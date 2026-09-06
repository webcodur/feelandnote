"use client";

import { useId, type ReactNode } from "react";
import { ArrowUpRight, BookOpenText, Pause, Play, UserRound, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MythPerson, MythTradition, MythWork } from "@/actions/home/mythAtlasTypes";
import { FormattedText } from "@/components/ui";
import FactionQuoteOverlay from "@/components/features/faction/quote/FactionQuoteOverlay";
import { useFactionQuoteStage } from "@/components/features/faction/quote/useFactionQuoteStage";
import MythPortraitMedia, { type MythPortrait } from "./MythPortraitMedia";
import MythSigilHeader, { DetailBackButton } from "./MythSigilHeader";
import MythWorkShelf from "./MythWorkShelf";

interface Props {
  person: MythPerson;
  tradition: MythTradition;
  works: MythWork[];
  onClose: () => void;
}

function DetailLeadIcon({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const tooltipId = useId();

  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={tooltipId}
      title={label}
      onClick={(event) => event.currentTarget.blur()}
      className="group relative float-start me-2 mt-1 grid size-6 place-items-center rounded-full text-accent hover:bg-accent/15 focus-visible:bg-accent/15 focus-visible:outline-none"
    >
      <Icon size={18} strokeWidth={2.2} aria-hidden />
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible absolute start-0 top-full z-30 mt-2 w-max max-w-52 rounded-lg border border-white/10 bg-black px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:visible group-focus-visible:visible"
      >
        {label}
      </span>
    </button>
  );
}

function IconLedParagraphs({ icon, label, text, emptyText }: { icon: LucideIcon; label: string; text: string | null; emptyText: string }) {
  return (
    <section className="break-keep text-[15px] leading-7 text-text-secondary md:text-base md:leading-8">
      <DetailLeadIcon icon={icon} label={label} />
      {text ? (
        <div className="space-y-3.5">
          {text.split(/\n\n+/).map((paragraph, index) => <p key={index}><FormattedText text={paragraph} /></p>)}
        </div>
      ) : <p className="text-text-tertiary">{emptyText}</p>}
    </section>
  );
}

/* 대사를 재생·정지하는 단추 — 화보 아무 데나 눌러도 되지만 눌러야 하는 자리를 눈에 보이게 둔다 */
function QuoteButton({ isPlaying, hasAudio, onClick }: { isPlaying: boolean; hasAudio: boolean; onClick: () => void }) {
  const t = useTranslations("explore.hub.myth");
  const label = isPlaying ? t("pauseQuote") : hasAudio ? t("playQuote") : t("showQuote");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute end-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full border border-accent/45 bg-black/70 px-4 py-2.5 text-sm font-bold text-accent shadow-lg backdrop-blur-sm hover:border-accent hover:bg-accent hover:text-black md:end-5 md:bottom-5"
    >
      {isPlaying ? <Pause size={15} fill="currentColor" aria-hidden /> : <Play size={15} fill="currentColor" aria-hidden />}
      {t("dialogue")}
    </button>
  );
}

function DetailBody({ person, tradition }: { person: MythPerson; tradition: MythTradition }) {
  const t = useTranslations("explore.hub.myth");
  const appearance = person.appearances.find((item) => item.traditionId === tradition.id)?.summary ?? null;
  const lead = person.headline ?? person.summary;

  return (
    <div className="flex min-w-0 flex-col bg-bg-secondary px-6 py-7 md:px-8 md:py-9 lg:px-10 lg:py-10">
      <div className="space-y-7">
        {lead && <p className="break-keep font-serif text-xl font-bold leading-8 text-text-primary md:text-2xl md:leading-9">{lead}</p>}

        <IconLedParagraphs
          icon={BookOpenText}
          label={t("appearanceInMyth", { name: tradition.name })}
          text={appearance}
          emptyText={t("noMythAppearance")}
        />

        <IconLedParagraphs icon={UserRound} label={t("bio")} text={person.bio} emptyText={t("noBio")} />

        {person.reading && (
          <IconLedParagraphs icon={BookOpenText} label={t("reading")} text={person.reading.guide} emptyText="" />
        )}
      </div>

      <Link href={`/celeb/${person.slug}`} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-accent/50 px-4 py-2.5 text-sm font-bold text-text-primary hover:border-accent hover:bg-accent/10 hover:text-accent">
        {t("openFigure")}<ArrowUpRight size={16} />
      </Link>
    </div>
  );
}

export default function MythPersonDetail({ person, tradition, works, onClose }: Props) {
  const t = useTranslations("explore.hub.myth");
  const locale = useLocale() === "en" ? "en" : "ko";
  /* 그 편에서 이 인물이 한 말. 영상 대본이 준 대사라 전승마다 다르다 */
  const here = person.appearances.find((item) => item.traditionId === tradition.id);
  const quote = here?.quote ?? null;
  const quoteMedia = here?.quoteMedia ?? null;

  /* 화면에 거는 대표 사진. 아바타는 작은 얼굴 썸네일이라 대형 화보 자리에 늘려 쓰지 않는다 */
  const basePortraits: MythPortrait[] = person.images.length > 0
    ? person.images
    : person.portraitUrl ? [{ url: person.portraitUrl }]
      : person.imageUrl ? [{ url: person.imageUrl }]
        : [];
  /* 대사용 화보 — 발화 시각마다 사진이 바뀐다. 대사를 재생하는 동안에만 이 사진으로 갈아 끼운다 */
  const quotePortraits: MythPortrait[] = quoteMedia?.images ?? [];

  /* 대사는 세력도감과 같은 무대에서 재생한다 — 음성이 있으면 발화에 맞춰, 없으면 눌러서 넘긴다 */
  const stage = useFactionQuoteStage({
    quote,
    media: quoteMedia,
    locale,
    portraits: quotePortraits.length ? quotePortraits.map((portrait) => ({ at: portrait.at ?? 0 })) : basePortraits.map(() => ({ at: 0 })),
  });

  const portraits = stage.isVisible && quotePortraits.length
    ? quotePortraits
    : basePortraits.length ? basePortraits : quotePortraits;

  const quoteLayer: ReactNode = quote && stage.isVisible ? (
    <FactionQuoteOverlay
      stage={stage}
      labels={{ tapForNextLine: t("tapForNextLine"), tapToCloseQuote: t("tapToCloseQuote") }}
    />
  ) : null;

  return (
    <section aria-labelledby="myth-person-detail-title" className="bg-bg-secondary">
      {portraits.length > 0 ? (
        <div className="grid min-w-0 lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]">
          <article
            onClick={stage.handleSurfaceClick}
            className={`relative min-h-[380px] overflow-hidden bg-black sm:min-h-[460px] lg:min-h-[600px] ${quote ? "cursor-pointer" : ""}`}
          >
            <MythPortraitMedia key={person.id} person={person} images={portraits} index={stage.portraitIndex} onMove={stage.movePortrait} />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20" />

            <DetailBackButton onClose={onClose} />
            {quote && <QuoteButton isPlaying={stage.isVisible} hasAudio={stage.hasPlayableAudio} onClick={stage.toggle} />}

            {/* 대사가 뜨는 동안에는 이름표를 비운다 — 사진 한 장에 글 두 덩어리가 겹치지 않게 한다 */}
            {!stage.isVisible && (
              <header className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-8">
                {person.title && <p className="text-sm font-bold text-accent md:text-base">{person.title}</p>}
                <h3 id="myth-person-detail-title" className="mt-1 font-serif text-4xl font-bold leading-none text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.65)] md:text-5xl">{person.name}</h3>
              </header>
            )}

            {quoteLayer}
          </article>

          <DetailBody person={person} tradition={tradition} />
        </div>
      ) : (
        <div className="min-w-0">
          <MythSigilHeader
            person={person}
            tradition={tradition}
            onClose={onClose}
            isQuoteVisible={stage.isVisible}
            onSurfaceClick={stage.handleSurfaceClick}
            quoteButton={quote ? <QuoteButton isPlaying={stage.isVisible} hasAudio={stage.hasPlayableAudio} onClick={stage.toggle} /> : null}
            quoteLayer={quoteLayer}
          />
          <DetailBody person={person} tradition={tradition} />
        </div>
      )}

      {works.length > 0 && (
        <div className="bg-black/[0.14] px-5 py-6 md:px-8 md:py-8">
          <MythWorkShelf works={works} selectedPersonId={person.id} />
        </div>
      )}
    </section>
  );
}
