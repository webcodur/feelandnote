/* ─────────────────────────────────────────────
 * [공유] 작품 소개 플레이트(펼침 모달)
 * - 셀럽 상세 sourceWorks와 작품 상세의 책소개가 같은 모듈을 쓴다.
 * - 이웃 열과 나란히 서는 폭(fillFrom, 기본 lg)부터는 줄 수를 박지 않고 칸을 채운다. 본문은 네 줄(min-h-28)을 바닥으로 늘어난다
 * - 제목 줄은 두지 않는다. 본문은 왼쪽 정렬이다
 * - 좁은 화면은 네 줄(max-h-28)에서 접는다. 넘칠 때만 끝 흐림이 붙고, 본문을 누르면 언제든 전체 소개 모달이 열린다
 * - 터치 기기는 넘칠 때 칸 둘레에 금빛 파동을 세 번 준다(마우스 기기는 커서가 대신한다)
 * - 출처는 우하단 칩 하나다. 공급처 이름(다음·카카오·YES24 등 바뀌는 값)은 안쪽 알약에 담아 고정 문구 「원문」과 구분한다
 * - 전체 보기 모달은 읽기 모달 높이(READING_MODAL_MAX_HEIGHT_CLASS)를 따라 위아래 여백을 넉넉히 남긴다
 * - 본문 개행은 normalizeIntroBreaks로 화면 규약에 맞춘다 — 공급처별 표기(다음 <br> 런·카카오 공백 런·저장본 혼재)를 \n=붙는 줄·\n\n=문단으로 정리하고, 문장부호 없이 끝나는 줄끼리의 빈 줄은 시 구절로 보고 붙인다
 * - 데이터: description/label/sourceTitle props. label은 보조기기용 이름으로만 읽힌다
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import FormattedText from "@/components/ui/FormattedText";
import { INTRO_PROVIDER_HEADING_NAME } from "@/components/shared/BookIntroductionSource";
import type { BookIntroductionAttribution } from "@/lib/utils/book-description";
import Modal, { READING_MODAL_MAX_HEIGHT_CLASS } from "@/components/ui/Modal";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import PendingMark from "@/components/ui/pending/PendingMark";
import type { TitleBadge } from "@/lib/utils/content-locale";
import { useClippedText } from "@/hooks/useClippedText";
import { cn } from "@/lib/utils";
import { normalizeIntroBreaks } from "@/lib/utils/prose-line-breaks";

/* 좁은 화면은 네 줄(max-h-28)에서 접고, 채우기 폭부터는 네 줄을 바닥으로 칸을 채운다. contain-size라 본문이 행을 밀지 않는다.
   채우기 폭은 이웃 열과 나란히 서는 폭이다 — 셀럽 상세는 lg, 작품 상세는 sm.
   클래스는 상수에 둔다 — Tailwind 스캐너는 템플릿 문자열에서 ${ 바로 앞의 토큰을 뽑지 않는다 */
const PREVIEW_CLASS =
  "max-h-28 overflow-hidden whitespace-pre-line text-base leading-7 text-text-secondary";
const FILL_CLASSES = {
  sm: {
    root: "sm:flex sm:min-h-0 sm:flex-1 sm:flex-col",
    footer: "sm:shrink-0",
    preview: "sm:min-h-28 sm:max-h-none sm:flex-1 sm:contain-size",
  },
  lg: {
    root: "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col",
    footer: "lg:shrink-0",
    preview: "lg:min-h-28 lg:max-h-none lg:flex-1 lg:contain-size",
  },
} as const;

const SOURCE_CHIP_CLASS =
  "inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent/40 bg-black/30 py-0.5 text-xs leading-5";

interface BookIntroductionPanelProps {
  description: string;
  label: string;
  loading?: boolean;
  attribution?: BookIntroductionAttribution | null;
  showSource?: boolean;
  sourceTitle: string;
  sourceTitleBadge?: TitleBadge | null;
  /** 바깥 여백 조정용. 기본 위 여백(mt-5)은 셀럽 상세 배치 기준이다 */
  className?: string;
  /** 이웃 열 높이만큼 칸을 채우기 시작하는 폭. 부모가 그 폭부터 flex 열로 높이를 내려줘야 한다 */
  fillFrom?: keyof typeof FILL_CLASSES;
}

interface SourceChipProps {
  providerName?: string | null;
  sourceUrl?: string | null;
  title: string;
  originalLabel: string;
}

export default function BookIntroductionPanel({
  description,
  label,
  loading = false,
  attribution,
  showSource = true,
  sourceTitle,
  sourceTitleBadge,
  className,
  fillFrom = "lg",
}: BookIntroductionPanelProps) {
  const fill = FILL_CLASSES[fillFrom];
  const t = useTranslations("celebPage");
  const tSource = useTranslations("content.introductionSource");
  const locale = useLocale();
  const triggerRef = useRef<HTMLParagraphElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const introText = normalizeIntroBreaks(description);
  /* ── 1. 넘침 측정 — 로딩 중에는 본문이 없어 재지 않는다 ── */
  const { ref: previewRef, isClipped } = useClippedText<HTMLParagraphElement>(introText, !loading);
  const providerName =
    showSource && attribution?.provider
      ? INTRO_PROVIDER_HEADING_NAME[attribution.provider]?.[locale === "en" ? "en" : "ko"]
      : null;
  const source: SourceChipProps = {
    providerName,
    sourceUrl: showSource ? attribution?.url : null,
    title: attribution?.provider === "feelandnote"
      ? tSource("originalDescription")
      : providerName ? tSource("sourceDescription", { source: providerName }) : tSource("openSource"),
    originalLabel: tSource("original"),
  };

  const closeModal = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  return (
    <div
      className={cn("engraved-plate relative mt-5 min-h-28 border-s-2 border-accent px-4 py-3", fill.root, className)}
      role={loading ? "status" : undefined}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <PendingMark size="sm" />
        </div>
      ) : (
        <>
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
            aria-label={`${label} — ${t("sourceWorkIntroductionOpen")}`}
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
            className={cn(
              PREVIEW_CLASS,
              fill.preview,
              // 끝 흐림은 폭과 무관하게 글이 실제로 잘릴 때만 붙는다 — 좁은 화면의 네 줄 접힘도 같다
              isClipped && "clip-fade-end",
              "cursor-pointer text-start hover:brightness-125 active:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
          >
            <FormattedText text={introText} />
          </p>
          {(source.providerName || source.sourceUrl) && (
            <div className={cn("mt-2 flex justify-end", fill.footer)}>
              <SourceChip {...source} />
            </div>
          )}
          {/* 터치 기기는 커서가 안 바뀌므로 잘린 글이면 칸 둘레에 금빛 파동을 세 번 준다.
              빛은 칸 바깥으로만 번져 글자를 가리지 않고, 누름은 통과해 본문이 받는다 */}
          {isClipped && (
            <span
              className="pointer-events-none absolute inset-0 hidden animate-[domainPulse_1.8s_ease-in-out_3] pointer-coarse:block motion-reduce:hidden"
              aria-hidden
            />
          )}
        </>
      )}

      {isOpen ? (
        <IntroductionModal
          description={introText}
          label={label}
          source={source}
          sourceTitle={sourceTitle}
          sourceTitleBadge={sourceTitleBadge}
          closeLabel={t("sourceWorkIntroductionClose")}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
}

/* ── 출처 칩 — 바뀌는 공급처 이름은 안쪽 알약, 고정 문구 「원문」은 금색 글자. URL이 없으면 공급처만 보이는 표기다 ── */
function SourceChip({ providerName, sourceUrl, title, originalLabel }: SourceChipProps) {
  const content = (
    <>
      {providerName && (
        <span className="truncate rounded-full bg-accent/15 px-2 font-semibold text-text-primary">{providerName}</span>
      )}
      {sourceUrl && (
        <>
          <span className="font-bold tracking-[0.12em] text-accent">{originalLabel}</span>
          <ArrowUpRight size={12} className="shrink-0 text-accent" aria-hidden />
        </>
      )}
    </>
  );

  if (!sourceUrl) {
    return <span className={cn(SOURCE_CHIP_CLASS, "px-0.5")} title={title}>{content}</span>;
  }
  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={title}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        SOURCE_CHIP_CLASS,
        providerName ? "ps-0.5 pe-2" : "px-2.5",
        "hover:border-accent hover:bg-accent/10 active:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      )}
    >
      {content}
    </a>
  );
}

/* ── 2. 전체 보기 모달 ── */
function IntroductionModal({
  description,
  label,
  source,
  sourceTitle,
  sourceTitleBadge,
  closeLabel,
  onClose,
}: {
  description: string;
  label: string;
  source: SourceChipProps;
  sourceTitle: string;
  sourceTitleBadge?: TitleBadge | null;
  closeLabel: string;
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <Modal
      isOpen
      onClose={onClose}
      frame="plain"
      widthClassName="max-w-2xl"
      overlayClassName="bg-black/70 backdrop-blur-sm"
      boxClassName="border border-accent-dim/60 bg-bg-card shadow-2xl"
      showCloseButton={false}
      animateHeight={false}
      maxHeightClassName={READING_MODAL_MAX_HEIGHT_CLASS}
    >
      {/* 높이 상한은 모달 상자에서 물려받는다 — 값을 여기 다시 적지 않는다 */}
      <div className="flex max-h-[inherit] flex-col overflow-hidden">
        <header className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-4 border-b border-stone-light bg-bg-secondary bg-texture-marble px-5 py-4 sm:px-7 sm:py-5">
          <h2 id={titleId} className="min-w-0 text-xl font-black text-text-primary sm:text-2xl">
            <span className="sr-only">{label} — </span>
            <NoEditionBadge badge={sourceTitleBadge} className="align-middle" />
            {sourceTitle}
          </h2>
          <button
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
          {(source.providerName || source.sourceUrl) && (
            <div className="mt-6 flex justify-end">
              <SourceChip {...source} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
