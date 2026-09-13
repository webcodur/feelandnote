"use client";

import { getCelebProfileUrl } from "@/lib/url";
import { useId } from "react";
import { ArrowUpRight, BookOpenText, UserRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MythPerson, MythTradition, MythWork } from "@/actions/home/mythAtlasTypes";
import { FormattedText } from "@/components/ui";
import { useFactionPortraits } from "@/components/features/faction/portrait/useFactionPortraits";
import MythPortraitMedia, { type MythPortrait } from "./MythPortraitMedia";
import MythSigilHeader, { DetailBackButton } from "./MythSigilHeader";
import MythWorkShelf from "./MythWorkShelf";
import { mythLeadImage } from "./mythLeadImage";

interface Props {
  person: MythPerson;
  tradition: MythTradition;
  works: MythWork[];
  onClose: () => void;
  /** 뒤로 가기 단추 이름 — 돌아갈 곳(그룹 개요·신화 개요)을 부른다 */
  backLabel: string;
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

      <Link href={getCelebProfileUrl(person)} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-accent/50 px-4 py-2.5 text-sm font-bold text-text-primary hover:border-accent hover:bg-accent/10 hover:text-accent">
        {t("openFigure")}<ArrowUpRight size={16} />
      </Link>
    </div>
  );
}

export default function MythPersonDetail({ person, tradition, works, onClose, backLabel }: Props) {
  /* 화면에 거는 사진은 이 전승의 대표 사진 하나다(mythLeadImage — 전승 전용 개인샷, 없으면 인물 대표 사진).
     아바타는 작은 얼굴 썸네일이라 대형 화보 자리에 늘려 쓰지 않는다.
     전에는 어록 음성에 딸린 화보를 둘째 장부터 이어 붙였다 — 어록을 걷어 내면서 함께 빠졌다.
     화보를 여러 장 다시 걸게 되면 gallery가 그대로 넘겨 준다 */
  const lead = mythLeadImage(person, tradition.id);
  const portraits: MythPortrait[] = lead ? [{ url: lead }] : [];
  const gallery = useFactionPortraits(portraits.length);

  return (
    <section aria-labelledby="myth-person-detail-title" className="bg-bg-secondary">
      {portraits.length > 0 ? (
        <div className="grid min-w-0 lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]">
          <article className="relative min-h-[380px] overflow-hidden bg-black sm:min-h-[460px] lg:min-h-[600px]">
            <MythPortraitMedia key={person.id} person={person} images={portraits} index={gallery.index} onMove={gallery.move} />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/20" />

            <DetailBackButton onClose={onClose} label={backLabel} />

            <header className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-8">
              {person.title && <p className="text-sm font-bold text-accent md:text-base">{person.title}</p>}
              <h3 id="myth-person-detail-title" className="mt-1 font-serif text-4xl font-bold leading-none text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.65)] md:text-5xl">{person.name}</h3>
            </header>
          </article>

          <DetailBody person={person} tradition={tradition} />
        </div>
      ) : (
        <div className="min-w-0">
          <MythSigilHeader
            person={person}
            tradition={tradition}
            onClose={onClose}
            backLabel={backLabel}
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
