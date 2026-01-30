"use client";

import Link from "next/link";
import { TrendingUp, Clock, Trophy, Target, ArrowRight } from "lucide-react";

// 실제 라운지 게임 구조에 맞춤
const LOUNGE_GAMES = [
  {
    id: "higher-lower",
    title: "Higher or Lower",
    description: "두 인물 중 더 높은 평점을 맞춰보세요",
    icon: <TrendingUp className="text-accent" width={24} height={24} />,
    link: "/lounge/higher-lower",
    status: "플레이 가능"
  },
  {
    id: "timeline",
    title: "연대기",
    description: "인물들의 활동 시기를 맞춰보세요",
    icon: <Clock className="text-blue-400" width={24} height={24} />,
    link: "/lounge/timeline",
    status: "플레이 가능"
  },
  {
    id: "tier-list",
    title: "티어리스트",
    description: "나만의 콘텐츠 순위표를 만들어보세요",
    icon: <Trophy className="text-amber-400" width={24} height={24} />,
    link: "/lounge/tier-list",
    status: "준비 중"
  },
  {
    id: "blind-game",
    title: "블라인드 게임",
    description: "힌트를 보고 작품을 맞춰보세요",
    icon: <Target className="text-green-400" width={24} height={24} />,
    link: "/lounge/blind-game",
    status: "준비 중"
  }
];

export default function LoungePreview() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {LOUNGE_GAMES.map((game) => (
          <Link
            key={game.id}
            href={game.link}
            className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4 md:p-6 text-left transition-all duration-300 hover:border-accent hover:bg-white/10 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="p-2 md:p-3 rounded-full bg-white/5 group-hover:bg-accent/10 transition-colors">
                {game.icon}
              </div>
              <ArrowRight size={16} className="text-text-secondary group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </div>

            <h3 className="text-base md:text-xl font-serif font-bold text-text-primary mb-1 md:mb-2 group-hover:text-amber-100 transition-colors">
              {game.title}
            </h3>

            <p className="text-xs md:text-sm text-text-secondary mb-4 md:mb-6 line-clamp-2">
              {game.description}
            </p>

            <div className="pt-3 md:pt-4 border-t border-white/5">
              <span className={`text-[10px] md:text-xs font-medium px-2 py-1 rounded ${
                game.status === "플레이 가능"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-white/5 text-text-tertiary"
              }`}>
                {game.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
