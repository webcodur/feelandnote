/*
  파일명: /app/(main)/archive/playground/blind-game/page.tsx
  기능: 블라인드 게임 페이지
  책임: 감상평으로 작품 맞추기 퀴즈를 제공한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Button, Badge, Avatar, Card, FilterChips, SectionHeader, type ChipOption } from "@/components/ui";
import BlindGamePlayModal from "@/components/features/playground/BlindGamePlayModal";
import { Plus, Quote, Gamepad2, Flame, Sparkles, Users, User, Target } from "lucide-react";

const TAB_OPTIONS: ChipOption[] = [
  { value: "popular", label: "인기 퀴즈", icon: Flame },
  { value: "latest", label: "최신", icon: Sparkles },
  { value: "following", label: "팔로잉", icon: Users },
  { value: "my", label: "내 문제", icon: User },
];

const gameData = [
  {
    title: "인생을 바꾼 그 소설",
    quote: "이 작품은 내 인생을 바꿨다. 처음 읽었을 때의 충격은 아직도 생생하다. 주인공의 선택 하나하나가 너무나 공감되었고...",
    user: "BookLover",
    avatar: "linear-gradient(135deg, #7c4dff, #ff4d4d)",
    category: "도서",
    difficulty: 2,
    plays: "1,240명",
  },
  {
    title: "꿈속의 꿈, 그 영화",
    quote: "마지막 장면의 팽이가 쓰러질지 아닐지 숨죽이며 지켜봤던 순간. 감독의 상상력에 다시 한번 감탄했다.",
    user: "MovieBuff",
    avatar: "linear-gradient(135deg, #84fab0, #8fd3f4)",
    category: "영화",
    difficulty: 1,
    plays: "3,502명",
  },
  {
    title: "전설의 대사 맞추기",
    quote: "용이 내가 된다! 류승룡 기모찌! 이 대사 하나로 모든 것이 설명되는 게임.",
    user: "GameMaster",
    avatar: "linear-gradient(135deg, #f093fb, #f5576c)",
    category: "게임",
    difficulty: 3,
    plays: "890명",
  },
  {
    title: "용두사미의 전설",
    quote: "겨울이 오고 있다. 하지만 그 겨울은 너무나 길었고, 마지막 시즌은 너무나 짧았다.",
    user: "DramaQueen",
    avatar: "linear-gradient(135deg, #fa709a, #fee140)",
    category: "드라마",
    difficulty: 2,
    plays: "2,100명",
  },
  {
    title: "추리 만화 명대사",
    quote: "범인은 바로 이 안에 있어! 할아버지의 이름을 걸고 맹세하지.",
    user: "AniLover",
    avatar: "linear-gradient(135deg, #30cfd0, #330867)",
    category: "애니메이션",
    difficulty: 1,
    plays: "5,430명",
  },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState("popular");
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  return (
    <>
      <SectionHeader
        title="블라인드 게임"
        description="감상평만 보고 작품을 맞추는 퀴즈에 도전하세요"
        icon={<Target size={24} />}
        action={
          <Button variant="primary">
            <Plus size={16} /> 새 문제 출제
          </Button>
        }
        className="mb-8"
      />

      <div className="mb-6">
        <FilterChips
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={setActiveTab}
          variant="filled"
          showIcon
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
        {gameData.map((game, idx) => (
          <Card key={idx} hover className="p-0 flex flex-col cursor-pointer" onClick={() => setIsPlayModalOpen(true)}>
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

      <BlindGamePlayModal isOpen={isPlayModalOpen} onClose={() => setIsPlayModalOpen(false)} />
    </>
  );
}
