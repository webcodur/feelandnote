/*
  파일명: /app/(main)/arena/tier-list/page.tsx
  기능: 티어리스트 페이지
  책임: 플레이리스트 기반 티어리스트 기능을 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TierListSection from "@/components/features/user/agora/TierListSection";
import SelectPlaylistModal from "@/components/features/user/agora/SelectPlaylistModal";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_SECTION_HEADERS } from "@/constants/arena";
import { getPlaylists, type PlaylistSummary } from "@/actions/playlists";

export default function Page() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  async function loadPlaylists() {
    setIsLoading(true);
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("플레이리스트 로드 실패:", error);
      setPlaylists([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handlePlaylistSelect = (playlistId: string) => {
    setIsSelectModalOpen(false);
    const selectedPlaylist = playlists.find(p => p.id === playlistId);
    if (!selectedPlaylist) return;
    router.push(`/${selectedPlaylist.user_id}/collections/${playlistId}/tiers`);
  };

  const headerInfo = ARENA_SECTION_HEADERS["tier-list"];

  return (
    <>
      <SectionHeader
        label={headerInfo.label}
        title={headerInfo.title}
        description={
          <>
            {headerInfo.description}
            {headerInfo.subDescription && (
              <>
                <br />
                <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
                  {headerInfo.subDescription}
                </span>
              </>
            )}
          </>
        }
      />
      <TierListSection
        playlists={playlists}
        isLoading={isLoading}
        onOpenSelectModal={() => setIsSelectModalOpen(true)}
      />
      <SelectPlaylistModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={handlePlaylistSelect}
        playlists={playlists}
      />
    </>
  );
}
