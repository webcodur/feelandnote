/*
  파일명: /components/features/archive/detail/playlistDetail/PlaylistHeader.tsx
  기능: 플레이리스트 상세 헤더
  책임: 플레이리스트 정보, 저장/공유 버튼, 메뉴를 표시한다.
*/ // ------------------------------
"use client";

import Link from "next/link";
import Image from "next/image";
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
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { CATEGORIES } from "@/constants/categories";
import type { PlaylistWithItems } from "@/types/database";

interface PlaylistHeaderProps {
  playlist: PlaylistWithItems;
  playlistId: string;
  isOwner: boolean;
  currentUserId: string | null;
  isSaved: boolean;
  isMenuOpen: boolean;
  categoryCounts: Record<string, number>;
  setIsMenuOpen: (open: boolean) => void;
  setIsEditMode: (edit: boolean) => void;
  handleTogglePublic: () => void;
  handleDelete: () => void;
  handleToggleSave: () => void;
}

export default function PlaylistHeader({
  playlist,
  playlistId,
  isOwner,
  currentUserId,
  isSaved,
  isMenuOpen,
  categoryCounts,
  setIsMenuOpen,
  setIsEditMode,
  handleTogglePublic,
  handleDelete,
  handleToggleSave,
}: PlaylistHeaderProps) {
  return (
    <>
      {/* 헤더 영역 */}
      <div className="flex items-start gap-4 mb-6">
        <Link href={`/${playlist.user_id}/collections`} className="p-2 -ml-2 text-text-secondary hover:text-text-primary">
          <ArrowLeft size={24} />
        </Link>

        <div className="flex-1 flex gap-4">
          {/* 커버 이미지 */}
          <div className="relative w-24 h-24 rounded-xl bg-bg-card flex items-center justify-center overflow-hidden flex-shrink-0">
            {playlist.cover_url ? (
              <Image src={playlist.cover_url} alt={playlist.name} fill unoptimized className="object-cover" />
            ) : playlist.items[0]?.content.thumbnail_url ? (
              <Image src={playlist.items[0].content.thumbnail_url} alt={playlist.name} fill unoptimized className="object-cover" />
            ) : (
              <ListMusic size={32} className="text-text-secondary" />
            )}
          </div>

          {/* 정보 영역 */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
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

        {/* 메뉴 - 소유자용 */}
        {isOwner && (
          <div className="relative">
            <Button unstyled onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-text-secondary hover:text-text-primary">
              <MoreVertical size={20} />
            </Button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0" style={{ zIndex: Z_INDEX.dropdown - 1 }} onClick={() => setIsMenuOpen(false)} />
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
        )}

        {/* 저장 버튼 - 타인의 공개 플레이리스트용 */}
        {!isOwner && currentUserId && (
          <Button
            unstyled
            onClick={handleToggleSave}
            className={`p-2 ${isSaved ? "text-accent" : "text-text-secondary hover:text-text-primary"}`}
          >
            {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </Button>
        )}
      </div>

      {/* 액션 버튼 - 소유자만 */}
      {isOwner && (
        <div className="flex gap-2 mb-6">
          <Button
            unstyled
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-secondary border border-border rounded-lg text-sm"
          >
            <Pencil size={16} />편집
          </Button>
          <Link href={`/${playlist.user_id}/collections/${playlistId}/tiers`} className="flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-secondary border border-border rounded-lg text-sm">
            <Trophy size={16} />티어 설정
          </Link>
        </div>
      )}
    </>
  );
}
