"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import { useCountries } from "@/hooks/useCountries";
import { getCountryNameByLocale } from "@/lib/countries";

import CelebPersonPreviewButton from "./CelebPersonPreviewButton";
import { useCelebPreview } from "./useCelebPreview";

const formatYear = (year: string | null | undefined) => {
  if (!year) return "";
  const num = parseInt(year);
  if (isNaN(num)) return year;
  return num < 0 ? `BC ${Math.abs(num)}` : `${num}`;
};

const MOBILE_QUERY = "(max-width: 767px)";

const subscribeToMobileViewport = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
};

const getMobileViewportSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const getServerMobileViewportSnapshot = () => false;

interface ContemporariesSectionProps {
  contemporaries: ContemporaryCeleb[];
}

export default function ContemporariesSection({
  contemporaries,
}: ContemporariesSectionProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  const {
    celeb: previewCeleb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("contemporaries");
  useCountries();

  const [expanded, setExpanded] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getServerMobileViewportSnapshot,
  );
  const initialCount = isMobile ? 4 : 6;
  const hasMore = contemporaries.length > initialCount;
  const visible = expanded ? contemporaries : contemporaries.slice(0, initialCount);

  return (
    <div className="space-y-4">
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 md:grid-cols-6 md:gap-4">
      {visible.map((celeb) => {
        const birthYear = formatYear(celeb.birth_date);
        const deathYear = celeb.death_date ? formatYear(celeb.death_date) : null;
        const period = birthYear
          ? deathYear
            ? `${birthYear}–${deathYear}`
            : `${birthYear}–`
          : "";

        return (
          <CelebPersonPreviewButton
            key={celeb.id}
            name={celeb.nickname}
            avatarUrl={celeb.avatar_url}
            loading={loadingId === celeb.id}
            onClick={() => void openCelebPreview(celeb.id)}
            className="w-full md:w-full"
          >
            {celeb.nationality && (
              <span className="block text-[11px] leading-tight text-text-secondary">
                {getCountryNameByLocale(celeb.nationality, locale)}
              </span>
            )}
            {celeb.profession && (
              <span className="block text-[11px] font-medium leading-tight text-accent/70">
                {tp(celeb.profession)}
              </span>
            )}
            {period && (
              <span className="block font-mono text-[10px] leading-tight tracking-wide text-text-tertiary">
                {period}
              </span>
            )}
          </CelebPersonPreviewButton>
        );
      })}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs text-text-secondary hover:border-accent/30 hover:text-accent"
          >
            {expanded
              ? t("hideDetail")
              : `+${contemporaries.length - initialCount}`}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}

      {previewCeleb && (
        <CelebDetailModal
          celeb={previewCeleb}
          isOpen
          onClose={closeCelebPreview}
        />
      )}
    </div>
  );
}
