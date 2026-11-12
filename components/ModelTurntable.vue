<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSlideContext } from "@slidev/client";
import { showOverview } from "@slidev/client/state/storage.ts";
import {
  acesToneMapping,
  createFloatDataTexture,
  glCanvas,
  linearToneMapping,
  loadTexture,
} from "@radiancejs/gl";
import { mat3, mat4 } from "gl-matrix";

type Vec3 = [number, number, number];

const props = defineProps<{
  src: string;
  mode?: "lit" | "matcap";
  diffuse?: string;
}>();
const mode = props.mode ?? "lit";
const label =
  mode === "matcap"
    ? "Modèle 3D gris, rendu matcap"
    : "Modèle 3D en rotation, rendu avec Radiance";

const canvas = ref<HTMLCanvasElement | null>(null);
let renderer: ReturnType<typeof glCanvas> | null = null;

const { $nav, $page } = useSlideContext();
const active = computed(
  () => $nav.value.currentSlideNo === $page.value && !showOverview.value,
);
watch(active, (on) => (on ? renderer?.play() : renderer?.pause()));

// Models are normalized to the same world height so one fixed camera frames
// both the alpaca and the duck.
const TARGET_HEIGHT = 5.43;

const FOV = (20 * Math.PI) / 180;
const EYE: Vec3 = [0, 0, 20];
const TARGET: Vec3 = [0, 0.06, 0];
const SPEED = 0.00032; // radians per millisecond
const START_ANGLE = 0.7;

// Textured materials often omit Kd, so the fallback tint must be white.
const DEFAULT_COLOR: Vec3 = [1, 1, 1];
const WHITE = createFloatDataTexture(new Float32Array([1, 1, 1, 1]));

const vertex = /* glsl */ `
  in vec3 aPos;
  in vec3 aNormal;
  in vec3 aColor;
  in vec2 aUV;

  uniform mat4 uViewProj;
  uniform float uAngle;

  out vec3 vNormal;
  out vec3 vColor;
  out vec2 vUv;

  void main() {
    float c = cos(uAngle);
    float s = sin(uAngle);
    vec3 position = vec3(c * aPos.x + s * aPos.z, aPos.y, -s * aPos.x + c * aPos.z);
    vec3 normal = vec3(c * aNormal.x + s * aNormal.z, aNormal.y, -s * aNormal.x + c * aNormal.z);

    vNormal = normal;
    vColor = aColor;
    vUv = aUV;
    gl_Position = uViewProj * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  in vec3 vNormal;
  in vec3 vColor;
  in vec2 vUv;

  uniform float uMode;
  uniform mat3 uViewRotation;
  uniform sampler2D uDiffuse;
  uniform float uHasDiffuse;

  out vec4 outColor;

  const vec3 KEY_DIR = normalize(vec3(-0.5, 0.75, 0.55));
  const vec3 KEY_COLOR = vec3(1.0, 0.97, 0.92) * 2.7;
  const vec3 RIM_DIR = normalize(vec3(0.7, 0.35, -0.6));
  const vec3 RIM_COLOR = vec3(0.78, 0.87, 1.0) * 1.5;
  const vec3 FILL_DIR = normalize(vec3(0.2, -0.3, 0.9));
  const vec3 FILL_COLOR = vec3(0.62, 0.76, 1.0) * 0.5;

  vec3 light(vec3 N, vec3 L, vec3 color, vec3 albedo) {
    float ndl = max(dot(N, L), 0.0);
    return albedo / 3.14159 * color * ndl;
  }

  // Grey matcap: a studio-lit sphere looked up by the view-space normal.
  vec3 matcap(vec3 n) {
    float up = n.y * 0.5 + 0.5;
    vec3 base = mix(vec3(0.05, 0.05, 0.055), vec3(0.55, 0.56, 0.58), up);
    float key = smoothstep(0.7, 0.0, distance(n.xy, vec2(-0.34, 0.4)));
    float bounce = smoothstep(0.8, 0.1, distance(n.xy, vec2(0.4, -0.35)));
    float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);
    return base + key * 0.45 + bounce * 0.08 + rim * 0.18;
  }

  void main() {
    vec3 N = normalize(vNormal);

    if (uMode > 0.5) {
      outColor = vec4(matcap(uViewRotation * N), 1.0);
      return;
    }

    vec3 albedo = uHasDiffuse > 0.5 ? texture(uDiffuse, vUv).rgb : vColor;
    vec3 color = albedo * mix(vec3(0.14, 0.17, 0.24), vec3(0.55, 0.63, 0.78), N.y * 0.5 + 0.5);
    color += light(N, KEY_DIR, KEY_COLOR, albedo);
    color += light(N, RIM_DIR, RIM_COLOR, albedo);
    color += light(N, FILL_DIR, FILL_COLOR, albedo);

    outColor = vec4(color, 1.0);
  }
`;

function parseMtl(text: string) {
  const materials = new Map<string, Vec3>();
  let diffuseMap = "";
  let current = "";
  for (const line of text.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "newmtl") current = parts[1];
    else if (parts[0] === "Kd" && current) {
      materials.set(current, [
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
      ]);
    } else if (parts[0] === "map_Kd") {
      diffuseMap = parts[parts.length - 1];
    }
  }
  return { materials, diffuseMap };
}

// The models are small, so a tiny fan triangulation of the OBJ is all we need:
// no loader dependency, and normals/UVs are already exported.
function buildModel(text: string, materials: Map<string, Vec3>) {
  const verts: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const faces: Array<{
    v: number[];
    t: number[];
    n: number[];
    color: Vec3;
  }> = [];
  let color = DEFAULT_COLOR;

  for (const line of text.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      verts.push(Number(parts[1]), Number(parts[2]), Number(parts[3]));
    } else if (parts[0] === "vn") {
      normals.push(Number(parts[1]), Number(parts[2]), Number(parts[3]));
    } else if (parts[0] === "vt") {
      uvs.push(Number(parts[1]), Number(parts[2]));
    } else if (parts[0] === "usemtl") {
      color = materials.get(parts[1]) ?? DEFAULT_COLOR;
    } else if (parts[0] === "f") {
      const v: number[] = [];
      const t: number[] = [];
      const n: number[] = [];
      for (const part of parts.slice(1)) {
        const [vi, ti, ni] = part.split("/");
        v.push(Number(vi) - 1);
        t.push(ti ? Number(ti) - 1 : -1);
        n.push(ni ? Number(ni) - 1 : -1);
      }
      faces.push({ v, t, n, color });
    }
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < verts.length; i += 3) {
    minX = Math.min(minX, verts[i]);
    maxX = Math.max(maxX, verts[i]);
    minY = Math.min(minY, verts[i + 1]);
    maxY = Math.max(maxY, verts[i + 1]);
    minZ = Math.min(minZ, verts[i + 2]);
    maxZ = Math.max(maxZ, verts[i + 2]);
  }
  const center: Vec3 = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ];
  const scale = TARGET_HEIGHT / (maxY - minY);

  const positions: number[] = [];
  const normalData: number[] = [];
  const colors: number[] = [];
  const uvData: number[] = [];

  const push = (v: number, t: number, n: number, c: Vec3) => {
    positions.push(
      (verts[v * 3] - center[0]) * scale,
      (verts[v * 3 + 1] - center[1]) * scale,
      (verts[v * 3 + 2] - center[2]) * scale,
    );
    if (n >= 0) normalData.push(normals[n * 3], normals[n * 3 + 1], normals[n * 3 + 2]);
    else normalData.push(0, 1, 0);
    if (t >= 0) uvData.push(uvs[t * 2], uvs[t * 2 + 1]);
    else uvData.push(0, 0);
    colors.push(...c);
  };

  for (const face of faces) {
    for (let i = 1; i < face.v.length - 1; i++) {
      push(face.v[0], face.t[0], face.n[0], face.color);
      push(face.v[i], face.t[i], face.n[i], face.color);
      push(face.v[i + 1], face.t[i + 1], face.n[i + 1], face.color);
    }
  }

  return { positions, normals: normalData, colors, uvs: uvData };
}

// The camera never moves, so the view matrix is computed once.
const VIEW = mat4.lookAt(mat4.create(), EYE, TARGET, [0, 1, 0]);
const VIEW_ROTATION = mat3.fromMat4(mat3.create(), VIEW);

function viewProjection(aspect: number) {
  const projection = mat4.perspective(mat4.create(), FOV, aspect, 0.1, 100);
  return mat4.multiply(mat4.create(), projection, VIEW);
}

async function init() {
  const el = canvas.value;
  if (!el || renderer) return;

  const obj = await fetch(props.src).then((response) => response.text());
  const dir = props.src.slice(0, props.src.lastIndexOf("/") + 1);
  const mtlName = obj.match(/^mtllib\s+(.+)$/m)?.[1]?.trim();
  const mtl = mtlName
    ? await fetch(dir + mtlName).then((response) => response.text())
    : "";

  const { materials, diffuseMap } = parseMtl(mtl);
  const model = buildModel(obj, materials);
  const mapUrl = props.diffuse ?? (diffuseMap ? dir + diffuseMap : "");
  const diffuse = mapUrl
    ? await loadTexture(mapUrl, { colorSpace: "srgb" })
    : null;
  if (!el.isConnected) return;

  renderer = glCanvas({
    canvas: el,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    renderMode: "continuous",
    immediate: false,
    vertex,
    fragment,
    attributes: {
      aPos: { size: 3, data: new Float32Array(model.positions) },
      aNormal: { size: 3, data: new Float32Array(model.normals) },
      aColor: { size: 3, data: new Float32Array(model.colors) },
      aUV: { size: 2, data: new Float32Array(model.uvs) },
    },
    uniforms: {
      uAngle: ({ time }) => START_ANGLE + time * SPEED,
      uMode: { lit: 0, matcap: 1 }[mode],
      uViewRotation: VIEW_ROTATION,
      uDiffuse: diffuse ?? WHITE,
      uHasDiffuse: diffuse ? 1 : 0,
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
    postEffects: [
      mode === "lit"
        ? acesToneMapping({ exposure: 1.15 })
        : linearToneMapping(),
    ],
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
    class="model-canvas"
    role="img"
    :aria-label="label"
  />
</template>

<style scoped>
.model-canvas {
  display: block;
  width: min(1100px, 100%);
  aspect-ratio: 16 / 9;
}
</style>
