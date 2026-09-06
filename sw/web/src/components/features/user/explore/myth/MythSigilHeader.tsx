"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import { ArrowLeft, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson, MythTradition } from "@/actions/home/mythAtlasTypes";
import ImageViewerModal from "@/components/ui/ImageViewerModal";

export function DetailBackButton({ onClose }: { onClose: () => void }) {
  const t = useTranslations("explore.hub.myth");
  return (
    <button type="button" onClick={onClose} aria-label={t("backToOverview")} title={t("backToOverview")} className="absolute start-4 top-4 z-30 inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white shadow-lg backdrop-blur-sm hover:border-accent hover:bg-black/85 hover:text-accent md:start-5 md:top-5">
      <ArrowLeft size={18} aria-hidden />
    </button>
  );
}

/* 사진이 없는 인물의 전용 머리말 — 사진 틀을 비워 두지 않고 문양 중앙 구도로 바꾼다.
   아바타 메달리온의 호버·클릭은 인물 상세 크게보기 단추와 같은 동작(전체 화면)으로 맞춘다 */
interface SigilHeaderProps {
  person: MythPerson;
  tradition: MythTradition;
  onClose: () => void;
  /** 대사가 떠 있는 동안에는 문양·이름을 감춘다 — 한 자리에 글 두 덩어리를 겹치지 않는다 */
  isQuoteVisible?: boolean;
  onSurfaceClick?: (event: MouseEvent<HTMLElement>) => void;
  quoteButton?: ReactNode;
  quoteLayer?: ReactNode;
}

export default function MythSigilHeader({ person, tradition, onClose, isQuoteVisible = false, onSurfaceClick, quoteButton, quoteLayer }: SigilHeaderProps) {
  const t = useTranslations("explore.hub.myth");
  const [zoomOpen, setZoomOpen] = useState(false);
  const initial = person.name.slice(0, 1);
  return (
    <div
      onClick={onSurfaceClick}
      className={`relative min-h-[320px] overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(217,181,78,.14),transparent_60%),var(--color-bg-secondary)] px-6 pb-10 pt-16 text-center md:min-h-[380px] md:pb-12 md:pt-20 ${onSurfaceClick ? "cursor-pointer" : ""}`}
    >
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[13rem] font-black leading-none text-white/[0.045] md:text-[17rem]">{initial}</span>
      <DetailBackButton onClose={onClose} />
      {quoteButton}
      <div className={`relative ${isQuoteVisible ? "invisible" : ""}`}>
        {person.avatarUrl ? (
          <span className="relative mx-auto block size-28 md:size-32">
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label={t("enlargeAvatar")}
              className="group block size-full overflow-hidden rounded-full border border-accent/30 shadow-[0_0_70px_rgba(217,181,78,.14)] hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Image src={person.avatarUrl} alt="" fill unoptimized sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: "none" }} />
            </button>
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label={t("enlargeAvatar")}
              style={{ minWidth: 36, minHeight: 36 }}
              className="absolute bottom-[-6px] end-[-6px] z-[3] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/70 shadow-sm hover:border-accent/60 hover:bg-black/85 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
            >
              <Maximize2 size={16} aria-hidden="true" />
            </button>
            <ImageViewerModal src={person.avatarUrl} alt={person.name} isOpen={zoomOpen} onClose={() => setZoomOpen(false)} />
          </span>
        ) : (
          <span aria-hidden className="mx-auto grid size-28 place-items-center rounded-full border border-accent/30 bg-accent/[0.06] shadow-[0_0_70px_rgba(217,181,78,.14)] md:size-32">
            <span className="grid size-24 place-items-center rounded-full border border-accent/20 text-5xl font-black text-accent md:size-28 md:text-6xl">{initial}</span>
          </span>
        )}
        {person.title && <p className="mt-6 text-sm font-bold text-accent md:text-base">{person.title}</p>}
        <h3 id="myth-person-detail-title" className="mt-1 font-serif text-4xl font-bold leading-tight text-text-primary md:text-5xl">{person.name}</h3>
        <div aria-hidden className="mx-auto mt-6 flex max-w-xs items-center gap-3">
          <span className="h-px flex-1 bg-accent/30" />
          <span className="size-1.5 rotate-45 bg-accent/70" />
          <span className="h-px flex-1 bg-accent/30" />
        </div>
        <p className="mx-auto mt-6 w-fit rounded-full border border-accent/30 bg-accent/[0.07] px-4 py-1.5 text-sm font-bold text-accent">{tradition.name}</p>
      </div>
      {quoteLayer}
    </div>
  );
}
