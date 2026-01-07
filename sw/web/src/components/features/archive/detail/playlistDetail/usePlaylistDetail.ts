"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPlaylist } from "@/actions/playlists/getPlaylist";
import { deletePlaylist } from "@/actions/playlists/deletePlaylist";
import { updatePlaylist } from "@/actions/playlists/updatePlaylist";
import { reorderPlaylistItems } from "@/actions/playlists/updatePlaylistItems";
import { savePlaylist, unsavePlaylist, checkPlaylistSaved } from "@/actions/playlists/savedPlaylists";
import { createClient } from "@/lib/supabase/client";
import type { PlaylistWithItems } from "@/types/database";

export function usePlaylistDetail(playlistId: string) {
  const router = useRouter();

  const [playlist, setPlaylist] = useState<PlaylistWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const isOwner = currentUserId === playlist?.user_id;

  // 데이터 로드
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

  // 현재 사용자 및 저장 여부 확인
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        const saved = await checkPlaylistSaved(playlistId);
        setIsSaved(saved);
      }
    };
    init();
  }, [playlistId]);

  // 핸들러
  const handleDelete = async () => {
    if (!confirm("이 재생목록을 삭제하시겠습니까?")) return;
    try {
      await deletePlaylist(playlistId);
      router.push("/archive/playlists");
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

  const handleEditSuccess = () => {
    setIsEditMode(false);
    loadPlaylist();
  };

  const handleToggleSave = async () => {
    try {
      if (isSaved) {
        await unsavePlaylist(playlistId);
        setIsSaved(false);
      } else {
        await savePlaylist(playlistId);
        setIsSaved(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다");
    }
  };

  return {
    playlist,
    isLoading,
    error,
    isMenuOpen,
    setIsMenuOpen,
    isDragging,
    draggedIndex,
    isEditMode,
    setIsEditMode,
    currentUserId,
    isSaved,
    isOwner,
    handleDelete,
    handleTogglePublic,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getCategoryCounts,
    handleEditSuccess,
    handleToggleSave,
    router,
  };
}
