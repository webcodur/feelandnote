/*
  파일명: /components/features/archive/lounge/BlindGameSection.tsx
  기능: 블라인드 게임 섹션 컴포넌트
  책임: 게임 목록 표시 및 탭 필터링
*/ // ------------------------------
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
      <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="min-w-max">
          <FilterChips options={BLIND_TAB_OPTIONS} value={subTab} onChange={onSubTabChange} variant="filled" showIcon />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p className="mb-2">만들어진 블라인드 게임이 없습니다</p>
          <p className="text-sm mb-4">남들보다 먼저 기록관에서 리뷰나 인용문을 작성해 주세요</p>
          <Button variant="primary" onClick={onPlayClick}>
            <Gamepad2 size={16} /> 시작해보기
          </Button>
        </div>
      ) : (
        <>
          {/* PC Grid (340px min) */}
          <div className="hidden sm:grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
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
                    <div className="flex gap-1">
                      난이도 <span className="text-accent">{"★".repeat(game.difficulty)}</span>{"☆".repeat(5 - game.difficulty)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Gamepad2 size={14} /> {game.plays} 도전
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Mobile Compact View (Stacked List) */}
          <div className="sm:hidden flex flex-col gap-4 px-1">
            {cards.map((game) => (
              <Button
                unstyled
                key={game.id}
                onClick={onPlayClick}
                className="w-full bg-white/5 rounded-2xl border border-white/5 overflow-hidden active:bg-white/10 transition-colors"
              >
                <div className="flex flex-col">
                  <div className="p-4 bg-accent/5 flex items-center gap-3 relative border-b border-white/5">
                    <Quote className="text-accent opacity-30 shrink-0" size={16} />
                    <div className="text-xs text-text-secondary italic line-clamp-1 flex-1">
                      {game.quote}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-bold text-text-primary">{game.title}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-tertiary">{game.user}</span>
                        <div className="w-px h-2 bg-white/10" />
                        <span className="text-[10px] text-accent font-serif tracking-tighter uppercase">{game.category}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-[9px] text-accent mb-0.5">Level {game.difficulty}</span>
                       <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
                         <Gamepad2 size={10} /> {game.plays}
                       </div>
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export type { BlindSubTab, BlindGameCardData };
