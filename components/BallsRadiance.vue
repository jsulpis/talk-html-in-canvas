<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSlideContext } from "@slidev/client";
import { showOverview } from "@slidev/client/state/storage.ts";
import {
  acesToneMapping,
  createFloatDataTexture,
  glCanvas,
} from "@radiancejs/gl";
import { mat4 } from "gl-matrix";

type Ball = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number;
  mass: number;
  phase: number;
  base: [number, number, number];
  shade: [number, number, number];
  glass: boolean;
};

const canvas = ref<HTMLCanvasElement | null>(null);
const visible = ref(false);

const { $nav, $page } = useSlideContext();
// Warm the simulation up while this slide is the previous or next one, so the
// entrance chaos is already settled by the time it is actually visible.
const nearby = computed(
  () => Math.abs($nav.value.currentSlideNo - $page.value) <= 1,
);
// The overview is an overlay: the slide stays mounted, so pause the render loop
// while it is open to keep the grid of previews smooth.
const active = computed(() => nearby.value && !showOverview.value);

const SLIDE_ASPECT = 16 / 9;

const COUNT = 96;
const TEXELS = 3;
const FOV = (38 * Math.PI) / 180;
const TAN_HALF_FOV = Math.tan(FOV / 2);
const CAMERA_Z = 13;

const PALETTE: Array<{
  base: [number, number, number];
  shade: [number, number, number];
}> = [
  { base: [236, 241, 255], shade: [190, 207, 245] }, // pastel
  { base: [168, 206, 255], shade: [112, 150, 218] }, // light
  { base: [47, 144, 255], shade: [22, 70, 180] },    // medium
  { base: [10, 79, 191], shade: [8, 40, 125] },      // deep
];
const GLASS = {
  base: [77, 154, 255] as [number, number, number],
  shade: [36, 90, 180] as [number, number, number],
};

const params = {
  mouseRepelForce: 0.04,
  mouseRepelRadius: 4.4,
  damping: 0.91,
  centerAttractForce: 0.0035,
  bounciness: 0.02,
};

let simTime = 0;
let lastFrame = 0;
const mousePos = { x: 99, y: 99, isDown: false };
const mouseWorld = { x: 0, y: 0, px: 0, py: 0 };
let balls: Ball[] = [];
let viewportWidth = 10;
let viewportHeight = 6;
let renderer: ReturnType<typeof glCanvas>;
let observer: ResizeObserver | null = null;
let raf = 0;
let running = false;

let texData: Float32Array;
const texture = createFloatDataTexture(new Float32Array(COUNT * TEXELS * 4));

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const vertex = /* glsl */ `
  in vec3 aPos;
  in float aId;

  uniform sampler2D uBalls;
  uniform mat4 uViewProj;

  out vec3 vNormal;
  out vec3 vWorld;
  flat out vec3 vBase;
  flat out vec3 vShade;
  flat out float vGlass;

  vec4 ballTexel(int i, int width) {
    return texelFetch(uBalls, ivec2(i % width, i / width), 0);
  }

  void main() {
    int id = int(aId + 0.5);
    int width = textureSize(uBalls, 0).x;
    int base = id * 3;

    vec4 d0 = ballTexel(base, width);
    vec4 d1 = ballTexel(base + 1, width);
    vec4 d2 = ballTexel(base + 2, width);

    vec3 world = d0.xyz + aPos * d0.w;
    vWorld = world;
    vNormal = aPos;
    vBase = d1.rgb;
    vShade = d2.rgb;
    vGlass = d1.a;

    gl_Position = uViewProj * vec4(world, 1.0);
  }
`;

const fragment = /* glsl */ `
  in vec3 vNormal;
  in vec3 vWorld;
  flat in vec3 vBase;
  flat in vec3 vShade;
  flat in float vGlass;

  uniform float uCameraZ;

  out vec4 outColor;

  const float PI = 3.14159265359;
  const vec3 KEY_DIR = normalize(vec3(-0.5, 0.72, 0.62));
  const vec3 KEY_COLOR = vec3(1.0, 0.98, 0.95) * 2.6;
  const vec3 RIM_DIR = normalize(vec3(0.65, 0.35, -0.62));
  const vec3 RIM_COLOR = vec3(0.82, 0.9, 1.0) * 1.4;
  const vec3 FILL_DIR = normalize(vec3(0.15, -0.45, 0.9));
  const vec3 FILL_COLOR = vec3(0.72, 0.82, 1.0) * 0.65;

  vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
  }

  vec3 environment(vec3 dir) {
    vec3 ground = vec3(0.1, 0.12, 0.22);
    vec3 sky = vec3(0.72, 0.8, 1.0);
    vec3 horizon = vec3(0.45, 0.52, 0.72);
    float h = dir.y;
    return h > 0.0
      ? mix(horizon, sky, pow(clamp(h, 0.0, 1.0), 0.6))
      : mix(horizon, ground, clamp(-h * 2.5, 0.0, 1.0));
  }

  vec3 brdf(
    vec3 N, vec3 V, vec3 L, vec3 lightColor,
    vec3 albedo, float roughness, vec3 f0
  ) {
    float ndl = dot(N, L);
    if (ndl <= 0.0) return vec3(0.0);

    vec3 H = normalize(L + V);
    float ndh = max(dot(N, H), 0.0);
    float ndv = max(dot(N, V), 0.0001);
    float vdh = max(dot(V, H), 0.0);

    float a = roughness * roughness;
    float a2 = a * a;
    float denom = ndh * ndh * (a2 - 1.0) + 1.0;
    float D = a2 / (PI * denom * denom);

    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    float G = (ndl / (ndl * (1.0 - k) + k)) * (ndv / (ndv * (1.0 - k) + k));

    vec3 F = f0 + (1.0 - f0) * pow(1.0 - vdh, 5.0);
    vec3 spec = D * G * F / (4.0 * ndl * ndv + 0.0001);

    return (albedo * (1.0 - F) / PI + spec) * lightColor * ndl;
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vec3(0.0, 0.0, uCameraZ) - vWorld);

    float roughness = mix(0.5, 0.13, vGlass);
    vec3 f0 = mix(vec3(0.04), vec3(0.1), vGlass);
    vec3 albedo = srgbToLinear(vBase) * mix(1.0, 0.8, vGlass);
    vec3 shade = srgbToLinear(vShade);

    vec3 color = vec3(0.0);
    color += brdf(N, V, KEY_DIR, KEY_COLOR, albedo, roughness, f0);
    color += brdf(N, V, RIM_DIR, RIM_COLOR, albedo, roughness, f0);
    color += brdf(N, V, FILL_DIR, FILL_COLOR, albedo, roughness, f0);

    // Hemisphere fill standing in for a soft ambient occlusion.
    float up = N.y * 0.5 + 0.5;
    vec3 ambient = mix(shade * 0.5, vec3(0.62, 0.7, 0.86), up);
    color += albedo * ambient * 0.65;

    // Sky reflection, stronger on the glossy glass balls.
    vec3 R = reflect(-V, N);
    float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 6.0) * 0.6;
    vec3 env = environment(R);
    color += env * (f0 + fresnel * (1.0 - f0)) * mix(0.28, 1.05, vGlass);

    outColor = vec4(color, 1.0);
  }
`;

function createIcosphere(subdivisions: number) {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices: number[][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((v) => {
    const len = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  });

  let faces: number[][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  for (let s = 0; s < subdivisions; s++) {
    const cache = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const va = vertices[a];
      const vb = vertices[b];
      const m = [va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]];
      const len = Math.hypot(m[0], m[1], m[2]);
      vertices.push([m[0] / len, m[1] / len, m[2] / len]);
      const index = vertices.length - 1;
      cache.set(key, index);
      return index;
    };
    const next: number[][] = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }

  return {
    positions: new Float32Array(vertices.flat()),
    indices: new Uint16Array(faces.flat()),
  };
}

const sphere = createIcosphere(3);
const ids = new Float32Array(COUNT).map((_, i) => i);

// The camera only translates, so the view matrix is computed once.
const VIEW = mat4.fromTranslation(mat4.create(), [0, 0, -CAMERA_Z]);

function viewProjection(aspect: number) {
  const projection = mat4.perspective(mat4.create(), FOV, aspect, 0.1, 100);
  return mat4.multiply(mat4.create(), projection, VIEW);
}

function makeBalls() {
  balls = [];
  for (let i = 0; i < COUNT; i++) {
    let radius = 0.33;
    const pick = Math.random();
    if (pick < 0.3) radius = 0.27 + Math.random() * 0.12;
    else if (pick < 0.8) radius = 0.42 + Math.random() * 0.18;
    else radius = 0.66 + Math.random() * 0.21;

    const glass = Math.random() < 0.22;
    let palette = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    if (glass) palette = GLASS;

    balls.push({
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      r: radius,
      mass: Math.pow(radius, 3),
      phase: Math.random() * Math.PI * 2,
      base: palette.base,
      shade: palette.shade,
      glass,
    });
  }
  scatterFar();
}

function scatterFar() {
  const R = Math.max(viewportWidth, viewportHeight) * 1.5;
  for (const b of balls) {
    const a = Math.random() * Math.PI * 2;
    const px = Math.cos(a) * R * 1.25;
    const py = Math.sin(a) * R * 0.85;
    const pz = (Math.random() - 0.5) * 4;
    b.x = px; b.y = py; b.z = pz;
    const len = Math.hypot(px, py, pz) || 1;
    const speed = 0.08 + Math.random() * 0.05;
    b.vx = (-px / len) * speed;
    b.vy = (-py / len) * speed;
    b.vz = (-pz / len) * speed;
  }
}

function updateBounds(aspect = canvas.value && canvas.value.clientHeight
  ? canvas.value.clientWidth / canvas.value.clientHeight
  : SLIDE_ASPECT) {
  viewportHeight = 2 * TAN_HALF_FOV * CAMERA_Z;
  viewportWidth = viewportHeight * aspect;
}

function writeTexture() {
  const sorted = [...balls].sort((a, b) => a.z - b.z);
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const o = i * TEXELS * 4;
    texData[o] = b.x;
    texData[o + 1] = b.y;
    texData[o + 2] = b.z;
    texData[o + 3] = b.r;
    texData[o + 4] = b.base[0] / 255;
    texData[o + 5] = b.base[1] / 255;
    texData[o + 6] = b.base[2] / 255;
    texData[o + 7] = b.glass ? 1 : 0;
    texData[o + 8] = b.shade[0] / 255;
    texData[o + 9] = b.shade[1] / 255;
    texData[o + 10] = b.shade[2] / 255;
    texData[o + 11] = 0;
  }
}

function step(time: number, scale: number) {
  const entranceT = easeOutCubic(clamp01(time / 2.2));
  const attractionBoost = lerp(7.5, 1, entranceT);

  const interacting = Math.abs(mousePos.x) < 0.99 || Math.abs(mousePos.y) < 0.99;
  const dx = mouseWorld.x - mouseWorld.px;
  const dy = mouseWorld.y - mouseWorld.py;
  let speed = interacting ? Math.hypot(dx, dy) / scale : 0;
  if (speed > 3) speed = 3;
  mouseWorld.px = mouseWorld.x;
  mouseWorld.py = mouseWorld.y;

  for (const b of balls) {
    b.vx += Math.sin(time * 0.4 + (b.phase + b.r * 30)) * 0.0004 * b.r * scale;
    b.vy += Math.cos(time * 0.5 + (b.phase + b.r * 24)) * 0.0004 * b.r * scale;
    b.vz += Math.sin(time * 0.35 + b.phase) * 0.0001 * scale;

    const cluster = params.centerAttractForce * attractionBoost;
    b.vx += (0 - b.x) * cluster * 0.38 * scale;
    b.vy += (0 - b.y) * cluster * 1.85 * scale;
    b.vz += (0 - b.z) * cluster * 1.8 * scale;

    if (interacting && (speed > 0.01 || mousePos.isDown)) {
      const ddx = b.x - mouseWorld.x;
      const ddy = b.y - mouseWorld.y;
      const dist = Math.hypot(ddx, ddy);
      const radius = mousePos.isDown
        ? params.mouseRepelRadius * 1.4
        : params.mouseRepelRadius;
      if (dist < radius && dist > 0.0001) {
        const ratio = dist / radius;
        const falloff = 1 - ratio * ratio * (3 - 2 * ratio);
        const force = mousePos.isDown
          ? params.mouseRepelForce * 1.7
          : params.mouseRepelForce;
        const push = (falloff * force * (1 + speed * 3.2)) / dist;
        b.vx += ddx * push * scale;
        b.vy += ddy * push * scale;
      }
    }

    const damping = Math.pow(params.damping, scale);
    b.vx *= damping;
    b.vy *= damping;
    b.vz *= damping;
    b.x += b.vx * scale;
    b.y += b.vy * scale;
    b.z += b.vz * scale;
  }

  const collideScale = 0.28 * scale;
  for (let iteration = 0; iteration < 4; iteration++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const ddx = b.x - a.x;
        const ddy = b.y - a.y;
        const ddz = b.z - a.z;
        const dist = Math.hypot(ddx, ddy, ddz);
        const min = a.r + b.r;
        if (dist < min && dist > 0.001) {
          const overlap = min - dist;
          const nx = ddx / dist;
          const ny = ddy / dist;
          const nz = ddz / dist;
          const total = a.mass + b.mass;
          const ra = b.mass / total;
          const rb = a.mass / total;
          a.x -= nx * overlap * ra * collideScale;
          a.y -= ny * overlap * ra * collideScale;
          a.z -= nz * overlap * ra * collideScale;
          b.x += nx * overlap * rb * collideScale;
          b.y += ny * overlap * rb * collideScale;
          b.z += nz * overlap * rb * collideScale;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const rvz = b.vz - a.vz;
          const along = rvx * nx + rvy * ny + rvz * nz;
          if (along < -0.0001) {
            const impulse =
              ((-(1 + params.bounciness) * along) /
                (1 / a.mass + 1 / b.mass)) * scale;
            a.vx -= (nx * impulse) / a.mass;
            a.vy -= (ny * impulse) / a.mass;
            a.vz -= (nz * impulse) / a.mass;
            b.vx += (nx * impulse) / b.mass;
            b.vy += (ny * impulse) / b.mass;
            b.vz += (nz * impulse) / b.mass;
          }
        }
      }
    }
  }

  const xBound = viewportWidth / 2 - 0.2;
  const topY = viewportHeight / 2 - 0.05;
  const floorY = -viewportHeight / 2 + 0.05;
  const zBound = 2;
  const restitution = 0.3;

  for (const b of balls) {
    if (b.x < -xBound - b.r) {
      b.x = -xBound - b.r;
      b.vx *= -0.3;
    } else if (b.x > xBound + b.r) {
      b.x = xBound + b.r;
      b.vx *= -0.3;
    }
    if (b.y - b.r < floorY) {
      b.y = floorY + b.r;
      if (b.vy < 0) b.vy = -b.vy * restitution;
    }
    if (b.y + b.r > topY) {
      b.y = topY - b.r;
      if (b.vy > 0) b.vy *= -0.3;
    }
    if (b.z < -zBound) {
      b.z = -zBound;
      b.vz *= -0.3;
    } else if (b.z > zBound) {
      b.z = zBound;
      b.vz *= -0.3;
    }
  }
}

function frame(now: number) {
  raf = requestAnimationFrame(frame);
  const scale = lastFrame ? Math.min((now - lastFrame) / (1000 / 60), 3) : 1;
  lastFrame = now;
  simTime += scale / 60;
  mouseWorld.x = mousePos.x * (viewportWidth / 2);
  mouseWorld.y = mousePos.y * (viewportHeight / 2);
  step(simTime, scale);
  if (!renderer || !canvas.value?.clientWidth) return;
  writeTexture();
  renderer.render();
}

function resize() {
  const el = canvas.value;
  if (!el || !el.clientWidth || !el.clientHeight) return;
  renderer.setSize({
    width: Math.round(el.clientWidth * renderer.dpr),
    height: Math.round(el.clientHeight * renderer.dpr),
  });
  updateBounds();
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
}

function pointerCoords(event: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  };
}

function onPointerEnter(event: PointerEvent) {
  const p = pointerCoords(event);
  mousePos.x = p.x;
  mousePos.y = p.y;
  mouseWorld.px = p.x * (viewportWidth / 2);
  mouseWorld.py = p.y * (viewportHeight / 2);
}

function onPointerMove(event: PointerEvent) {
  const p = pointerCoords(event);
  mousePos.x = p.x;
  mousePos.y = p.y;
}

function onPointerDown() {
  mousePos.isDown = true;
}

function onPointerUp() {
  mousePos.isDown = false;
}

function onPointerLeave() {
  mousePos.x = 99;
  mousePos.y = 99;
  mousePos.isDown = false;
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
      aPos: { size: 3, data: sphere.positions },
      aId: { size: 1, data: ids, divisor: 1 },
      index: { size: 1, data: sphere.indices },
    },
    uniforms: {
      uBalls: texture,
      uCameraZ: CAMERA_Z,
      uViewProj: ({ canvasResolution }) =>
        viewProjection(canvasResolution[0] / canvasResolution[1]),
    },
    depthTest: true,
    drawMode: "TRIANGLES",
    webglAttributes: {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    },
    postEffects: [acesToneMapping({ exposure: 1.15 })],
  });

  renderer.gl.clearColor(0, 0, 0, 0);
  resize();

  // Overview preview cards mount while showOverview is true: draw a single
  // static frame instead of running a loop (or leaving a blank canvas).
  if (active.value) {
    start();
  } else {
    writeTexture();
    renderer.render();
  }
  // Hide the first frames while the pipeline warms up.
  requestAnimationFrame(() => requestAnimationFrame(() => (visible.value = true)));
}

onMounted(() => {
  const el = canvas.value;
  if (!el) return;

  // Slidev mounts hidden slides at 0x0; keep the physics running anyway so the
  // cluster is settled before the slide is shown.
  texData = texture.data as Float32Array;
  updateBounds(SLIDE_ASPECT);
  makeBalls();

  observer = new ResizeObserver(() => (renderer ? resize() : init()));
  observer.observe(el);
  window.addEventListener("pointerup", onPointerUp);
  watch(active, (on) => (on ? start() : stop()), { immediate: true });
  init();
});

onBeforeUnmount(() => {
  stop();
  observer?.disconnect();
  window.removeEventListener("pointerup", onPointerUp);
  renderer?.dispose();
});
</script>

<template>
  <div class="balls-slide" :class="{ 'is-visible': visible }">
    <canvas
      ref="canvas"
      role="img"
      aria-label="Nuage de sphères bleues interactif, rendu avec Radiance"
      @pointerenter="onPointerEnter"
      @pointermove="onPointerMove"
      @pointerdown="onPointerDown"
      @pointerleave="onPointerLeave"
    />
  </div>
</template>

<style scoped>
.balls-slide {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  background: transparent;
  opacity: 0;
  transition: opacity 500ms 200ms var(--motion-ease);
}

.balls-slide.is-visible {
  opacity: 1;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
