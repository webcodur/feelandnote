"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight, AudioLines, UserRound } from "lucide-react";
import type { MonologueProfile } from "@/actions/celebs/getCelebVirtualMonologue";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import FormattedText from "@/components/ui/FormattedText";
import NationalityText from "@/components/ui/NationalityText";
import { useProfessionLabel } from "@/hooks/useFilterLabels";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import { formatCelebPeriod } from "@/lib/utils/celeb-period";

export default function MonologueIdentity({ celeb, profile }: { celeb: VirtualMonologueCeleb; profile: MonologueProfile | null }) {
  const t = useTranslations("explore.monologue");
  const professionLabel = useProfessionLabel();
  const period = profile ? formatCelebPeriod(profile.birthDate, profile.deathDate) : "";
  return (
    <header className="mb-8" data-monologue-profile>
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4 flex size-20 items-center justify-center overflow-hidden rounded-full border border-accent/30 bg-white/[0.035] md:size-24">
          {celeb.avatar_url ? <CelebAvatarImage src={celeb.avatar_url} alt="" /> : <UserRound className="size-10 text-text-tertiary" aria-hidden />}
        </div>
        {celeb.title ? <p className="mb-1 break-keep text-sm text-text-secondary">{celeb.title}</p> : null}
        <h2 id="monologue-title" className="break-keep font-serif text-2xl font-bold text-text-primary md:text-3xl" aria-live="polite">{celeb.nickname}</h2>
        {profile?.headline ? <p className="mt-2 max-w-2xl break-keep text-sm font-medium leading-relaxed text-accent/90">{profile.headline}</p> : null}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-text-secondary" data-monologue-basics>
          {celeb.profession ? <span>{professionLabel(celeb.profession)}</span> : null}
          {celeb.nationality ? <NationalityText code={celeb.nationality} /> : null}
          {period ? <span className="font-mono">{period}</span> : null}
          <span className="inline-flex items-center gap-1 text-text-tertiary">{celeb.hasVoice ? <AudioLines size={13} aria-hidden /> : null}{t(celeb.hasVoice ? "withAudio" : "textOnly")}</span>
        </div>
        <Link href={getCelebProfileUrl(celeb)} prefetch={false} className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-semibold text-accent/80 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {t("openProfile")}<ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>
      {profile?.bio ? <div className="mx-auto mt-4 max-w-3xl border-l-2 border-accent/25 pl-4 text-sm leading-7 text-text-secondary md:pl-5" data-monologue-bio><FormattedText text={profile.bio} /></div> : null}
      <h3 className="mt-8 text-center font-serif text-lg font-bold text-text-primary">{t("monologueTitle", { name: celeb.nickname })}</h3>
    </header>
  );
}
