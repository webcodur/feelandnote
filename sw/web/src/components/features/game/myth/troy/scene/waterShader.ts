/*
  파일명: components/features/game/myth/troy/scene/waterShader.ts
  기능: 물 면 셰이더
  책임: 잔물결 법선으로 하늘을 비추고(프레넬), 해·달의 반사와 잔 반짝임을 얹고, 뭍 가까이 흰 거품 띠를 그린다.
        판 가장자리 물 단면(aWall)은 짙은 물빛으로 칠한다. 안개·톤 매핑·색 공간은 three 조각을 그대로 쓴다.
*/ // ------------------------------
import { Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from "three";
import { WATER } from "./palette";

const VERT = /* glsl */ `
uniform float uTime;
attribute float aShore;
attribute float aDeep;
attribute float aWall;
varying vec3 vW;
varying float vShore;
varying float vDeep;
varying float vWall;
#include <fog_pars_vertex>
void main() {
  vec3 p = position;
  float w = sin(p.x * 2.1 + uTime * 1.2) * 0.5 + sin(p.z * 2.7 - uTime * 0.9) * 0.5;
  p.y += w * 0.007 * (1.0 - aWall) * smoothstep(0.0, 0.35, aShore);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vShore = aShore;
  vDeep = aDeep;
  vWall = aWall;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeepColor;
uniform vec3 uFoam;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uTint;
uniform float uGlint;
varying vec3 vW;
varying float vShore;
varying float vDeep;
varying float vWall;
#include <fog_pars_fragment>
float wHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  float t = uTime;
  vec2 q = vW.xz;
  vec2 g = vec2(
    cos(q.x * 3.1 + t * 1.3) + 0.6 * cos((q.x + q.y) * 5.7 - t * 1.9) + 0.3 * cos(q.x * 11.0 - q.y * 7.0 + t * 2.7),
    cos(q.y * 3.5 - t * 1.1) + 0.6 * cos((q.x - q.y) * 4.9 + t * 1.6) + 0.3 * cos(q.y * 10.0 + q.x * 6.0 - t * 2.3)
  );
  vec3 n = normalize(vec3(-g.x * 0.055, 1.0, -g.y * 0.055));
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.0);
  vec3 col = mix(uShallow, uDeepColor, vDeep) * uTint;
  col = mix(col, uSky, clamp(fres * 0.7, 0.0, 0.55));
  vec3 H = normalize(uSunDir + V);
  float spec = pow(clamp(dot(n, H), 0.0, 1.0), 220.0) * 1.6;
  float sparkle = smoothstep(0.86, 1.0, wNoise(q * 8.0 + vec2(t * 0.6, -t * 0.45)))
    * smoothstep(0.8, 1.0, wNoise(q * 21.0 - vec2(t * 1.2, t * 0.35)));
  col += uSunColor * (spec + sparkle * 0.9) * uGlint * (1.0 - vWall);
  float edge = vShore + (wNoise(q * 6.0 + t * 0.25) - 0.5) * 0.08;
  float swell = 0.5 + 0.5 * sin(t * 1.3 - vShore * 16.0);
  float foam = 1.0 - smoothstep(0.02, 0.12, edge);
  foam += (1.0 - smoothstep(0.1, 0.24, edge)) * swell * 0.5 * step(0.45, wNoise(q * 10.0 + t * 0.2));
  foam = clamp(foam, 0.0, 1.0) * (1.0 - vWall);
  col = mix(col, uFoam * uTint, foam * 0.8);
  float alpha = mix(0.6, 0.84, vDeep) + fres * 0.12 + foam * 0.3;
  col = mix(col, uDeepColor * uTint * 0.75, vWall * 0.55);
  alpha = mix(alpha, 0.82, vWall);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createWaterMaterial(): ShaderMaterial {
  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    {
      uTime: { value: 0 },
      uShallow: { value: new Color(WATER.shallow) },
      uDeepColor: { value: new Color(WATER.deep) },
      uFoam: { value: new Color(WATER.foam) },
      uSky: { value: new Color() },
      uSunDir: { value: new Vector3(0, 1, 0) },
      uSunColor: { value: new Color() },
      uTint: { value: new Color(1, 1, 1) },
      uGlint: { value: 1 },
    },
  ]);
  return new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: DoubleSide,
  });
}
