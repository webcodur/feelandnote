/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 원전 소개글(펼침 모달)
 * - 목차 위치: sourceWorks
 * - 넓은 화면(lg)은 줄 수를 박지 않고 FigureBookFeature가 준 칸을 채운다. 본문은 네 줄(min-h-28)을 바닥으로 늘어난다
 * - 좁은 화면은 네 줄(max-h-28)에서 접는다. 넘칠 때만 「전체 소개 보기」와 끝 흐림이 붙는다
 * - 데이터: description/label/sourceTitle props
 * - 함께 보기: FigureBookFeature.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import FormattedText from "@/components/ui/FormattedText";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import PendingMark from "@/components/ui/pending/PendingMark";
import { Z_INDEX } from "@/constants/zIndex";
import type { TitleBadge } from "@/lib/utils/content-locale";
import { useClippedText } from "@/hooks/useClippedText";

/* 좁은 화면은 네 줄(max-h-28)에서 접고, 넓은 화면은 네 줄을 바닥으로 칸을 채운다. contain-size라 본문이 행을 밀지 않는다.
   클래스는 상수에 둔다 — Tailwind 스캐너는 템플릿 문자열에서 ${ 바로 앞의 토큰을 뽑지 않는다 */
const PREVIEW_CLASS =
  "mt-2 max-h-28 overflow-hidden whitespace-pre-line text-base leading-7 text-text-secondary lg:min-h-28 lg:max-h-none lg:flex-1 lg:contain-size";
const PREVIEW_CLIPPED_CLASS = "lg:clip-fade-end";

interface FigureBookIntroductionProps {
  description: string;
  label: string;
  loading?: boolean;
  sourceTitle: string;
  sourceTitleBadge?: TitleBadge | null;
}

export default function FigureBookIntroduction({
  description,
  label,
  loading = false,
  sourceTitle,
  sourceTitleBadge,
}: FigureBookIntroductionProps) {
  const t = useTranslations("celebPage");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  /* ── 1. 넘침 측정 — 로딩 중에는 본문이 없어 재지 않는다 ── */
  const { ref: previewRef, isClipped } = useClippedText<HTMLParagraphElement>(description, !loading);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  return (
    <div
      className="engraved-plate relative mt-5 min-h-28 border-s-2 border-accent px-4 py-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      role={loading ? "status" : undefined}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <PendingMark size="sm" />
        </div>
      ) : (
        <>
          <p className="text-sm font-black tracking-[0.16em] text-accent lg:shrink-0">{label}</p>
          <p
            ref={previewRef}
            className={isClipped ? `${PREVIEW_CLASS} ${PREVIEW_CLIPPED_CLASS}` : PREVIEW_CLASS}
          >
            <FormattedText text={description} />
          </p>
          {isClipped ? (
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              onClick={() => setIsOpen(true)}
              className="mt-2 min-h-10 border-b border-accent-dim pb-1 text-sm font-black text-accent lg:shrink-0 hover:border-accent-hover hover:text-accent-hover active:text-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("sourceWorkIntroductionOpen")}
            </button>
          ) : null}
        </>
      )}

      {isOpen ? (
        <IntroductionModal
          description={description}
          label={label}
          sourceTitle={sourceTitle}
          sourceTitleBadge={sourceTitleBadge}
          closeLabel={t("sourceWorkIntroductionClose")}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
}

/* ── 2. 전체 보기 모달 ── */
function IntroductionModal({
  description,
  label,
  sourceTitle,
  sourceTitleBadge,
  closeLabel,
  onClose,
}: {
  description: string;
  label: string;
  sourceTitle: string;
  sourceTitleBadge?: TitleBadge | null;
  closeLabel: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      event.preventDefault();
      closeRef.current?.focus();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm animate-modal-overlay"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden border border-accent-dim/60 bg-bg-card shadow-2xl animate-modal-content"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="grid shrink-0 grid-cols-[1fr_auto] items-start gap-4 border-b border-stone-light bg-bg-secondary bg-texture-marble px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="text-sm font-black tracking-[0.16em] text-accent">{label}</p>
            <h2 id={titleId} className="mt-1 text-xl font-black text-text-primary sm:text-2xl">
              <NoEditionBadge badge={sourceTitleBadge} className="align-middle" />
              {sourceTitle}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex size-10 items-center justify-center border border-stone-light bg-bg-card text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-texture-noise px-5 py-6 [overflow-anchor:none] sm:px-8 sm:py-8">
          <p className="whitespace-pre-wrap break-words text-base leading-8 text-text-primary">
            <FormattedText text={description} />
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
