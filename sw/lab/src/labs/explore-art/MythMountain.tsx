/*
  파일명: /labs/explore-art/MythMountain.tsx
  기능: 신화의 세계 — 신들의 산. 구름 띠 위로 솟은 세 봉우리, 가운데 봉의 눈 덮인 정상, 그 옆 하늘의 초승달, 신들의 산으로 드는 문(門)과 거기서 내려오는 길
  책임: 순수 장식. 산맥은 구름 띠 속 자름선(y 154)에서 봉우리와 밑동으로 나눈다 — 봉우리는 금속 채움에 오른쪽 그늘 면을 얹어
        보석 깎듯 면을 세우고, 밑동은 옅게 채우고 평평한 어두운 막으로 가라앉힌다. 시각 무게는 봉우리와 구름 띠에 있고 발은 지평선을 딛되 흐릿하다.
        구름 띠는 어두운 막을 먼저 깔아 산허리를 끊는다.
  보관: 탐색 카드 시안. 신화를 신들의 산으로 그린 안 — 신전 기반이 맞아 내렸다. 서비스에는 쓰지 않는다.
*/ // ------------------------------

import { CX, GROUND, LIGHT, DARK, STROKE, OPACITY, Sparkle, pt, type ArtProps } from "./shared";

type P = readonly [number, number];
const join = (ps: readonly P[]) => ps.map(pt).join("L");

/* 산맥 하늘선 — 왼봉(꼭대기 y 104)·가운데봉(y 30)·오른봉(y 90). 능선은 어깨와 턱으로 꺾인다. 안장은 구름 띠 뒤(y 152)에 숨는다 */
const LEFT: P[] = [[215, GROUND], [236, 165], [248, 138], [258, 126], [266, 104], [274, 116], [282, 122], [294, 140], [306, 152]];
const MAIN: P[] = [[306, 152], [322, 112], [332, 100], [340, 84], [346, 76], [352, 52], [CX, 30], [368, 46], [374, 58], [382, 70], [388, 92], [398, 108], [408, 128], [420, 152]];
const RIGHT: P[] = [[420, 152], [432, 128], [440, 118], [446, 100], [452, 90], [460, 104], [466, 112], [474, 140], [480, 156], [505, GROUND]];

/* 자름선 — 구름 띠 속에 숨는 높이. 선분 a-b가 이 높이를 지나는 x */
const CUT = 154;
const xAt = (a: P, b: P, y: number) => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
const cut = (a: P, b: P): P => [xAt(a, b, CUT), CUT];

/* 봉우리 — 자름선 위 하늘선. 양끝은 구름 밑에 묻힌다 */
const PEAKS: P[] = [cut(LEFT[1], LEFT[2]), ...LEFT.slice(2), ...MAIN.slice(1), ...RIGHT.slice(1, 8), cut(RIGHT[7], RIGHT[8])];

/* 그늘 면 — 봉마다 꼭대기에서 오른쪽 하늘선을 타고 자름선까지 내려와 앞 능선(접힘)으로 돌아온다. 빛은 왼쪽에서 온다.
   구름 밑에는 그늘 면을 두지 않는다 — 세로 패널이 생겨 무대 커튼으로 읽혔다 */
const FOLDS: [P, P][] = [[LEFT[4], [262, GROUND]], [MAIN[6], [384.7, GROUND]], [RIGHT[4], [463.6, GROUND]]];
const PEAK_SHADES: P[][] = [
  [...LEFT.slice(4), cut(...FOLDS[0])],
  [...MAIN.slice(6), cut(...FOLDS[1])],
  [...RIGHT.slice(4, 8), cut(RIGHT[7], RIGHT[8]), cut(...FOLDS[2])],
];

/* 밑동 — 자름선 밑은 단일 채움 한 장에 평평한 어두운 막을 덮어 안개 속 산 아랫도리로 둔다. 지평선을 딛는 건 이 발이다.
   그라디언트를 쓰지 않는다 — 어두운 반투명 그라디언트는 8비트에서 가로 띠로 갈라져 실제 화면에도 보였다.
   바깥 사선은 장식 선으로 y 175까지만 긋고 그 밑은 선 없이 막 속에 잠긴다 */
const FEET: P[] = [LEFT[0], LEFT[1], PEAKS[0], PEAKS[PEAKS.length - 1], RIGHT[8], RIGHT[9]];
const EDGE_END = 175;
const FEET_EDGES = `M${join([PEAKS[0], LEFT[1], [xAt(LEFT[1], LEFT[0], EDGE_END), EDGE_END]])}M${join([PEAKS[PEAKS.length - 1], RIGHT[8], [xAt(RIGHT[8], RIGHT[9], EDGE_END), EDGE_END]])}`;
const MIST_VEIL = 0.5;

/* 눈 덮인 정상 — 밝은 강조의 심장. 밑변이 지그재그 */
const SNOW: P[] = [[CX, 30], [350, 58], [356, 73], [CX, 61], [366, 74], [374, 58]];

/* 정상의 문(門) — 눈선 밑 산면 가운데. 기둥 둘과 양끝이 들린 상인방, 그 안을 채우는 남빛 아치. 분위기 색은 이곳뿐 */
const GATE = { x: 352, y: 84, w: 16, h: 14, eave: 3 };
const gateFrame = () => {
  const { x, y, w, h, eave } = GATE;
  return `M${x - eave} ${y - 1.5}Q${x} ${y} ${x + w / 2} ${y}Q${x + w} ${y} ${x + w + eave} ${y - 1.5}M${x} ${y}V${y + h}M${x + w} ${y}V${y + h}`;
};
const gateArch = () => {
  const { x, y, w, h } = GATE;
  const r = w / 2;
  return `M${x} ${y + h}V${y + r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h}Z`;
};

/* 오르는 길 — 문 밑에서 구름까지 굽이치는 점선. 구름에 가려지는 밑동 구간은 긋지 않는다 */
const TRAIL = "M360 99Q352 106 348 114Q344 122 352 128Q358 134 340 143";

/* 구름 띠 — 산허리를 가로지르는 얇은 띠. 윗변은 물결 7개(가운데가 큼), 아랫변은 잔물결, 양 끝은 물결 호만 한 반원으로 닫는다 */
const CLOUD = { top: 148, bottom: 160, x: 233, widths: [24, 40, 50, 28, 50, 40, 24], rise: 0.3, dip: 5 };
const cloud = () => {
  const { top, bottom, x, widths, rise, dip } = CLOUD;
  const r = (bottom - top) / 2;
  let cx = x;
  let d = `M${x} ${bottom}A${r} ${r} 0 0 1 ${x} ${top}`;
  for (const w of widths) {
    d += `Q${(cx + w / 2).toFixed(1)} ${(top - 2 * w * rise).toFixed(1)} ${cx + w} ${top}`;
    cx += w;
  }
  d += `A${r} ${r} 0 0 1 ${cx} ${bottom}`;
  for (const w of [...widths].reverse()) {
    d += `Q${(cx - w / 2).toFixed(1)} ${bottom + 2 * dip} ${cx - w} ${bottom}`;
    cx -= w;
  }
  return d + "Z";
};

/* 초승달 — 같은 반지름 원 둘을 어긋나게 겹친 낫. 뿔이 위를 보게 기울인다 */
const MOON = { cx: 256, cy: 50, r: 11, d: 7, rot: -70 };
const moon = () => {
  const { r, d } = MOON;
  const h = Math.sqrt(r * r - (d * d) / 4).toFixed(2);
  const x = (d / 2).toFixed(1);
  return `M${x} -${h}A${r} ${r} 0 1 0 ${x} ${h}A${r} ${r} 0 0 1 ${x} -${h}Z`;
};

export default function MythMountain({ gold, metal, tint }: ArtProps) {
  return (
    <>
      {/* 주제: 산맥 — 봉우리는 금속 채움에 그늘 면, 밑동은 옅은 금속 한 장에 막. 밑변(지평선)은 긋지 않는다 */}
      <path d={`M${join(PEAKS)}Z`} fill={metal} fillOpacity=".5" />
      {PEAK_SHADES.map((face, i) => <path key={i} d={`M${join(face)}Z`} fill={DARK} fillOpacity=".3" />)}
      <path d={`M${join(PEAKS)}`} stroke={gold} strokeWidth={STROKE.main} strokeLinejoin="round" />
      <path d={`M${join(FEET)}Z`} fill={metal} fillOpacity=".22" />
      <path d={`M${join(FEET)}Z`} fill={DARK} fillOpacity={MIST_VEIL} />
      <path d={FEET_EDGES} stroke={gold} strokeWidth={STROKE.deco} strokeOpacity={OPACITY.deco} />

      {/* 오르는 길 — 신화로 오르는 길 */}
      <path d={TRAIL} stroke={gold} strokeWidth={STROKE.deco} strokeOpacity={OPACITY.deco} strokeDasharray="3 2.5" />

      {/* 강조: 눈 덮인 정상(심장)과 문(분위기 색) */}
      <path d={`M${join(SNOW)}Z`} fill={LIGHT} fillOpacity=".92" />
      <path d={gateArch()} fill={tint} fillOpacity=".9" />
      <path d={gateFrame()} stroke={gold} strokeWidth={STROKE.sub} />

      {/* 구름 띠 — 어두운 막으로 산허리를 끊고 그 위에 옅은 금속을 얹는다 */}
      <path d={cloud()} fill={DARK} />
      <path d={cloud()} fill={metal} stroke={gold} strokeWidth={STROKE.sub} strokeLinejoin="round" />

      {/* 보조 강조: 초승달 */}
      <g transform={`translate(${MOON.cx} ${MOON.cy}) rotate(${MOON.rot})`}>
        <path d={moon()} fill={LIGHT} fillOpacity=".68" />
      </g>

      {/* 반짝임 — 좌우 거울. 바깥 쌍은 휴대폰 잘림 밖, 안쪽 쌍은 안 */}
      <Sparkle x={150} y={72} o={0.55} /><Sparkle x={570} y={72} o={0.55} />
      <Sparkle x={312} y={72} s={3} o={0.4} /><Sparkle x={408} y={72} s={3} o={0.4} />
    </>
  );
}
