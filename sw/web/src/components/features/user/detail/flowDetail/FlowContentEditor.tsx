/*
  파일명: /components/features/user/detail/flowDetail/FlowContentEditor.tsx
  기능: 플로우 콘텐츠 편집 - 우측 사이드 패널
  책임: 내 서재 콘텐츠를 표시하고, 드래그로 스테이지에 추가한다.
*/
"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import type { FlowStageWithNodes } from "@/types/database";

interface FlowContentEditorProps {
  flowId: string;
  stages: FlowStageWithNodes[];
  isDragging?: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

function DraggableContentItem({ item }: { item: UserContentWithContent }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${item.content_id}`,
    data: {
      type: "library-content",
      contentId: item.content_id,
      content: item.content,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2.5 p-2 bg-[#1a1a1a] border border-white/[0.06] rounded-lg hover:border-accent/30 transition-colors cursor-grab active:cursor-grabbing"
    >
      {/* 썸네일 */}
      <div className="w-9 h-12 bg-[#222] rounded overflow-hidden relative shrink-0 pointer-events-none">
        {item.content.thumbnail_url ? (
          <Image
            src={item.content.thumbnail_url}
            alt={item.content.title}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] text-white/20">
            {item.content.title.slice(0, 4)}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="text-xs text-white truncate">{item.content.title}</p>
        <p className="text-[10px] text-text-secondary/50 truncate">{item.content.creator}</p>
      </div>
    </div>
  );
}

export default function FlowContentEditor({
  flowId,
  stages,
  isDragging = false,
  onClose,
  onRefresh
}: FlowContentEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  void flowId;
  void onRefresh;

  const existingContentIds = new Set(
    stages.flatMap(s => s.nodes.map(n => n.content_id))
  );

  const loadContents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyContents({
        search: searchQuery.trim().length >= 2 ? searchQuery.trim() : undefined,
        page: 1,
        limit: 50,
      });
      setContents(result.items);
    } catch (error) {
      console.error("콘텐츠 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const availableContents = contents.filter(
    item => !existingContentIds.has(item.content_id)
  );

  return (
    <>
      {/* 모바일 배경 오버레이 (하단 시트 위 딤, 드래그 중 숨김) */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 md:hidden transition-opacity duration-200",
          isDragging ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{ zIndex: Z_INDEX.dropdown - 1 }}
        onClick={onClose}
      />

      {/* 모바일: 하단 시트 / 데스크톱: 우측 사이드 패널 */}
      {/* 모바일 드래그 중: 아래로 슬라이드 → 드롭 후 다시 올라옴 */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 h-[55vh] rounded-t-2xl md:rounded-none md:inset-auto md:top-16 md:end-0 md:bottom-0 md:h-auto md:w-80 bg-[#0d0d0d] border-t border-white/10 md:border-t-0 md:border-s md:border-white/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.6)] md:shadow-[-4px_0_20px_rgba(0,0,0,0.6)] flex flex-col transition-transform duration-300 ease-out",
          isDragging ? "translate-y-full md:translate-y-0" : "translate-y-0"
        )}
        style={{ zIndex: Z_INDEX.dropdown }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          <h3 className="text-sm font-serif font-bold text-white flex-1">
            내 서재
          </h3>
          <Button
            unstyled
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </Button>
        </div>

        {/* 검색 */}
        <div className="px-4 py-2 border-b border-white/[0.04] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="검색..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-white/[0.06] rounded-lg text-xs text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* 콘텐츠 목록 (세로 스크롤) */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-accent animate-spin" />
            </div>
          ) : availableContents.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-xs">
              {existingContentIds.size > 0
                ? "모든 콘텐츠가 플로우에 추가되었습니다"
                : "서재에 콘텐츠가 없습니다"
              }
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {availableContents.map(item => (
                <DraggableContentItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
