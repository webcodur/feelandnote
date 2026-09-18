"use client";

import { Clock, LoaderCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { celebDisplayName } from "@/lib/celeb/displayName";
import { CelebImage, VoiceBadge } from "@/components/ui";
import { getCelebProfileUrl } from "@/lib/url";
import type { Locale } from "@/types/locale";
import type { TimelineCeleb } from "@/actions/home";
import { getYear, formatYear, formatLifespan } from "../utils";
import ContemporariesPanel from "./ContemporariesPanel";
import { useTranslations } from "next-intl";

interface Props {
  celeb: TimelineCeleb;
  locale: Locale;
  isBioExpanded: boolean;
  isContemporariesShown: boolean;
  isContemporariesLoading: boolean;
  onToggleBio: (id: string) => void;
  onToggleContemporaries: (id: string) => void;
  onFireDialogue: (celeb: TimelineCeleb) => void;
  getContemporaries: (celeb: TimelineCeleb) => TimelineCeleb[];
}

/** PC와 모바일에서 같은 본문을 사용해 소개·링크를 두 번 전송하지 않는다. */
export default function CelebTimelineItem({ celeb, locale, isBioExpanded, isContemporariesShown, isContemporariesLoading, onToggleBio, onToggleContemporaries, onFireDialogue, getContemporaries }: Props) {
  const t = useTranslations("explore.ui.timeline");
  const shared = useTranslations("shared.celeb");
  const displayName = celebDisplayName(celeb, locale);
  const displayTitle = locale === "en" && celeb.title_en ? celeb.title_en : celeb.title;
  const displayBio = locale === "en" && celeb.bio_en ? celeb.bio_en : celeb.bio;
  const href = getCelebProfileUrl(celeb);

  return (
    <div className="mb-3 md:mb-5 group/item">
      <div className="flex gap-1.5 md:gap-3">
        <div className="w-[38px] md:w-[120px] flex items-start justify-end shrink-0 pt-3">
          <span className="text-xs md:text-sm text-text-primary font-mono mr-1 md:mr-2">{formatYear(getYear(celeb.birth_date!))}</span>
          <span className="mt-1 w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0 z-10 bg-bg-card border-2 border-accent/40" />
        </div>
        <div className="min-w-0 flex-1 py-1.5 md:p-2.5">
          <div className="flex items-start gap-2 md:gap-3">
            <Link href={href} prefetch={false} aria-label={displayName} className="block shrink-0 w-9 h-9 md:w-14 md:h-14 rounded-full overflow-hidden border border-white/10 hover:border-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <CelebImage src={celeb.avatar_url} alt={displayName} shape="circle" maxPx={128} fallbackSize={24} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1 md:gap-2">
                <div className="min-w-0 flex-1">
                  <Link href={href} prefetch={false} className="block rounded-sm text-sm md:text-lg font-semibold text-text-primary leading-tight hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">{displayName}</Link>
                  <p className="text-[11px] md:text-sm text-text-secondary">{formatLifespan(celeb.birth_date, celeb.death_date)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {celeb.has_voice && (
                    <button type="button" onClick={() => onFireDialogue(celeb)} aria-label={`${displayName} · ${shared("playDialogue")}`} title={shared("playDialogue")}
                      className="p-1 md:p-2 rounded-lg border border-white/10 hover:border-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <VoiceBadge size="sm" bare />
                    </button>
                  )}
                  <button type="button" onClick={() => onToggleContemporaries(celeb.id)} disabled={isContemporariesLoading}
                    aria-label={`${displayName} · ${t("contemporaries")}`} aria-expanded={isContemporariesShown} aria-busy={isContemporariesLoading} title={t("contemporaries")}
                    className={`p-1.5 md:p-2 rounded-lg border hover:border-accent hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${isContemporariesShown ? "border-accent/50 text-accent bg-accent/10" : "border-white/10 text-text-secondary"}`}>
                    {isContemporariesLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Clock size={16} />}
                  </button>
                </div>
              </div>
              {displayTitle && <p className="text-[11px] md:text-sm text-amber-400/80 truncate mt-0.5">{displayTitle}</p>}
              {displayBio && (
                <button type="button" onClick={() => onToggleBio(celeb.id)} aria-expanded={isBioExpanded}
                  className={`block w-full text-left text-[11px] md:text-sm text-text-secondary mt-1 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent ${isBioExpanded ? "" : "line-clamp-2"}`}>
                  {displayBio}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {isContemporariesShown && <ContemporariesPanel celeb={celeb} contemporaries={getContemporaries(celeb)} locale={locale} />}
    </div>
  );
}
