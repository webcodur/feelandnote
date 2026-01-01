"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trophy,
  Share2,
  Trash2,
  Lock,
  Globe,
  ListMusic,
  GripVertical,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { getPlaylist } from "@/actions/playlists/getPlaylist";
import { deletePlaylist } from "@/actions/playlists/deletePlaylist";
import { updatePlaylist } from "@/actions/playlists/updatePlaylist";
import { Z_INDEX } from "@/constants/zIndex";
import { reorderPlaylistItems } from "@/actions/playlists/updatePlaylistItems";
import type { PlaylistWithItems } from "@/types/database";
import { CATEGORIES } from "@/constants/categories";

interface PlaylistDetailViewProps {
  playlistId: string;
}

export default function PlaylistDetailView({ playlistId }: PlaylistDetailViewProps) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<PlaylistWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const loadPlaylist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlaylist(playlistId);
      setPlaylist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "재생목록을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const handleDelete = async () => {
    if (!confirm("이 재생목록을 삭제하시겠습니까?")) return;
    try {
      await deletePlaylist(playlistId);
      router.push("/archive");
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다");
    }
  };

  const handleTogglePublic = async () => {
    if (!playlist) return;
    try {
      await updatePlaylist({ playlistId, isPublic: !playlist.is_public });
      setPlaylist({ ...playlist, is_public: !playlist.is_public });
    } catch (err) {
      alert(err instanceof Error ? err.message : "설정 변경에 실패했습니다");
    }
    setIsMenuOpen(false);
  };

  const handleEdit = () => {
    router.push(`/archive?mode=playlist&id=${playlistId}`);
  };

  const handleTierSetup = () => {
    router.push(`/archive/playlists/${playlistId}/tiers`);
  };

  const handleDragStart = (index: number) => {
    setIsDragging(true);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !playlist) return;
    const newItems = [...playlist.items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setPlaylist({ ...playlist, items: newItems });
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setIsDragging(false);
    setDraggedIndex(null);
    if (!playlist) return;
    try {
      await reorderPlaylistItems({ playlistId, itemIds: playlist.items.map((item) => item.id) });
    } catch (err) {
      console.error("순서 변경 실패:", err);
      loadPlaylist();
    }
  };

  const getCategoryCounts = () => {
    if (!playlist) return {};
    const counts: Record<string, number> = {};
    playlist.items.forEach((item) => {
      const type = item.content.type;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error || "재생목록을 찾을 수 없습니다"}</p>
        <Button unstyled onClick={() => router.push("/archive")} className="text-accent hover:underline">
          기록관으로 돌아가기
        </Button>
      </div>
    );
  }

  const categoryCounts = getCategoryCounts();

  return (
    <div>
      <div className="flex items-start gap-4 mb-6">
        <Button unstyled onClick={() => router.push("/archive")} className="p-2 -ml-2 text-text-secondary hover:text-text-primary">
          <ArrowLeft size={24} />
        </Button>

        <div className="flex-1 flex gap-4">
          <div className="w-24 h-24 rounded-xl bg-bg-card flex items-center justify-center overflow-hidden flex-shrink-0">
            {playlist.cover_url ? (
              <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />
            ) : playlist.items[0]?.content.thumbnail_url ? (
              <img src={playlist.items[0].content.thumbnail_url} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <ListMusic size={32} className="text-text-secondary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{playlist.name}</h1>
            <p className="text-sm text-text-secondary mt-1">
              {playlist.item_count}개
              {Object.entries(categoryCounts).length > 0 && (
                <span className="ml-2">
                  · {Object.entries(categoryCounts).map(([type, count]) => {
                    const cat = CATEGORIES.find((c) => c.dbType === type);
                    return cat ? `${cat.label} ${count}` : null;
                  }).filter(Boolean).join(" · ")}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {playlist.is_public ? (
                <span className="flex items-center gap-1 text-xs text-green-400"><Globe size={12} /> 공개</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-text-secondary"><Lock size={12} /> 비공개</span>
              )}
              {playlist.has_tiers && (
                <span className="flex items-center gap-1 text-xs text-amber-400"><Trophy size={12} /> 티어 설정됨</span>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <Button unstyled onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-text-secondary hover:text-text-primary">
            <MoreVertical size={20} />
          </Button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0" style={{ zIndex: Z_INDEX.overlay }} onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
                <Button unstyled onClick={handleTogglePublic} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-left text-sm">
                  {playlist.is_public ? <Lock size={16} /> : <Globe size={16} />}
                  {playlist.is_public ? "비공개로 전환" : "공개로 전환"}
                </Button>
                <Button unstyled onClick={() => { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다"); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-left text-sm">
                  <Share2 size={16} />링크 복사
                </Button>
                <Button unstyled onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-left text-sm text-red-400">
                  <Trash2 size={16} />삭제
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button unstyled onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-secondary border border-border rounded-lg text-sm">
          <Pencil size={16} />편집
        </Button>
        <Button unstyled onClick={handleTierSetup} className="flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-secondary border border-border rounded-lg text-sm">
          <Trophy size={16} />티어 설정
        </Button>
      </div>

      <div className="space-y-2">
        {playlist.items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => router.push(`/archive/${item.content_id}`)}
            className={`flex items-center gap-3 p-3 bg-bg-card rounded-xl cursor-pointer transition-all hover:bg-bg-secondary ${isDragging && draggedIndex === index ? "opacity-50" : ""}`}
          >
            <div className="text-text-secondary hover:text-text-primary cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
              <GripVertical size={18} />
            </div>
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-bg-secondary">
              {item.content.thumbnail_url ? (
                <img src={item.content.thumbnail_url} alt={item.content.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">No</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.content.title}</p>
              <p className="text-xs text-text-secondary truncate">{item.content.creator || "\u00A0"}</p>
            </div>
            <div className="text-xs text-text-secondary px-2 py-1 bg-bg-secondary rounded">
              {CATEGORIES.find((c) => c.dbType === item.content.type)?.label}
            </div>
          </div>
        ))}
      </div>

      {playlist.items.length === 0 && (
        <div className="text-center py-20 text-text-secondary">
          <ListMusic size={48} className="mx-auto mb-4 opacity-50" />
          <p>재생목록이 비어있습니다</p>
          <Button unstyled onClick={handleEdit} className="mt-4 text-accent hover:underline">콘텐츠 추가하기</Button>
        </div>
      )}
    </div>
  );
}
