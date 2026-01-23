/*
  파일명: /components/features/user/lounge/Lounge.tsx
  기능: 라운지 페이지 최상위 컴포넌트
  책임: 각 게임 UI를 조합하여 렌더링한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Target, TrendingUp, Clock } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";
import SectionHeader from "@/components/ui/SectionHeader";
import BlindGamePlayModal from "./BlindGamePlayModal";
import SelectPlaylistModal from "./SelectPlaylistModal";
import TierListSection from "./TierListSection";
import BlindGameSection, { type BlindSubTab, type BlindGameCardData } from "./BlindGameSection";
import HigherLowerGame from "@/components/features/game/HigherLowerGame";
import TimelineGame from "@/components/features/game/TimelineGame";
import { getPlaylists, type PlaylistSummary } from "@/actions/playlists";
import { getRecords } from "@/actions/records";

type LoungeTab = "tier-list" | "blind-game" | "higher-lower" | "timeline";

const MAIN_TABS = [
  { value: "higher-lower", label: "Higher or Lower", icon: TrendingUp },
  { value: "timeline", label: "연대기", icon: Clock },
  { value: "tier-list", label: "티어리스트", icon: Trophy },
  { value: "blind-game", label: "블라인드 게임", icon: Target },
] as const;

// 주사위 컴포넌트 (점 위치 정확하게)
function SkeletonDice({ value, className = "" }: { value: 1 | 2 | 3 | 4 | 5 | 6; className?: string }) {
  const dotPositions: Record<number, string[]> = {
    1: ["top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"],
    2: ["top-[25%] left-[25%]", "bottom-[25%] right-[25%]"],
    3: ["top-[25%] left-[25%]", "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", "bottom-[25%] right-[25%]"],
    4: ["top-[25%] left-[25%]", "top-[25%] right-[25%]", "bottom-[25%] left-[25%]", "bottom-[25%] right-[25%]"],
    5: ["top-[25%] left-[25%]", "top-[25%] right-[25%]", "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", "bottom-[25%] left-[25%]", "bottom-[25%] right-[25%]"],
    6: ["top-[25%] left-[25%]", "top-[25%] right-[25%]", "top-1/2 left-[25%] -translate-y-1/2", "top-1/2 right-[25%] -translate-y-1/2", "bottom-[25%] left-[25%]", "bottom-[25%] right-[25%]"],
  };

  return (
    <div className={`relative w-10 h-10 md:w-12 md:h-12 bg-bg-card rounded-lg border border-accent-dim/20 shadow-inner ${className}`}>
      {dotPositions[value].map((pos, i) => (
        <div key={i} className={`absolute w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-accent/30 ${pos}`} />
      ))}
    </div>
  );
}

// 고대 스타일 트로피
function SkeletonTrophy({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 트로피 컵 */}
      <div className="w-8 h-6 md:w-10 md:h-8 bg-accent/20 rounded-t-full border-t-2 border-x-2 border-accent/30" />
      {/* 손잡이 */}
      <div className="flex items-center gap-0">
        <div className="w-2 h-3 md:w-3 md:h-4 border-2 border-accent/30 rounded-l-full border-r-0" />
        <div className="w-4 h-2 md:w-5 md:h-3 bg-accent/20" />
        <div className="w-2 h-3 md:w-3 md:h-4 border-2 border-accent/30 rounded-r-full border-l-0" />
      </div>
      {/* 받침대 */}
      <div className="w-3 h-2 md:w-4 md:h-3 bg-accent/20" />
      <div className="w-6 h-1.5 md:w-8 md:h-2 bg-accent/30 rounded-sm" />
    </div>
  );
}

// 고대 스크롤/책
function SkeletonScroll({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* 스크롤 본체 */}
      <div className="w-12 h-16 md:w-16 md:h-20 bg-bg-card rounded border border-accent-dim/20 relative overflow-hidden">
        {/* 텍스트 라인 */}
        <div className="absolute inset-2 flex flex-col gap-1.5">
          <div className="h-1 w-full bg-accent/10 rounded" />
          <div className="h-1 w-4/5 bg-accent/10 rounded" />
          <div className="h-1 w-full bg-accent/10 rounded" />
          <div className="h-1 w-3/5 bg-accent/10 rounded" />
          <div className="h-1 w-4/5 bg-accent/10 rounded" />
        </div>
      </div>
      {/* 스크롤 끝 장식 */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-14 md:w-18 h-2 bg-accent/20 rounded-full" />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-14 md:w-18 h-2 bg-accent/20 rounded-full" />
    </div>
  );
}

// 봉화대
function SkeletonBeacon({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 불꽃 */}
      <div className="relative mb-1">
        <div className="w-4 h-5 md:w-5 md:h-6 bg-gradient-to-t from-accent/40 via-accent/30 to-transparent rounded-full animate-pulse"
          style={{ animationDuration: "1.5s" }} />
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-3 md:w-3 md:h-4 bg-gradient-to-t from-accent/60 to-transparent rounded-full" />
      </div>
      {/* 받침 그릇 */}
      <div className="w-6 h-2 md:w-8 md:h-3 bg-accent/30 rounded-t-sm border-t border-x border-accent/40" />
      {/* 기둥 */}
      <div className="w-2 h-8 md:w-3 md:h-12 bg-bg-card border-x border-accent-dim/30" />
      {/* 기둥 장식 */}
      <div className="w-4 h-1 md:w-5 md:h-1.5 bg-accent/20 rounded-sm" />
      <div className="w-1.5 h-3 md:w-2 md:h-4 bg-bg-card border-x border-accent-dim/30" />
      {/* 받침대 */}
      <div className="w-5 h-1.5 md:w-7 md:h-2 bg-accent/30 rounded-sm" />
    </div>
  );
}

// 월계수 가지
function SkeletonLaurel({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 ${flip ? "scale-x-[-1]" : ""} ${className}`}>
      {/* 잎들 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center" style={{ marginLeft: `${i * 2}px` }}>
          <div className="w-3 h-1.5 md:w-4 md:h-2 bg-accent/20 rounded-full"
            style={{ transform: `rotate(${-30 + i * 5}deg)` }} />
        </div>
      ))}
      {/* 줄기 */}
      <div className="absolute left-0 top-0 w-0.5 h-full bg-accent/30 rounded-full"
        style={{ transform: "rotate(15deg)", transformOrigin: "top" }} />
    </div>
  );
}

// 암포라 (고대 항아리)
function SkeletonAmphora({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 입구 */}
      <div className="w-3 h-1 md:w-4 md:h-1.5 bg-accent/30 rounded-t-sm" />
      {/* 목 */}
      <div className="w-2 h-2 md:w-3 md:h-3 bg-bg-card border-x border-accent-dim/30" />
      {/* 손잡이 + 몸통 */}
      <div className="flex items-start">
        <div className="w-1.5 h-4 md:w-2 md:h-5 border border-accent/30 rounded-l-full border-r-0 -mr-0.5" />
        <div className="w-5 h-8 md:w-7 md:h-10 bg-bg-card rounded-b-full border border-accent-dim/30 border-t-0" />
        <div className="w-1.5 h-4 md:w-2 md:h-5 border border-accent/30 rounded-r-full border-l-0 -ml-0.5" />
      </div>
    </div>
  );
}

// 기둥 (Column)
function SkeletonColumn({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 주두 (Capital) */}
      <div className="w-6 h-1.5 md:w-8 md:h-2 bg-accent/30 rounded-t-sm" />
      <div className="w-5 h-1 md:w-7 md:h-1.5 bg-accent/20" />
      {/* 기둥 본체 (홈이 있는) */}
      <div className="w-4 h-12 md:w-5 md:h-16 bg-bg-card border-x border-accent-dim/30 relative overflow-hidden">
        {/* 세로 홈 */}
        <div className="absolute inset-y-0 left-0.5 w-px bg-accent/10" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-accent/10" />
        <div className="absolute inset-y-0 right-0.5 w-px bg-accent/10" />
      </div>
      {/* 주초 (Base) */}
      <div className="w-5 h-1 md:w-7 md:h-1.5 bg-accent/20" />
      <div className="w-6 h-1.5 md:w-8 md:h-2 bg-accent/30 rounded-b-sm" />
    </div>
  );
}

// 초기 로딩 스켈레톤
function LoungeSkeleton() {
  return (
    <div className="animate-pulse">
      {/* SectionHeader 스켈레톤 */}
      <div className="flex items-end justify-between mb-8 md:mb-12 px-2 md:px-4 border-b border-accent-dim/10 pb-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-28 bg-bg-card rounded" />
          <div className="h-8 w-40 bg-bg-card rounded" />
          <div className="h-4 w-52 bg-bg-card rounded" />
        </div>
      </div>

      {/* 고대 경기장 영역 */}
      <div className="relative bg-bg-card/30 rounded-xl border border-accent-dim/20 p-6 md:p-10 mb-8 overflow-hidden">
        {/* 배경 장식 - 월계수 */}
        <div className="absolute top-4 left-4 opacity-30 hidden md:block">
          <SkeletonLaurel />
        </div>
        <div className="absolute top-4 right-4 opacity-30 hidden md:block">
          <SkeletonLaurel flip />
        </div>

        {/* 테이블 상단 장식 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
          <div className="h-px w-8 md:w-16 bg-accent/30" />
          <div className="w-3 h-3 md:w-4 md:h-4 rotate-45 border border-accent/40 bg-bg-main" />
          <div className="h-px w-8 md:w-16 bg-accent/30" />
        </div>

        {/* 메인 오브젝트 배치 */}
        <div className="flex items-end justify-center gap-4 md:gap-8 lg:gap-12">
          {/* 왼쪽 기둥 + 봉화 */}
          <div className="hidden md:flex flex-col items-center gap-2">
            <SkeletonBeacon className="opacity-70" />
          </div>

          {/* 왼쪽: 암포라 + 스크롤 */}
          <div className="flex flex-col items-center gap-3">
            <SkeletonAmphora className="opacity-50 hidden sm:flex" />
            <SkeletonScroll className="opacity-60" />
          </div>

          {/* 중앙: 게임 테이블 */}
          <div className="flex flex-col items-center">
            {/* 테이블 상판 */}
            <div className="relative bg-bg-card/80 rounded-lg border border-accent-dim/30 p-4 md:p-6">
              {/* 주사위들 */}
              <div className="flex flex-col items-center gap-2 md:gap-3">
                <div className="flex gap-2 md:gap-3">
                  <SkeletonDice value={5} className="rotate-6" />
                  <SkeletonDice value={3} className="-rotate-3" />
                </div>
                <div className="flex gap-2 md:gap-3">
                  <SkeletonDice value={6} className="-rotate-6" />
                  <SkeletonDice value={2} className="rotate-12" />
                </div>
              </div>
            </div>
            {/* 테이블 다리 */}
            <div className="flex gap-8 md:gap-16">
              <div className="w-2 h-4 md:w-3 md:h-6 bg-accent/20 rounded-b" />
              <div className="w-2 h-4 md:w-3 md:h-6 bg-accent/20 rounded-b" />
            </div>
          </div>

          {/* 오른쪽: 트로피 */}
          <div className="flex flex-col items-center gap-3">
            <SkeletonTrophy className="opacity-70" />
            <SkeletonScroll className="opacity-40 hidden sm:flex" />
          </div>

          {/* 오른쪽 기둥 */}
          <div className="hidden md:flex flex-col items-center gap-2">
            <SkeletonColumn className="opacity-50" />
          </div>
        </div>

        {/* 바닥 장식 */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent/20" />
          <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-accent/20" />
        </div>

        {/* 테이블 하단 장식 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-2">
          <div className="h-px w-12 md:w-24 bg-accent/30" />
          <div className="w-2 h-2 md:w-3 md:h-3 rounded-full border border-accent/40 bg-bg-main" />
          <div className="h-px w-12 md:w-24 bg-accent/30" />
        </div>
      </div>

      {/* 탭 스켈레톤 */}
      <div className="flex gap-3 mb-8">
        <div className="h-10 w-28 bg-bg-card rounded-lg flex items-center justify-center gap-2 border border-accent-dim/10">
          <div className="w-4 h-4 bg-accent/20 rounded" />
          <div className="w-12 h-3 bg-accent/20 rounded" />
        </div>
        <div className="h-10 w-32 bg-bg-card rounded-lg flex items-center justify-center gap-2 border border-accent-dim/10">
          <div className="w-4 h-4 bg-accent/20 rounded" />
          <div className="w-16 h-3 bg-accent/20 rounded" />
        </div>
      </div>

      {/* 카드 그리드 스켈레톤 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-bg-card rounded-xl border border-accent-dim/10 p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 bg-accent/10 rounded-lg" />
              <div className="w-12 h-4 bg-accent/10 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-accent/10 rounded" />
              <div className="h-3 w-2/3 bg-accent/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Lounge() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<LoungeTab>("higher-lower");
  const [blindSubTab, setBlindSubTab] = useState<BlindSubTab>("popular");
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(true);
  const [blindGameCards, setBlindGameCards] = useState<BlindGameCardData[]>([]);
  const [isBlindLoading, setIsBlindLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 초기 로딩 해제 (higher-lower, timeline 탭은 별도 데이터 로드 불필요)
  useEffect(() => {
    if (mainTab === "higher-lower" || mainTab === "timeline") {
      setIsInitialLoad(false);
    }
  }, [mainTab]);

  useEffect(() => {
    if (mainTab === "tier-list") loadPlaylists();
  }, [mainTab]);

  useEffect(() => {
    if (mainTab === "blind-game") loadBlindGameCards();
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
      setIsInitialLoad(false);
    }
  }

  async function loadBlindGameCards() {
    setIsBlindLoading(true);
    try {
      const records = await getRecords({ limit: 20 }) as Array<{
        id: string;
        content: string;
        type: string;
        contentData: { id: string; title: string; type: string } | null;
      }>;

      const categoryMap: Record<string, string> = {
        BOOK: "도서", MOVIE: "영화", DRAMA: "드라마", GAME: "게임",
      };

      const cards = records
        .filter(r => r.type === "QUOTE" && r.content && r.contentData)
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

  const handlePlaylistSelect = (playlistId: string) => {
    setIsSelectModalOpen(false);
    const selectedPlaylist = playlists.find(p => p.id === playlistId);
    if (!selectedPlaylist) return;
    router.push(`/${selectedPlaylist.user_id}/collections/${playlistId}/tiers`);
  };

  if (isInitialLoad) {
    return <LoungeSkeleton />;
  }

  return (
    <>
      <SectionHeader
        variant="hero"
        englishTitle="Lounge"
        title="라운지"
        description="각종 게임을 즐기며 기록 사이사이의 즐거움을 더해보세요."
        className="mb-8 md:mb-12"
      />
      <p className="mb-4 text-sm text-accent">하이어-로워, 연대기 게임은 지금 플레이 가능합니다</p>
      <div className="relative -mx-4 px-4">
        {/* Divine Lintel for Lounge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-accent/20 shadow-glow" />

        <div className="pt-2 overflow-x-auto scrollbar-hidden">
          <div className="min-w-max">
            <Tabs>
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Tab
                    key={tab.value}
                    label={
                      <span className="flex items-center gap-1.5">
                        <Icon size={14} />
                        {tab.label}
                      </span>
                    }
                    active={mainTab === tab.value}
                    onClick={() => setMainTab(tab.value)}
                  />
                );
              })}
            </Tabs>
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-accent/10 mb-8" />

      <SelectPlaylistModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={handlePlaylistSelect}
        playlists={playlists}
      />
      <BlindGamePlayModal isOpen={isPlayModalOpen} onClose={() => setIsPlayModalOpen(false)} />

      {mainTab === "tier-list" && (
        <TierListSection
          playlists={playlists}
          isLoading={isPlaylistLoading}
          onOpenSelectModal={() => setIsSelectModalOpen(true)}
        />
      )}
      {mainTab === "blind-game" && (
        <BlindGameSection
          cards={blindGameCards}
          isLoading={isBlindLoading}
          onPlayClick={() => setIsPlayModalOpen(true)}
          subTab={blindSubTab}
          onSubTabChange={setBlindSubTab}
        />
      )}
      {(mainTab === "higher-lower" || mainTab === "timeline") && (
        <>
          {mainTab === "higher-lower" && <HigherLowerGame />}
          {mainTab === "timeline" && <TimelineGame />}
        </>
      )}
    </>
  );
}
