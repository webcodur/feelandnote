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
