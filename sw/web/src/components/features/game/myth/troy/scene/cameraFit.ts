/*
  파일명: components/features/game/myth/troy/scene/cameraFit.ts
  기능: 카메라가 판을 담는 셈
  책임: 방위·올려 본 각·화면비에서 판 상자 전체가 화면에 꽉 차는 거리와 화면 가운데 맞춤(오른쪽·위)을 셈하고,
        당겨 볼 때 화면이 판 끝을 넘어 빈 하늘만 비추지 않도록 과녁이 움직일 수 있는 폭을 정한다.
*/ // ------------------------------
import { MathUtils, Vector3 } from "three";

const DEG = Math.PI / 180;
export const FOV = 32;
export const TARGET_Y = 0.2;
const HALF = (FOV * DEG) / 2;
// 판 끝 너머로 비쳐도 되는 폭(칸)
const EDGE_MARGIN = 0.8;

export interface BoardBox {
  hw: number;
  hh: number;
  top: number;
}

export interface Fit {
  d: number;
  sr: number;
  su: number;
  r: Vector3;
  u: Vector3;
}

export const createFit = (): Fit => ({ d: 20, sr: 0, su: 0, r: new Vector3(1, 0, 0), u: new Vector3(0, 1, 0) });

const fwd = new Vector3();
const q = new Vector3();

// 판 전체를 볼 때 화면 가운데 맞춤을 거는 정도(당겨 볼수록 과녁 칸이 가운데 오게 줄인다)
export const centerWeight = (zoom: number) => MathUtils.clamp((zoom - 0.45) / 0.55, 0, 1);

// 판 상자(받침·높은 칸 포함) 여덟 모서리가 화면 가운데에 꽉 차게 들어오는 거리와 바라보는 점 보정(오른쪽·위).
// 원근 때문에 가까운 쪽이 커 보여 판이 아래로 처지므로, 화면에서 상자의 가운데를 셈해 바라보는 점을 옮긴다
export function computeFit(box: BoardBox, az: number, el: number, aspect: number, out: Fit): Fit {
  const tanV = Math.tan(HALF);
  const tanH = tanV * aspect;
  const f = fwd.set(-Math.cos(el) * Math.sin(az), -Math.sin(el), -Math.cos(el) * Math.cos(az));
  const r = out.r.set(Math.cos(az), 0, -Math.sin(az));
  const u = out.u.crossVectors(r, f);
  let d = Math.hypot(box.hw, box.hh) * 3;
  let sr = 0;
  let su = 0;
  for (let pass = 0; pass < 4; pass += 1) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const x of [-box.hw - 0.4, box.hw + 0.4]) {
      for (const y of [-1 - TARGET_Y, box.top + 0.9 - TARGET_Y]) {
        for (const z of [-box.hh - 0.4, box.hh + 0.4]) {
          q.set(x, y, z).addScaledVector(r, -sr).addScaledVector(u, -su);
          const depth = Math.max(0.5, d + q.dot(f));
          x0 = Math.min(x0, q.dot(r) / depth);
          x1 = Math.max(x1, q.dot(r) / depth);
          y0 = Math.min(y0, q.dot(u) / depth);
          y1 = Math.max(y1, q.dot(u) / depth);
        }
      }
    }
    sr += ((x0 + x1) / 2) * d;
    su += ((y0 + y1) / 2) * d;
    d *= Math.max((x1 - x0) / 2 / tanH, (y1 - y0) / 2 / tanV) * 1.02;
  }
  out.d = d;
  out.sr = sr;
  out.su = su;
  return out;
}

// lo~hi 안에 넣는다. 화면이 판보다 넓어 폭이 없으면 판이 화면 가운데 오는 자리로 모으고,
// 멀리 볼수록(w) 그 몫을 화면 가운데 맞춤(computeFit)에 넘긴다
function squeeze(v: number, lo: number, hi: number, w: number): number {
  const mid = (lo + hi) / 2;
  const shift = mid * w;
  return lo <= hi ? MathUtils.clamp(v, lo - shift, hi - shift) : mid - shift;
}

const cot = (a: number) => 1 / Math.tan(Math.max(a, 0.05));

// 과녁(x, z)을 지금 화면이 비추는 땅이 판 끝 + EDGE_MARGIN을 넘지 않는 폭으로 가둔다.
// 화면 가로(r)와 화면 위로 뻗는 땅(g) 두 축으로 따지고, 원근 때문에 화면 위쪽이 더 멀리까지 비치는 몫을 넣는다
export function clampToView(t: Vector3, box: BoardBox, az: number, el: number, d: number, aspect: number, w: number): Vector3 {
  const h = d * Math.sin(el);
  const far = h * (cot(el - HALF) - cot(el));
  const near = h * (cot(el) - cot(el + HALF));
  const halfW = d * Math.tan(HALF) * aspect;
  const c = Math.cos(az);
  const s = Math.sin(az);
  const reachR = box.hw * Math.abs(c) + box.hh * Math.abs(s) + EDGE_MARGIN;
  const reachG = box.hw * Math.abs(s) + box.hh * Math.abs(c) + EDGE_MARGIN;
  const tr = squeeze(t.x * c - t.z * s, -reachR + halfW, reachR - halfW, w);
  const tg = squeeze(-t.x * s - t.z * c, -reachG + near, reachG - far, w);
  t.x = tr * c - tg * s;
  t.z = -tr * s - tg * c;
  return t;
}
