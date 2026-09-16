/*
  파일명: /components/features/user/explore/sections/TopByTypeCard/TopByTypeCard.tsx
  기능: 매체 하나(책·영상·게임·음악)의 랭킹 카드
  책임: Top 3 시상대와 4위 이하 리더보드 목록, 요약 통계, 공통 감상 인사이트를 표시한다.
        레인 하나가 매체 하나를 맡으므로 이 컴포넌트는 다른 매체를 몰라도 된다.
*/ // ------------------------------

"use client";

import { Book, Film, Gamepad2, Music } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getCelebProfileUrl } from "@/lib/url";
import PodiumBoard from "@/components/shared/PodiumBoard";
import RankCardList from "@/components/shared/RankCardList";
import { TYPE_COLORS } from "@/app/[locale]/(main)/explore/ranking/constants";
import type { TopByTypeFullEntry } from "@/actions/home/getTopByContentTypeFull";
import type { SharedContent } from "@/actions/home/getSharedContents";
import SharedContentInsight from "./SharedContentInsight";

const TYPE_CONFIG: Record<string, { color: string; icon: typeof Book }> = {
  BOOK: { color: TYPE_COLORS.BOOK, icon: Book },
  VIDEO: { color: TYPE_COLORS.VIDEO, icon: Film },
  GAME: { color: TYPE_COLORS.GAME, icon: Gamepad2 },
  MUSIC: { color: TYPE_COLORS.MUSIC, icon: Music },
};

interface TopByTypeCardProps {
  entry: TopByTypeFullEntry;
  shared: SharedContent[];
}

export default function TopByTypeCard({ entry, shared }: TopByTypeCardProps) {
  const locale = useLocale();
  const t = useTranslations("explore.topByType");
  const tc = useTranslations("content.category");
  const tu = useTranslations("content.unit");
  const config = TYPE_CONFIG[entry.type];
  if (!config) return null;

  const Icon = config.icon;
  const unit = tu(entry.type.toLowerCase());
  const label = locale === "en" ? entry.label.en : entry.label.ko;
  const topThree = entry.celebs.slice(0, 3);
  const remaining = entry.celebs.slice(3);

  return (
    <section>
      <div className="mb-5 flex flex-col items-center gap-1 text-center">
        <div className="flex items-center justify-center gap-2.5">
          <Icon size={20} style={{ color: config.color }} aria-hidden />
          <h2 className="text-lg font-bold text-text-primary">{label}</h2>
          <span className="text-sm text-text-tertiary">Top {entry.celebs.length}</span>
        </div>
        <p className="break-keep text-xs text-text-tertiary">
          {t("rankDesc", { media: tc(entry.type.toLowerCase()) })}
        </p>
      </div>

      <PodiumBoard
        items={topThree.map((celeb) => ({
          href: getCelebProfileUrl({ id: celeb.id, slug: celeb.slug }),
          nickname: celeb.nickname,
          nickname_en: celeb.nickname_en,
          avatarUrl: celeb.avatar_url,
          subtitle: locale === "en" && celeb.title_en ? celeb.title_en : celeb.title,
          value: celeb.typeCount,
          unit,
        }))}
        accent={config.color}
        valuePrefix={<Icon size={10} style={{ color: config.color }} aria-hidden />}
      />

      {remaining.length > 0 && (
        <div className="mt-7">
          <RankCardList
            items={remaining.map((celeb) => ({
              href: getCelebProfileUrl({ id: celeb.id, slug: celeb.slug }),
              nickname: celeb.nickname,
              nickname_en: celeb.nickname_en,
              avatarUrl: celeb.avatar_url,
              subtitle: locale === "en" && celeb.title_en ? celeb.title_en : celeb.title,
              value: celeb.typeCount,
              unit,
            }))}
            accent={config.color}
            startRank={4}
          />
        </div>
      )}

      <SharedContentInsight items={shared} color={config.color} type={entry.type} />
    </section>
  );
}
