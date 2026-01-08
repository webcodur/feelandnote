/*
  파일명: /components/features/archive/lounge/Lounge.tsx
  기능: 휴게실 페이지 최상위 컴포넌트
  책임: 티어리스트와 블라인드 게임 UI를 조합하여 렌더링한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trophy, Target, Gamepad2, Puzzle } from "lucide-react";
import { Button, FilterChips, SectionHeader, type ChipOption } from "@/components/ui";
import BlindGamePlayModal from "./BlindGamePlayModal";
import SelectPlaylistModal from "./SelectPlaylistModal";
import TierListSection from "./TierListSection";
import BlindGameSection, { type BlindSubTab, type BlindGameCardData } from "./BlindGameSection";
import { getPlaylists, type PlaylistSummary } from "@/actions/playlists";
import { getRecords } from "@/actions/records";

type LoungeTab = "tier-list" | "blind-game";

const MAIN_TABS: ChipOption<LoungeTab>[] = [
  { value: "tier-list", label: "티어리스트", icon: Trophy },
  { value: "blind-game", label: "블라인드 게임", icon: Target },
];

export default function Lounge() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<LoungeTab>("tier-list");
  const [blindSubTab, setBlindSubTab] = useState<BlindSubTab>("popular");
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const [blindGameCards, setBlindGameCards] = useState<BlindGameCardData[]>([]);
  const [isBlindLoading, setIsBlindLoading] = useState(false);

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
    router.push(`/archive/playlists/${playlistId}/tiers`);
  };

  return (
    <>
      <SectionHeader
        title="휴게실"
        description="쉬면서 티어리스트를 공유하고 블라인드 게임을 즐기세요"
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

      <div className="border-b border-border pb-4 mb-6">
        <FilterChips options={MAIN_TABS} value={mainTab} onChange={setMainTab} variant="filled" showIcon />
      </div>

      <SelectPlaylistModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={handlePlaylistSelect}
        playlists={playlists}
      />
      <BlindGamePlayModal isOpen={isPlayModalOpen} onClose={() => setIsPlayModalOpen(false)} />

      {mainTab === "tier-list" ? (
        <TierListSection
          playlists={playlists}
          isLoading={isPlaylistLoading}
          onOpenSelectModal={() => setIsSelectModalOpen(true)}
        />
      ) : (
        <BlindGameSection
          cards={blindGameCards}
          isLoading={isBlindLoading}
          onPlayClick={() => setIsPlayModalOpen(true)}
          subTab={blindSubTab}
          onSubTabChange={setBlindSubTab}
        />
      )}
    </>
  );
}
