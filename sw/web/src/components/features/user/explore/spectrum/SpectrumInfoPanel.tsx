"use client";

import type { SpectrumPersonSummary } from "@/actions/spectrum/getSpectrumPeople";
import type { SpectrumVector } from "@/lib/spectrum/utils";
import BlurDissolve from "@/components/ui/BlurDissolve";
import SpectrumStatPanel from "@/components/shared/SpectrumStatPanel";
import { useTranslations } from "next-intl";

interface Props {
  person: SpectrumPersonSummary | null;
  spectrum: SpectrumVector | null;
  loading: boolean;
}

export default function SpectrumInfoPanel({ person, spectrum, loading }: Props) {
  const t = useTranslations("explore.ui");
  const statusText = loading ? t("spectrumLoading") : spectrum ? t("spectrumTitle") : t("spectrumNoSpectrum");

  if (!person) {
    return (
      <div className="rounded-lg border border-white/10 bg-bg-card/40 p-6 text-sm text-text-secondary">
        {t("spectrumNoSelection")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/20 bg-[#d9d9d9]/5 p-3 sm:p-4">
      <div className="rounded border border-white/20 bg-black/25">
        <div className="flex items-center gap-3 border-b border-white/10 bg-black/30 p-3">
          <div className="h-14 w-14 overflow-hidden rounded-sm border border-white/20 bg-bg-secondary">
            {person.avatar_url ? (
              // 인물 선택이 바뀔 때마다 등장 효과가 다시 재생되도록 key로 구분한다
              <BlurDissolve key={person.id} className="h-full w-full">
                <img src={person.avatar_url} alt={person.nickname} className="h-full w-full object-cover" />
              </BlurDissolve>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-serif text-text-secondary">
                {person.nickname.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-secondary">{person.title || t("spectrumFigure")}</p>
            <h3 className="truncate text-lg font-serif font-bold text-text-primary">{person.nickname}</h3>
            <p className="truncate text-xs text-accent/80">{statusText}</p>
          </div>
        </div>
        <SpectrumStatPanel stats={spectrum} />
      </div>
    </div>
  );
}
