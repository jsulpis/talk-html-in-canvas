<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSlideContext } from "@slidev/client";
import { showOverview } from "@slidev/client/state/storage.ts";
import { glCanvas, loadTexture, pingPongFBO } from "@radiancejs/gl";

const SRC = "/devfest-lyon.png";

// 531 × 376 source image.
const COLS = 36;
const ROWS = 26;
const PLANE_WIDTH = 11.3;
const PLANE_HEIGHT = (PLANE_WIDTH * 376) / 531;
const CUBE_DEPTH = 0.45;
// Cubes overlap by a few percent: their decals sample the image by world
// position, so the overlap stays invisible but closes the moving gaps.
const CUBE_SCALE = 1.08;
const FOV = (38 * Math.PI) / 180;
// Full-slide canvas: camera distance sets the picture size on the slide, the
// height lifts the camera so the picture clears the subtitle.
const CAMERA_Z = 19.1;
const CAMERA_Y = 0.5;

// Elastic return + pointer repulsion, tuned like BallsRadiance.
const SPRING = 0.02;
const Z_SPRING = 0.7;
const DAMPING = 0.82;
const REPEL_RADIUS = 1.8;
const REPEL_FORCE = 0.2;
// Global time scale: below 1 the whole simulation runs slower.
const SPEED = 0.6;

const canvas = ref<HTMLCanvasElement | null>(null);
const visible = ref(false);

const { $nav, $page } = useSlideContext();
// Slidev keeps every slide mounted, so only run the loop near the current one
// and pause it while the overview grid is open.
const nearby = computed(
  () => Math.abs($nav.value.currentSlideNo - $page.value) <= 1,
);
const active = computed(() => nearby.value && !showOverview.value);

type Vec2 = [number, number];
type Vec3 = [number, number, number];

let renderer: ReturnType<typeof glCanvas>;
let observer: ResizeObserver | null = null;
let raf = 0;
let running = false;
let lastFrame = 0;
const pointer = { x: 999, y: 999, inside: false };
const prevPointer = { x: 999, y: 999 };

function perspective(fov: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ];
}

// p * translate(0, CAMERA_Y, -CAMERA_Z), column-major.
function viewProjection(aspect: number) {
  const p = perspective(FOV, aspect, 0.1, 100);
  const out = new Float32Array(p);
  out[12] = -CAMERA_Z * p[8] + p[12];
  out[13] = -CAMERA_Y * p[5] - CAMERA_Z * p[9] + p[13];
  out[14] = -CAMERA_Z * p[10] + p[14];
  out[15] = -CAMERA_Z * p[11] + p[15];
  return out;
}

const FACES: { normal: Vec3; corners: Vec3[]; front: boolean }[] = [
  { normal: [0, 0, 1], front: true, corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { normal: [0, 0, -1], front: false, corners: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
  { normal: [1, 0, 0], front: false, corners: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  { normal: [-1, 0, 0], front: false, corners: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  { normal: [0, 1, 0], front: false, corners: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { normal: [0, -1, 0], front: false, corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
];

function makeGeometry() {
  const positions: number[] = [];
  const normals: number[] = [];
  const fronts: number[] = [];
  const indices: number[] = [];

  FACES.forEach((face, faceIndex) => {
    for (const corner of face.corners) {
      positions.push(...corner);
      normals.push(...face.normal);
      fronts.push(face.front ? 1 : 0);
    }
    const offset = faceIndex * 4;
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  });

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    fronts: new Float32Array(fronts),
    indices: new Uint16Array(indices),
  };
}

function makeCells() {
  const cells = new Float32Array(COLS * ROWS * 2);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const o = (row * COLS + col) * 2;
      cells[o] = col;
      cells[o + 1] = row;
    }
  }
  return cells;
}

const cube = makeGeometry();
const cells = makeCells();

const CELL_X = PLANE_WIDTH / COLS;
const CELL_Y = PLANE_HEIGHT / ROWS;
const CUBE_COUNT = COLS * ROWS;

// The simulation lives entirely on the GPU (see `simFragment`): two texels per
// cube, even = position, odd = velocity. The GPU starts from this grid laid flat.
function makeInitialState() {
  const data = new Float32Array(CUBE_COUNT * 8);
  for (let id = 0; id < CUBE_COUNT; id++) {
    const col = id % COLS;
    const row = Math.floor(id / COLS);
    data[id * 8] = (col + 0.5) * CELL_X - PLANE_WIDTH / 2;
    data[id * 8 + 1] = PLANE_HEIGHT / 2 - (row + 0.5) * CELL_Y;
  }
  return data;
}

const vertex = /* glsl */ `
  in vec3 aPos;
  in vec3 aNormal;
  in float aFront;
  in vec2 aCell;

  uniform mat4 uViewProj;
  uniform sampler2D uState;
  uniform vec2 uPlane;
  uniform vec2 uGrid;

  out vec2 vUv;
  out vec2 vSideUv;
  out vec3 vNormal;
  flat out float vFront;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  // Rodrigues rotation around an arbitrary axis.
  vec3 rotateAxis(vec3 v, vec3 axis, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }

  void main() {
    vec2 cell = uPlane / uGrid;
    // Row 0 is the top row of the picture.
    vec2 base = vec2(
      (aCell.x + 0.5) * cell.x - uPlane.x * 0.5,
      uPlane.y * 0.5 - (aCell.y + 0.5) * cell.y
    );

    // Sample the picture by world position, so overlapping neighbours show the
    // same pixels and every cube keeps its patch while it flies around.
    vUv = (base + aPos.xy * cell * ${CUBE_SCALE.toFixed(2)}) / uPlane + 0.5;
    // Sides take the color at the cube's own place, not at the patch edge.
    vSideUv = base / uPlane + 0.5;
    vFront = aFront;

    int id = int(aCell.x + aCell.y * uGrid.x + 0.5);
    int width = textureSize(uState, 0).x;
    int texel = id * 2;
    vec4 d0 = texelFetch(uState, ivec2(texel % width, texel / width), 0);

    vec3 home = vec3(base, 0.0);
    vec3 pos = d0.xyz;
    vec3 offset = pos - home;
    float shift = length(offset);

    // Give every front face a tiny, invisible depth offset so overlapping
    // neighbours never z-fight while they move.
    pos.z += hash(vec3(aCell, 13.0)) * 0.004;

    // Every cube spins around its own axis, more the further it is from home,
    // and unwinds to a flat image as it returns.
    float s1 = hash(vec3(aCell, 3.0));
    float s2 = hash(vec3(aCell, 5.0));
    float s3 = hash(vec3(aCell, 9.0));
    vec3 axis = normalize(vec3(s1, s2, s3) - 0.5 + vec3(0.001));
    float spin = min(shift, 2.5) * 1.4 * (s1 > 0.5 ? 1.0 : -1.0);

    vec3 local = aPos * vec3(cell * ${CUBE_SCALE.toFixed(2)}, ${CUBE_DEPTH.toFixed(2)});
    // Side faces are hidden while a cube sits in the picture; their slivers
    // would otherwise draw a faint gray grid over the flat image.
    if (aFront < 0.5) local.z -= (1.0 - smoothstep(0.2, 0.5, shift)) * ${CUBE_DEPTH.toFixed(2)};
    vec3 world = pos + rotateAxis(local, axis, spin);

    vNormal = normalize(rotateAxis(aNormal, axis, spin));

    gl_Position = uViewProj * vec4(world, 1.0);
    // Pull front faces a hair closer so their shared edge with the sides
    // always wins the depth test instead of letting the side poke through.
    if (aFront > 0.5) gl_Position.z -= 2e-5 * gl_Position.w;
  }
`;

const fragment = /* glsl */ `
  in vec2 vUv;
  in vec2 vSideUv;
  in vec3 vNormal;
  flat in float vFront;

  uniform sampler2D uImage;

  out vec4 outColor;

  const vec3 LIGHT = normalize(vec3(-0.35, 0.75, 0.9));
  // Front faces are lit too; this is their brightness when the cube is flat,
  // so the resting picture keeps its exact colors.
  const float REST = 0.25 + 0.75 * LIGHT.z;

  void main() {
    if (vFront > 0.5) {
      float lambert = max(dot(normalize(vNormal), LIGHT), 0.0);
      vec3 color = texture(uImage, vUv).rgb;
      outColor = vec4(color * ((0.25 + 0.75 * lambert) / REST), 1.0);
      return;
    }

    // Cube sides: the cube's own colors with strong face lighting, so the
    // flying pieces read as solid volumes.
    float lambert = max(dot(normalize(vNormal), LIGHT), 0.0);
    vec3 src = texture(uImage, vSideUv).rgb;
    outColor = vec4(src * (0.25 + 0.75 * lambert), 1.0);
  }
`;

const simFragment = /* glsl */ `
  uniform sampler2D tState;
  uniform vec2 uPlane;
  uniform vec2 uGrid;
  uniform vec2 uPointer;
  uniform float uPointerOn;
  uniform float uSpeed;
  uniform float uDt;
  uniform float uDamping;
  uniform float uReset;

  out vec4 outColor;

  const float SPRING = ${SPRING.toFixed(3)};
  const float Z_SPRING = ${Z_SPRING.toFixed(3)};
  const float REPEL_RADIUS = ${REPEL_RADIUS.toFixed(3)};
  const float REPEL_FORCE = ${REPEL_FORCE.toFixed(3)};

  float hash(float n) {
    return fract(sin(n * 127.1) * 43758.5453);
  }

  // Each cube's own direction in space, so a repulsion scatters them instead
  // of only pushing them radially.
  vec3 cubeDir(int id) {
    vec3 d = vec3(
      hash(float(id) + 0.1),
      hash(float(id) + 11.7),
      hash(float(id) + 23.3)
    ) - 0.5;
    return normalize(d + vec3(0.001));
  }

  void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    int width = textureSize(tState, 0).x;
    int index = coord.y * width + coord.x;
    int count = int(uGrid.x * uGrid.y);
    // The texture is padded to a square; pad texels are never read.
    if (index >= count * 2) {
      outColor = vec4(-1.0);
      return;
    }

    int id = index / 2;
    int col = id % int(uGrid.x);
    int row = id / int(uGrid.x);
    vec2 cell = uPlane / uGrid;
    vec2 home = vec2(
      (float(col) + 0.5) * cell.x - uPlane.x * 0.5,
      uPlane.y * 0.5 - (float(row) + 0.5) * cell.y
    );

    int pIndex = id * 2;
    int vIndex = pIndex + 1;
    vec3 pos = texelFetch(tState, ivec2(pIndex % width, pIndex / width), 0).xyz;
    vec3 vel = texelFetch(tState, ivec2(vIndex % width, vIndex / width), 0).xyz;

    if (uReset > 0.5) {
      outColor = index == pIndex ? vec4(home, 0.0, 0.0) : vec4(0.0);
      return;
    }

    if (uPointerOn > 0.5 && uSpeed > 0.01) {
      vec2 d = pos.xy - uPointer;
      float dist = length(d);
      if (dist < REPEL_RADIUS && dist > 0.0001) {
        float ratio = dist / REPEL_RADIUS;
        float falloff = 1.0 - ratio * ratio * (3.0 - 2.0 * ratio);
        float push = falloff * REPEL_FORCE * (1.0 + uSpeed * 2.0) * uDt;
        vec3 dir = cubeDir(id);
        // Mostly radial, plus this cube's own direction in space.
        vel.xy += (d / dist + dir.xy) * push;
        vel.z += dir.z * push * 2.0;
      }
    }

    // Elastic pull back to the cube's place in the picture.
    vel.xy += (home - pos.xy) * SPRING * uDt;
    vel.z += -pos.z * SPRING * Z_SPRING * uDt;
    vel *= uDamping;
    pos += vel * uDt;

    // Snap back to the exact grid so the flat picture stays crisp.
    if (
      abs(pos.x - home.x) < 0.0005 &&
      abs(pos.y - home.y) < 0.0005 &&
      abs(pos.z) < 0.0005 &&
      abs(vel.x) + abs(vel.y) + abs(vel.z) < 0.0005
    ) {
      pos = vec3(home, 0.0);
      vel = vec3(0.0);
    }

    outColor = index == pIndex ? vec4(pos, 0.0) : vec4(vel, 0.0);
  }
`;

const imageTexture = loadTexture(SRC, {
  generateMipmaps: true,
  anisotropy: 4,
});

let sim: ReturnType<typeof pingPongFBO> | null = null;

function stepSim(scale: number) {
  if (!sim) return;
  const dx = pointer.x - prevPointer.x;
  const dy = pointer.y - prevPointer.y;
  let speed = pointer.inside ? Math.hypot(dx, dy) / scale : 0;
  if (speed > 3) speed = 3;
  prevPointer.x = pointer.x;
  prevPointer.y = pointer.y;

  const s = scale * SPEED;
  sim.uniforms.uPointer = [pointer.x, pointer.y];
  sim.uniforms.uPointerOn = pointer.inside ? 1 : 0;
  sim.uniforms.uSpeed = speed;
  sim.uniforms.uDt = s;
  sim.uniforms.uDamping = Math.pow(DAMPING, s);
  sim.render();
}

// Write the flat grid into both buffers (ping-pong swaps them), so the next
// render — and any still frame — shows the untouched picture.
function resetSim() {
  if (!sim) return;
  sim.uniforms.uReset = 1;
  sim.render();
  sim.render();
  sim.uniforms.uReset = 0;
}


function frame(now: number) {
  raf = requestAnimationFrame(frame);
  const scale = lastFrame ? Math.min((now - lastFrame) / (1000 / 60), 3) : 1;
  lastFrame = now;

  if (!renderer || !canvas.value?.clientWidth) return;
  stepSim(scale);
  renderer.render();
}

function resize() {
  const el = canvas.value;
  if (!el || !el.clientWidth || !el.clientHeight) return;
  renderer.setSize({
    width: Math.round(el.clientWidth * renderer.dpr),
    height: Math.round(el.clientHeight * renderer.dpr),
  });
}

function start() {
  if (running) return;
  running = true;
  lastFrame = 0;
  raf = requestAnimationFrame(frame);
}

function stop() {
  running = false;
  cancelAnimationFrame(raf);
  // Leave the overview preview and the next visit with the flat picture.
  resetSim();
  renderer?.render();
}

function pointerCoords(event: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  };
}

// Map the pointer onto the z = 0 plane where the cubes live.
function updatePointer(event: PointerEvent, reset = false) {
  const p = pointerCoords(event);
  const viewHeight = 2 * Math.tan(FOV / 2) * CAMERA_Z;
  const viewWidth =
    viewHeight * (canvas.value!.clientWidth / canvas.value!.clientHeight);
  pointer.x = (p.x * viewWidth) / 2;
  pointer.y = (p.y * viewHeight) / 2 + CAMERA_Y;
  pointer.inside = true;
  if (reset) {
    prevPointer.x = pointer.x;
    prevPointer.y = pointer.y;
  }
}

function onPointerEnter(event: PointerEvent) {
  updatePointer(event, true);
}

function onPointerMove(event: PointerEvent) {
  updatePointer(event);
}

function onPointerLeave() {
  pointer.x = 999;
  pointer.y = 999;
  pointer.inside = false;
  prevPointer.x = 999;
  prevPointer.y = 999;
}

function init() {
  const el = canvas.value;
  // Slidev mounts the slide while it is still hidden, so the WebGL pipeline
  // must wait for a real size instead of initializing at 0x0.
  if (!el || renderer || !el.clientWidth || !el.clientHeight) return;

  renderer = glCanvas({
    canvas: el,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    renderMode: "manual",
    vertex,
    fragment,
    attributes: {
      aPos: { size: 3, data: cube.positions },
      aNormal: { size: 3, data: cube.normals },
      aFront: { size: 1, data: cube.fronts },
      aCell: { size: 2, data: cells, divisor: 1 },
      index: { size: 1, data: cube.indices },
    },
    uniforms: {
      uImage: imageTexture,
      uState: () => sim!.texture,
      uViewProj: ({ canvasResolution }) =>
        viewProjection(canvasResolution[0] / canvasResolution[1]),
      uPlane: [PLANE_WIDTH, PLANE_HEIGHT] as Vec2,
      uGrid: [COLS, ROWS] as Vec2,
    },
    depthTest: true,
    drawMode: "TRIANGLES",
    webglAttributes: {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    },
  });

  renderer.gl.clearColor(0, 0, 0, 0);
  resize();

  sim = pingPongFBO({
    gl: renderer.gl,
    fragment: simFragment,
    dataTexture: { name: "tState", initialData: makeInitialState() },
    uniforms: {
      uPointer: [0, 0] as Vec2,
      uPointerOn: 0,
      uSpeed: 0,
      uDt: 0,
      uDamping: 1,
      uPlane: [PLANE_WIDTH, PLANE_HEIGHT] as Vec2,
      uGrid: [COLS, ROWS] as Vec2,
      uReset: 0,
    },
  });
  resetSim();

  if (active.value) {
    start();
  } else {
    renderer.render();
  }

  // The texture arrives asynchronously: fade the canvas in once the image is
  // ready, and repaint the still frame used by the overview grid.
  imageTexture.then(() => {
    visible.value = true;
    if (!active.value) renderer?.render();
  });
}

onMounted(() => {
  const el = canvas.value;
  if (!el) return;

  observer = new ResizeObserver(() => (renderer ? resize() : init()));
  observer.observe(el);
  watch(active, (on) => (on ? start() : stop()), { immediate: true });
  init();
});

onBeforeUnmount(() => {
  stop();
  observer?.disconnect();
  sim?.dispose();
  renderer?.dispose();
});
</script>

<template>
  <canvas
    ref="canvas"
    class="cubes-image"
    :class="{ 'is-visible': visible }"
    role="img"
    aria-label="L'image du DevFest Lyon faite de cubes 3D repoussés par le curseur, rendue avec Radiance"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  />
</template>

<style scoped>
.cubes-image {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 18px 36px rgba(30, 53, 82, 0.28));
  opacity: 0;
  transition: opacity 500ms 200ms var(--motion-ease);
  touch-action: none;
}

.cubes-image.is-visible {
  opacity: 1;
}
</style>
