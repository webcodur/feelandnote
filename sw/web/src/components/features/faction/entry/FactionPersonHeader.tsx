"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ArrowUpRight, ImageIcon, Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import CelebProfileMedia, { type CelebProfileMediaProps } from "@/components/shared/CelebProfileMedia";
import CelebRealityLabel from "@/components/shared/CelebRealityLabel";
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import FactionArtworkViewer from "../FactionArtworkViewer";
import { FACTION_PERSON_LAYOUT as layout } from "./factionPersonLayout";

interface Props {
  person: { id: string; slug: string | null; name: string; title: string | null; avatarUrl: string | null; reality?: CelebReality | null };
  factionName: string;
  group?: string | null;
  portraitUrl?: string | null;
  onMonologue?: () => void;
  voice?: Pick<CelebProfileMediaProps, "hasVoice" | "isVoicePlaying" | "onGreet" | "greetLabel">;
  nested?: boolean;
  children: ReactNode;
}

/** 신화와 일반 세력은 같은 아바타·이름·버튼 배치를 쓰고 소개 본문만 넘긴다. */
export default function FactionPersonHeader({ person, factionName, group, portraitUrl, onMonologue, voice, nested, children }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tCeleb = useTranslations("celebPage");
  const [image, setImage] = useState<"avatar" | "portrait" | null>(null);
  const closeImage = useCallback(() => setImage(null), []);
  const imageUrl = image === "avatar" ? person.avatarUrl : image === "portrait" ? portraitUrl : null;
  const actionClass = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-white/20 bg-bg-main px-2 py-2 text-sm font-semibold text-text-primary outline-none hover:border-accent hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent sm:px-3.5";

  return (
    <>
      <div data-faction-person-header>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-x-6 md:grid-cols-[164px_minmax(0,1fr)]">
          <div className="flex items-start md:row-span-2">
            <div className="rounded-full border border-accent/30 bg-bg-card p-px">
              <CelebProfileMedia photoUrl={null} avatarUrl={person.avatarUrl} nickname={person.name} imageAction="zoom"
                onZoom={() => person.avatarUrl && setImage("avatar")} zoomLabel={t("enlargeAvatar")}
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
              <CelebRealityLabel reality={person.reality} />
            </div>
            {person.title && <p className="mt-1.5 text-sm leading-6 text-text-secondary">{person.title}</p>}
          </div>
          <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1 md:col-start-2">
            {onMonologue && <button type="button" onClick={onMonologue} aria-haspopup="dialog" className={actionClass}><Quote size={14} aria-hidden />{tCeleb("virtualMonologue")}</button>}
            <Link href={getCelebProfileUrl(person)} prefetch={false} className={actionClass}>{t("openFigure")}<ArrowUpRight size={14} aria-hidden /></Link>
            {portraitUrl && <button type="button" onClick={() => setImage("portrait")} aria-haspopup="dialog" className={actionClass}><ImageIcon size={14} aria-hidden />{t("portraitImage")}</button>}
          </div>
        </div>
        <div data-faction-person-body className={layout.body}>{children}</div>
      </div>
      {imageUrl && <FactionArtworkViewer images={[{ url: imageUrl }]} title={person.name} onClose={closeImage} nested={nested} />}
    </>
  );
}
