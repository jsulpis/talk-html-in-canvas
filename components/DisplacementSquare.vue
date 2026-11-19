<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { resolveAssetUrl, useSlideContext } from "@slidev/client";
import { showOverview } from "@slidev/client/state/storage.ts";
import { glCanvas, linearToneMapping, loadTexture } from "@radiancejs/gl";
import { mat4 } from "gl-matrix";

const props = defineProps<{ name: string }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let renderer: ReturnType<typeof glCanvas> | null = null;

const { $nav, $page } = useSlideContext();
const active = computed(
  () => $nav.value.currentSlideNo === $page.value && !showOverview.value,
);
watch(active, (on) => (on ? renderer?.play() : renderer?.pause()));

const FOV = (24 * Math.PI) / 180;
const EYE = [0, 2.3, 3.8] as const;
const SPEED = 0.00025; // radians per millisecond
const START_ANGLE = 0.35;
const HALF_SIZE = 0.82;
const RELIEF = 0.1;

const vertex = /* glsl */ `
  in vec3 aPos;
  in vec2 aUv;

  uniform mat4 uViewProj;
  uniform float uAngle;
  uniform float uRelief;
  uniform sampler2D uDisp;

  out vec3 vWorld;

  void main() {
    float h = texture(uDisp, aUv).r;
    vec3 p = vec3(aPos.x, h * uRelief, aPos.y);

    float c = cos(uAngle);
    float s = sin(uAngle);
    p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);

    vWorld = p;
    gl_Position = uViewProj * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  in vec3 vWorld;

  out vec4 outColor;

  const vec3 LIGHT_DIR = normalize(vec3(-0.12, 0.92, -0.38));
  const vec3 LIGHT_COLOR = vec3(1.0, 0.98, 0.95) * .9;

  void main() {
    // The relief comes from the displaced geometry itself: no normal map.
    vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));

    vec3 albedo = vec3(.4);

    // Lambert: ambient + diffuse, no specular.
    vec3 ambient = albedo * 0.15;
    vec3 diffuse = albedo * LIGHT_COLOR * max(dot(N, LIGHT_DIR), 0.0);

    outColor = vec4(ambient + diffuse, 1.0);
  }
`;

function buildPlane(segments: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const step = (HALF_SIZE * 2) / segments;

  const push = (x: number, y: number) => {
    positions.push(x, y, 0);
    uvs.push(
      (x + HALF_SIZE) / (HALF_SIZE * 2),
      (y + HALF_SIZE) / (HALF_SIZE * 2),
    );
  };

  for (let y = 0; y < segments; y++) {
    for (let x = 0; x < segments; x++) {
      const x0 = -HALF_SIZE + x * step;
      const y0 = -HALF_SIZE + y * step;
      const x1 = x0 + step;
      const y1 = y0 + step;
      push(x0, y0);
      push(x1, y0);
      push(x1, y1);
      push(x0, y0);
      push(x1, y1);
      push(x0, y1);
    }
  }
  return { positions, uvs };
}

const VIEW = mat4.lookAt(
  mat4.create(),
  EYE as unknown as number[],
  [0, 0, 0],
  [0, 1, 0],
);

function viewProjection(aspect: number) {
  const projection = mat4.perspective(mat4.create(), FOV, aspect, 0.1, 100);
  return mat4.multiply(mat4.create(), projection, VIEW);
}

async function init() {
  const el = canvas.value;
  if (!el || renderer) return;

  const disp = await loadTexture(resolveAssetUrl(`${props.name}_disp_1k.jpg`), {
    anisotropy: 8,
  });
  if (!el.isConnected) return;

  const plane = buildPlane(256);
  renderer = glCanvas({
    canvas: el,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    renderMode: "continuous",
    immediate: false,
    vertex,
    fragment,
    attributes: {
      aPos: { size: 3, data: new Float32Array(plane.positions) },
      aUv: { size: 2, data: new Float32Array(plane.uvs) },
    },
    uniforms: {
      uAngle: ({ time }) => START_ANGLE + time * SPEED,
      uDisp: disp,
      uRelief: RELIEF,
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
    postEffects: [linearToneMapping({ exposure: 1.4 })],
  });

  renderer.gl.clearColor(0, 0, 0, 0);
  renderer.render();
  if (active.value) renderer.play();
}

onMounted(init);

onBeforeUnmount(() => {
  renderer?.dispose();
  renderer = null;
});
</script>

<template>
  <canvas
    ref="canvas"
    class="relief-canvas"
    role="img"
    aria-label="Carré en rotation déplacé par une carte de déplacement, éclairage Lambert"
  />
</template>

<style scoped>
.relief-canvas {
  display: block;
  width: min(1240px, 100%);
  aspect-ratio: 16 / 9;
}
</style>
