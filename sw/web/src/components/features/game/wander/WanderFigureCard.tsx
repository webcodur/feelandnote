"use client";

import { useTranslations } from "next-intl";
import CelebImage from "@/components/ui/CelebImage";
import { WANDER_POWER_KEYS } from "@/lib/game/wander/constants";
import type { WanderFigure } from "@/lib/game/wander/types";

interface Props {
  figure: WanderFigure;
  regionLabel: string;
  yearLabel: string;
}

export default function WanderFigureCard({ figure, regionLabel, yearLabel }: Props) {
  const t = useTranslations("rest.arena.wander");
  return (
    <article className="grid overflow-hidden rounded-2xl border border-accent/25 bg-bg-main/90 shadow-xl md:grid-cols-[220px_1fr]">
      <div className="relative h-44 min-h-0 w-full sm:h-52 md:h-auto md:min-h-[290px]">
        <CelebImage src={figure.avatarUrl} alt={figure.name} sizes="(max-width: 768px) 100vw, 220px" className="rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-bg-main/40" />
      </div>
      <div className="flex flex-col justify-center p-4 text-start md:p-7">
        <div className="flex flex-wrap gap-2 text-sm text-accent">
          <span>{regionLabel}</span><span aria-hidden>·</span><span>{yearLabel}</span>
        </div>
        <h3 className="mt-2 font-serif text-2xl font-black text-text-primary md:text-3xl">{figure.name}</h3>
        {figure.title && <p className="mt-1 text-sm text-text-secondary md:text-base">{figure.title}</p>}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {WANDER_POWER_KEYS.map((power) => (
            <div key={power} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
              <span className="block text-sm text-text-secondary">{t(`powers.${power}.label`)}</span>
              <strong className="font-cinzel text-lg text-text-primary">{figure.powers[power]}</strong>
            </div>
          ))}
        </div>
        {figure.quote && (
          <blockquote className="mt-4 line-clamp-3 border-s-2 border-accent/40 ps-4 text-sm italic leading-6 text-text-secondary md:line-clamp-none">
            “{figure.quote}”
          </blockquote>
        )}
      </div>
    </article>
  );
}
