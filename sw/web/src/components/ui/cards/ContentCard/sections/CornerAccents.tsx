"use client";

import { Z_INDEX } from "@/constants/zIndex";

/*
  카드 hover의 즉각 축 — 손을 올리면 카드 둘레가 옅은 금선으로 바로 켜진다(transition 없음).
  예전에는 네 모서리에 빛나는 꺽쇠를 세웠는데, 카드가 여럿 모인 격자에서 장식이 먼저 보였다.
  이름은 호출처를 흔들지 않으려고 그대로 둔다.
*/
const RADIUS_CLASS = {
  lg: "rounded-lg",
  xl: "rounded-xl",
};

export default function CornerAccents({ radius = "xl" }: { radius?: "lg" | "xl" }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 opacity-0 ring-1 ring-inset ring-accent/45 group-hover/card:opacity-100 ${RADIUS_CLASS[radius]}`}
      style={{ zIndex: Z_INDEX.cardBadge - 1 }}
    />
  );
}
