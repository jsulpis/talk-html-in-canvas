<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSlideContext } from "@slidev/client";
import { showOverview } from "@slidev/client/state/storage.ts";
import {
  createFloatDataTexture,
  glCanvas,
  loadTexture,
} from "@radiancejs/gl";

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

type Cube = {
  hx: number;
  hy: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

const CELL_X = PLANE_WIDTH / COLS;
const CELL_Y = PLANE_HEIGHT / ROWS;
const cubes: Cube[] = [];
// Each cube gets its own direction in space, so a repulsion scatters them
// instead of only pushing them radially.
const dirs = new Float32Array(COLS * ROWS * 3);

let seed = 7;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const hx = (col + 0.5) * CELL_X - PLANE_WIDTH / 2;
    const hy = PLANE_HEIGHT / 2 - (row + 0.5) * CELL_Y;
    cubes.push({ hx, hy, x: hx, y: hy, z: 0, vx: 0, vy: 0, vz: 0 });

    const i = row * COLS + col;
    const dx = random() * 2 - 1;
    const dy = random() * 2 - 1;
    const dz = random() * 2 - 1;
    const len = Math.hypot(dx, dy, dz) || 1;
    dirs[i * 3] = dx / len;
    dirs[i * 3 + 1] = dy / len;
    dirs[i * 3 + 2] = dz / len;
  }
}

// Two texels per cube: position and velocity. The CPU integrates the springs,
// the vertex shader reads the result back through texelFetch.
const stateTexture = createFloatDataTexture(new Float32Array(cubes.length * 8));
const stateData = stateTexture.data as Float32Array;

function writeState() {
  for (let i = 0; i < cubes.length; i++) {
    const c = cubes[i];
    const o = i * 8;
    stateData[o] = c.x;
    stateData[o + 1] = c.y;
    stateData[o + 2] = c.z;
    stateData[o + 3] = 0;
    stateData[o + 4] = c.vx;
    stateData[o + 5] = c.vy;
    stateData[o + 6] = c.vz;
    stateData[o + 7] = 0;
  }
}

writeState();

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

const imageTexture = loadTexture(SRC, {
  generateMipmaps: true,
  anisotropy: 4,
});

function step(scale: number) {
  const dx = pointer.x - prevPointer.x;
  const dy = pointer.y - prevPointer.y;
  let speed = pointer.inside ? Math.hypot(dx, dy) / scale : 0;
  if (speed > 3) speed = 3;
  prevPointer.x = pointer.x;
  prevPointer.y = pointer.y;

  const s = scale * SPEED;
  const damping = Math.pow(DAMPING, s);

  for (let i = 0; i < cubes.length; i++) {
    const c = cubes[i];

    if (pointer.inside && speed > 0.01) {
      const dxm = c.x - pointer.x;
      const dym = c.y - pointer.y;
      const dist = Math.hypot(dxm, dym);
      if (dist < REPEL_RADIUS && dist > 0.0001) {
        const ratio = dist / REPEL_RADIUS;
        const falloff = 1 - ratio * ratio * (3 - 2 * ratio);
        const push = falloff * REPEL_FORCE * (1 + speed * 2.0) * s;
        // Mostly radial, plus this cube's own direction in space.
        c.vx += (dxm / dist + dirs[i * 3]) * push;
        c.vy += (dym / dist + dirs[i * 3 + 1]) * push;
        c.vz += dirs[i * 3 + 2] * push * 2.0;
      }
    }

    // Elastic pull back to the cube's place in the picture.
    c.vx += (c.hx - c.x) * SPRING * s;
    c.vy += (c.hy - c.y) * SPRING * s;
    c.vz += (0 - c.z) * SPRING * Z_SPRING * s;

    c.vx *= damping;
    c.vy *= damping;
    c.vz *= damping;
    c.x += c.vx * s;
    c.y += c.vy * s;
    c.z += c.vz * s;

    // Snap back to the exact grid so the flat picture stays crisp.
    if (
      Math.abs(c.x - c.hx) < 0.0005 &&
      Math.abs(c.y - c.hy) < 0.0005 &&
      Math.abs(c.z) < 0.0005 &&
      Math.abs(c.vx) + Math.abs(c.vy) + Math.abs(c.vz) < 0.0005
    ) {
      c.x = c.hx;
      c.y = c.hy;
      c.z = 0;
      c.vx = 0;
      c.vy = 0;
      c.vz = 0;
    }
  }

  writeState();
}

function frame(now: number) {
  raf = requestAnimationFrame(frame);
  const scale = lastFrame ? Math.min((now - lastFrame) / (1000 / 60), 3) : 1;
  lastFrame = now;

  if (!renderer || !canvas.value?.clientWidth) return;
  step(scale);
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
  for (const c of cubes) {
    c.x = c.hx;
    c.y = c.hy;
    c.z = 0;
    c.vx = 0;
    c.vy = 0;
    c.vz = 0;
  }
  writeState();
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
      uState: stateTexture,
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
