"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListMusic, Plus, ChevronRight, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import Button from "@/components/ui/Button";
import { getPlaylists, type PlaylistSummary } from "@/actions/playlists";
import { PlaylistEditor } from "@/components/features/playlist";

export default function Page() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("재생목록 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleSelectPlaylist = (playlistId: string) => {
    router.push(`/archive/playlists/${playlistId}`);
  };

  // 생성 모드
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

  return (
    <>
      <SectionHeader
        title="재생목록"
        description="나만의 콘텐츠 컬렉션을 관리하세요"
        icon={<ListMusic size={20} />}
        className="mb-4"
        action={
          <Button
            onClick={() => setIsCreateMode(true)}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Plus size={16} />
            새 재생목록
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center">
          <div className="text-text-tertiary mb-4 flex justify-center">
            <ListMusic size={48} />
          </div>
          <p className="text-lg font-medium text-text-secondary mb-2">
            아직 재생목록이 없습니다
          </p>
          <p className="text-sm text-text-tertiary mb-6">
            좋아하는 콘텐츠를 모아 나만의 컬렉션을 만들어보세요
          </p>
          <Button onClick={() => setIsCreateMode(true)} className="inline-flex items-center gap-2">
            <Plus size={16} />
            첫 재생목록 만들기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onClick={() => handleSelectPlaylist(playlist.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function PlaylistCard({
  playlist,
  onClick,
}: {
  playlist: PlaylistSummary;
  onClick: () => void;
}) {
  return (
    <Button
      unstyled
      onClick={onClick}
      className="group bg-surface hover:bg-surface-hover border border-border rounded-xl p-4 text-left w-full"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <ListMusic size={24} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate group-hover:text-accent">
            {playlist.name}
          </p>
          <p className="text-sm text-text-secondary mt-0.5">
            {playlist.item_count}개 콘텐츠
          </p>
        </div>
        <ChevronRight
          size={20}
          className="text-text-tertiary group-hover:text-accent flex-shrink-0"
        />
      </div>
    </Button>
  );
}
