<!-- The MIT License (MIT)

Copyright (c) 2026 Abdughafur Khujzoda (https://codepen.io/editor/Abdughafur-Khujzoda/pen/01a1a59a-ef98-76f4-bbb3-1ecefb3bf32f)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. -->

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { onSlideEnter, onSlideLeave } from "@slidev/client";
import * as THREE from "three";

type Ball = {
  id: number;
  radius: number;
  mass: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>;
};

const canvas = ref<HTMLCanvasElement | null>(null);

const PALETTE = {
  pastel: new THREE.Color("#ECEFFF"),
  light: new THREE.Color("#A8C1FF"),
  medium: new THREE.Color("#2F69FF"),
  deep: new THREE.Color("#0A33BF"),
  glass: new THREE.Color("#4D80FF"),
};

const params = {
  mouseRepelForce: 0.04,
  mouseRepelRadius: 4.4,
  damping: 0.91,
  centerAttractForce: 0.0035,
  bounciness: 0.02,
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let geometry: THREE.SphereGeometry;
let balls: Ball[] = [];
let startTime = 0;
let lastFrame = 0;
let raf = 0;
let running = false;
let observer: ResizeObserver | null = null;
let viewportWidth = 10;
let viewportHeight = 6;

const mousePos = { x: 99, y: 99, isDown: false };
const mouseWorld = new THREE.Vector3();
const prevMouseWorld = new THREE.Vector3(999, 999, 999);
const mouseProj = new THREE.Vector3();

const collideDiff = new THREE.Vector3();
const relVel = new THREE.Vector3();
const diff = new THREE.Vector3();

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function updateFrustumBounds() {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  viewportHeight = 2 * Math.tan(fov / 2) * camera.position.z;
  viewportWidth =
    viewportHeight * (canvas.value!.clientWidth / canvas.value!.clientHeight);
}

function scatterFar() {
  const R = Math.max(viewportWidth, viewportHeight) * 1.5;
  for (const b of balls) {
    const a = Math.random() * Math.PI * 2;
    const px = Math.cos(a) * R * 1.25;
    const py = Math.sin(a) * R * 0.85;
    const pz = (Math.random() - 0.5) * 4;
    b.position.set(px, py, pz);
    b.mesh.position.copy(b.position);
    b.velocity
      .set(-px, -py, -pz)
      .normalize()
      .multiplyScalar(0.08 + Math.random() * 0.05);
  }
}

function createBall(material: THREE.MeshPhysicalMaterial) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function initScene() {
  const el = canvas.value;
  // Slidev mounts the slide while it is still hidden, so the WebGL renderer
  // must wait for a real size instead of initializing at 0x0.
  if (!el || renderer || !el.clientWidth || !el.clientHeight) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    38,
    el.clientWidth / el.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 11);

  renderer = new THREE.WebGLRenderer({
    canvas: el,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.transmissionResolutionScale = 1;
  renderer.setSize(el.clientWidth, el.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene.add(new THREE.HemisphereLight(0xffffff, PALETTE.medium, 1.6));

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-6, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    near: 0.5,
    far: 30,
    left: -8,
    right: 8,
    top: 8,
    bottom: -8,
  });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0003;
  key.shadow.radius = 12;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffffff, 1.25);
  rim.position.set(8, 7, -8);
  scene.add(rim);

  const front = new THREE.DirectionalLight(0xffffff, 0.4);
  front.position.set(0, 0, 11);
  scene.add(front);

  const side = new THREE.DirectionalLight(0xffffff, 0.3);
  side.position.set(-9, -2, 4);
  scene.add(side);

  updateFrustumBounds();

  geometry = new THREE.SphereGeometry(1, 40, 40);
  const count = 96;

  for (let i = 0; i < count; i++) {
    let radius = 0.33;
    const r = Math.random();
    if (r < 0.3) radius = 0.27 + Math.random() * 0.12;
    else if (r < 0.8) radius = 0.42 + Math.random() * 0.18;
    else radius = 0.66 + Math.random() * 0.21;

    let chosen = PALETTE.medium;
    const isGlass = Math.random() < 0.22;
    let material: THREE.MeshPhysicalMaterial;

    if (isGlass) {
      material = new THREE.MeshPhysicalMaterial({
        color: PALETTE.glass,
        roughness: 0.08,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transmission: 0.95,
        ior: 1.485,
        thickness: 2.2,
        specularColor: new THREE.Color("#ffffff"),
        specularIntensity: 1,
        attenuationColor: PALETTE.pastel,
        attenuationDistance: 1,
        emissive: PALETTE.glass,
        emissiveIntensity: 0.12,
        transparent: true,
      });
    } else {
      const cr = Math.random();
      if (cr < 0.25) chosen = PALETTE.pastel;
      else if (cr < 0.55) chosen = PALETTE.light;
      else if (cr < 0.85) chosen = PALETTE.medium;
      else chosen = PALETTE.deep;

      material = new THREE.MeshPhysicalMaterial({
        color: chosen,
        roughness: 0.44,
        metalness: 0,
        clearcoat: 0.24,
        clearcoatRoughness: 0.35,
        emissive: chosen,
        emissiveIntensity: 0.08,
        transparent: true,
      });
    }

    const mesh = createBall(material);
    mesh.scale.setScalar(radius);
    balls.push({
      id: i,
      radius,
      mass: Math.pow(radius, 3),
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      mesh,
    });
  }

  scatterFar();
  startTime = performance.now();
  start();
}

function updateMouse3D() {
  mouseProj.set(mousePos.x, mousePos.y, 0.5).unproject(camera);
  const dir = mouseProj.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  mouseWorld.copy(camera.position).add(dir.multiplyScalar(distance));
}

function animate(now: number) {
  raf = requestAnimationFrame(animate);
  if (!canvas.value?.clientWidth || !canvas.value?.clientHeight) return;
  const time = (now - startTime) / 1000;
  const scale = lastFrame ? Math.min((now - lastFrame) / (1000 / 60), 3) : 1;
  lastFrame = now;
  updateMouse3D();

  const entranceT = easeOutCubic(clamp01(time / 2.2));
  const attractionBoost = lerp(7.5, 1, entranceT);

  const interacting =
    Math.abs(mousePos.x) < 0.99 || Math.abs(mousePos.y) < 0.99;
  let mouseSpeed = interacting
    ? mouseWorld.distanceTo(prevMouseWorld) / scale
    : 0;
  if (mouseSpeed > 3) mouseSpeed = 3;
  prevMouseWorld.copy(mouseWorld);

  for (const b of balls) {
    // Gentle float so the cluster never looks frozen.
    b.velocity.x +=
      Math.sin(time * 0.4 + b.id * 1.5) * 0.0004 * b.radius * scale;
    b.velocity.y +=
      Math.cos(time * 0.5 + b.id * 1.2) * 0.0004 * b.radius * scale;
    b.velocity.z += Math.sin(time * 0.35 + b.id) * 0.0001 * scale;

    const cluster = params.centerAttractForce * attractionBoost;
    b.velocity.x += (0 - b.position.x) * cluster * 0.38 * scale;
    b.velocity.y += (0 - b.position.y) * cluster * 1.85 * scale;
    b.velocity.z += (0 - b.position.z) * cluster * 1.8 * scale;

    if (interacting && (mouseSpeed > 0.01 || mousePos.isDown)) {
      diff.subVectors(b.position, mouseWorld);
      const dist = diff.length();
      const rad = mousePos.isDown
        ? params.mouseRepelRadius * 1.4
        : params.mouseRepelRadius;
      const force = mousePos.isDown
        ? params.mouseRepelForce * 1.7
        : params.mouseRepelForce;
      if (dist < rad && dist > 0.0001) {
        const ratio = dist / rad;
        const falloff = 1 - ratio * ratio * (3 - 2 * ratio);
        const push = falloff * force * (1 + mouseSpeed * 3.2);
        diff.normalize();
        diff.z *= 0.12;
        diff.normalize();
        b.velocity.addScaledVector(diff, push * scale);
      }
    }

    b.velocity.multiplyScalar(Math.pow(params.damping, scale));
    b.position.addScaledVector(b.velocity, scale);
  }

  const collideScale = 0.28 * scale;
  for (let step = 0; step < 4; step++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        collideDiff.subVectors(b.position, a.position);
        const dist = collideDiff.length();
        const min = a.radius + b.radius;
        if (dist < min && dist > 0.001) {
          const overlap = min - dist;
          collideDiff.multiplyScalar(1 / dist);
          const total = a.mass + b.mass;
          const r1 = b.mass / total;
          const r2 = a.mass / total;
          a.position.addScaledVector(collideDiff, -overlap * r1 * collideScale);
          b.position.addScaledVector(collideDiff, overlap * r2 * collideScale);
          relVel.subVectors(b.velocity, a.velocity);
          const along = relVel.dot(collideDiff);
          if (along < -0.0001) {
            const impulse =
              ((-(1 + params.bounciness) * along) / (1 / a.mass + 1 / b.mass)) *
              scale;
            a.velocity.addScaledVector(collideDiff, -impulse / a.mass);
            b.velocity.addScaledVector(collideDiff, impulse / b.mass);
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
    const r = b.radius;
    if (b.position.x < -xBound - r) {
      b.position.x = -xBound - r;
      b.velocity.x *= -0.3;
    } else if (b.position.x > xBound + r) {
      b.position.x = xBound + r;
      b.velocity.x *= -0.3;
    }
    if (b.position.y - r < floorY) {
      b.position.y = floorY + r;
      if (b.velocity.y < 0) b.velocity.y = -b.velocity.y * restitution;
    }
    if (b.position.y + r > topY) {
      b.position.y = topY - r;
      if (b.velocity.y > 0) b.velocity.y *= -0.3;
    }
    if (b.position.z < -zBound) {
      b.position.z = -zBound;
      b.velocity.z *= -0.3;
    } else if (b.position.z > zBound) {
      b.position.z = zBound;
      b.velocity.z *= -0.3;
    }
    b.mesh.position.copy(b.position);
  }

  renderer.render(scene, camera);
}

function resize() {
  const el = canvas.value;
  if (!el) return;
  const width = el.clientWidth;
  const height = el.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(width, height, false);
  updateFrustumBounds();
}

function pointerCoords(event: PointerEvent) {
  const el = canvas.value!;
  const rect = el.getBoundingClientRect();
  // Slidev scales the 1920×1080 slide, so normalize against its screen rect.
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  };
}

function onPointerEnter(event: PointerEvent) {
  const p = pointerCoords(event);
  mousePos.x = p.x;
  mousePos.y = p.y;
  updateMouse3D();
  prevMouseWorld.copy(mouseWorld);
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

function start() {
  if (running || !renderer) return;
  running = true;
  lastFrame = 0;
  raf = requestAnimationFrame(animate);
}

function stop() {
  running = false;
  cancelAnimationFrame(raf);
}

onSlideEnter(start);
onSlideLeave(stop);

onMounted(() => {
  const el = canvas.value;
  if (!el) return;
  observer = new ResizeObserver(() => (renderer ? resize() : initScene()));
  observer.observe(el);
  window.addEventListener("pointerup", onPointerUp);
  initScene();
});

onBeforeUnmount(() => {
  stop();
  observer?.disconnect();
  window.removeEventListener("pointerup", onPointerUp);
  if (!renderer) return;
  balls.forEach((b) => b.mesh.material.dispose());
  geometry.dispose();
  renderer.dispose();
});
</script>

<template>
  <div class="balls-slide">
    <canvas
      ref="canvas"
      role="img"
      aria-label="Nuage de sphères bleues interactif"
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
  overflow: hidden;
  background: radial-gradient(
    circle at 50% 46%,
    #fff 0%,
    #eef2ff 36%,
    #d8e3fa 100%
  );
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
