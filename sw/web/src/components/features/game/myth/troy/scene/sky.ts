/*
  파일명: components/features/game/myth/troy/scene/sky.ts
  기능: 분위기별 배경과 비침 환경
  책임: 받침 밖을 채우는 세로 그라데이션 배경(띠 무늬가 안 보이게 잡음을 섞는다)과,
        청동·금이 분위기 빛을 비추도록 같은 색의 하늘 구를 PMREM으로 구운 환경 지도를 만든다.
*/ // ------------------------------
import {
  BackSide, CanvasTexture, Color, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, SRGBColorSpace,
  type Texture, type Vector3, type WebGLRenderer, type WebGLRenderTarget,
} from "three";
import type { Mood } from "../engine/types";
import { MOOD_COLORS, SKY_VIGNETTE } from "./palette";

const backgrounds = new Map<Mood, Texture>();

export function skyTexture(mood: Mood): Texture {
  const hit = backgrounds.get(mood);
  if (hit) return hit;
  const c = MOOD_COLORS[mood];
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, c.skyTop);
    g.addColorStop(0.55, c.skyMid);
    g.addColorStop(1, c.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
    // 가장자리를 살짝 눌러 판에 눈이 모이게
    const v = ctx.createRadialGradient(64, 150, 40, 64, 150, 190);
    v.addColorStop(0, SKY_VIGNETTE.center);
    v.addColorStop(1, SKY_VIGNETTE.edge);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 128, 256);
    const img = ctx.getImageData(0, 0, 128, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 3;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  backgrounds.set(mood, tex);
  return tex;
}

const ENV_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ENV_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uGround;
uniform vec3 uSun;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  float y = vDir.y;
  vec3 c = y > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.8, y)) : mix(uMid, uGround, smoothstep(0.0, -0.4, y));
  c += uSun * pow(max(dot(normalize(vDir), uSunDir), 0.0), 24.0) * 3.0;
  gl_FragColor = vec4(c, 1.0);
}
`;

// 분위기 하늘을 구운 비침 지도. 분위기를 바꿀 때마다 한 번 굽는다(수십 ms). 다 쓰면 받은 쪽이 dispose한다
export function buildEnvironment(renderer: WebGLRenderer, mood: Mood, sunDir: Vector3): WebGLRenderTarget {
  const c = MOOD_COLORS[mood];
  const scene = new Scene();
  const geo = new SphereGeometry(10, 32, 16);
  const mat = new ShaderMaterial({
    side: BackSide,
    vertexShader: ENV_VERT,
    fragmentShader: ENV_FRAG,
    uniforms: {
      uTop: { value: new Color(c.skyTop) },
      uMid: { value: new Color(c.skyBottom) },
      uGround: { value: new Color(c.hemiGround) },
      uSun: { value: new Color(c.sun) },
      uSunDir: { value: sunDir.clone().normalize() },
    },
  });
  scene.add(new Mesh(geo, mat));
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0, 0.1, 50);
  pmrem.dispose();
  geo.dispose();
  mat.dispose();
  return target;
}
