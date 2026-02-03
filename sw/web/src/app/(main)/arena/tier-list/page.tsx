/*
  파일명: /app/(main)/arena/tier-list/page.tsx
  기능: 티어리스트 페이지
  책임: 공개 티어리스트 탐색 및 내 플레이리스트 티어 설정
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TierListSection from "@/components/features/user/agora/TierListSection";
import SelectPlaylistModal from "@/components/features/user/agora/SelectPlaylistModal";
import SectionHeader from "@/components/shared/SectionHeader";
import { ARENA_SECTION_HEADERS } from "@/constants/arena";
import { getPlaylists, getPublicTierLists, type PlaylistSummary } from "@/actions/playlists";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [publicTierLists, setPublicTierLists] = useState<PlaylistSummary[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<PlaylistSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    setIsLoading(true);
    try {
      // 공개 티어리스트는 항상 로드
      const publicData = await getPublicTierLists();
      setPublicTierLists(publicData);

      // 로그인한 사용자만 내 플레이리스트 로드
      if (user) {
        const myData = await getPlaylists();
        setMyPlaylists(myData);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handlePlaylistSelect = (playlistId: string) => {
    setIsSelectModalOpen(false);
    const selectedPlaylist = myPlaylists.find(p => p.id === playlistId);
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
        playlists={publicTierLists}
        isLoading={isLoading}
        onOpenSelectModal={() => setIsSelectModalOpen(true)}
        isLoggedIn={!!user}
      />
      {user && (
        <SelectPlaylistModal
          isOpen={isSelectModalOpen}
          onClose={() => setIsSelectModalOpen(false)}
          onSelect={handlePlaylistSelect}
          playlists={myPlaylists}
        />
      )}
    </>
  );
}
