"use client";

import { Z_INDEX } from "@/constants/zIndex";

const CORNER_SIZE = 16;

const CORNER_RADIUS = {
  lg: { tl: "rounded-tl-lg", tr: "rounded-tr-lg", bl: "rounded-bl-lg", br: "rounded-br-lg" },
  xl: { tl: "rounded-tl-xl", tr: "rounded-tr-xl", bl: "rounded-bl-xl", br: "rounded-br-xl" },
};

const CORNER_COMMON = "drop-shadow-[0_0_3px_rgba(212,175,55,0.6)]";

export default function CornerAccents({ radius = "xl" }: { radius?: "lg" | "xl" }) {
  const r = CORNER_RADIUS[radius];
  return (
    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/card:opacity-100" style={{ zIndex: Z_INDEX.cardBadge - 1 }}>
      <span className={`absolute top-0 left-0 border-t-[2.5px] border-l-[2.5px] border-accent ${CORNER_COMMON} ${r.tl}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
      <span className={`absolute top-0 right-0 border-t-[2.5px] border-r-[2.5px] border-accent ${CORNER_COMMON} ${r.tr}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
      <span className={`absolute bottom-0 left-0 border-b-[2.5px] border-l-[2.5px] border-accent ${CORNER_COMMON} ${r.bl}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
      <span className={`absolute bottom-0 right-0 border-b-[2.5px] border-r-[2.5px] border-accent ${CORNER_COMMON} ${r.br}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
    </div>
  );
}
