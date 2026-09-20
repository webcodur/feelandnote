/*
  파일명: /labs/explore-art/FactionArch.tsx
  기능: 세력도감 — 석조 아치 하나, 쐐기돌 자리의 대표 초상 메달, 아치 안을 가르는 경계선 양옆에 두 진영(왼쪽은 밝은 면, 오른쪽은 어두운 면)
  책임: 실제 인물·관계가 아닌 장식. 메달은 테·금속 띠·어두운 면·흉상 순으로 쌓고, 연결선은 테에서 테까지만 긋는다.
        아치는 짧은 기둥 위 반원이다 — 발이 지평선을 딛고 정점이 y 40에 닿으려면 순수 반원으로는 높이가 모자란다.
  보관: 탐색 카드 시안. 세력도감을 아치 안 두 진영으로 그린 안 — 관계망 그래프가 맞아 내렸다. 서비스에는 쓰지 않는다.
*/ // ------------------------------

import { CX, GROUND, DARK, LIGHT, STROKE, OPACITY, Sparkle, type ArtProps } from "./shared";

type Medal = { x: number; y: number; r: number };

const BAND = 0.84; // 금속 띠 안쪽 반지름 = 테 × 0.84 — 그 안이 어두운 면
const HEAD = { cy: -0.26, r: 0.21 }; // 머리 위치·크기 (테 반지름 비율) — 밑이 목에 닿는다
const SHOULDER = 0.5; // 어깨 반폭 (테 반지름 비율)

const ARCH = { r: 145, band: 9, spring: 185 }; // 반원 반지름·석재 띠 폭·기둥 윗선. 발 x 215·505, 정점 y 40
const BASE = { w: 22, h: 8 }; // 발치 주초
const LEADER: Medal = { x: CX, y: 62, r: 33 }; // 쐐기돌 자리 — 꼭대기 y 29, 아치 띠를 덮는다
const SEAL = { y: 150, w: 6, h: 8 }; // 경계선 한가운데 마름모 인장 — 분위기 색을 쓰는 유일한 자리
const CAMP_R = 21;
const CAMP = { dx: 70, head: 130, headOut: 10, foot: GROUND - 12 - CAMP_R, spread: 34 }; // 진영 중심 거리, 머리 메달 y·바깥쪽 치우침(대표→머리 선과 머리→발 선이 한 줄로 이어지지 않게), 아래 두 메달 y(지평선에서 12px 뜬다)·반폭

/** 진영 하나 — 머리 메달 하나 위, 둘 아래 */
const camp = (sign: -1 | 1): Medal[] => {
  const c = CX + sign * CAMP.dx;
  return [
    { x: c - sign * CAMP.headOut, y: CAMP.head, r: CAMP_R },
    { x: c - CAMP.spread, y: CAMP.foot, r: CAMP_R },
    { x: c + CAMP.spread, y: CAMP.foot, r: CAMP_R },
  ];
};
const CAMPS = [camp(-1), camp(1)];

const f = (n: number) => n.toFixed(1);

/** 두 메달의 테 사이만 잇는다 */
function rimToRim(p: Medal, q: Medal) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const d = Math.hypot(dx, dy);
  return `M${f(p.x + (dx * p.r) / d)} ${f(p.y + (dy * p.r) / d)}L${f(q.x - (dx * q.r) / d)} ${f(q.y - (dy * q.r) / d)}`;
}

/** 흉상 — 어깨 윤곽(선), 채움(밑은 안쪽 면보다 1px 안에서 닫아 선이 겹치지 않는다), 목, 옷깃 */
function bust(r: number) {
  const ri = r * BAND - 1;
  const hx = r * SHOULDER;
  const hy = Math.sqrt(ri * ri - hx * hx);
  const top = `M${f(-hx)} ${f(hy)}C${f(-hx)} ${f(r * 0.22)} ${f(-r * 0.22)} ${f(r * 0.08)} 0 ${f(r * 0.08)}C${f(r * 0.22)} ${f(r * 0.08)} ${f(hx)} ${f(r * 0.22)} ${f(hx)} ${f(hy)}`;
  return {
    line: top,
    fill: `${top}A${f(ri)} ${f(ri)} 0 0 1 ${f(-hx)} ${f(hy)}Z`,
    neck: `M${f(-r * 0.12)} ${f(r * -0.1)}H${f(r * 0.12)}V${f(r * 0.14)}H${f(-r * 0.12)}Z`,
    collar: `M${f(-r * 0.1)} ${f(r * 0.11)}L${f(-r * 0.3)} ${f(r * 0.48)}M${f(r * 0.1)} ${f(r * 0.11)}L${f(r * 0.3)} ${f(r * 0.48)}`,
  };
}

/** 아치 한 겹 — 왼발에서 올라 반원을 넘어 오른발로 */
const arch = (r: number, sweep: 0 | 1 = 1) =>
  sweep
    ? `M${CX - r} ${GROUND}V${ARCH.spring}A${r} ${r} 0 0 1 ${CX + r} ${ARCH.spring}V${GROUND}`
    : `M${CX + r} ${GROUND}V${ARCH.spring}A${r} ${r} 0 0 0 ${CX - r} ${ARCH.spring}V${GROUND}`;

/** 초상 메달 — dark면 금속 띠 없이 어두운 면만 두고 흉상 채움도 옅다(다른 편) */
function MedalMark({ m, gold, metal, leader = false, lit = false, dark = false }: { m: Medal; gold: string; metal: string; leader?: boolean; lit?: boolean; dark?: boolean }) {
  const { x, y, r } = m;
  const ri = r * BAND;
  const b = bust(r);
  const flesh = dark ? 0.35 : 1;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={DARK} stroke={gold} strokeWidth={STROKE.main} />
      {!dark && <circle r={(r + ri) / 2} stroke={metal} strokeWidth={r - ri} />}
      <path d={b.neck} fill={metal} fillOpacity={flesh} />
      <path d={b.fill} fill={metal} fillOpacity={flesh} />
      <path d={b.line} stroke={gold} strokeWidth={STROKE.sub} />
      <path d={b.collar} stroke={gold} strokeWidth={STROKE.deco} strokeOpacity={OPACITY.sub} />
      <circle cy={HEAD.cy * r} r={HEAD.r * r} fill={lit ? LIGHT : metal} fillOpacity={leader ? 0.95 : lit ? 0.8 : flesh} stroke={gold} strokeWidth={STROKE.sub} />
    </g>
  );
}

export default function FactionArch({ gold, metal, tint }: ArtProps) {
  const inner = ARCH.r - ARCH.band;
  const footBase = (x: number) => `M${x - BASE.w / 2} ${GROUND - BASE.h}H${x + BASE.w / 2}V${GROUND}H${x - BASE.w / 2}Z`;
  return (
    <>
      {/* 석조 아치 — 바깥 금선, 안쪽 띠(옅은 금속 채움 + 가는 안선), 발치 주초(밑에 어두운 면을 깔아 아치 선이 관통하지 않는다) */}
      <path d={`${arch(ARCH.r)}H${CX + inner}${arch(inner, 0).slice(arch(inner, 0).indexOf("V"))}Z`} fill={metal} fillOpacity=".5" />
      <path d={arch(inner)} stroke={gold} strokeWidth={STROKE.deco} strokeOpacity={OPACITY.sub} />
      <path d={arch(ARCH.r)} stroke={gold} strokeWidth={STROKE.main} />
      <path d={footBase(CX - ARCH.r + ARCH.band / 2) + footBase(CX + ARCH.r - ARCH.band / 2)} fill={DARK} />
      <path d={footBase(CX - ARCH.r + ARCH.band / 2) + footBase(CX + ARCH.r - ARCH.band / 2)} fill={metal} stroke={gold} strokeWidth={STROKE.sub} strokeOpacity=".8" />

      {/* 경계선 — 대표 메달 밑에서 지평선까지, 한가운데 인장 */}
      <path d={`M${CX} ${LEADER.y + LEADER.r}V${GROUND}`} stroke={gold} strokeWidth={STROKE.sub} strokeOpacity={OPACITY.sub} />
      <path d={`M${CX} ${SEAL.y - SEAL.h}L${CX + SEAL.w} ${SEAL.y}L${CX} ${SEAL.y + SEAL.h}L${CX - SEAL.w} ${SEAL.y}Z`} fill={tint} fillOpacity=".9" stroke={gold} strokeWidth={STROKE.deco} />

      {/* 연결선 — 대표에서 각 진영 머리로(보조), 진영 안 세 메달은 삼각(장식) */}
      <path d={CAMPS.map((c) => rimToRim(LEADER, c[0])).join("")} stroke={gold} strokeWidth={STROKE.sub} strokeOpacity={OPACITY.sub} />
      <path d={CAMPS.map((c) => rimToRim(c[0], c[1]) + rimToRim(c[0], c[2]) + rimToRim(c[1], c[2])).join("")} stroke={gold} strokeWidth={STROKE.deco} strokeOpacity={OPACITY.deco} />

      {/* 메달 — 왼쪽 진영은 밝은 면, 오른쪽 진영은 어두운 면. 왼쪽 머리는 밝은 보조, 대표 얼굴이 심장 */}
      {CAMPS.map((c, side) => c.map((m, i) => <MedalMark key={`${m.x}-${m.y}`} m={m} gold={gold} metal={metal} dark={side === 1} lit={side === 0 && i === 0} />))}
      <MedalMark m={LEADER} gold={gold} metal={metal} leader lit />

      <Sparkle x={150} y={72} s={5} o={0.55} /><Sparkle x={570} y={72} s={5} o={0.55} />
      <Sparkle x={236} y={44} s={4} o={0.5} /><Sparkle x={484} y={44} s={4} o={0.5} />
    </>
  );
}
