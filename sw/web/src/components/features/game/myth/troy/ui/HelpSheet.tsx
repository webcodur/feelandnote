/*
  파일명: components/features/game/myth/troy/ui/HelpSheet.tsx
  기능: 트로이 전쟁 싸우는 법
  책임: 칸 전투의 기본(고르기·움직이기·예측·지형·높이·인연·맞수·쓰러짐)을 짧은 줄로 보여 주는 창.
*/ // ------------------------------
"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { MODAL_MAX_HEIGHT } from "@/components/ui/modalLayout";

export default function HelpSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("gameMythTroy");
  const lines = t.raw("help.lines") as string[];
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg-main/80 p-3" role="dialog" aria-label={t("help.heading")} onClick={onClose}>
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-border-gold bg-bg-card p-5 sm:p-6" style={{ maxHeight: MODAL_MAX_HEIGHT }} onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-xl font-black text-text-primary">{t("help.heading")}</h2>
          <button type="button" onClick={onClose} aria-label={t("frame.close")} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-text-secondary hover:border-accent hover:text-accent">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <ol className="mt-4 flex min-h-0 flex-col gap-3 overflow-y-auto">
          {lines.map((line, i) => (
            <li key={line} className="flex gap-3 text-sm leading-relaxed text-text-primary sm:text-base">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-dim text-sm font-bold text-accent">{i + 1}</span>
              <span className="break-keep">{line}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
