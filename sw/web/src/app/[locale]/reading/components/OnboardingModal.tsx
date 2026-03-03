/*
  파일명: /app/reading/components/OnboardingModal.tsx
  기능: 사용 안내 모달
  책임: 최초 접속 시 페이지 사용 방법을 안내한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { X, MousePointer2, BookOpen, Timer, Sparkles, StickyNote, FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: BookOpen, titleKey: "bookSelect", descKey: "bookSelectDesc" },
  { icon: Timer, titleKey: "autoTimer", descKey: "autoTimerDesc" },
  { icon: FileText, titleKey: "mainNote", descKey: "mainNoteDesc" },
  { icon: Sparkles, titleKey: "aiQuestion", descKey: "aiQuestionDesc" },
  { icon: StickyNote, titleKey: "autoSave", descKey: "autoSaveDesc" },
] as const;

export default function OnboardingModal({ isOpen, onClose }: Props) {
  const t = useTranslations("reading.onboarding");
  const tf = useTranslations("reading.onboarding.features");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-sm text-text-secondary">{t("subtitle")}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 기능 설명 */}
        <div className="max-h-[400px] overflow-y-auto p-4">
          <ul className="space-y-4">
            {FEATURES.map((feature, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <feature.icon className="size-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">{tf(feature.titleKey)}</p>
                  <p className="text-sm text-text-secondary">{tf(feature.descKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 푸터 */}
        <div className="border-t border-border p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-white hover:bg-accent-hover"
          >
            {t("startButton")}
          </button>
          <p className="mt-2 text-center text-xs text-text-secondary">
            {t("reopenHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
