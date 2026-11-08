<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";

type Mat4 = Float32Array;
type Vec3 = [number, number, number];

interface Cube {
  position: Vec3;
  size: number;
  color: Vec3;
  speed: [number, number];
  phase: number;
}

const PALETTE: Vec3[] = [
  [0.11, 0.31, 0.85],
  [0.15, 0.39, 0.92],
  [0.23, 0.51, 0.96],
  [0.38, 0.65, 0.98],
  [0.39, 0.4, 0.95],
  [0.05, 0.65, 0.91],
];

function makeCubes(): Cube[] {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 15 }, (_, i) => ({
    position: [
      (random() - 0.5) * 8.5,
      (random() - 0.5) * 4,
      (random() - 0.5) * 3.5,
    ],
    size: 0.55 + random() * 0.5,
    color: PALETTE[i % PALETTE.length],
    speed: [0.15 + random() * 0.35, 0.1 + random() * 0.3],
    phase: random() * Math.PI * 2,
  }));
}

const cubes = makeCubes();

const canvas = ref<HTMLCanvasElement | null>(null);
const cursor = ref("default");

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let uniforms: Record<string, WebGLUniformLocation> = {};
let vertexBuffer: WebGLBuffer | null = null;
let indexBuffer: WebGLBuffer | null = null;
let indexCount = 0;
let pickFbo: WebGLFramebuffer | null = null;
let pickTexture: WebGLTexture | null = null;
let pickDepth: WebGLRenderbuffer | null = null;
let hovered = -1;
let raf = 0;
let observer: ResizeObserver | null = null;

const identity = () =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fov / 2);
  const range = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * range, -1,
    0, 0, 2 * far * near * range, 0,
  ]);
}

function translation(x: number, y: number, z: number): Mat4 {
  const out = identity();
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

function rotationX(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function rotationY(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function scale(value: number): Mat4 {
  const out = identity();
  out[0] = out[5] = out[10] = value;
  return out;
}

function compile(type: number, source: string) {
  const shader = gl!.createShader(type)!;
  gl!.shaderSource(shader, source);
  gl!.compileShader(shader);
  return shader;
}

function createProgram() {
  const program = gl!.createProgram()!;
  gl!.attachShader(program, compile(gl!.VERTEX_SHADER, VERTEX_SHADER));
  gl!.attachShader(program, compile(gl!.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl!.linkProgram(program);
  gl!.useProgram(program);
  return program;
}

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vNormal;

void main() {
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec3 uColor;
uniform float uPicking;
varying vec3 vNormal;

void main() {
  if (uPicking > 0.5) {
    gl_FragColor = vec4(uColor, 1.0);
    return;
  }
  vec3 n = normalize(vNormal);
  float shade = 0.5 + 0.5 * max(dot(n, normalize(vec3(0.4, 0.8, 0.6))), 0.0);
  gl_FragColor = vec4(uColor * shade, 1.0);
}
`;

const FACES: { normal: Vec3; corners: Vec3[] }[] = [
  { normal: [0, 0, 1], corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { normal: [0, 0, -1], corners: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
  { normal: [1, 0, 0], corners: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
  { normal: [-1, 0, 0], corners: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
  { normal: [0, 1, 0], corners: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
  { normal: [0, -1, 0], corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
];

function createGeometry() {
  const vertices: number[] = [];
  const indices: number[] = [];

  FACES.forEach((face, faceIndex) => {
    face.corners.forEach((corner) => {
      vertices.push(...corner, ...face.normal);
    });
    const offset = faceIndex * 4;
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  });

  vertexBuffer = gl!.createBuffer();
  gl!.bindBuffer(gl!.ARRAY_BUFFER, vertexBuffer);
  gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(vertices), gl!.STATIC_DRAW);

  indexBuffer = gl!.createBuffer();
  gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl!.STATIC_DRAW);
  indexCount = indices.length;

  const position = gl!.getAttribLocation(program!, "aPosition");
  gl!.enableVertexAttribArray(position);
  gl!.vertexAttribPointer(position, 3, gl!.FLOAT, false, 24, 0);

  const normal = gl!.getAttribLocation(program!, "aNormal");
  gl!.enableVertexAttribArray(normal);
  gl!.vertexAttribPointer(normal, 3, gl!.FLOAT, false, 24, 12);
}

function createPickTarget() {
  const element = canvas.value!;
  const width = element.width;
  const height = element.height;

  pickTexture = gl!.createTexture();
  gl!.bindTexture(gl!.TEXTURE_2D, pickTexture);
  gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, width, height, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);

  pickFbo = gl!.createFramebuffer();
  gl!.bindFramebuffer(gl!.FRAMEBUFFER, pickFbo);
  gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, pickTexture, 0);

  pickDepth = gl!.createRenderbuffer();
  gl!.bindRenderbuffer(gl!.RENDERBUFFER, pickDepth);
  gl!.renderbufferStorage(gl!.RENDERBUFFER, gl!.DEPTH_COMPONENT16, width, height);
  gl!.framebufferRenderbuffer(gl!.FRAMEBUFFER, gl!.DEPTH_ATTACHMENT, gl!.RENDERBUFFER, pickDepth);

  gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
}

function render(picking: boolean) {
  const element = canvas.value;
  if (!gl || !program || !element) return;

  gl.viewport(0, 0, element.width, element.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, picking ? pickFbo : null);
  gl.clearColor(0, 0, 0, picking ? 1 : 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  const projection = perspective(Math.PI / 4, element.width / element.height, 0.1, 50);
  const view = multiply(translation(0, 0, -9), multiply(rotationX(-0.15), rotationY(0.35)));
  const time = performance.now() / 1000;

  gl.uniformMatrix4fv(uniforms.uProjection, false, projection);
  gl.uniformMatrix4fv(uniforms.uView, false, view);
  gl.uniform1f(uniforms.uPicking, picking ? 1 : 0);

  cubes.forEach((cube, index) => {
    const lift = index === hovered ? 1.18 : 1;
    const model = multiply(
      translation(...cube.position),
      multiply(
        rotationY(time * cube.speed[0] + cube.phase),
        multiply(rotationX(time * cube.speed[1] + cube.phase * 1.7), scale(cube.size * lift)),
      ),
    );

    gl.uniformMatrix4fv(uniforms.uModel, false, model);
    if (picking) gl.uniform3f(uniforms.uColor, (index + 1) / 255, 0, 0);
    else if (index === hovered) gl.uniform3f(uniforms.uColor, 0.96, 0.82, 0.04);
    else gl.uniform3f(uniforms.uColor, ...cube.color);

    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  });
}

function onPointerMove(event: PointerEvent) {
  const element = canvas.value;
  if (!gl || !element) return;

  render(true);

  const sx = element.width / element.clientWidth;
  const sy = element.height / element.clientHeight;
  const x = Math.floor(event.offsetX * sx);
  const y = Math.floor((element.clientHeight - 1 - event.offsetY) * sy);
  const pixel = new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  const id = pixel[0] - 1;
  hovered = id >= 0 && id < cubes.length ? id : -1;
  cursor.value = hovered >= 0 ? "pointer" : "default";
}

function onPointerLeave() {
  hovered = -1;
  cursor.value = "default";
}

function resize() {
  const element = canvas.value;
  if (!gl || !element) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  element.width = Math.round(element.clientWidth * dpr);
  element.height = Math.round(element.clientHeight * dpr);

  if (pickFbo) gl.deleteFramebuffer(pickFbo);
  if (pickTexture) gl.deleteTexture(pickTexture);
  if (pickDepth) gl.deleteRenderbuffer(pickDepth);
  createPickTarget();
  render(false);
}

onMounted(() => {
  const element = canvas.value;
  if (!element) return;

  gl = element.getContext("webgl", { antialias: false, alpha: true });
  if (!gl) return;

  program = createProgram();
  uniforms = {
    uProjection: gl.getUniformLocation(program, "uProjection")!,
    uView: gl.getUniformLocation(program, "uView")!,
    uModel: gl.getUniformLocation(program, "uModel")!,
    uColor: gl.getUniformLocation(program, "uColor")!,
    uPicking: gl.getUniformLocation(program, "uPicking")!,
  };

  createGeometry();

  observer = new ResizeObserver(resize);
  observer.observe(element);
  resize();

  const frame = () => {
    render(false);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  observer?.disconnect();
  if (!gl) return;
  gl.deleteFramebuffer(pickFbo);
  gl.deleteTexture(pickTexture);
  gl.deleteRenderbuffer(pickDepth);
  gl.deleteBuffer(vertexBuffer);
  gl.deleteBuffer(indexBuffer);
  gl.deleteProgram(program);
});
</script>

<template>
  <canvas
    ref="canvas"
    class="canvas-frame cubes-canvas"
    role="img"
    aria-label="Cubes 3D rendus en WebGL"
    :style="{ cursor }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  />
</template>

<style scoped>
.cubes-canvas {
  aspect-ratio: 16 / 9;
}
</style>
