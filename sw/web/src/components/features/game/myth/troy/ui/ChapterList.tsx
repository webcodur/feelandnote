/*
  파일명: components/features/game/myth/troy/ui/ChapterList.tsx
  기능: 트로이 전쟁 장 고르기
  책임: 원정의 장을 차례대로 늘어놓는다. 장마다 이름·출전·줄거리·넘음 여부·가장 빠른 판을 보이고, 앞 장을 넘지 않은 장은 잠근다.
*/ // ------------------------------
"use client";

import { ArrowLeft, Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { CHAPTERS } from "../campaign";
import { isUnlocked } from "../campaign/progress";
import type { CampaignSave } from "../model";
import type { StoryLocale } from "../story/types";

interface Props {
  save: CampaignSave;
  locale: StoryLocale;
  onPick: (id: string) => void;
  onBack: () => void;
}

export default function ChapterList({ save, locale, onPick, onBack }: Props) {
  const t = useTranslations("gameMythTroy.chapters");
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain bg-bg-main">
      <div className="mx-auto w-full max-w-4xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg-card px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{t("back")}
          </button>
          <h1 className="text-2xl font-black text-text-primary sm:text-3xl">{t("heading")}</h1>
        </div>
        <ol className="mt-6 flex flex-col gap-3">
          {CHAPTERS.map((entry) => {
            const story = entry.story[locale];
            const open = isUnlocked(save, entry.id);
            const won = save.cleared.includes(entry.id);
            const best = save.bestTurns[entry.id];
            return (
              <li key={entry.id}>
                <button type="button" disabled={!open} onClick={() => onPick(entry.id)}
                  className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-bg-card p-4 text-start hover:border-accent disabled:cursor-not-allowed disabled:hover:border-border sm:p-5">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-black ${won ? "border-accent bg-accent/15 text-accent" : "border-border text-text-secondary"}`}>
                    {open ? entry.no : <Lock className="h-5 w-5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold text-accent">{t("chapterNo", { no: entry.no })}</span>
                      <span className="text-lg font-bold text-text-primary group-hover:text-accent sm:text-xl">{story.title}</span>
                      {won && <span className="inline-flex items-center gap-1 text-sm font-semibold text-status-watching"><Check className="h-4 w-4" aria-hidden />{t("cleared")}</span>}
                    </span>
                    <span className="mt-1 block text-sm text-text-tertiary">{story.source}</span>
                    <span className="mt-2 block break-keep text-sm leading-relaxed text-text-secondary sm:text-base">{open ? story.summary : t("locked")}</span>
                    {best && <span className="mt-2 block text-sm text-text-secondary">{t("best", { turns: best })}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
