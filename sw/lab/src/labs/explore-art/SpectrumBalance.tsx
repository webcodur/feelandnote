/*
  파일명: /labs/explore-art/SpectrumBalance.tsx
  기능: 스펙트럼 — 살짝 기울어진 천칭. 양 접시에 서로 다른 구슬이 놓여 성향의 양극을 견준다
  책임: 자료를 표현하지 않는 순수 장식이다. 기울기·구슬 크기는 형태 대비를 위한 임의값이다.
        받침대는 지평선(218)을 딛고, 들보는 받침점(y 72)에서 8도 기울어 왼쪽이 무겁다. 접시는 좁은 화면 잘림(x 187~533) 안에 둔다.
        이 카드는 꼭대기 y 30 규칙을 풀어 들보 끝 구슬이 y≈48에서 멈춘다 — 기둥이 길면 가로등으로 읽힌다.
        맞닿는 변은 한 번만 긋는다 — 받침대 밑변은 판의 지평선이, 기둥 밑변은 받침대 윗변이, 기둥 윗변은 주두가 맡는다.
        끝 구슬은 불투명 금, 핀은 금속 원판에 밝은 심 — 둘 다 밑에 깔린 들보 선을 가린다.
  보관: 탐색 카드 시안. 스펙트럼을 천칭으로 그린 안 — 일대일 대결로 읽혀 내렸다. 서비스에는 쓰지 않는다.
*/ // ------------------------------

import { CX, DARK, GROUND, LIGHT, OPACITY, STROKE, Sparkle, polar, pt, type ArtProps } from "./shared";

const PIVOT = { x: CX, y: 72 }; // 받침점 — 들보의 축
const TILT = 8; // 도. 오른쪽 끝이 오른다 — 10도는 「판결」로 읽혀 줄였다
const ARM = 116; // 받침점에서 들보 끝까지
const BEAM = { mid: 2.5, end: 1.5 }; // 들보 반두께 — 가운데가 두껍다
const KNOB = 4; // 들보 끝 구슬 — 사슬은 그 밑점에서 시작한다
const PIN = 7.5; // 핀 밑이 주두 윗변(80)에 닿고, 들보 밑변은 주두 모서리와 3 띄운다
const CHAIN = 40; // 고리 밑점에서 접시 테까지 세로 길이
const PAN = { rx: 42, ry: 9, wall: 7, hangDeg: 36 }; // 사슬은 뒤쪽 테 ±36도 지점에 닿는다
const CAPITAL = { top: 80, bot: 86, hwTop: 11.2, hwBot: 7 }; // 얕은 사다리꼴 주두 — 윗폭은 기둥의 1.6배
const SHAFT = { top: 86, bot: 200, hwTop: 7, hwBot: 9 };
const STEPS = [{ hw: 18, top: 200 }, { hw: 27, top: 209 }]; // 두 단 — 밑단 폭은 기둥 폭의 3배. 밑변은 지평선 218
const BEADS = { light: 7, tint: 6 }; // 무거운 쪽(왼쪽)이 조금 크다

const f = (n: number) => n.toFixed(1);
const P = (r: number, deg: number) => polar(PIVOT.x, PIVOT.y, r, deg);

/** 들보 양끝 세계 좌표 — 왼쪽은 170도, 오른쪽은 -10도 방향 */
const END = { left: P(ARM, 180 - TILT), right: P(ARM, -TILT) };

/** 받침대 — 두 단 계단. 밑변은 지평선이 맡으므로 윤곽은 열어 둔다 */
const plinthOutline = () => {
  const [s1, s2] = STEPS;
  return `M${CX - s2.hw} ${GROUND}V${s2.top}H${CX - s1.hw}V${s1.top}H${CX + s1.hw}V${s2.top}H${CX + s2.hw}V${GROUND}`;
};

/** 기둥 몸통 — 위로 갈수록 좁다. 윤곽은 두 옆선만 */
const shaftFill = () => `M${CX - SHAFT.hwBot} ${SHAFT.bot}L${CX - SHAFT.hwTop} ${SHAFT.top}H${CX + SHAFT.hwTop}L${CX + SHAFT.hwBot} ${SHAFT.bot}Z`;
const shaftOutline = () => `M${CX - SHAFT.hwBot} ${SHAFT.bot}L${CX - SHAFT.hwTop} ${SHAFT.top}M${CX + SHAFT.hwTop} ${SHAFT.top}L${CX + SHAFT.hwBot} ${SHAFT.bot}`;

/** 주두 — 위가 넓은 사다리꼴. 밑변은 기둥 윗변과 겹치므로 긋지 않는다 */
const capitalFill = () => `M${CX - CAPITAL.hwBot} ${CAPITAL.bot}L${CX - CAPITAL.hwTop} ${CAPITAL.top}H${CX + CAPITAL.hwTop}L${CX + CAPITAL.hwBot} ${CAPITAL.bot}Z`;
const capitalOutline = () => `M${CX - CAPITAL.hwBot} ${CAPITAL.bot}L${CX - CAPITAL.hwTop} ${CAPITAL.top}H${CX + CAPITAL.hwTop}L${CX + CAPITAL.hwBot} ${CAPITAL.bot}`;

/** 들보 — 받침점 기준 수평으로 그리고 회전한다. 가운데가 두껍고 끝이 얇은 마름모 막대 */
const beamBar = () => {
  const l = PIVOT.x - ARM;
  const r = PIVOT.x + ARM;
  const y = PIVOT.y;
  return `M${l} ${y - BEAM.end}L${PIVOT.x} ${y - BEAM.mid}L${r} ${y - BEAM.end}V${y + BEAM.end}L${PIVOT.x} ${y + BEAM.mid}L${l} ${y + BEAM.end}Z`;
};

/** 접시 하나 — 사슬 두 가닥, 얕은 원반(윗면 타원 + 옆벽), 위에 구슬 */
function Pan({ end, bead, beadColor, gold, metal }: { end: readonly [number, number]; bead: number; beadColor: string; gold: string; metal: string }) {
  const [cx, hookY] = [end[0], end[1] + KNOB];
  const cy = hookY + CHAIN;
  const hang = (deg: number) => [cx + PAN.rx * Math.cos((deg * Math.PI) / 180), cy - PAN.ry * Math.sin((deg * Math.PI) / 180)] as const;
  const [hl, hr] = [hang(180 - PAN.hangDeg), hang(PAN.hangDeg)];
  const wall = `M${f(cx - PAN.rx)} ${cy}A${PAN.rx} ${PAN.ry} 0 0 0 ${f(cx + PAN.rx)} ${cy}V${cy + PAN.wall}A${PAN.rx} ${PAN.ry} 0 0 1 ${f(cx - PAN.rx)} ${cy + PAN.wall}Z`;
  return (
    <g>
      <path d={`M${f(cx)} ${f(hookY)}L${pt(hl)}M${f(cx)} ${f(hookY)}L${pt(hr)}`} stroke={gold} strokeWidth={STROKE.sub} strokeOpacity={OPACITY.sub} />
      <path d={wall} fill={metal} stroke={gold} strokeWidth={STROKE.sub} strokeOpacity={OPACITY.sub} />
      <ellipse cx={cx} cy={cy} rx={PAN.rx} ry={PAN.ry} fill={metal} stroke={gold} strokeWidth={STROKE.main} />
      <ellipse cx={cx} cy={cy + 1} rx={bead * 0.9} ry={2} fill={DARK} fillOpacity=".4" stroke="none" />
      <circle cx={cx} cy={cy - bead + 1} r={bead} fill={beadColor} stroke={gold} strokeWidth={STROKE.sub} strokeOpacity={OPACITY.sub} />
    </g>
  );
}

export default function SpectrumBalance({ gold, metal, tint }: ArtProps) {
  return (
    <>
      {/* 반짝임 — 바깥 쌍은 잘림 밖, 안쪽 쌍은 들보 위 하늘(높은 쪽 들보와 17 띄운다) */}
      <Sparkle x={140} y={72} s={5} o={0.5} /><Sparkle x={580} y={72} s={5} o={0.5} />
      <Sparkle x={300} y={40} s={3.5} o={0.4} /><Sparkle x={420} y={40} s={3.5} o={0.4} />

      {/* 받침대·기둥·주두 — 금속 면 위에 윤곽 */}
      <path d={`${plinthOutline()}Z`} fill={metal} stroke="none" />
      <path d={plinthOutline()} stroke={gold} strokeWidth={STROKE.main} />
      <path d={shaftFill()} fill={metal} stroke="none" />
      <path d={shaftOutline()} stroke={gold} strokeWidth={STROKE.main} />
      <path d={capitalFill()} fill={metal} stroke="none" />
      <path d={capitalOutline()} stroke={gold} strokeWidth={STROKE.main} strokeLinejoin="round" />

      {/* 접시 둘 — 왼쪽이 낮고 무겁다(밝은 구슬), 오른쪽이 높다(분위기 색 구슬) */}
      <Pan end={END.left} bead={BEADS.light} beadColor={LIGHT} gold={gold} metal={metal} />
      <Pan end={END.right} bead={BEADS.tint} beadColor={tint} gold={gold} metal={metal} />

      {/* 들보 — 받침점을 축으로 회전. 끝 구슬은 사슬 고리 */}
      <g transform={`rotate(${-TILT} ${PIVOT.x} ${PIVOT.y})`}>
        <path d={beamBar()} fill={metal} stroke={gold} strokeWidth={STROKE.main} strokeLinejoin="round" />
        <circle cx={PIVOT.x - ARM} cy={PIVOT.y} r={KNOB} fill={gold} stroke="none" />
        <circle cx={PIVOT.x + ARM} cy={PIVOT.y} r={KNOB} fill={gold} stroke="none" />
      </g>

      {/* 받침점 핀 — 금속 원판에 밝은 심. 검은 눈은 실제 크기에서 눈알처럼 튀어 뺐다 */}
      <circle cx={PIVOT.x} cy={PIVOT.y} r={PIN} fill={metal} stroke={gold} strokeWidth={STROKE.main} />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={2} fill={LIGHT} stroke="none" />
    </>
  );
}
