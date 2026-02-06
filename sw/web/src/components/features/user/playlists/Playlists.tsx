/*
  파일명: /components/features/user/playlists/Playlists.tsx
  기능: 재생목록 페이지 최상위 컴포넌트
  책임: 재생목록 목록, 탭, 생성 모드 등을 조합하여 렌더링한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListMusic, Plus, ChevronRight, Loader2, Bookmark } from "lucide-react";
import Button from "@/components/ui/Button";
import { DecorativeLabel } from "@/components/ui";
import { getPlaylists, getSavedPlaylists, type PlaylistSummary } from "@/actions/playlists";
import PlaylistEditor from "./PlaylistEditor";
import ClassicalBox from "@/components/ui/ClassicalBox";
import type { SavedPlaylistWithDetails } from "@/types/database";

type TabType = "mine" | "saved";

const TABS = [
  { id: "mine" as const, label: "내 재생목록" },
  { id: "saved" as const, label: "저장됨" },
];

interface PlaylistsProps {
  userId: string;
  isOwner: boolean;
}

export default function Playlists({ userId, isOwner }: PlaylistsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("mine");
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylistWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      if (isOwner && activeTab === "saved") {
        const data = await getSavedPlaylists();
        setSavedPlaylists(data);
      } else {
        const data = await getPlaylists(userId);
        setPlaylists(data);
      }
    } catch (error) {
      console.error("재생목록 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [activeTab, userId]);

  const handleSelectPlaylist = (userId: string, playlistId: string) => {
    router.push(`/${userId}/collections/${playlistId}`);
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

  const currentList = activeTab === "mine" ? playlists : savedPlaylists;
  const isEmpty = currentList.length === 0;

  // 타인 컬렉션 페이지
  if (!isOwner) {
    return (
      <>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-accent" />
          </div>
        ) : isEmpty ? (
          <EmptyState variant="other" />
        ) : (
          <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20">
            <div className="flex justify-center mb-6">
              <DecorativeLabel label="컬렉션" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onClick={() => handleSelectPlaylist(playlist.user_id, playlist.id)}
                />
              ))}
            </div>
          </ClassicalBox>
        )}
      </>
    );
  }

  // 본인 컬렉션 페이지
  return (
    <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20">
      <div className="flex justify-center mb-6">
        <DecorativeLabel label="컬렉션" />
      </div>

      <div className="flex gap-2 p-1 bg-bg-card border border-accent-dim/20 rounded-sm mb-6 w-fit mx-auto sm:mx-0">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            unstyled
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-sm text-xs font-serif font-black tracking-widest uppercase transition-all duration-300 ${
              activeTab === tab.id
                ? "bg-accent text-bg-main shadow-glow-sm scale-105"
                : "text-text-tertiary hover:text-accent hover:bg-accent/5"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      ) : isEmpty ? (
        <EmptyState variant={activeTab} onCreateClick={() => setIsCreateMode(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === "mine"
            ? playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onClick={() => handleSelectPlaylist(playlist.user_id, playlist.id)}
                />
              ))
            : savedPlaylists.map((item) => (
                <SavedPlaylistCard
                  key={item.id}
                  item={item}
                  onClick={() => handleSelectPlaylist(item.playlist.user_id, item.playlist.id)}
                />
              ))}
        </div>
      )}
    </ClassicalBox>
  );
}

// region 하위 컴포넌트
type EmptyVariant = "mine" | "saved" | "other";

const EMPTY_CONTENT: Record<EmptyVariant, { icon: typeof ListMusic; title: string; description: string }> = {
  mine: {
    icon: ListMusic,
    title: "아직 컬렉션이 없습니다",
    description: "나만의 컬렉션을 만들어 좋아하는 콘텐츠를 모아보세요.",
  },
  saved: {
    icon: Bookmark,
    title: "저장된 컬렉션이 없습니다",
    description: "다른 사용자의 컬렉션을 저장하면 여기에 표시됩니다.",
  },
  other: {
    icon: ListMusic,
    title: "공개된 컬렉션이 없습니다",
    description: "이 사용자가 공개한 컬렉션이 아직 없습니다.",
  },
};

function EmptyState({ variant, onCreateClick }: { variant: EmptyVariant; onCreateClick?: () => void }) {
  const { icon: Icon, title, description } = EMPTY_CONTENT[variant];

  return (
    <div className="relative overflow-hidden bg-bg-card border-2 border-dashed border-accent-dim/20 p-12 sm:p-20 text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        <div className="text-accent/30 mb-6 flex justify-center">
          <Icon size={64} strokeWidth={1} />
        </div>
        <h3 className="text-xl sm:text-2xl font-serif font-black text-text-primary mb-3 tracking-widest">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-text-tertiary mb-8 font-serif max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
        {variant === "mine" && onCreateClick && (
          <Button
            onClick={onCreateClick}
            className="group relative px-8 py-3 bg-accent text-bg-main font-serif font-black tracking-widest text-xs hover:bg-accent-hover transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <div className="relative z-10 flex items-center gap-3">
              <Plus size={16} strokeWidth={3} />
              새 컬렉션 만들기
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}

function PlaylistCard({ playlist, onClick }: { playlist: PlaylistSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-bg-card border-2 border-accent-dim/10 p-5 text-left w-full transition-all duration-500 hover:border-accent hover:shadow-glow-sm active:translate-y-1 overflow-hidden"
    >
      {/* Stone texture overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")` }} />
      
      <div className="flex items-center gap-5 relative z-10">
        <div className="w-14 h-14 bg-black border border-accent/20 flex items-center justify-center flex-shrink-0 relative group-hover:rotate-6 transition-transform duration-500">
           {/* Photo Frame Detail */}
          <div className="absolute inset-1 border border-white/5" />
          <ListMusic size={28} className="text-accent/60 group-hover:text-accent group-hover:drop-shadow-glow-sm transition-all" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-base font-serif font-black text-text-primary tracking-tight truncate group-hover:text-accent transition-colors">
            {playlist.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-serif font-bold text-accent/40 tracking-widest">
              {playlist.item_count}개 항목
            </span>
          </div>
        </div>
        
        <div className="text-accent opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <ChevronRight size={20} strokeWidth={3} />
        </div>
      </div>
      
      {/* Corner Brackets for active card focus */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-s border-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-e border-accent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function SavedPlaylistCard({ item, onClick }: { item: SavedPlaylistWithDetails; onClick: () => void }) {
  const { playlist } = item;

  return (
    <button
      onClick={onClick}
      className="group relative bg-bg-card border-2 border-accent-dim/10 p-5 text-left w-full transition-all duration-500 hover:border-accent hover:shadow-glow-sm active:translate-y-1 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")` }} />
      
      <div className="flex items-center gap-5 relative z-10">
        <div className="w-14 h-14 bg-black border border-accent/20 flex items-center justify-center flex-shrink-0 relative group-hover:rotate-6 transition-transform duration-500">
          <div className="absolute inset-1 border border-white/5" />
          <Bookmark size={28} className="text-accent/60 group-hover:text-accent group-hover:drop-shadow-glow-sm transition-all" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-base font-serif font-black text-text-primary tracking-tight truncate group-hover:text-accent transition-colors">
            {playlist.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-serif font-bold text-accent/40 tracking-widest truncate">
              {playlist.owner?.nickname || "익명"} · {playlist.item_count}개 항목
            </span>
          </div>
        </div>
        
        <div className="text-accent opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <ChevronRight size={20} strokeWidth={3} />
        </div>
      </div>

       <div className="absolute top-0 left-0 w-2 h-2 border-t border-s border-accent opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-e border-accent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
// endregion
