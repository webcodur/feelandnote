"use client";

import { useState } from "react";
import { ArrowUpRight, AudioLines, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import { activeReadingSegment } from "@/lib/reading-timing";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import ReviewScrollBox from "@/components/features/user/contentLibrary/expand/ReviewScrollBox";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";

interface Props {
  celeb: VirtualMonologueCeleb;
  text: string;
  hero?: boolean;
  voiceBadge: string;
  listenLabel: string;
  profileLabel: string;
}

export default function VoicedMonologueCard({ celeb, text, hero = false, voiceBadge, listenLabel, profileLabel }: Props) {
  const t = useTranslations("celebPage");
  const [textOpen, setTextOpen] = useState(false);
  const narration = useReadingNarration(celeb.voiceUrl ?? "");
  const { available, status, currentTime, duration, play, seek } = narration;
  const timing = useReadingTiming(celeb.id, celeb.voiceLocale, celeb.voiceV, text, duration, available, "monologue");
  const sentence = activeReadingSegment(timing, currentTime, status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  const playFrom = (seconds: number) => { seek(seconds); play(); };

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-accent/25 bg-[linear-gradient(160deg,#191712_0%,#12110e_55%,#0f0f0f_100%)] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] hover:border-accent/60 focus-within:border-accent/60 ${hero ? "p-5 md:p-8" : "p-5 md:p-6"}`}
    >
      <span aria-hidden className="pointer-events-none absolute -top-6 right-3 select-none font-serif text-[110px] leading-none text-accent/[0.08] transition-opacity duration-500 group-hover:text-accent/[0.16] md:text-[130px]">“</span>
      <div className={`relative flex items-center ${hero ? "gap-4 md:gap-5" : "gap-3.5"}`}>
        <Link
          href={`${getCelebProfileUrl(celeb)}#reading`}
          prefetch={false}
          className="flex min-w-0 flex-1 items-center gap-3.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className={`relative shrink-0 overflow-hidden rounded-full border border-accent/40 bg-black/40 shadow-[0_0_28px_-8px_rgba(212,175,55,0.5)] ${hero ? "size-16 md:size-20" : "size-14"}`}>
            {celeb.avatar_url ? <CelebAvatarImage src={celeb.avatar_url} alt="" boxPx={hero ? 80 : 56} /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-bold text-text-primary group-hover:text-accent ${hero ? "text-lg md:text-xl" : "text-base"}`}>{celeb.nickname}</span>
            {celeb.title ? <span className="mt-0.5 block truncate text-xs text-text-secondary md:text-sm">{celeb.title}</span> : null}
          </span>
        </Link>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
          <AudioLines size={13} strokeWidth={2} aria-hidden />
          {voiceBadge}
        </span>
      </div>

      <div className="relative mt-5 border-t border-white/10 pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
          <AudioLines size={14} aria-hidden />
          {listenLabel}
        </p>
        <ReadingNarrationControls narration={narration} />
      </div>

      <div className={`relative mt-1 flex-1 break-keep font-serif text-text-primary/90 ${hero ? "text-base md:text-lg" : "text-sm md:text-[15px]"}`}>
        <ReviewScrollBox onOpen={() => setTextOpen(true)} openLabel={t("readingExpandMonologue")}>
          <ReadingHighlightText text={text} mark={mark} />
        </ReviewScrollBox>
      </div>
      <button
        type="button"
        onClick={() => setTextOpen(true)}
        className="relative mt-3 flex w-fit items-center gap-1.5 rounded-md text-xs font-semibold text-accent/75 hover:text-accent active:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("readingExpandMonologue")}
        <Maximize2 size={13} aria-hidden />
      </button>

      <Link
        href={`${getCelebProfileUrl(celeb)}#reading`}
        prefetch={false}
        className="relative mt-auto flex w-fit items-center gap-1.5 rounded-md text-xs font-semibold text-accent/70 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {profileLabel}
        <ArrowUpRight size={14} aria-hidden className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
      {textOpen ? (
        <VirtualMonologueModal
          text={text}
          mark={mark}
          segments={timing?.segments}
          onPlayFrom={playFrom}
          onClose={() => setTextOpen(false)}
        />
      ) : null}
    </article>
  );
}
