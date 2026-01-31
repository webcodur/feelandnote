/*
  파일명: /components/features/user/detail/PlaylistDetail.tsx
  기능: 플레이리스트 상세 뷰
  책임: 플레이리스트 헤더, 아이템 목록, 편집 모드를 조합한다.
*/ // ------------------------------
"use client";

import Link from "next/link";
import { PlaylistEditor } from "@/components/features/user/playlists";
import { usePlaylistDetail } from "./playlistDetail/usePlaylistDetail";
import PlaylistHeader from "./playlistDetail/PlaylistHeader";
import PlaylistItemList from "./playlistDetail/PlaylistItemList";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";

interface PlaylistDetailProps {
  playlistId: string;
}

export default function PlaylistDetail({ playlistId }: PlaylistDetailProps) {
  const {
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
  } = usePlaylistDetail(playlistId);

  // 편집 모드
  if (isEditMode) {
    return (
      <PlaylistEditor
        mode="edit"
        playlistId={playlistId}
        onClose={() => setIsEditMode(false)}
        onSuccess={handleEditSuccess}
      />
    );
  }

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
        <Link href={currentUserId ? `/${currentUserId}/collections` : "/"} className="text-accent hover:underline">
          재생목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const categoryCounts = getCategoryCounts();

  return (
    <div>
      <PlaylistHeader
        playlist={playlist}
        playlistId={playlistId}
        isOwner={isOwner}
        currentUserId={currentUserId}
        isSaved={isSaved}
        isMenuOpen={isMenuOpen}
        categoryCounts={categoryCounts}
        setIsMenuOpen={setIsMenuOpen}
        setIsEditMode={setIsEditMode}
        handleTogglePublic={handleTogglePublic}
        handleDelete={handleDelete}
        handleToggleSave={handleToggleSave}
      />

      <PlaylistItemList
        playlist={playlist}
        isOwner={isOwner}
        isDragging={isDragging}
        draggedIndex={draggedIndex}
        onItemClick={(contentId, contentType) => {
          const category = getCategoryByDbType(contentType as ContentType)?.id || "book";
          router.push(`/content/${contentId}?category=${category}`);
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        setIsEditMode={setIsEditMode}
      />
    </div>
  );
}
