/*
  파일명: components/features/game/myth/troy/ui/battle/CameraPad.tsx
  기능: 트로이 전쟁 카메라·빠르기 단추
  책임: 판 돌리기(90°씩)와 가까이·멀리를 단추로 두고, 맨 아래에 연출 「빠르게」 켜고 끄기를 둔다. 넓은 화면은 Q·E 키로도 돌린다(3D 판이 받는다).
        판 위에 떠 있으므로 단추 사이 틈은 판 누름을 가로채지 않게 하고, 손가락으로 쓰는 화면은 두 손가락 벌리기로 확대하므로 확대 단추를 뺀다.
*/ // ------------------------------
"use client";
import { FastForward, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BoardView } from "../../scene/BoardView";
const BTN = "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-main/85 text-text-secondary hover:border-accent hover:text-accent";
const ON = "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent bg-accent text-bg-main hover:bg-accent-hover";
interface Props {
  view: BoardView | null;
  fast: boolean;
  onFast: () => void;
}
export default function CameraPad({ view, fast, onFast }: Props) {
  const t = useTranslations("gameMythTroy.hud");
  const items = [
    { key: "rotateLeft", Icon: RotateCcw, run: () => view?.rotate(-1), only: "" },
    { key: "rotateRight", Icon: RotateCw, run: () => view?.rotate(1), only: "" },
    { key: "zoomIn", Icon: ZoomIn, run: () => view?.zoomBy(0.85), only: "pointer-coarse:hidden" },
    { key: "zoomOut", Icon: ZoomOut, run: () => view?.zoomBy(1.18), only: "pointer-coarse:hidden" },
  ] as const;
  return (
    <div className="pointer-events-none flex flex-col gap-2">
      {items.map(({ key, Icon, run, only }) => (
        <button key={key} type="button" onClick={run} className={`${BTN} ${only}`} aria-label={t(key)} title={t(key)}>
          <Icon className="h-5 w-5" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={onFast} className={`mt-2 ${fast ? ON : BTN}`} aria-pressed={fast} aria-label={t("fast")} title={t("fast")}>
        <FastForward className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
