/*
  파일명: /components/features/user/detail/playlistDetail/PlaylistItemList.tsx
  기능: 플레이리스트 아이템 목록
  책임: 플레이리스트의 콘텐츠 목록과 드래그 앤 드롭 재정렬을 처리한다.
*/ // ------------------------------
"use client";

import { GripVertical, ListMusic, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { CATEGORIES } from "@/constants/categories";
import type { PlaylistWithItems } from "@/types/database";
import ContentCard from "@/components/ui/cards/ContentCard/ContentCard";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { updatePlaylistItems } from "@/actions/playlists/updatePlaylistItems";
import { useRouter } from "next/navigation";

const TIER_KEYS = ["S", "A", "B", "C", "D"] as const;
const TIER_BADGE_STYLES: Record<string, string> = {
  S: "bg-red-500 text-white border-red-500",
  A: "bg-orange-500 text-white border-orange-500",
  B: "bg-yellow-500 text-black border-yellow-500",
  C: "bg-green-500 text-black border-green-500",
  D: "bg-blue-500 text-white border-blue-500",
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
  const router = useRouter();
  const tierMap = playlist.has_tiers ? buildTierMap(playlist.tiers) : null;

  const handleRemoveItem = async (contentId: string) => {
    if (!confirm("이 콘텐츠를 재생목록에서 삭제하시겠습니까?")) return;

    try {
      const newItems = playlist.items.filter((item) => item.content_id !== contentId);
      const newContentIds = newItems.map((item) => item.content_id);

      const result = await updatePlaylistItems({
        playlistId: playlist.id,
        contentIds: newContentIds
      });

      if (!result.success) {
        throw new Error("플레이리스트 업데이트에 실패했습니다.");
      }
      
      router.refresh();
      
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  if (playlist.items.length === 0) {
    return (
      <div className="text-center py-20 text-text-secondary border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
        <ListMusic size={48} className="mx-auto mb-4 opacity-50" />
        <p className="font-serif text-lg text-text-primary mb-2">소장된 기록이 없습니다</p>
        <p className="text-sm opacity-60 mb-6">지혜의 조각들을 모아 컬렉션을 완성해보세요.</p>
        {isOwner && (
          <Button onClick={() => setIsEditMode(true)} className="px-6 py-2 bg-accent text-black font-bold hover:bg-accent-hover rounded-full">
            콘텐츠 추가하기
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
      {playlist.items.map((item, index) => {
         const tier = tierMap?.get(item.content_id);

         return (
            <div
               key={item.id}
               draggable={isOwner}
               onDragStart={isOwner ? () => onDragStart(index) : undefined}
               onDragOver={isOwner ? (e) => onDragOver(e, index) : undefined}
               onDragEnd={isOwner ? onDragEnd : undefined}
               className={`relative group ${isDragging && draggedIndex === index ? "opacity-30 scale-95" : "opacity-100"}`}
            >
               <ContentCard
                  contentId={item.content.id}
                  thumbnail={item.content.thumbnail_url}
                  title={item.content.title}
                  creator={item.content.creator}
                  contentType={item.content.type}
                  onClick={() => onItemClick(item.content_id, item.content.type)}
                  className="h-full bg-[#151515] border-white/5 hover:border-accent/40"
                  aspectRatio="2/3"
                  topRightNode={
                     isOwner ? (
                        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                           <div 
                              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-md text-white/70 hover:text-white cursor-grab active:cursor-grabbing border border-white/10 shadow-lg hover:bg-black/80 hover:border-white/30"
                              title="순서 변경 (드래그)"
                           >
                              <GripVertical size={16} />
                           </div>
                           <DropdownMenu
                              items={[
                                 {
                                    label: "목록에서 삭제",
                                    icon: <Trash2 size={14} />,
                                    onClick: () => handleRemoveItem(item.content_id),
                                    variant: "danger"
                                 }
                              ]}
                              buttonClassName="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-md border border-white/10 shadow-lg hover:bg-black/80 hover:border-white/30 text-white/90"
                              iconSize={16}
                           />
                        </div>
                     ) : tier ? (
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${TIER_BADGE_STYLES[tier]}`}>
                           {tier}
                        </div>
                     ) : undefined
                  }
               />
               
               {/* Order Badge (Optional, maybe too cluttered) */}
               {isOwner && (
                  <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white/50 border border-white/10 pointer-events-none">
                     {index + 1}
                  </div>
               )}
            </div>
         );
      })}
    </div>
  );
}

