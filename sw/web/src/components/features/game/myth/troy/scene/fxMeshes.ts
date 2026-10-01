/*
  파일명: components/features/game/myth/troy/scene/fxMeshes.ts
  기능: 연출용 빛 도형(빛기둥·충격파 고리·바닥 번쩍임)
  책임: 신 내림·나타남·수준 오름이 쓰는 빛기둥(위로 갈수록 사라지는 더하기 섞기 원통)과, 바닥에 퍼지는 고리·번쩍임 판을 만든다.
        연출이 끝나면 부른 쪽이 dispose로 푼다. 텍스처는 공용이라 풀지 않는다.
*/ // ------------------------------
import {
  AdditiveBlending, Color, CylinderGeometry, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial,
} from "three";
import { glowTexture, ringTexture } from "./fxTextures";

const PILLAR_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PILLAR_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
void main() {
  float fade = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.06, vUv.y);
  float shimmer = 0.75 + 0.25 * sin(vUv.x * 43.98 + uTime * 5.0) * sin(vUv.y * 9.0 - uTime * 7.0);
  gl_FragColor = vec4(uColor * 1.4, fade * shimmer * uOpacity);
  #include <colorspace_fragment>
}
`;

export interface FxMesh {
  mesh: Mesh;
  setOpacity(a: number): void;
  setTime(t: number): void;
  dispose(): void;
}

// 바닥(y=0)에서 height까지 서는 빛기둥
export function lightPillar(color: string, radius: number, height: number): FxMesh {
  const geo = new CylinderGeometry(radius, radius * 1.15, height, 32, 1, true).translate(0, height / 2, 0);
  const mat = new ShaderMaterial({
    vertexShader: PILLAR_VERT, fragmentShader: PILLAR_FRAG, transparent: true, depthWrite: false, side: DoubleSide,
    blending: AdditiveBlending, uniforms: { uColor: { value: new Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
  });
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 10;
  return {
    mesh,
    setOpacity: (a) => { mat.uniforms.uOpacity.value = a; },
    setTime: (t) => { mat.uniforms.uTime.value = t; },
    dispose: () => {
      mesh.removeFromParent();
      geo.dispose();
      mat.dispose();
    },
  };
}

// 바닥에 눕는 판(고리면 충격파, 아니면 번쩍임)
export function floorPlate(color: string, ring: boolean, size = 1): FxMesh {
  const geo = new PlaneGeometry(size, size).rotateX(-Math.PI / 2);
  const mat = new MeshBasicMaterial({
    color: new Color(color), alphaMap: ring ? ringTexture() : glowTexture(), transparent: true, opacity: 0,
    depthWrite: false, blending: AdditiveBlending, toneMapped: false,
  });
  const mesh = new Mesh(geo, mat);
  mesh.renderOrder = 10;
  return {
    mesh,
    setOpacity: (a) => { mat.opacity = a; },
    setTime: () => {},
    dispose: () => {
      mesh.removeFromParent();
      geo.dispose();
      mat.dispose();
    },
  };
}
