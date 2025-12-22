"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Avatar, Card, FilterChips, SectionHeader, type ChipOption } from "@/components/ui";
import BlindGamePlayModal from "@/components/features/playground/BlindGamePlayModal";
import SelectPlaylistModal from "@/components/features/playground/SelectPlaylistModal";
import { Plus, GitFork, Heart, Flame, Sparkles, Users, User, Trophy, Target, Quote, Gamepad2, Puzzle, Loader2, ListMusic, Settings } from "lucide-react";
import { getPlaylists, type PlaylistSummary } from "@/actions/playlists";
import { getRecords } from "@/actions/records";

type PlaygroundTab = "tier-list" | "blind-game";
type TierSubTab = "all" | "with-tiers" | "my";
type BlindSubTab = "popular" | "latest" | "following" | "my";

const MAIN_TABS: ChipOption<PlaygroundTab>[] = [
  { value: "tier-list", label: "티어리스트", icon: Trophy },
  { value: "blind-game", label: "블라인드 게임", icon: Target },
];

const TIER_TAB_OPTIONS: ChipOption<TierSubTab>[] = [
  { value: "all", label: "전체", icon: ListMusic },
  { value: "with-tiers", label: "티어 설정됨", icon: Trophy },
];

const BLIND_TAB_OPTIONS: ChipOption<BlindSubTab>[] = [
  { value: "popular", label: "인기 퀴즈", icon: Flame },
  { value: "latest", label: "최신", icon: Sparkles },
  { value: "following", label: "팔로잉", icon: Users },
  { value: "my", label: "내 문제", icon: User },
];

const TIER_COLORS: Record<string, string> = {
  S: "#ffd700",
  A: "#b57cff",
  B: "#4d9fff",
  C: "#50c878",
  D: "#808080",
};

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

export default function PlaygroundView() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<PlaygroundTab>("tier-list");
  const [tierSubTab, setTierSubTab] = useState<TierSubTab>("all");
  const [blindSubTab, setBlindSubTab] = useState<BlindSubTab>("popular");
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  // 재생목록 데이터
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);

  // 블라인드 게임 데이터 (내 기록 기반)
  const [blindGameCards, setBlindGameCards] = useState<BlindGameCardData[]>([]);
  const [isBlindLoading, setIsBlindLoading] = useState(false);

  // 재생목록 로드
  useEffect(() => {
    if (mainTab === "tier-list") {
      loadPlaylists();
    }
  }, [mainTab]);

  // 블라인드 게임 카드 로드
  useEffect(() => {
    if (mainTab === "blind-game") {
      loadBlindGameCards();
    }
  }, [mainTab, blindSubTab]);

  async function loadPlaylists() {
    setIsPlaylistLoading(true);
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("Failed to load playlists:", error);
      setPlaylists([]);
    } finally {
      setIsPlaylistLoading(false);
    }
  }

  async function loadBlindGameCards() {
    setIsBlindLoading(true);
    try {
      const records = await getRecords({ limit: 20 }) as Array<{
        id: string;
        content: string;
        type: string;
        contentData: {
          id: string;
          title: string;
          type: string;
        } | null;
      }>;

      const categoryMap: Record<string, string> = {
        BOOK: "도서",
        MOVIE: "영화",
        DRAMA: "드라마",
        GAME: "게임",
      };

      const cards = records
        .filter(r => (r.type === "REVIEW" || r.type === "QUOTE") && r.content && r.contentData)
        .map((r, idx) => ({
          id: r.id,
          title: r.contentData!.title,
          quote: r.content.slice(0, 100) + (r.content.length > 100 ? "..." : ""),
          category: categoryMap[r.contentData!.type] || "기타",
          user: "나",
          avatar: `linear-gradient(135deg, hsl(${(idx * 60) % 360}, 70%, 60%), hsl(${(idx * 60 + 60) % 360}, 70%, 60%))`,
          difficulty: Math.floor(Math.random() * 3) + 1,
          plays: "-",
        }));

      setBlindGameCards(cards);
    } catch (error) {
      console.error("Failed to load blind game cards:", error);
      setBlindGameCards([]);
    } finally {
      setIsBlindLoading(false);
    }
  }

  // 필터링된 재생목록
  const filteredPlaylists = playlists.filter(p => {
    if (tierSubTab === "with-tiers") return p.has_tiers;
    return true;
  });

  // 재생목록 선택 시 티어 설정 페이지로 이동
  const handlePlaylistSelect = (playlistId: string) => {
    setIsSelectModalOpen(false);
    router.push(`/archive/playlists/${playlistId}/tiers`);
  };

  // 재생목록 카드 클릭
  const handlePlaylistClick = (playlist: PlaylistSummary) => {
    if (playlist.has_tiers) {
      // 티어가 설정된 경우 상세 보기 (또는 티어 편집)
      router.push(`/archive/playlists/${playlist.id}`);
    } else {
      // 티어 미설정 시 티어 설정 페이지로
      router.push(`/archive/playlists/${playlist.id}/tiers`);
    }
  };

  return (
    <>
      <SectionHeader
        title="놀이터"
        description="티어리스트를 만들고, 블라인드 게임에 도전해보세요"
        icon={<Puzzle size={24} />}
        action={
          mainTab === "tier-list" ? (
            <Button variant="primary" onClick={() => setIsSelectModalOpen(true)}>
              <Plus size={16} /> 티어 설정하기
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setIsPlayModalOpen(true)}>
              <Gamepad2 size={16} /> 게임 시작
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

      <SelectPlaylistModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={handlePlaylistSelect}
        playlists={playlists}
      />
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

          {isPlaylistLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-accent" />
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <Trophy size={48} className="mx-auto mb-4 opacity-50" />
              <p className="mb-2">
                {tierSubTab === "with-tiers"
                  ? "티어가 설정된 재생목록이 없습니다"
                  : "재생목록이 없습니다"}
              </p>
              <p className="text-sm mb-4">
                {tierSubTab === "with-tiers"
                  ? "재생목록에서 티어를 설정해보세요!"
                  : "먼저 기록관에서 재생목록을 만들어주세요"}
              </p>
              {playlists.length > 0 && (
                <Button variant="primary" onClick={() => setIsSelectModalOpen(true)}>
                  <Settings size={16} /> 티어 설정하기
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              {filteredPlaylists.map((playlist) => (
                <Card
                  key={playlist.id}
                  hover
                  className="p-0 overflow-hidden cursor-pointer"
                  onClick={() => handlePlaylistClick(playlist)}
                >
                  {/* 티어 프리뷰 영역 */}
                  <div className="h-40 bg-[#2a2f38] p-3 flex flex-col gap-1">
                    {playlist.has_tiers && playlist.tiers ? (
                      // 티어가 설정된 경우 티어 프리뷰
                      Object.entries(playlist.tiers)
                        .filter(([, items]) => Array.isArray(items) && items.length > 0)
                        .slice(0, 4)
                        .map(([tier, items]) => (
                          <div key={tier} className="flex h-7 gap-1">
                            <div
                              className="w-7 rounded flex items-center justify-center text-[11px] font-bold text-black"
                              style={{ background: TIER_COLORS[tier] || "#808080" }}
                            >
                              {tier}
                            </div>
                            <div className="flex-1 bg-white/5 rounded flex gap-0.5 p-0.5 items-center">
                              {(items as string[]).slice(0, 10).map((_, j) => (
                                <div
                                  key={j}
                                  className="w-5 h-6 rounded-sm bg-gradient-to-br from-accent/60 to-accent/30"
                                />
                              ))}
                              {(items as string[]).length > 10 && (
                                <span className="text-[10px] text-text-secondary ml-1">
                                  +{(items as string[]).length - 10}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      // 티어 미설정 시 안내
                      <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                        <ListMusic size={32} className="mb-2 opacity-50" />
                        <span className="text-sm">{playlist.item_count}개 콘텐츠</span>
                        <span className="text-xs mt-1">클릭하여 티어 설정</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-base font-bold leading-snug flex-1 truncate">
                        {playlist.name}
                      </div>
                      {playlist.has_tiers && (
                        <Badge variant="primary">티어</Badge>
                      )}
                    </div>
                    {playlist.description && (
                      <p className="text-sm text-text-secondary line-clamp-1 mb-3">
                        {playlist.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-text-secondary border-t border-white/5 pt-3">
                      <div className="flex items-center gap-1">
                        <ListMusic size={14} />
                        <span className="font-bold">{playlist.item_count}</span>
                        <span>콘텐츠</span>
                      </div>
                      {playlist.is_public && (
                        <div className="flex items-center gap-1">
                          <Heart size={14} />
                          <span>공개</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
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

          {isBlindLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-accent" />
            </div>
          ) : blindGameCards.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <Target size={48} className="mx-auto mb-4 opacity-50" />
              <p className="mb-2">블라인드 게임을 만들 기록이 없습니다</p>
              <p className="text-sm mb-4">먼저 기록관에서 리뷰나 인용문을 작성해 주세요</p>
              <Button variant="primary" onClick={() => setIsPlayModalOpen(true)}>
                <Gamepad2 size={16} /> 그래도 시작해보기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
              {blindGameCards.map((game) => (
                <Card key={game.id} hover className="p-0 flex flex-col cursor-pointer" onClick={() => setIsPlayModalOpen(true)}>
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
      )}
    </>
  );
}
