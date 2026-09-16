/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/sections/DispositionCard.tsx
  기능: 성향 양극 매치업 (Dispositions)
  책임: 음극(왼쪽)·양극(오른쪽) 최고점자를 공용 매치업(VersusPanels)으로 세우고,
        양극 차순위는 카드형 순위로 나열한다. 각 항목은 프로필 링크.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";
import VersusPanels from "@/components/shared/VersusPanels";
import RankCardList from "@/components/shared/RankCardList";
import AxisCard from "./AxisCard";
import { celebHref } from "../utils";
import { getAxisSides } from "../../../spectrumAxis";

export default function DispositionCard({
  entry, locale, color,
}: {
  entry: SpectrumExtremeEntry; locale: string; color: string;
}) {
  const t = useTranslations("explore.ui.spectrumDistribution");
  if (!entry.opposing) {
    return <AxisCard entry={entry} locale={locale} color={color} />;
  }

  const sides = getAxisSides(entry.label, locale);
  const isEn = locale === "en";

  /* 왼쪽이 음극(sides[1]), 오른쪽이 양극(sides[0]).
     음극 percentile은 「위에 있는 사람 비율」(극단자≈100)이라 표시용 상위%로 뒤집는다 */
  const lowPercentile = Math.max(0, Math.min(100, 100 - entry.opposing.percentile));

  return (
    <div className="space-y-8">
      <VersusPanels
        accent={color}
        left={{
          chip: sides[1],
          nickname: entry.opposing.celeb.nickname,
          nickname_en: entry.opposing.celeb.nickname_en,
          avatarUrl: entry.opposing.celeb.avatar_url,
          value: entry.opposing.score,
          sub: t("topPercent", { percentile: lowPercentile < 0.1 ? "<0.1" : lowPercentile }),
          note: isEn ? entry.opposing.reason.en : entry.opposing.reason.ko,
          href: celebHref(entry.opposing.celeb),
        }}
        right={{
          chip: sides[0],
          nickname: entry.celeb.nickname,
          nickname_en: entry.celeb.nickname_en,
          avatarUrl: entry.celeb.avatar_url,
          value: entry.score,
          sub: t("topPercent", { percentile: entry.percentile < 0.1 ? "<0.1" : entry.percentile }),
          note: isEn ? entry.reason.en : entry.reason.ko,
          href: celebHref(entry.celeb),
        }}
      />

      {entry.runnersUp.length > 0 && (
        <div>
          <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
            {sides[0]} {t("runnersUp")}
          </p>
          <RankCardList
            items={entry.runnersUp.map((r) => ({
              href: celebHref(r),
              nickname: r.nickname,
              nickname_en: r.nickname_en,
              avatarUrl: r.avatar_url,
              value: r.score,
            }))}
            accent={color}
            startRank={2}
          />
        </div>
      )}
    </div>
  );
}
