/*
  파일명: components/features/game/myth/troy/scene/tileShader.ts
  기능: 칸 기둥 셰이더 덧대기
  책임: MeshStandardMaterial에 끼워 윗면은 지형색(칸마다 흔든 색 + 풀·모래·흙·돌 판 무늬)으로,
        옆면은 흙 층 줄무늬·돌 쌓기·바위로 칠한다. 빛·그림자·안개는 three 기본 셰이더가 그대로 맡는다.
*/ // ------------------------------
import { Color, MeshStandardMaterial, Vector2 } from "three";
import { SOIL } from "./palette";

// 칸마다 받는 값: aTop(윗면 높이) · aMeta.x(옆면 0 흙 1 돌 쌓기 2 바위) · aMeta.y(윗면 0 없음 1 풀 2 모래 3 흙 4 돌 판)
const VERT_HEAD = /* glsl */ `
attribute float aTop;
attribute vec2 aMeta;
varying vec3 vTilePos;
varying float vTileNY;
varying float vTileTop;
varying vec2 vTileMeta;
`;

const VERT_BODY = /* glsl */ `
vec4 tileWorld = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
vTilePos = tileWorld.xyz;
vTileNY = normal.y;
vTileTop = aTop;
vTileMeta = aMeta;
`;

const FRAG_HEAD = /* glsl */ `
uniform vec3 uSoilTop;
uniform vec3 uSoilClay;
uniform vec3 uSoilLoam;
uniform vec3 uSoilDeep;
uniform vec3 uPebble;
uniform vec3 uMortar;
uniform vec2 uGridOffset;
varying vec3 vTilePos;
varying float vTileNY;
varying float vTileTop;
varying vec2 vTileMeta;
float tHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1.0, 0.0)), f.x), mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 tileTop(vec3 base) {
  vec2 p = vTilePos.xz;
  float pat = vTileMeta.y;
  float n = tNoise(p * 2.3) * 0.6 + tNoise(p * 7.3) * 0.4;
  vec3 c = base * (0.97 + 0.06 * n);
  if (pat > 0.5 && pat < 1.5) {
    c = base * (0.88 + 0.22 * n);
    c = mix(c, c * vec3(1.1, 1.12, 0.82), step(0.9, tHash(floor(p * 11.0))) * 0.7);
  } else if (pat > 1.5 && pat < 2.5) {
    c = base * (0.95 + 0.035 * sin(p.x * 17.0 + p.y * 6.0 + n * 5.0) + 0.04 * n);
  } else if (pat > 2.5 && pat < 3.5) {
    c = base * (0.9 + 0.16 * n) * (1.0 - 0.12 * step(0.9, tHash(floor(p * 15.0))));
  } else if (pat > 3.5) {
    vec2 g = (p + uGridOffset) * 3.0;
    float row = floor(g.y);
    g.x += mod(row, 2.0) * 0.5;
    vec2 f = fract(g);
    float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    c = base * (0.92 + 0.12 * tHash(floor(g))) * (1.0 - 0.26 * (1.0 - smoothstep(0.015, 0.06, edge)));
  }
  return c;
}
vec3 tileSide(vec3 base) {
  float depth = vTileTop - vTilePos.y;
  float along = vTilePos.x + vTilePos.z;
  float wy = vTilePos.y + 0.025 * sin(along * 4.1) + 0.014 * sin(along * 9.3 + 1.7);
  float band = floor((wy + 0.6) / 0.12);
  vec3 soil = mix(uSoilClay, uSoilLoam, tHash(vec2(band, 3.1)));
  soil = mix(uSoilTop, soil, smoothstep(0.06, 0.2, depth));
  soil = mix(soil, uSoilDeep, smoothstep(-0.1, -0.62, wy) * 0.7);
  soil *= 0.9 + 0.2 * tNoise(vec2(along * 6.0, wy * 14.0));
  soil = mix(soil, uPebble, step(0.94, tHash(floor(vec2(along, wy) * 26.0))) * 0.6);
  vec3 c = soil;
  float mat = vTileMeta.x;
  if (mat > 0.5 && mat < 1.5 && vTilePos.y > -0.02) {
    float by = vTilePos.y / 0.155;
    float row = floor(by);
    float bx = along / 0.31 + mod(row, 2.0) * 0.5;
    vec2 f = fract(vec2(bx, by));
    float e = min(min(f.x, 1.0 - f.x) * 2.0, min(f.y, 1.0 - f.y));
    vec3 block = base * 0.86 * (0.84 + 0.2 * tHash(vec2(floor(bx), row))) * (0.94 + 0.08 * tNoise(vec2(along, vTilePos.y) * 9.0));
    c = mix(uMortar, block, smoothstep(0.05, 0.12, e));
  } else if (mat > 1.5) {
    c = mix(c, base * 0.7 * (0.82 + 0.3 * tNoise(vec2(along * 3.0, wy * 5.0))), 0.5);
  }
  float lip = 1.0 - smoothstep(0.035, 0.075, depth);
  return mix(c, base * 0.8, lip);
}
`;

const FRAG_COLOR = /* glsl */ `
vec3 tileBase = vColor.rgb;
float topMask = smoothstep(0.45, 0.85, vTileNY);
diffuseColor.rgb = mix(tileSide(tileBase), tileTop(tileBase), topMask);
`;

// 판마다 돌 판 이음새가 칸 경계에 맞도록 옮기는 값
export interface TileMaterial {
  material: MeshStandardMaterial;
  gridOffset: Vector2;
}

export function createTileMaterial(): TileMaterial {
  const gridOffset = new Vector2();
  const material = new MeshStandardMaterial({ roughness: 0.93, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSoilTop = { value: new Color(SOIL.top) };
    shader.uniforms.uSoilClay = { value: new Color(SOIL.clay) };
    shader.uniforms.uSoilLoam = { value: new Color(SOIL.loam) };
    shader.uniforms.uSoilDeep = { value: new Color(SOIL.deep) };
    shader.uniforms.uPebble = { value: new Color(SOIL.pebble) };
    shader.uniforms.uMortar = { value: new Color(SOIL.mortar) };
    shader.uniforms.uGridOffset = { value: gridOffset };
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERT_BODY}`);
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader.replace("#include <color_fragment>", FRAG_COLOR);
  };
  material.customProgramCacheKey = () => "troy-tile-1";
  return { material, gridOffset };
}
