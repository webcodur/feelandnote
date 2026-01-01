"use client";

import { Button, Badge, Avatar, Card, FilterChips, type ChipOption } from "@/components/ui";
import { Flame, Sparkles, Users, User, Target, Quote, Gamepad2, Loader2 } from "lucide-react";

type BlindSubTab = "popular" | "latest" | "following" | "my";

const BLIND_TAB_OPTIONS: ChipOption<BlindSubTab>[] = [
  { value: "popular", label: "인기 퀴즈", icon: Flame },
  { value: "latest", label: "최신", icon: Sparkles },
  { value: "following", label: "팔로잉", icon: Users },
  { value: "my", label: "내 문제", icon: User },
];

interface BlindGameCardData {
  id: string;
  title: string;
  quote: string;
  category: string;
  user: string;
  avatar: string;
  difficulty: number;
  plays: string;
}

interface BlindGameSectionProps {
  cards: BlindGameCardData[];
  isLoading: boolean;
  onPlayClick: () => void;
  subTab: BlindSubTab;
  onSubTabChange: (tab: BlindSubTab) => void;
}

export default function BlindGameSection({ cards, isLoading, onPlayClick, subTab, onSubTabChange }: BlindGameSectionProps) {
  return (
    <>
      <div className="mb-6">
        <FilterChips options={BLIND_TAB_OPTIONS} value={subTab} onChange={onSubTabChange} variant="filled" showIcon />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p className="mb-2">블라인드 게임을 만들 기록이 없습니다</p>
          <p className="text-sm mb-4">먼저 기록관에서 리뷰나 인용문을 작성해 주세요</p>
          <Button variant="primary" onClick={onPlayClick}>
            <Gamepad2 size={16} /> 그래도 시작해보기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
          {cards.map((game) => (
            <Card key={game.id} hover className="p-0 flex flex-col cursor-pointer" onClick={onPlayClick}>
              <div className="bg-accent/5 p-6 min-h-[140px] flex items-center justify-center text-center relative">
                <Quote className="absolute top-4 left-4 text-2xl text-accent opacity-50" />
                <div className="text-[15px] leading-relaxed text-[#d0d7de] italic line-clamp-3">
                  &ldquo;{game.quote}&rdquo;
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="text-base font-bold mb-2">{game.title}</div>
                <div className="flex items-center gap-2 mb-4">
                  <Avatar size="sm" gradient={game.avatar} />
                  <span className="text-sm text-text-secondary">{game.user}</span>
                  <Badge variant="default">{game.category}</Badge>
                </div>
                <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5 text-[13px] text-text-secondary">
                  <div className="flex gap-0.5">
                    난이도: <span className="text-accent">{"★".repeat(game.difficulty)}</span>{"☆".repeat(5 - game.difficulty)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Gamepad2 size={14} /> {game.plays} 도전
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export type { BlindSubTab, BlindGameCardData };
