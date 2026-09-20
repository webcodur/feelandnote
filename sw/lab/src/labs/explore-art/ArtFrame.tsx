/*
  파일명: /labs/explore-art/ArtFrame.tsx
  기능: 탐색 허브 바로가기 카드의 장식 그림 — 흑요석 위 금선 세공
  책임: 판(하늘·후광·지평선·반사)과 그라디언트를 깔고 카드별 그림(artwork/)을 얹는다.
        가로 세공선 결은 두지 않는다 — 카드 배율에서 모아레가 생겼다. 번짐은 0.8 — 더 크면 가는 선이 안개가 된다.
        금 그라디언트는 세로 방향이다 — 대각선이면 좌우 대칭 그림의 오른쪽이 탁해진다. 반사선은 넓은 화면 잘림선(y 250) 안에 둔다.
        색은 사이트 금색 하나로 통일하고 카드마다 분위기 색만 다르게 준다. 자료를 표현하지 않는 순수 장식이다.
        판 규격과 잘림 범위는 artwork/shared.tsx가 쥔다.
*/ // ------------------------------

import { W, H, CX, GROUND } from "./shared";
import SpectrumBalance from "./SpectrumBalance";
import MythMountain from "./MythMountain";
import FactionArch from "./FactionArch";

/* 2×2 격자에서 난색·한색이 대각선으로 교차한다 — 같은 열에 난색만 몰리면 격자 가운데 세로 경계가 생긴다.
   금선과 같은 색이나 금과 30° 안쪽 색(청동)은 쓰지 않는다 — 그림 속 강조가 금과 구분되지 않는다. */
/* glow는 색별 후광 세기 — 밝은 한색·난색(청록·구리)은 같은 불투명도에서 더 밝게 떠 격자 좌우 밝기가 어긋난다. */
const TINTS: Record<string, { color: string; glow: number }> = {
  balance: { color: "#5fbfa8", glow: 0.18 },
  mountain: { color: "#6f7ad8", glow: 0.26 },
  arch: { color: "#b8573a", glow: 0.2 },
};

const ARTS = { balance: SpectrumBalance, mountain: MythMountain, arch: FactionArch } as const;

/** Decorative illustrations only; the shapes do not represent measured figure data. */
export default function ArtFrame({ variant }: { variant: string }) {
  const { color: tint, glow } = TINTS[variant] ?? TINTS.balance;
  const id = `explore-art-${variant}`;
  const gold = `url(#${id}-gold)`;
  const metal = `url(#${id}-metal)`;
  const Art = ARTS[variant as keyof typeof ARTS] ?? SpectrumBalance;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false" className="h-full w-full">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop stopColor="#f6dc8f" /><stop offset=".5" stopColor="#d4af37" /><stop offset="1" stopColor="#9a7f2e" />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f6dc8f" stopOpacity=".36" /><stop offset="1" stopColor="#8a732a" stopOpacity=".08" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor={tint} stopOpacity={glow} /><stop offset=".55" stopColor={tint} stopOpacity={glow * 0.3} /><stop offset="1" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={tint} stopOpacity=".1" /><stop offset="1" stopColor={tint} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation=".8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <ellipse cx={CX} cy={110} rx={300} ry={150} fill={`url(#${id}-glow)`} />
      <path d={`M0 ${GROUND}H${W}`} stroke={gold} strokeOpacity=".4" />
      <path d={`M100 ${GROUND + 8}H620M200 ${GROUND + 16}H520M270 ${GROUND + 24}H450`} stroke={gold} strokeOpacity=".12" />
      <ellipse cx={CX} cy={GROUND} rx={120} ry={4} fill={tint} fillOpacity=".12" />
      <g filter={`url(#${id}-soft)`}>
        <Art gold={gold} metal={metal} tint={tint} />
      </g>
    </svg>
  );
}
