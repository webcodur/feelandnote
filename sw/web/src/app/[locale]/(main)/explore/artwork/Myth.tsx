/*
  파일명: /app/(main)/explore/artwork/Myth.tsx
  기능: 신화의 세계 — 도리아식 여섯 기둥 신전, 초승달과 별, 먼 산
  책임: 순수 장식. 기단 3단·주초 없는 기둥·아바쿠스·트리글리프 프리즈·코니스·페디먼트 순으로 쌓는다.
        맞닿는 변은 한 번만 긋는다 — 채움과 윤곽을 분리해 겹선을 없앤다.
*/ // ------------------------------

import { CX, GROUND, LIGHT, Sparkle, type ArtProps } from "./shared";

const COLS = [240, 288, 336, 384, 432, 480];
const STYLO = { l: 216, r: 504, y: 197 }; // 기단 맨 윗단
const STEP = 7;
const SHAFT = { top: 110, wTop: 7.5, wBot: 9 }; // 위로 갈수록 좁아진다
const CAP = { abacus: 102, echinus: 106, w: 12 };
const ENT = { l: 214, r: 506, arch: 91, frieze: 79, cornice: 75, cl: 210, cr: 510 };
const PED = { apex: 35, inset: 5 };
const CLIP = "explore-art-myth-behind";

/** 기단 3단 — 계단 윤곽 한 줄 */
const crepis = () => {
  const { l, r, y } = STYLO;
  return `M${l - 16} ${GROUND}V${y + STEP * 2}H${l - 8}V${y + STEP}H${l}V${y}H${r}V${y + STEP}H${r + 8}V${y + STEP * 2}H${r + 16}V${GROUND}`;
};

/** 기둥 실루엣(채움용, 닫힘) */
const columnFill = (x: number) => {
  const { top, wTop, wBot } = SHAFT;
  return `M${x - wBot} ${STYLO.y}L${x - wTop} ${top}L${x - CAP.w} ${CAP.echinus}V${CAP.abacus}H${x + CAP.w}V${CAP.echinus}L${x + wTop} ${top}L${x + wBot} ${STYLO.y}Z`;
};

/** 기둥 윤곽(선용) — 기단 윗선·아키트레이브 밑선과 겹치는 변은 긋지 않는다 */
const columnStroke = (x: number) => {
  const { top, wTop, wBot } = SHAFT;
  return `M${x - wBot} ${STYLO.y}L${x - wTop} ${top}L${x - CAP.w} ${CAP.echinus}V${CAP.abacus}M${x + CAP.w} ${CAP.abacus}V${CAP.echinus}L${x + wTop} ${top}L${x + wBot} ${STYLO.y}`;
};

/** 플루팅 — 가운데가 또렷하고 가장자리로 갈수록 옅다 */
const FLUTES = [
  { o: 0, a: 0.3 },
  { o: 3, a: 0.22 },
  { o: -3, a: 0.22 },
  { o: 6, a: 0.13 },
  { o: -6, a: 0.13 },
];
const flute = (x: number, o: number) => `M${x + o} ${STYLO.y - 3}L${(x + (o * SHAFT.wTop) / SHAFT.wBot).toFixed(1)} ${SHAFT.top + 4}`;

/** 엔타블러처 윤곽 — 아키트레이브·프리즈·코니스를 한 줄로 */
const entablature = () =>
  `M${ENT.l} ${CAP.abacus}V${ENT.frieze}H${ENT.cl}V${ENT.cornice}H${ENT.cr}V${ENT.frieze}H${ENT.r}V${CAP.abacus}Z`;

/** 팀파눔 — 페디먼트 안쪽으로 일정 두께만큼 들어간 삼각형 */
const tympanum = () => {
  const half = (ENT.cr - ENT.cl) / 2;
  const k = (ENT.cornice - PED.apex) / half;
  const baseY = ENT.cornice - PED.inset;
  const apexY = PED.apex + PED.inset * Math.sqrt(1 + k * k);
  const hb = (baseY - apexY) / k;
  return { d: `M${(CX - hb).toFixed(1)} ${baseY}L${CX} ${apexY.toFixed(1)}L${(CX + hb).toFixed(1)} ${baseY}Z`, apexY, baseY };
};

/** 아크로테리온 — 줄기 하나와 잎 두 장의 팔메트 */
const palmette = (x: number, y: number, h: number) => {
  const w = h * 0.45;
  return `M${x} ${y}V${y - h}M${x - w} ${y - 2}Q${x - w / 2} ${y - h - 1} ${x} ${y - h}M${x + w} ${y - 2}Q${x + w / 2} ${y - h - 1} ${x} ${y - h}`;
};

/** 초승달 — 바깥 호와 안쪽 얕은 호, 뿔이 오른쪽을 향한다 */
const crescent = (x: number, y: number, r: number) => `M${x} ${y - r}A${r} ${r} 0 1 0 ${x} ${y + r}A${r * 1.25} ${r * 1.25} 0 0 1 ${x} ${y - r}Z`;

const TRIGLYPHS = [219.5, ...COLS.flatMap((x) => [x, x + 24]).slice(0, -1), 500.5];
const STARS: [number, number, number, number][] = [
  [92, 122, 4, 0.5], [40, 62, 3, 0.35], [215, 30, 2.5, 0.4], [300, 20, 3, 0.45], [430, 24, 2.5, 0.35],
  [560, 62, 4, 0.55], [636, 104, 5, 0.6], [600, 32, 3, 0.4], [682, 52, 2.5, 0.3],
];

export default function Myth({ gold, metal }: ArtProps) {
  const tym = tympanum();
  const discY = (tym.apexY + tym.baseY) / 2 + 2;
  return (
    <>
      <defs>
        <clipPath id={CLIP} clipPathUnits="userSpaceOnUse">
          <path d={`M0 0H720V260H0ZM${STYLO.l - 16} ${STYLO.y}H${STYLO.r + 16}V${GROUND}H${STYLO.l - 16}Z`} clipRule="evenodd" />
        </clipPath>
      </defs>

      {/* 먼 산 — 기단 뒤로 숨는다 */}
      <g clipPath={`url(#${CLIP})`} fill={gold} fillOpacity=".08" stroke={gold} strokeOpacity=".15">
        <path d={`M0 ${GROUND}L58 166L108 194L166 152L214 198L246 ${GROUND}Z`} />
        <path d={`M474 ${GROUND}L506 200L556 158L604 190L662 148L720 ${GROUND}Z`} />
      </g>

      {/* 하늘 — 초승달과 별 */}
      <path d={crescent(502, 42, 12)} fill={LIGHT} fillOpacity=".85" stroke="none" />
      {STARS.map(([x, y, s, o]) => <Sparkle key={`${x}-${y}`} x={x} y={y} s={s} o={o} />)}

      {/* 기단 */}
      <path d={crepis()} fill={metal} stroke={gold} strokeWidth="1.5" strokeOpacity=".8" />

      {/* 기둥 — 채움, 플루팅, 윤곽, 주두 */}
      {COLS.map((x) => (
        <g key={x}>
          <path d={columnFill(x)} fill={metal} stroke="none" />
          <g stroke={gold}>
            {FLUTES.map(({ o, a }) => <path key={o} d={flute(x, o)} strokeOpacity={a} />)}
          </g>
          <path d={columnStroke(x)} stroke={gold} strokeWidth="1.5" strokeOpacity=".85" />
          <path d={`M${x - CAP.w} ${CAP.echinus}H${x + CAP.w}M${x - SHAFT.wTop} ${SHAFT.top + 3}H${x + SHAFT.wTop}`} stroke={gold} strokeOpacity=".5" />
        </g>
      ))}

      {/* 엔타블러처 — 아키트레이브, 트리글리프·메토프 프리즈, 코니스 */}
      <path d={entablature()} fill={metal} stroke={gold} strokeWidth="1.5" strokeOpacity=".85" />
      <path d={`M${ENT.l} ${ENT.arch}H${ENT.r}`} stroke={gold} strokeOpacity=".5" />
      {TRIGLYPHS.map((x) => (
        <g key={x} stroke={gold}>
          <path d={`M${x - 4.5} ${ENT.frieze + 2}H${x + 4.5}V${ENT.arch - 2}H${x - 4.5}Z`} fill={LIGHT} fillOpacity=".16" strokeOpacity=".6" />
          <path d={`M${x - 1.5} ${ENT.frieze + 3}V${ENT.arch - 3}M${x + 1.5} ${ENT.frieze + 3}V${ENT.arch - 3}`} strokeOpacity=".4" />
        </g>
      ))}

      {/* 페디먼트 — 밑변은 코니스 윗선과 같으므로 긋지 않는다 */}
      <path d={`M${ENT.cl} ${ENT.cornice}L${CX} ${PED.apex}L${ENT.cr} ${ENT.cornice}`} fill={metal} stroke={gold} strokeWidth="1.5" strokeOpacity=".85" />
      <path d={tym.d} fill="#0a0a0a" fillOpacity=".45" stroke={gold} strokeOpacity=".3" />
      <circle cx={CX} cy={discY} r={6} fill={LIGHT} fillOpacity=".95" stroke="none" />
      <g stroke={LIGHT} strokeOpacity=".75" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <path key={d} d="M0 -8.5V-12" transform={`translate(${CX} ${discY}) rotate(${d})`} />)}
      </g>

      {/* 아크로테리온 — 꼭대기 하나, 모서리 둘 */}
      <g stroke={gold} strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round">
        <path d={palmette(CX, PED.apex, 11)} />
        <path d={palmette(ENT.cl + 2, ENT.cornice, 6)} />
        <path d={palmette(ENT.cr - 2, ENT.cornice, 6)} />
      </g>
    </>
  );
}
