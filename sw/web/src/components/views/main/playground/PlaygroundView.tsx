"use client";

import { useState } from "react";
import { Button, Badge, Avatar, Card, FilterChips, SectionHeader, type ChipOption } from "@/components/ui";
import CreateTierListModal from "@/components/features/playground/CreateTierListModal";
import BlindGamePlayModal from "@/components/features/playground/BlindGamePlayModal";
import { Plus, GitFork, Heart, Flame, Sparkles, Users, User, Trophy, Target, Quote, Gamepad2, Puzzle } from "lucide-react";

type PlaygroundTab = "tier-list" | "blind-game";

const MAIN_TABS: ChipOption<PlaygroundTab>[] = [
  { value: "tier-list", label: "티어리스트", icon: Trophy },
  { value: "blind-game", label: "블라인드 게임", icon: Target },
];

const TIER_TAB_OPTIONS: ChipOption[] = [
  { value: "trending", label: "트렌딩", icon: Flame },
  { value: "latest", label: "최신", icon: Sparkles },
  { value: "following", label: "팔로잉", icon: Users },
  { value: "my", label: "내 티어리스트", icon: User },
];

const BLIND_TAB_OPTIONS: ChipOption[] = [
  { value: "popular", label: "인기 퀴즈", icon: Flame },
  { value: "latest", label: "최신", icon: Sparkles },
  { value: "following", label: "팔로잉", icon: Users },
  { value: "my", label: "내 문제", icon: User },
];

const tierListData = [
  {
    title: "2023년 최고의 SF 영화 결산",
    user: "SciFiLover",
    avatar: "linear-gradient(135deg, #7c4dff, #ff4d4d)",
    category: "영화",
    forks: "1,203",
    likes: "3.4k",
    tiers: [
      { label: "S", color: "#ffd700", items: ["#ff9a9e", "#a18cd1", "#84fab0"] },
      { label: "A", color: "#b57cff", items: ["#fbc2eb", "#8fd3f4"] },
      { label: "B", color: "#4d9fff", items: ["#a6c0fe"] },
    ],
  },
  {
    title: "내 인생의 판타지 소설 Top 50",
    user: "BookWorm",
    avatar: "linear-gradient(135deg, #84fab0, #8fd3f4)",
    category: "도서",
    forks: "856",
    likes: "2.1k",
    tiers: [
      { label: "S", color: "#ffd700", items: ["#ffecd2", "#fcb69f"] },
      { label: "A", color: "#b57cff", items: ["#ff9a9e", "#fecfef", "#a18cd1"] },
    ],
  },
  {
    title: "지브리 영화 음식 비주얼 티어",
    user: "GhibliFan",
    avatar: "linear-gradient(135deg, #fa709a, #fee140)",
    category: "애니메이션",
    forks: "3,420",
    likes: "8.9k",
    tiers: [
      { label: "S", color: "#ffd700", items: ["#f093fb"] },
      { label: "A", color: "#b57cff", items: ["#f5576c", "#4facfe"] },
      { label: "B", color: "#4d9fff", items: ["#00f2fe"] },
    ],
  },
  {
    title: "2024 1분기 신작 드라마 평가",
    user: "DramaQueen",
    avatar: "linear-gradient(135deg, #30cfd0, #330867)",
    category: "드라마",
    forks: "420",
    likes: "1.2k",
    tiers: [
      { label: "S", color: "#ffd700", items: ["#43e97b", "#38f9d7"] },
      { label: "A", color: "#b57cff", items: ["#fa8bff"] },
    ],
  },
];

const blindGameData = [
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
];

export default function PlaygroundView() {
  const [mainTab, setMainTab] = useState<PlaygroundTab>("tier-list");
  const [tierSubTab, setTierSubTab] = useState("trending");
  const [blindSubTab, setBlindSubTab] = useState("popular");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  return (
    <>
      <SectionHeader
        title="놀이터"
        description="티어리스트를 만들고, 블라인드 게임에 도전해보세요"
        icon={<Puzzle size={24} />}
        action={
          mainTab === "tier-list" ? (
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} /> 새 리스트 만들기
            </Button>
          ) : (
            <Button variant="primary">
              <Plus size={16} /> 새 문제 출제
            </Button>
          )
        }
        className="mb-8"
      />

      {/* 메인 탭 */}
      <div className="border-b border-border pb-4 mb-6">
        <FilterChips
          options={MAIN_TABS}
          value={mainTab}
          onChange={setMainTab}
          variant="filled"
          showIcon
        />
      </div>

      <CreateTierListModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <BlindGamePlayModal isOpen={isPlayModalOpen} onClose={() => setIsPlayModalOpen(false)} />

      {mainTab === "tier-list" ? (
        <>
          <div className="mb-6">
            <FilterChips
              options={TIER_TAB_OPTIONS}
              value={tierSubTab}
              onChange={setTierSubTab}
              variant="filled"
              showIcon
            />
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {tierListData.map((card, idx) => (
              <Card key={idx} hover className="p-0 overflow-hidden">
                <div className="h-40 bg-[#2a2f38] p-3 flex flex-col gap-1">
                  {card.tiers.map((tier, i) => (
                    <div key={i} className="flex h-6 gap-1">
                      <div
                        className="w-6 rounded flex items-center justify-center text-[10px] font-bold text-black"
                        style={{ background: tier.color }}
                      >
                        {tier.label}
                      </div>
                      <div className="flex-1 bg-white/5 rounded flex gap-0.5 p-0.5">
                        {tier.items.map((itemColor, j) => (
                          <div key={j} className="w-4 h-5 rounded-sm" style={{ background: itemColor }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <div className="text-base font-bold mb-2 leading-snug">{card.title}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar size="sm" gradient={card.avatar} />
                    <span className="text-sm text-text-secondary">{card.user}</span>
                    <Badge variant="default">{card.category}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-text-secondary border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1">
                      <GitFork size={14} />
                      <span className="font-bold">{card.forks}</span>
                      <span>Forks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart size={14} />
                      <span className="font-bold">{card.likes}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <FilterChips
              options={BLIND_TAB_OPTIONS}
              value={blindSubTab}
              onChange={setBlindSubTab}
              variant="filled"
              showIcon
            />
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
            {blindGameData.map((game, idx) => (
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
        </>
      )}
    </>
  );
}
