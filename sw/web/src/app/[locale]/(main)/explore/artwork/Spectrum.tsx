/*
  파일명: /app/(main)/explore/artwork/Spectrum.tsx
  기능: 스펙트럼 — 동심원 격자 위에 성향 다각형 둘이 겹친다 (최초 판의 형태를 1.3배로 옮기고 금선·분위기 색만 맞췄다)
  책임: 자료를 표현하지 않는 순수 장식이다. 반지름·꼭짓점 값은 형태 대비를 위한 임의값이다.
*/ // ------------------------------

import { CX, LIGHT, OPACITY, STROKE, Sparkle, type ArtProps } from "./shared";

const CY = 120;
const K = 1.3; // 최초 판(320×180, 중심 (160,87)) 좌표 배율
const RINGS = [25, 48, 72].map((r) => r * K);
const AXES = [0, 45, 90, 135];
const AXIS_LEN = 81 * K;
// 최초 판의 두 다각형 — 채운 8각과 점선 8각
const SOLID: [number, number][] = [[0, -62], [39, -39], [64, 0], [32, 32], [0, 72], [-50, 50], [-44, 0], [-34, -34]];
const DASHED: [number, number][] = [[0, -35], [53, -53], [39, 0], [46, 46], [0, 45], [-32, 32], [-66, 0], [-20, -20]];

const scaled = (ps: [number, number][]) => ps.map(([x, y]) => [CX + x * K, CY + y * K] as const);
const shape = (ps: [number, number][]) => `M${scaled(ps).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;

export default function Spectrum({ gold, metal, tint }: ArtProps) {
  return (
    <>
      {/* 격자 — 동심원 셋과 축선 넷 */}
      {RINGS.map((r) => <circle key={r} cx={CX} cy={CY} r={r} stroke={gold} strokeOpacity={OPACITY.deco} strokeWidth={STROKE.deco} />)}
      {AXES.map((deg) => <path key={deg} d={`M${-AXIS_LEN} 0H${AXIS_LEN}`} transform={`translate(${CX} ${CY}) rotate(${deg})`} stroke={gold} strokeOpacity={OPACITY.deco} strokeWidth={STROKE.deco} />)}

      {/* 성향 다각형 — 채운 금 8각과 분위기 색 점선 8각 */}
      <path d={shape(SOLID)} fill={metal} stroke={gold} strokeWidth={STROKE.main} strokeOpacity={OPACITY.main} />
      <path d={shape(DASHED)} stroke={tint} strokeOpacity=".8" strokeWidth={STROKE.sub} strokeDasharray="4 5" strokeLinejoin="round" />
      {scaled(SOLID).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.5} fill={LIGHT} stroke="none" />)}

      {/* 중심 — 밝은 심과 가는 고리 */}
      <circle cx={CX} cy={CY} r={6} fill={LIGHT} stroke="none" />
      <circle cx={CX} cy={CY} r={13} stroke={gold} strokeOpacity={OPACITY.sub} strokeWidth={STROKE.sub} />

      {/* 양옆 장식 — 최초 판의 짧은 선과 점을 잘림선 밖에 */}
      <g stroke={gold} strokeOpacity={OPACITY.sub} strokeWidth={STROKE.sub} strokeLinecap="round">
        <path d="M100 82H128M108 90H128M592 156H620M592 164H612" />
      </g>
      <Sparkle x={150} y={72} s={4} o={0.45} /><Sparkle x={570} y={72} s={4} o={0.45} />
      <Sparkle x={124} y={144} s={3} o={0.35} /><Sparkle x={596} y={110} s={3} o={0.35} />
    </>
  );
}
