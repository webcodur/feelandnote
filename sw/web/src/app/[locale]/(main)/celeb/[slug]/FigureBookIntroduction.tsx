/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 원전 소개글(펼침 모달)
 * - 목차 위치: sourceWorks
 * - 넓은 화면(lg)은 줄 수를 박지 않고 FigureBookFeature가 준 칸을 채운다. 본문은 네 줄(min-h-28)을 바닥으로 늘어난다
 * - 좁은 화면은 네 줄(max-h-28)에서 접는다. 넘칠 때만 끝 흐림이 붙고, 본문을 누르면 언제든 전체 소개 모달이 열린다
 * - 데이터: description/label/sourceTitle props
 * - 함께 보기: FigureBookFeature.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import FormattedText from "@/components/ui/FormattedText";
import { INTRO_PROVIDER_HEADING_NAME } from "@/components/shared/BookIntroductionSource";
import type { BookIntroductionAttribution } from "@/lib/utils/book-description";
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
  attribution?: BookIntroductionAttribution | null;
  showSource?: boolean;
  sourceTitle: string;
  sourceTitleBadge?: TitleBadge | null;
}

export default function FigureBookIntroduction({
  description,
  label,
  loading = false,
  attribution,
  showSource = true,
  sourceTitle,
  sourceTitleBadge,
}: FigureBookIntroductionProps) {
  const t = useTranslations("celebPage");
  const locale = useLocale();
  const triggerRef = useRef<HTMLParagraphElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  /* ── 1. 넘침 측정 — 로딩 중에는 본문이 없어 재지 않는다 ── */
  const { ref: previewRef, isClipped } = useClippedText<HTMLParagraphElement>(description, !loading);
  // 출처는 제목에 합쳐 「다음 작품 소개」처럼 한 덩어리로 읽는다
  const providerName =
    showSource && attribution?.provider
      ? INTRO_PROVIDER_HEADING_NAME[attribution.provider]?.[locale === "en" ? "en" : "ko"]
      : null;
  const mergedLabel = providerName ? `${providerName} ${label}` : label;

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
          <div className="flex flex-wrap items-center justify-center gap-2 lg:shrink-0">
            <p className="text-sm font-black tracking-[0.16em] text-accent">{mergedLabel}</p>
          </div>
          {/* 본문 자체가 전체 보기를 연다 — 모달이 다른 읽기 화면이라 길이와 무관하게 항상 눌린다 */}
          <p
            ref={(node) => {
              previewRef.current = node;
              triggerRef.current = node;
            }}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label={t("sourceWorkIntroductionOpen")}
            title={t("sourceWorkIntroductionOpen")}
            onClick={() => {
              // 글을 긁으려던 클릭(드래그 선택)은 모달을 열지 않는다
              if (!window.getSelection()?.toString()) setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsOpen(true);
              }
            }}
            className={`${isClipped ? `${PREVIEW_CLASS} ${PREVIEW_CLIPPED_CLASS}` : PREVIEW_CLASS} cursor-pointer text-center hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
          >
            <FormattedText text={description} />
          </p>
        </>
      )}

      {isOpen ? (
        <IntroductionModal
          description={description}
          label={mergedLabel}
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
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]');
      const first = focusable?.[0];
      const last = focusable?.[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
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
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black tracking-[0.16em] text-accent">{label}</p>
            </div>
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
