/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/sections/AxisCard.tsx
  기능: 일반 축 순위 (내면/외면/능력)
  책임: 상위 3인은 공용 시상대(PodiumBoard), 4위 이하는 카드형 순위(RankCardList).
        각 항목은 프로필 링크. 인물 표시명은 공용 컴포넌트가 로케일로 고른다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";
import PodiumBoard, { type PodiumBoardItem } from "@/components/shared/PodiumBoard";
import RankCardList, { type RankCardItem } from "@/components/shared/RankCardList";
import { celebHref } from "../utils";

export default function AxisCard({
  entry, locale, color,
}: {
  entry: SpectrumExtremeEntry; locale: string; color: string;
}) {
  const isEn = locale === "en";
  const t = useTranslations("explore.ui.spectrumDistribution");

  /* 시상대는 상위 3인 — 1위만 기록·상위%·호칭을 담는다 */
  const podiumItems: PodiumBoardItem[] = [
    {
      href: celebHref(entry.celeb),
      nickname: entry.celeb.nickname,
      nickname_en: entry.celeb.nickname_en,
      avatarUrl: entry.celeb.avatar_url,
      subtitle: isEn ? (entry.celeb.title_en || entry.celeb.profession) : (entry.celeb.title || entry.celeb.profession),
      value: entry.score,
      sub: t("topPercent", { percentile: entry.percentile < 0.1 ? "<0.1" : entry.percentile }),
      note: isEn ? entry.reason.en : entry.reason.ko,
    },
    ...entry.runnersUp.slice(0, 2).map((r) => ({
      href: celebHref(r),
      nickname: r.nickname,
      nickname_en: r.nickname_en,
      avatarUrl: r.avatar_url,
      value: r.score,
    })),
  ];

  const rest: RankCardItem[] = entry.runnersUp.slice(2).map((r) => ({
    href: celebHref(r),
    nickname: r.nickname,
    nickname_en: r.nickname_en,
    avatarUrl: r.avatar_url,
    value: r.score,
  }));

  return (
    <div className="space-y-8">
      <PodiumBoard items={podiumItems} accent={color} />
      {rest.length > 0 && (
        <RankCardList items={rest} accent={color} startRank={4} />
      )}
    </div>
  );
}
