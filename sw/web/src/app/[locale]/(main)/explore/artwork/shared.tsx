/*
  파일명: /app/(main)/explore/artwork/shared.tsx
  기능: 바로가기 카드 그림 4장이 함께 쓰는 판 규격과 부품
  책임: 판은 720×260. 주제는 가운데 300px(x 210~510) 안에 둔다 — 좁은 화면(4:3)은 x 187~533만 보이고,
        넓은 화면(3:1)은 y 10~250만 보인다. 지평선은 y 218.
*/ // ------------------------------

/* 네 카드가 같은 손에서 나온 것처럼 보이게 하는 규칙 — 카드 파일은 이 값만 쓴다.
   - 선: 주제 윤곽 STROKE.main, 보조 STROKE.sub, 장식 STROKE.deco. 크기 비례 굵기는 두지 않는다.
   - 밝은 강조(LIGHT): 카드당 주제의 심장 1곳 + 보조 4곳 이하.
   - 분위기 색(tint): 그림 안에서는 강조 1곳만. 나머지는 판(하늘·후광·반사)이 쓴다.
   - 반짝임: 카드당 4~5개, 크기 3~5, 불투명 .35~.6, 좌우 거울 배치.
   - 주제 봉투: 꼭대기 y 30±4, 밑 218(지평선을 딛는다). 무게중심 y 120±5.
   - 좌우 장식은 끝이 x 187~533 안에 들어오거나 완전히 밖에 있어야 한다. 잘림선에 걸치지 않는다. */
export const STROKE = { main: 1.5, sub: 1, deco: 0.8 } as const;
export const OPACITY = { main: 1, sub: 0.6, deco: 0.3 } as const;
export const LIGHT = "#f6dc8f";
export const DARK = "#0e1116";

export const W = 720;
export const H = 260;
export const CX = 360;
export const GROUND = 218;

export interface ArtProps {
  /** 금 그라디언트 url — 선·테두리 */
  gold: string;
  /** 금속 채움 그라디언트 url — 면 */
  metal: string;
  /** 카드 분위기 색 — 보조 강조 */
  tint: string;
}

export const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
};
export const pt = (p: readonly [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** 네 갈래 반짝임 — 하늘 장식 */
export function Sparkle({ x, y, s = 5, o = 0.6 }: { x: number; y: number; s?: number; o?: number }) {
  return <path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`} fill={LIGHT} fillOpacity={o} stroke="none" />;
}
