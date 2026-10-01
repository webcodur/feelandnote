/*
  파일명: components/features/game/myth/troy/scene/hpBars.ts
  기능: 체력 막대 묶음
  책임: 모든 말의 체력 막대를 카메라를 보는 판 하나(InstancedMesh, 그리기 한 번)로 그린다.
        막대마다 가운데 자리·남은 체력·방금 깎인 몫(빨강)·편 색을 넘기고, 셰이더가 둥근 막대와 테두리를 칠한다.
*/ // ------------------------------
import {
  Color, InstancedBufferAttribute, InstancedMesh, PlaneGeometry, ShaderMaterial, Vector2, type Vector3,
} from "three";
import { PIECE } from "./palette";

const CAPACITY = 64;
const BAR_W = 0.5;
const BAR_H = 0.085;

const VERT = /* glsl */ `
attribute vec3 aCenter;
attribute vec4 aFill;
attribute vec3 aTint;
uniform vec2 uSize;
varying vec2 vUv;
varying vec4 vFill;
varying vec3 vTint;
void main() {
  vUv = uv;
  vFill = aFill;
  vTint = aTint;
  vec4 mv = viewMatrix * vec4(aCenter, 1.0);
  // 기준점이 막대 아래 끝이 되게 반 칸 올린다(화면 기준 위쪽)
  mv.xy += (position.xy + vec2(0.0, 0.5)) * uSize * aFill.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uBack;
uniform vec3 uLag;
uniform vec2 uSize;
varying vec2 vUv;
varying vec4 vFill;
varying vec3 vTint;
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 h = uSize * 0.5 - vec2(uSize.y * 0.5);
  float d = length(max(abs(p) - h, 0.0)) - uSize.y * 0.5;
  if (d > 0.0) discard;
  float inner = smoothstep(-0.012, -0.02, d);
  vec3 col = vUv.x <= vFill.x ? vTint : (vUv.x <= vFill.y ? uLag : uBack);
  col *= 0.86 + 0.28 * smoothstep(0.2, 0.9, vUv.y);
  col = mix(vec3(0.02), col, inner);
  gl_FragColor = vec4(col, vFill.w);
  #include <colorspace_fragment>
}
`;

export class HpBars {
  readonly mesh: InstancedMesh;
  private readonly center = new InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3);
  private readonly fill = new InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4);
  private readonly tint = new InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3);
  private readonly geometry = new PlaneGeometry(1, 1);
  private readonly material: ShaderMaterial;
  private used = 0;

  constructor() {
    this.geometry.setAttribute("aCenter", this.center);
    this.geometry.setAttribute("aFill", this.fill);
    this.geometry.setAttribute("aTint", this.tint);
    this.material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uBack: { value: new Color(PIECE.hpBack) },
        uLag: { value: new Color(PIECE.hpLag) },
        uSize: { value: new Vector2(BAR_W, BAR_H) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new InstancedMesh(this.geometry, this.material, CAPACITY);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 21;
  }

  // 한 장면 동안 채운 막대 수를 센다
  begin() {
    this.used = 0;
  }

  push(at: Vector3, ratio: number, lag: number, color: Color, alpha: number, scale = 1) {
    if (this.used >= CAPACITY) return;
    const i = this.used;
    this.center.setXYZ(i, at.x, at.y, at.z);
    this.fill.setXYZW(i, ratio, Math.max(ratio, lag), scale, alpha);
    this.tint.setXYZ(i, color.r, color.g, color.b);
    this.used += 1;
  }

  end() {
    this.mesh.count = this.used;
    this.center.needsUpdate = true;
    this.fill.needsUpdate = true;
    this.tint.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
