"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "./Modal";
import { getEditionAvailabilityBadge, isTranslatedTitleBadge, type TitleBadge } from "@/lib/utils/content-locale";
import { Z_INDEX } from "@/constants/zIndex";

/** 정식 출판명이 아닌 번역 제목의 짧은 표기와 안내. 판본 상태·표지와는 독립이다. */
export default function ProvisionalTitleBadge({ badge, className = "" }: {
  badge?: TitleBadge | null;
  className?: string;
}) {
  return isTranslatedTitleBadge(badge) ? <TitleNotice kind="provisionalTitle" className={className} /> : null;
}

export function OutOfPrintBadge({ badge, className = "" }: { badge?: TitleBadge | null; className?: string }) {
  return badge && getEditionAvailabilityBadge(badge) === "out-of-print"
    ? <TitleNotice kind="outOfPrint" className={className} /> : null;
}

/** 공간이 좁은 제목 줄에서는 번역본 없음은 기존 취소선으로, 가번역·절판은 짧은 버튼으로 알린다. */
export function TitleNoticeBadges({ badge, className }: { badge?: TitleBadge | null; className?: string }) {
  return <><ProvisionalTitleBadge badge={badge} className={className} /><OutOfPrintBadge badge={badge} className={className} /></>;
}

function TitleNotice({ kind, className }: { kind: "provisionalTitle" | "outOfPrint"; className: string }) {
  const t = useTranslations("content.edition");
  const [isOpen, setIsOpen] = useState(false);

  return <>
    <button type="button" data-title-notice={kind}
      aria-label={t(`${kind}Open`)} aria-haspopup="dialog" aria-expanded={isOpen}
      onClick={event => { event.preventDefault(); event.stopPropagation(); setIsOpen(true); }}
      onKeyDown={event => event.stopPropagation()}
      className={`pointer-events-auto relative z-10 me-1 inline-block shrink-0 rounded px-1 py-1 align-baseline text-[11px] font-normal leading-snug text-accent outline-none hover:bg-accent/15 hover:text-white active:bg-accent/25 focus-visible:ring-2 focus-visible:ring-accent ${className}`}>
      [{t(kind)}]
    </button>
    {isOpen && <Modal isOpen onClose={() => setIsOpen(false)} title={t(`${kind}Heading`)}
      size="sm" stickyHeader zIndex={Z_INDEX.gameModal}>
      <div className="space-y-3 p-5 text-start text-sm font-normal leading-relaxed text-text-secondary"
        onClick={event => event.stopPropagation()}>
        <p>{t(`${kind}Description`)}</p>
        <p>{t(`${kind}Note`)}</p>
      </div>
    </Modal>}
  </>;
}
