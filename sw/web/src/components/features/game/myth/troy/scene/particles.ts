/*
  파일명: components/features/game/myth/troy/scene/particles.ts
  기능: 불티·연기·반짝이 입자
  책임: 정해 둔 수만큼의 점(Points) 하나로 터지는 입자를 돌려쓴다(그리기 한 번). 더하기 섞기(불꽃·빛)와 보통 섞기(연기·흙먼지)
        두 벌을 만들어 쓴다. 입자마다 속도·중력·끌림·수명·크기·색 변화를 CPU에서 셈한다.
*/ // ------------------------------
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial, type Vector3,
} from "three";

export interface Burst {
  count: number;
  at: Vector3;
  color: string;
  color2?: string;
  // 처음 자리 흩어짐(반지름), 위로 솟는 속도, 사방으로 퍼지는 속도
  spread?: number;
  up?: number;
  speed?: number;
  // 수평 고리로만 퍼짐(충격파)
  flat?: boolean;
  gravity?: number;
  drag?: number;
  life?: [number, number];
  // 시작·끝 크기(월드 단위)
  size?: [number, number];
  alpha?: number;
}

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
  #include <colorspace_fragment>
}
`;

export class Particles {
  readonly points: Points;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly col0: Float32Array;
  private readonly col1: Float32Array;
  private readonly col: Float32Array;
  private readonly num: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly geo = new BufferGeometry();
  private readonly mat: ShaderMaterial;
  private cursor = 0;
  private alive = 0;
  private readonly c0 = new Color();
  private readonly c1 = new Color();

  constructor(capacity: number, additive: boolean) {
    this.n = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.col0 = new Float32Array(capacity * 3);
    this.col1 = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    // 입자마다 수치 7개: 남은 수명, 처음 수명, 시작 크기, 끝 크기, 불투명, 중력, 끌림
    this.num = new Float32Array(capacity * 7);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.geo.setAttribute("position", new BufferAttribute(this.pos, 3));
    this.geo.setAttribute("aColor", new BufferAttribute(this.col, 3));
    this.geo.setAttribute("aSize", new BufferAttribute(this.size, 1));
    this.geo.setAttribute("aAlpha", new BufferAttribute(this.alpha, 1));
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: { uScale: { value: 600 } },
      transparent: true, depthWrite: false, blending: additive ? AdditiveBlending : NormalBlending,
    });
    this.points = new Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 9 : 8;
  }

  burst(b: Burst) {
    this.c0.set(b.color);
    this.c1.set(b.color2 ?? b.color);
    const [l0, l1] = b.life ?? [0.5, 0.9];
    const [s0, s1] = b.size ?? [0.08, 0.02];
    for (let k = 0; k < b.count; k += 1) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 2 - 1;
      const r = (b.spread ?? 0.1) * Math.sqrt(Math.random());
      const flat = b.flat ? 0 : 1;
      const sp = (b.speed ?? 0.6) * (0.5 + Math.random() * 0.5);
      this.pos.set([b.at.x + Math.cos(a) * r, b.at.y + (Math.random() - 0.5) * r * flat, b.at.z + Math.sin(a) * r], i * 3);
      const h = Math.sqrt(1 - up * up * flat);
      this.vel.set([Math.cos(a) * h * sp, up * sp * flat + (b.up ?? 0) * (0.6 + Math.random() * 0.4), Math.sin(a) * h * sp], i * 3);
      this.col0.set([this.c0.r, this.c0.g, this.c0.b], i * 3);
      this.col1.set([this.c1.r, this.c1.g, this.c1.b], i * 3);
      const life = l0 + Math.random() * (l1 - l0);
      this.num.set([life, life, s0, s1, b.alpha ?? 1, b.gravity ?? 0, b.drag ?? 1.5], i * 7);
    }
    this.alive = this.n;
  }

  update(dt: number) {
    if (this.alive === 0) return;
    let alive = 0;
    for (let i = 0; i < this.n; i += 1) {
      const o = i * 7;
      if (this.num[o] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      alive += 1;
      this.num[o] -= dt;
      const k = 1 - Math.max(0, this.num[o]) / this.num[o + 1];
      const drag = Math.max(0, 1 - this.num[o + 6] * dt);
      const v = i * 3;
      this.vel[v] *= drag;
      this.vel[v + 1] = this.vel[v + 1] * drag - this.num[o + 5] * dt;
      this.vel[v + 2] *= drag;
      this.pos[v] += this.vel[v] * dt;
      this.pos[v + 1] += this.vel[v + 1] * dt;
      this.pos[v + 2] += this.vel[v + 2] * dt;
      for (let c = 0; c < 3; c += 1) this.col[v + c] = this.col0[v + c] + (this.col1[v + c] - this.col0[v + c]) * k;
      this.size[i] = this.num[o + 2] + (this.num[o + 3] - this.num[o + 2]) * k;
      this.alpha[i] = this.num[o] <= 0 ? 0 : this.num[o + 4] * Math.min(1, k * 10) * Math.pow(1 - k, 0.7);
    }
    this.alive = alive;
    ["position", "aColor", "aSize", "aAlpha"].forEach((name) => {
      this.geo.getAttribute(name).needsUpdate = true;
    });
  }

  // 화면 높이(장치 픽셀)와 시야각으로 월드 크기를 점 크기로 바꾸는 값
  setScale(pixelHeight: number, fovDeg: number) {
    this.mat.uniforms.uScale.value = pixelHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  busy(): boolean {
    return this.alive > 0;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
