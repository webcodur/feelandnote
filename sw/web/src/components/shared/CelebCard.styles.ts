// #region Variant Styles
/* 뱃지 크기: 화면 폭이 아니라 "카드 자신의 폭"에 비례해 연속으로 변한다(@container + cqw).
   ① 화면 폭 기준이면 한 줄 장수가 늘어나 카드가 좁아지는 구간에서 뱃지만 커지는 뒤집힘이 생긴다.
   ② 특정 폭에서 값을 갈아끼우는 방식도 그 지점에서 크기가 툭 튄다.
   그래서 cqw(카드 폭의 %)로 잇고 clamp로 아래위 한계만 잡는다 — 카드 109~200px 구간에서 매끄럽다. */
export const badgeStyles = {
  /* 반응 2단: 카드에 손을 올리면 옅게 밝아지고(group-hover), 뱃지를 직접 가리키면 색을 뒤집어
     카드 애니메이션에 묻히지 않게 한다(hover). 둘 다 transition 없이 즉시 — 즉각 반응 축이다. */
  card: "absolute top-[clamp(4px,3cqw,8px)] right-[clamp(4px,3cqw,8px)] min-w-[clamp(18px,15cqw,28px)] h-[clamp(18px,15cqw,28px)] px-[clamp(3px,1.5cqw,8px)] bg-black/70 rounded-full border border-accent/50 text-accent text-[clamp(11px,7cqw,12px)] shadow-sm group-hover:bg-black/70 group-hover:border-accent group-hover:text-accent-hover hover:bg-accent hover:border-accent hover:text-black hover:shadow-[0_0_10px_rgba(212,175,55,0.5)]",
  circle: "absolute -top-1 -right-1 min-w-[28px] h-7 px-1.5 bg-accent text-black rounded-full text-xs",
  medallion: "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent text-black rounded-full border border-black/20 shadow-lg text-[10px]",
};
// #endregion

export const quietBadgeStyles = {
  card: "absolute top-[clamp(4px,3cqw,8px)] right-[clamp(4px,3cqw,8px)] min-w-[clamp(18px,15cqw,28px)] h-[clamp(18px,15cqw,28px)] px-[clamp(3px,1.5cqw,8px)] rounded-full text-[clamp(11px,7cqw,12px)]",
  circle: "absolute -top-1 -right-1 min-w-[28px] h-7 px-1.5 rounded-full text-xs",
  medallion: "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px]",
};

/* 트렌드 직접 매칭 카드의 화염 테두리. border에는 그라데이션이 없으니 배경 2층으로 그린다:
   1층은 카드 바탕을 padding-box에, 2층은 이 원추 그라데이션을 border-box에 깔고
   border를 투명하게 두면 둥근 모서리를 따라 불길이 보인다.
   아래(180°)는 연노랑, 위로 갈수록 주황→빨강으로 타오른다.
   --flame-angle은 globals.css의 @property 등록 각도로, animate-flame-edge가 느리게 돌려
   불꽃이 테두리를 핥듯 움직인다. 미지원 환경은 180deg 정적 링. */
export const FLAME_EDGE =
  "conic-gradient(from var(--flame-angle, 180deg), #fde68a, #fbbf24 12%, #f97316 32%, #ef4444 50%, #b91c1c 66%, #f97316 82%, #fbbf24 94%, #fde68a)";

/* 트렌드 매칭 표기 — 네모 칩이 급상승 표지다. auto 칩은 맥박치는 화염 테두리를 입는다
   (칩 자체가 [급상승 top n] 표기). 탐색 설명대 범례가 같은 모양을 쓰도록 여기 한 곳에서 쥔다. */
export const TREND_CHIP_BASE =
  "inline-flex items-center whitespace-nowrap rounded px-1.5 py-px text-[10px] font-semibold leading-tight";
export const TREND_CHIP_DIRECT = "border-2 border-transparent animate-flame-edge text-accent";
/* 탐색 카드처럼 테두리가 이미 표지인 자리의 평범한 테두리 칩 */
export const TREND_CHIP_PLAIN = "border border-white/20 text-text-secondary";
/* 홈 명부 칩 — 금박 테두리 하나로 단순하게 */
export const TREND_CHIP_GOLD = "border border-accent/60 text-accent";
/* 칩의 안쪽 면 — 칩이 놓이는 자리가 달라도 같은 색이 되도록 카드 바탕을 올린다 */
export const TREND_CHIP_FLAME_BG =
  `linear-gradient(var(--color-bg-card), var(--color-bg-card)) padding-box, ${FLAME_EDGE} border-box`;

/* 같은 애니메이션이 여러 카드·칩에 걸리면 위상이 같아 전부 동시에 뛴다.
   시드(인물 id·이름)로 음수 지연을 뽑아 각자 다른 시점부터 재생되게 어긋나게 한다. */
export function trendEdgeDelay(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return `${-(Math.abs(h) % 2600) / 1000}s`;
}
