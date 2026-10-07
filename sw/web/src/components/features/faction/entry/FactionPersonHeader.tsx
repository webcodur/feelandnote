"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight, BookOpen, ImageIcon, Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CelebProfileMediaProps } from "@/components/shared/CelebProfileMedia";
import CelebPortrait from "@/components/shared/CelebPortrait";
import CelebRealityLabel from "@/components/shared/CelebRealityLabel";
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import FactionArtworkViewer from "../FactionArtworkViewer";

/** 낭독 음원이 붙을 수 있는 읽기 항목 — hasAudio가 true면 초록으로 표시한다(null은 확인 중) */
interface ReadingAction {
  onOpen: () => void;
  hasAudio: boolean | null;
}

interface Props {
  person: { id: string; slug: string | null; name: string; title: string | null; avatarUrl: string | null; reality?: CelebReality | null };
  factionName: string;
  group?: string | null;
  portraitUrl?: string | null;
  guide?: ReadingAction;
  monologue?: ReadingAction;
  voice?: Pick<CelebProfileMediaProps, "hasVoice" | "isVoicePlaying" | "onGreet" | "greetLabel">;
  nested?: boolean;
}

/** 신화와 일반 세력은 같은 아바타·이름·버튼 배치를 쓴다. 소개 본문은 모달 본문 섹션이 담당한다. */
export default function FactionPersonHeader({ person, factionName, group, portraitUrl, guide, monologue, voice, nested }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tCeleb = useTranslations("celebPage");
  const [portraitOpen, setPortraitOpen] = useState(false);
  const closeImage = useCallback(() => setPortraitOpen(false), []);
  const actionClass = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-white/20 bg-bg-main px-2 py-2 text-sm font-semibold text-text-primary outline-none hover:border-accent hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent sm:px-3.5";
  /* 음원이 실린 읽기 항목은 버튼 전체를 초록 톤으로 칠해 바깥에서 듣기 가능을 표시한다 */
  const audioActionClass = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-emerald-400/50 bg-emerald-400/10 px-2 py-2 text-sm font-semibold text-emerald-300 outline-none hover:border-emerald-300 hover:bg-emerald-400/20 hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-400 sm:px-3.5";

  return (
    <>
      <div data-faction-person-header>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-x-6 md:grid-cols-[164px_minmax(0,1fr)]">
          <div className="flex items-start md:row-span-2">
            <div className="rounded-full border border-accent/30 bg-bg-card p-px">
              <CelebPortrait key={person.id} photoUrl={null} avatarUrl={person.avatarUrl} nickname={person.name} imageAction="zoom"
                zoomLabel={t("enlargeAvatar")}
                hasVoice={voice?.hasVoice ?? false} isVoicePlaying={voice?.isVoicePlaying} onGreet={voice?.onGreet} greetLabel={voice?.greetLabel}
                avatarSize="h-20 w-20 sm:h-32 sm:w-32 md:h-40 md:w-40" initialSize="text-4xl" avatarAlignment="center" />
            </div>
          </div>
          <div className="min-w-0 text-start md:pe-8">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-text-secondary sm:text-sm">
              <span className="text-accent">{factionName}</span>
              {group && <><span aria-hidden>·</span><span>{group}</span></>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="text-balance text-2xl font-bold leading-tight text-text-primary md:text-3xl">{person.name}</h2>
              {/* 인물 상세로 가는 문은 이름 옆 아이콘 하나로 둔다 */}
              <Link href={getCelebProfileUrl(person)} prefetch={false} aria-label={t("openFigure")} title={t("openFigure")}
                className="inline-flex shrink-0 items-center justify-center self-center rounded-md p-1 text-text-secondary hover:bg-white/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <ArrowUpRight size={20} aria-hidden />
              </Link>
              <CelebRealityLabel reality={person.reality} />
            </div>
            {person.title && <p className="mt-1.5 text-sm leading-6 text-text-secondary">{person.title}</p>}
          </div>
          <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1 md:col-start-2">
            {guide && <button type="button" onClick={guide.onOpen} aria-haspopup="dialog" className={guide.hasAudio ? audioActionClass : actionClass}><BookOpen size={14} aria-hidden />{tCeleb("personGuide")}</button>}
            {monologue && <button type="button" onClick={monologue.onOpen} aria-haspopup="dialog" className={monologue.hasAudio ? audioActionClass : actionClass}><Quote size={14} aria-hidden />{tCeleb("virtualMonologue")}</button>}
            {portraitUrl && <button type="button" onClick={() => setPortraitOpen(true)} aria-haspopup="dialog" className={actionClass}><ImageIcon size={14} aria-hidden />{t("portraitImage")}</button>}
          </div>
        </div>
      </div>
      {portraitOpen && portraitUrl && <FactionArtworkViewer images={[{ url: portraitUrl }]} title={person.name} onClose={closeImage} nested={nested} />}
    </>
  );
}
