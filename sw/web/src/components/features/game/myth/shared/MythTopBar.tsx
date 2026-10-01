/*
  파일명: components/features/game/myth/shared/MythTopBar.tsx
  기능: 신화 게임 머리줄
  책임: 목록으로 돌아가기(ESC와 같다)·게임 이름(누르면 시작 화면)·지금 단계를 한 줄에 둔다.
        휴대폰에서는 돌아가기가 아이콘 하나가 되고 게임 이름이 남는 폭을 모두 쓴다.
*/ // ------------------------------
"use client";

import { ChevronLeft } from "lucide-react";

interface Props {
  hubLabel: string;
  title: string;
  phaseLabel?: string | null;
  exitHint: string;
  onHub: () => void;
  onTitle: () => void;
}

export default function MythTopBar({ hubLabel, title, phaseLabel, exitHint, onHub, onTitle }: Props) {
  return (
    <header className="relative z-[2] flex h-14 shrink-0 items-center gap-2 bg-bg-main/75 px-2 backdrop-blur-md sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onHub}
        title={exitHint}
        className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-bg-card/80 px-2.5 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent sm:pe-3.5"
      >
        <ChevronLeft size={20} aria-hidden />
        <span className="sr-only sm:not-sr-only">{hubLabel}</span>
      </button>
      <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
      <button
        type="button"
        onClick={onTitle}
        className="flex min-h-11 min-w-0 items-center truncate rounded-md px-1.5 text-base font-bold text-text-primary hover:text-accent"
      >
        <span className="truncate">{title}</span>
      </button>
      {phaseLabel && (
        <span className="shrink-0 rounded-full border border-accent-dim bg-accent/10 px-2.5 py-0.5 text-sm font-semibold text-accent">
          {phaseLabel}
        </span>
      )}
      <span className="ms-auto hidden shrink-0 items-center gap-2 text-sm text-text-tertiary lg:flex">
        <kbd className="rounded border border-border bg-bg-card px-1.5 py-0.5 text-sm font-semibold text-text-secondary">ESC</kbd>
        {hubLabel}
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/45 to-transparent" />
    </header>
  );
}
