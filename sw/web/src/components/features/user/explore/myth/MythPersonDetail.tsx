"use client";

import { useId } from "react";
import { ArrowLeft, ArrowUpRight, BookOpenText, Quote, UserRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MythPerson, MythTradition, MythWork } from "@/actions/home/mythAtlasTypes";
import { FormattedText } from "@/components/ui";
import MythPortraitMedia from "./MythPortraitMedia";
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

export default function MythPersonDetail({ person, tradition, works, onClose }: Props) {
  const t = useTranslations("explore.hub.myth");
  const here = person.appearances.find((item) => item.traditionId === tradition.id);
  const appearance = here?.summary ?? null;
  const quote = here?.quote ?? null;
  const lead = person.headline ?? person.summary;

  return (
    <section aria-labelledby="myth-person-detail-title" className="bg-bg-secondary">
      <div className="grid min-w-0 lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]">
        <article className="relative min-h-[380px] overflow-hidden bg-black sm:min-h-[460px] lg:min-h-[600px]">
          <MythPortraitMedia key={person.id} person={person} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20" />

          <button type="button" onClick={onClose} className="absolute start-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3.5 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm hover:border-accent hover:bg-black/85 hover:text-accent md:start-5 md:top-5">
            <ArrowLeft size={16} />{t("backToOverview")}
          </button>

          <header className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-8">
            {person.title && <p className="text-sm font-bold text-accent md:text-base">{person.title}</p>}
            <h3 id="myth-person-detail-title" className="mt-1 font-serif text-4xl font-bold leading-none text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.65)] md:text-5xl">{person.name}</h3>
          </header>
        </article>

        <div className="flex min-w-0 flex-col bg-bg-secondary px-6 py-7 md:px-8 md:py-9 lg:px-10 lg:py-10">
          <div className="space-y-7">
            {/* 그 편에서 이 인물이 한 말. 영상 대본이 준 대사라 전승마다 다르다 */}
            {quote && (
              <blockquote className="border-s-2 border-accent/70 ps-4 md:ps-5">
                <p className="break-keep font-serif text-lg leading-8 text-text-primary md:text-xl md:leading-9">
                  <Quote size={15} className="me-1.5 inline-block -translate-y-1 text-accent/70" aria-hidden />
                  {quote}
                </p>
              </blockquote>
            )}

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
      </div>

      {works.length > 0 && (
        <div className="bg-black/[0.14] px-5 py-6 md:px-8 md:py-8">
          <MythWorkShelf works={works} selectedPersonId={person.id} />
        </div>
      )}
    </section>
  );
}
