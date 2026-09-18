/*
  파일명: /app/(main)/explore/artwork/Ranking.tsx
  기능: 분야별 챔피언 — 닫힌 월계관이 트로피를 감싸고, 관의 매듭이 1위 단 윗면에 앉는다
  책임: 관은 잎으로만 이뤄진다(따로 두는 원·광선 없음). 시상대 채움은 실루엣 한 장이라 1위가 가장 밝다.
        밝은 강조는 별(심장)과 I 표식 둘. 분위기 색은 매듭 한 곳.
*/ // ------------------------------

import { CX, GROUND, LIGHT, STROKE, OPACITY, Sparkle, polar, pt, type ArtProps } from "./shared";

/* 월계관 — 잎 12장씩 좌우. 아래 매듭 위(114°)에서 출발해 꼭대기(270°) 근처에서 5px 틈을 두고 끝난다.
   첫 잎은 매듭 고리와 6px 이상 떨어져야 한다(3배 렌더에서 잎이 고리를 찌른다) */
const WREATH = { cy: 98, r: 60, from: 114, to: 249, leaves: 12, spread: 26 };
/* 잎 — 원점에서 +x 방향, 길이 21·폭 14 */
const LEAF = "M0 0Q7 -7 21 0Q7 7 0 0Z";
const LEAF_RIB = "M3 0H16";

/* 시상대 — 가운데 1위. 윗면 높이 순서는 1위·2위·3위 */
const PODIUM = { l: 236, m0: 312, m1: 408, r: 484, top: [168, 182, 194] };
const podiumFill = () => {
  const { l, m0, m1, r, top } = PODIUM;
  return `M${l} ${top[1]}H${m0}V${top[0]}H${m1}V${top[2]}H${r}V${GROUND}H${l}Z`;
};
/* 윤곽 — 지평선과 겹치는 밑변은 긋지 않고, 이웃과 맞닿는 변은 한 번만 긋는다 */
const podiumStroke = () => {
  const { l, m0, m1, r, top } = PODIUM;
  return `M${l} ${GROUND}V${top[1]}H${m0}V${top[0]}H${m1}V${top[2]}H${r}V${GROUND}M${m0} ${top[1]}V${GROUND}M${m1} ${top[2]}V${GROUND}`;
};

/* 리본 매듭 — 관이 만나는 자리. 1위 단 윗면에 앉고 꼬리가 앞면에 늘어진다 */
const KNOT = { cx: CX, cy: 168, loop: "M-4 -3Q-22 -12 -20 0Q-18 12 -4 4Z", tail: "M-4 4Q-9 13 -17 19L-9 20Q-5 13 -1 6Z" };

/* 트로피 — 관 안쪽(반지름 약 50)에 온전히 들어간다. 대는 마디 자리에서 끊어 마디 뒤로 비치지 않는다 */
const TROPHY = {
  cup: "M333 58H387V80C387 101 375 112 360 112C345 112 333 101 333 80Z",
  rim: "M333 66H387",
  handles: "M387 63H391Q397 63 397 70V76C397 86 390 92 382 94M333 63H329Q323 63 323 70V76C323 86 330 92 338 94",
  stem: "M360 112V118M360 128V132",
  node: { cx: CX, cy: 123, r: 3.5 },
  base: "M346 132H374V138H380V144H340V138H346Z",
  star: { cx: CX, cy: 80, R: 11, r: 4.6 },
};

/* 별 — 꼭짓점 5개, 위를 향한다 */
const star = ({ cx, cy, R, r }: typeof TROPHY.star) =>
  Array.from({ length: 10 }, (_, i) => pt(polar(cx, cy, i % 2 ? r : R, -90 + i * 36))).join("L");

/* 순위 표식 — 세로 막대 n개를 x 중심에 균등 배치 */
const MARK = { y: 199, len: 10, gap: 8 };
const marks = (cx: number, n: number) =>
  Array.from({ length: n }, (_, i) => cx + (i - (n - 1) / 2) * MARK.gap).map((x) => `M${x} ${MARK.y}V${MARK.y + MARK.len}`).join("");
const mid = (a: number, b: number) => (a + b) / 2;

export default function Ranking({ gold, metal, tint }: ArtProps) {
  /* 관의 한쪽 가지 — 잎은 진행 방향을 향하고 안팎으로 번갈아 벌어지며 끝으로 갈수록 조금 작아진다 */
  const branch = (mirror: boolean) => {
    const { cy, r, from, to, leaves, spread } = WREATH;
    const at = (a: number) => polar(CX, cy, r, mirror ? 180 - a : a);
    return (
      <g key={String(mirror)}>
        {Array.from({ length: leaves }, (_, i) => {
          const a = from + (i * (to - from)) / (leaves - 1);
          const [x, y] = at(a);
          const s = i === leaves - 1 ? 0 : i % 2 ? spread : -spread;
          const rot = mirror ? 90 - a - s : a + 90 + s;
          const scale = 1 - 0.15 * (i / (leaves - 1));
          return (
            <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(2)})`}>
              <path d={LEAF} fill={metal} fillOpacity=".55" />
              <path d={LEAF_RIB} strokeWidth={STROKE.deco} strokeOpacity={OPACITY.deco} />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <>
      {/* 주제: 시상대 — 채움은 실루엣 한 장(그라디언트가 한 번만 흐른다) */}
      <path d={podiumFill()} fill={metal} fillOpacity=".35" />
      <path d={podiumStroke()} stroke={gold} strokeWidth={STROKE.main} />
      <path d={marks(mid(PODIUM.m0, PODIUM.m1), 1)} stroke={LIGHT} strokeWidth="2" strokeOpacity=".85" strokeLinecap="round" />
      <path d={marks(mid(PODIUM.l, PODIUM.m0), 2) + marks(mid(PODIUM.m1, PODIUM.r), 3)} stroke={gold} strokeWidth={STROKE.main} strokeOpacity={OPACITY.sub} strokeLinecap="round" />

      {/* 주제: 월계관 */}
      <g stroke={gold} strokeWidth={STROKE.main}>
        {branch(false)}
        {branch(true)}
      </g>

      {/* 강조: 매듭 — 분위기 색은 여기 한 곳 */}
      <g transform={`translate(${KNOT.cx} ${KNOT.cy})`} fill={tint} fillOpacity=".85" stroke={gold} strokeWidth={STROKE.sub}>
        <path d={KNOT.loop} /><path d={KNOT.tail} />
        <g transform="scale(-1 1)"><path d={KNOT.loop} /><path d={KNOT.tail} /></g>
        <rect x={-5} y={-4} width={10} height={8} rx={2} />
      </g>

      {/* 주제: 트로피 — 컵, 테, 손잡이, 마디 있는 대, 2단 받침, 별 */}
      <g stroke={gold} strokeWidth={STROKE.main}>
        <path d={TROPHY.cup} fill={metal} />
        <path d={TROPHY.rim} strokeOpacity={OPACITY.sub} />
        <path d={TROPHY.handles} />
        <path d={TROPHY.stem} strokeWidth="3" />
        <circle {...TROPHY.node} fill={metal} />
        <path d={TROPHY.base} fill={metal} />
        <path d={`M${star(TROPHY.star)}Z`} fill={LIGHT} fillOpacity=".95" stroke="none" />
      </g>

      {/* 반짝임 — 좌우 거울. 바깥 쌍(y 72는 세트 공통)은 휴대폰 잘림 밖, 안쪽 쌍은 안 */}
      <Sparkle x={150} y={72} o={0.55} /><Sparkle x={570} y={72} o={0.55} />
      <Sparkle x={250} y={48} s={3} o={0.4} /><Sparkle x={470} y={48} s={3} o={0.4} />
    </>
  );
}
