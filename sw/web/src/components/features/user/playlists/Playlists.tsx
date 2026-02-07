/*
  파일명: /components/features/user/playlists/Playlists.tsx
  기능: 재생목록 페이지 최상위 컴포넌트
  책임: 재생목록 목록, 생성 모드 등을 조합하여 렌더링한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListMusic, Plus, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { DecorativeLabel } from "@/components/ui";
import { getPlaylists, getSavedPlaylists, type PlaylistSummary } from "@/actions/playlists";
import PlaylistEditor from "./PlaylistEditor";
import CollectionCard from "./CollectionCard";
import type { SavedPlaylistWithDetails } from "@/types/database";

interface PlaylistsProps {
  userId: string;
  isOwner: boolean;
}

export default function Playlists({ userId, isOwner }: PlaylistsProps) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylistWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const data = await getPlaylists(userId);
      setPlaylists(data);

      // owner 모드면 저장된 플레이리스트도 함께 로드
      if (isOwner) {
        const saved = await getSavedPlaylists();
        setSavedPlaylists(saved);
      }
    } catch (error) {
      console.error("재생목록 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [userId]);

  const handleSelectPlaylist = (ownerId: string, playlistId: string) => {
    router.push(`/${ownerId}/reading/collections/${playlistId}`);
  };

  if (isCreateMode) {
    return (
      <PlaylistEditor
        mode="create"
        onClose={() => setIsCreateMode(false)}
        onSuccess={() => {
          setIsCreateMode(false);
          loadPlaylists();
        }}
      />
    );
  }

  const isEmpty = playlists.length === 0 && savedPlaylists.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-20">
      {/* 헤더 섹션 */}
      <div className="flex flex-col items-center justify-center mb-4 relative">
        <DecorativeLabel label="소장중인 재생목록" />
        {isOwner && (
           <Button
             onClick={() => setIsCreateMode(true)}
             className="mt-10 px-4 py-2 bg-accent/10 border border-accent/30 text-accent hover:bg-accent hover:text-black transition-all font-serif font-bold text-sm tracking-widest flex items-center gap-2"
           >
             <Plus size={16} />
             NEW COLLECTION
           </Button>
        )}
      </div>

      {isEmpty ? (
        <EmptyState variant={isOwner ? "mine" : "other"} onCreateClick={() => setIsCreateMode(true)} />
      ) : (
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 px-3 md:px-0">
          {/* 내 컬렉션 */}
          {playlists.map((playlist) => (
            <CollectionCard
              key={playlist.id}
              playlist={playlist}
              onClick={() => handleSelectPlaylist(playlist.user_id, playlist.id)}
            />
          ))}
          
          {/* 저장된 남의 컬렉션 (isOwner일 때만 표시) */}
          {savedPlaylists.map((item) => (
            <CollectionCard
              key={item.id}
              playlist={item.playlist}
              onClick={() => handleSelectPlaylist(item.playlist.user_id, item.playlist.id)}
              className="opacity-90 grayscale-[30%] hover:grayscale-0" 
            />
          ))}
        </div>
      )}
    </div>
  );
}

// region 하위 컴포넌트
type EmptyVariant = "mine" | "other";

const EMPTY_CONTENT: Record<EmptyVariant, { icon: typeof ListMusic; title: string; description: string }> = {
  mine: {
    icon: ListMusic,
    title: "소장품이 없습니다",
    description: "새로운 컬렉션을 만들어 지혜를 기록해보세요.",
  },
  other: {
    icon: ListMusic,
    title: "공개된 소장품이 없습니다",
    description: "아직 전시된 컬렉션이 없습니다.",
  },
};

function EmptyState({ variant, onCreateClick }: { variant: EmptyVariant; onCreateClick?: () => void }) {
  const { icon: Icon, title, description } = EMPTY_CONTENT[variant];

  return (
    <div className="relative overflow-hidden border border-white/5 bg-[#111] p-16 text-center max-w-lg mx-auto rounded-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 border border-white/10 flex items-center justify-center mb-6 rotate-45">
           <div className="-rotate-45">
              <Icon size={32} strokeWidth={1} className="text-white/40" />
           </div>
        </div>
        
        <h3 className="text-xl font-serif font-black text-text-primary mb-3 tracking-wider">
          {title}
        </h3>
        <p className="text-sm text-text-tertiary mb-8 font-serif leading-relaxed opacity-60">
          {description}
        </p>
        
        {variant === "mine" && onCreateClick && (
          <Button
            onClick={onCreateClick}
            className="px-8 py-3 bg-[#1a1a1a] border border-accent/30 text-accent font-serif font-bold text-xs tracking-widest hover:bg-accent hover:text-black transition-all"
          >
            CREATE FIRST COLLECTION
          </Button>
        )}
      </div>
    </div>
  );
}
// endregion
