/*
  파일명: /components/features/user/detail/playlistDetail/PlaylistItemList.tsx
  기능: 플레이리스트 아이템 목록
  책임: 플레이리스트의 콘텐츠 목록과 드래그 앤 드롭 재정렬을 처리한다.
*/ // ------------------------------
"use client";

import Image from "next/image";
import { GripVertical, ListMusic } from "lucide-react";
import Button from "@/components/ui/Button";
import { CATEGORIES } from "@/constants/categories";
import type { PlaylistWithItems } from "@/types/database";

const TIER_KEYS = ["S", "A", "B", "C", "D"] as const;
const TIER_BADGE_STYLES: Record<string, string> = {
  S: "bg-red-500/20 text-red-400 border-red-500/30",
  A: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  B: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  C: "bg-green-500/20 text-green-400 border-green-500/30",
  D: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function buildTierMap(tiers: Record<string, string[]> | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!tiers) return map;
  for (const key of TIER_KEYS) {
    for (const id of tiers[key] || []) {
      map.set(id, key);
    }
  }
  return map;
}

interface PlaylistItemListProps {
  playlist: PlaylistWithItems;
  isOwner: boolean;
  isDragging: boolean;
  draggedIndex: number | null;
  onItemClick: (contentId: string, contentType: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  setIsEditMode: (edit: boolean) => void;
}

export default function PlaylistItemList({
  playlist,
  isOwner,
  isDragging,
  draggedIndex,
  onItemClick,
  onDragStart,
  onDragOver,
  onDragEnd,
  setIsEditMode,
}: PlaylistItemListProps) {
  const tierMap = playlist.has_tiers ? buildTierMap(playlist.tiers) : null;

  if (playlist.items.length === 0) {
    return (
      <div className="text-center py-20 text-text-secondary">
        <ListMusic size={48} className="mx-auto mb-4 opacity-50" />
        <p>재생목록이 비어있습니다</p>
        <Button unstyled onClick={() => setIsEditMode(true)} className="mt-4 text-accent hover:underline">
          콘텐츠 추가하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {playlist.items.map((item, index) => (
        <div
          key={item.id}
          draggable={isOwner}
          onDragStart={isOwner ? () => onDragStart(index) : undefined}
          onDragOver={isOwner ? (e) => onDragOver(e, index) : undefined}
          onDragEnd={isOwner ? onDragEnd : undefined}
          onClick={() => onItemClick(item.content_id, item.content.type)}
          className={`flex items-center gap-3 p-3 bg-bg-card rounded-xl cursor-pointer hover:bg-bg-secondary ${isDragging && draggedIndex === index ? "opacity-50" : ""}`}
        >
          {isOwner && (
            <div className="text-text-secondary hover:text-text-primary cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
              <GripVertical size={18} />
            </div>
          )}
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-bg-secondary">
            {item.content.thumbnail_url ? (
              <Image src={item.content.thumbnail_url} alt={item.content.title} fill unoptimized className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">No</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.content.title}</p>
            <p className="text-xs text-text-secondary truncate">{item.content.creator?.replace(/\^/g, ', ') || "\u00A0"}</p>
          </div>
          {tierMap?.get(item.content_id) && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_BADGE_STYLES[tierMap.get(item.content_id)!]}`}>
              {tierMap.get(item.content_id)}
            </span>
          )}
          <div className="text-xs text-text-secondary px-2 py-1 bg-bg-secondary rounded">
            {CATEGORIES.find((c) => c.dbType === item.content.type)?.label}
          </div>
        </div>
      ))}
    </div>
  );
}
