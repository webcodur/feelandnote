/*
  파일명: /app/(main)/explore/artwork/Faction.tsx
  기능: 세력도감 — 초상 메달이 별자리처럼 이어진다
  책임: 실제 인물·관계가 아닌 장식이다. 연결선은 메달 바깥 고리에서 멈추고, 메달의 층(고리·테·안쪽 면·흉상)은 반지름에 비례한다.
*/ // ------------------------------

import { DARK, LIGHT, Sparkle, polar, pt, type ArtProps } from "./shared";

type Node = [number, number, number];

const RING = 1.2; // 바깥 고리 반지름 = 테 반지름 × 1.2
const INNER = 0.86; // 안쪽 어두운 면의 가장자리 — 흉상 어깨는 이 원호를 따라 잘린다

// 가운데 대표 메달 하나, 위성 다섯 — 좁은 화면(x 187~533)과 넓은 화면(y 10~250)에서 고리까지 온전히 보인다
const NODES: Node[] = [[360, 112, 40], [262, 66, 25], [458, 66, 25], [230, 152, 22], [490, 152, 22], [360, 192, 14]];
const HUB_LINKS = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]];
const RIM_LINKS = [[1, 3], [3, 5], [5, 4], [4, 2]];
// 먼 노드 — 양옆 장식이라 좁은 화면에서 잘려도 된다
const FAR: Node[] = [[130, 100, 10], [590, 120, 10]];
const FAR_LINKS: [Node, Node][] = [[FAR[0], NODES[1]], [FAR[0], NODES[3]], [FAR[1], NODES[2]], [FAR[1], NODES[4]]];
// 별자리 점 — 먼 노드에서 더 바깥으로 이어진다. 점선은 점과 먼 노드의 고리 사이만 잇는다
const STARS: Node[] = [[78, 176, 2], [46, 122, 1.4], [652, 60, 2], [684, 150, 1.4], [160, 46, 1.2], [548, 30, 1.2]];
const STAR_LINKS: [Node, Node][] = [[STARS[0], FAR[0]], [STARS[1], STARS[0]], [STARS[2], FAR[1]], [STARS[3], STARS[2]]];

/** 두 메달의 바깥 고리 사이만 잇는다 — 중심에서 고리 반지름만큼 뺀다 */
function ringToRing(p: Node, q: Node, kp = RING, kq = RING) {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const d = Math.hypot(dx, dy);
  const a = p[2] * kp;
  const b = q[2] * kq;
  return `M${(p[0] + (dx * a) / d).toFixed(1)} ${(p[1] + (dy * a) / d).toFixed(1)}L${(q[0] - (dx * b) / d).toFixed(1)} ${(q[1] - (dy * b) / d).toFixed(1)}`;
}

/** 흉상 어깨 — 좌우 곡선을 올린 뒤 안쪽 면의 원호를 따라 내려 닫는다. 크기가 달라도 같은 비율로 잘린다 */
function shoulders(r: number) {
  const ri = r * INNER;
  const hx = r * 0.5;
  const hy = Math.sqrt(ri * ri - hx * hx);
  const f = (n: number) => n.toFixed(1);
  return `M${f(-hx)} ${f(hy)}C${f(-hx)} ${f(r * 0.26)} ${f(-r * 0.22)} ${f(r * 0.12)} 0 ${f(r * 0.12)}C${f(r * 0.22)} ${f(r * 0.12)} ${f(hx)} ${f(r * 0.26)} ${f(hx)} ${f(hy)}A${f(ri)} ${f(ri)} 0 0 1 ${f(-hx)} ${f(hy)}Z`;
}

/** 대표 메달의 눈금 고리 — 테와 후광 사이에 짧은 눈금을 돌리고 네 방위만 길게 둔다 */
function ticks(r: number, count: number) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const deg = (360 / count) * i;
    const long = i % (count / 4) === 0;
    d += `M${pt(polar(0, 0, r * (long ? 1.05 : 1.07), deg))}L${pt(polar(0, 0, r * (long ? 1.14 : 1.11), deg))}`;
  }
  return d;
}

/** 점선 고리의 점 간격을 둘레에 맞춰 이음새를 없앤다 */
const haloDash = (r: number, dot: number, periods: number) => `${dot} ${((2 * Math.PI * r) / periods - dot).toFixed(3)}`;

function Medal({ node, gold, metal, tint, hub }: { node: Node; gold: string; metal: string; tint: string; hub: boolean }) {
  const [x, y, r] = node;
  const rim = hub ? 2 : Math.max(1, r * 0.05);
  return (
    <g transform={`translate(${x} ${y})`}>
      {hub ? (
        <>
          <circle r={r * RING} stroke={tint} strokeOpacity=".7" strokeDasharray={haloDash(r * RING, 2, 50)} />
          <path d={ticks(r, 36)} stroke={gold} strokeOpacity=".75" strokeWidth="1.1" />
        </>
      ) : (
        <circle r={r * RING} stroke={gold} strokeOpacity=".35" strokeWidth=".8" />
      )}
      <circle r={r} fill={DARK} stroke={gold} strokeWidth={rim} strokeOpacity={hub ? "1" : ".75"} />
      <circle r={r * INNER} stroke={gold} strokeOpacity={hub ? ".45" : ".25"} strokeWidth=".8" />
      <circle cy={-r * 0.3} r={r * 0.2} fill={metal} stroke={gold} strokeOpacity=".85" strokeWidth={hub ? 1.2 : 1} />
      <path d={shoulders(r)} fill={metal} stroke={gold} strokeOpacity=".85" strokeWidth={hub ? 1.2 : 1} />
    </g>
  );
}

export default function Faction({ gold, metal, tint }: ArtProps) {
  return (
    <>
      {/* 장식 — 별자리 점선 (가장 옅고 가늘다) */}
      <g stroke={gold} strokeOpacity=".25" strokeWidth=".9" strokeDasharray="2 5">
        <path d={FAR_LINKS.map(([p, q]) => ringToRing(p, q, 1.5)).join("")} />
        <path d={STAR_LINKS.map(([p, q]) => ringToRing(p, q, 2.5, q[2] > 5 ? 1.5 : 2.5)).join("")} />
      </g>
      {/* 보조 — 위성끼리 잇는 선 */}
      <path d={RIM_LINKS.map(([i, j]) => ringToRing(NODES[i], NODES[j])).join("")} stroke={gold} strokeOpacity=".45" strokeWidth="1.1" />
      {/* 주제 — 대표 메달에서 위성으로 뻗는 선 */}
      <path d={HUB_LINKS.map(([i, j]) => ringToRing(NODES[i], NODES[j])).join("")} stroke={gold} strokeOpacity=".65" strokeWidth="1.6" />
      {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={LIGHT} fillOpacity=".55" stroke="none" />)}
      {FAR.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r={r * 1.5} stroke={gold} strokeOpacity=".2" strokeWidth=".8" />
          <circle r={r} fill={DARK} stroke={gold} strokeOpacity=".45" />
          <circle cy={-r * 0.16} r={r * 0.28} fill={LIGHT} fillOpacity=".5" stroke="none" />
        </g>
      ))}
      {NODES.map((node, i) => <Medal key={i} node={node} gold={gold} metal={metal} tint={tint} hub={i === 0} />)}
      <Sparkle x={100} y={40} s={3} o={0.4} /><Sparkle x={630} y={196} s={3} o={0.4} /><Sparkle x={40} y={206} s={2} o={0.3} />
    </>
  );
}
