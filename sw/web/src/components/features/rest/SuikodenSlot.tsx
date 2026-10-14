"use client";

import dynamic from "next/dynamic";
import { Z_INDEX } from "@/constants/zIndex";

const CheondoApp = dynamic(() => import("@/components/features/game/suikoden/CheondoApp"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 grid place-items-center bg-bg-main text-text-secondary" style={{ zIndex: Z_INDEX.top }} role="status">Loading…</div>,
});

export default function SuikodenSlot({ onExitFullScreenExternal }: { onExitFullScreenExternal: () => void }) {
  return <CheondoApp onExit={onExitFullScreenExternal} />;
}
