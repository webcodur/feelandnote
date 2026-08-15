/*
  파일명: /components/features/user/explore/sections/TopByTypeCard/TopByTypeCard.tsx
  기능: 매체 하나(책·영상·게임·음악)의 랭킹 카드
  책임: Top 10 인물 그리드 + 막대 인포그래픽 + 공통 감상 인사이트를 표시한다.
        레인 하나가 매체 하나를 맡으므로 이 컴포넌트는 다른 매체를 몰라도 된다.
*/ // ------------------------------

"use client";

import { Book, Film, Gamepad2, Music } from "lucide-react";
import { useLocale } from "next-intl";
import CelebCard from "@/components/shared/CelebCard";
import type { TopByTypeFullEntry } from "@/actions/home/getTopByContentTypeFull";
import type { SharedContent } from "@/actions/home/getSharedContents";
import RankBadge from "./RankBadge";
import SectionInfoGraphic from "./SectionInfoGraphic";
import SharedContentInsight from "./SharedContentInsight";

const TYPE_CONFIG: Record<string, { color: string; icon: typeof Book }> = {
  BOOK: { color: "#3b82f6", icon: Book },
  VIDEO: { color: "#ef4444", icon: Film },
  GAME: { color: "#22c55e", icon: Gamepad2 },
  MUSIC: { color: "#a855f7", icon: Music },
};

interface TopByTypeCardProps {
  entry: TopByTypeFullEntry;
  shared: SharedContent[];
}

export default function TopByTypeCard({ entry, shared }: TopByTypeCardProps) {
  const locale = useLocale();
  const config = TYPE_CONFIG[entry.type];
  if (!config) return null;

  const Icon = config.icon;
  const label = locale === "en" ? entry.label.en : entry.label.ko;

  return (
    <section>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: config.color }} />
        <Icon size={22} style={{ color: config.color }} />
        <h2 className="text-lg font-bold text-text-primary">{label}</h2>
        <span className="text-sm">Top {entry.celebs.length}</span>
      </div>

      {/* 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {entry.celebs.map((celeb, idx) => {
          const rank = idx + 1;
          return (
            <div key={celeb.id} className="relative">
              <RankBadge rank={rank} />
              <CelebCard
                id={celeb.id}
                nickname={celeb.nickname}
                avatar_url={celeb.avatar_url}
                title={celeb.title}
                count={celeb.typeCount}
                celebProfile={celeb}
                variant="card"
                shape="square"
              />
            </div>
          );
        })}
      </div>

      {/* 기록가 막대 인포그래픽 */}
      <SectionInfoGraphic celebs={entry.celebs} color={config.color} />

      {/* 공통 콘텐츠 인사이트 */}
      <SharedContentInsight items={shared} color={config.color} totalCelebs={entry.celebs.length} />
    </section>
  );
}
