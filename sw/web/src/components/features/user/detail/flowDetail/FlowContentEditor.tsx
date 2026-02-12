/*
  파일명: /components/features/user/detail/flowDetail/FlowContentEditor.tsx
  기능: 플로우 콘텐츠 편집 - 하단 드래그 패널
  책임: 내 서재 콘텐츠를 표시하고, DND로 스테이지에 추가할 수 있게 한다.
         이미 추가된 콘텐츠는 목록에서 숨긴다.
*/
"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2, GripVertical } from "lucide-react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { useDraggable } from "@dnd-kit/core";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import type { FlowStageWithNodes } from "@/types/database";

// #region Props
interface FlowContentEditorProps {
  flowId: string;
  stages: FlowStageWithNodes[];
  onClose: () => void;
}
// #endregion

// #region DraggableContentItem
function DraggableContentItem({ item }: { item: UserContentWithContent }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${item.content_id}`,
    data: { type: "library-content", contentId: item.content_id, content: item.content },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999, opacity: 0.9 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg shrink-0 cursor-grab active:cursor-grabbing select-none transition-colors hover:border-accent/30 ${isDragging ? "shadow-lg shadow-accent/20 border-accent/50" : ""}`}
      {...listeners}
      {...attributes}
    >
      {/* 드래그 핸들 */}
      <GripVertical size={14} className="text-white/30 shrink-0" />

      {/* 썸네일 */}
      <div className="w-8 h-11 bg-[#222] rounded overflow-hidden shrink-0 relative">
        {item.content.thumbnail_url ? (
          <Image src={item.content.thumbnail_url} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[7px] text-white/20 p-0.5 text-center leading-tight">
            {item.content.title.slice(0, 4)}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="min-w-0 max-w-[120px]">
        <p className="text-xs text-white truncate">{item.content.title}</p>
        <p className="text-[10px] text-text-secondary truncate">{item.content.creator}</p>
      </div>
    </div>
  );
}
// #endregion

// #region FlowContentEditor
export default function FlowContentEditor({
  flowId,
  stages,
  onClose,
}: FlowContentEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 이미 플로우에 존재하는 콘텐츠 ID 수집
  const existingContentIds = new Set(
    stages.flatMap(s => s.nodes.map(n => n.content_id))
  );

  // 내 서재 콘텐츠 로드
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

  // 이미 추가된 콘텐츠 필터링
  const availableContents = contents.filter(
    item => !existingContentIds.has(item.content_id)
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-accent/20 shadow-[0_-4px_20px_rgba(0,0,0,0.6)]" style={{ zIndex: Z_INDEX.dropdown }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
        <h3 className="text-sm font-serif font-bold text-white flex-1">내 서재에서 드래그하여 추가</h3>

        {/* 검색 */}
        <div className="relative w-48">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="검색..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none transition-colors"
          />
        </div>

        <Button unstyled onClick={onClose} className="p-1.5 text-white/50 hover:text-white transition-colors">
          <X size={18} />
        </Button>
      </div>

      {/* 콘텐츠 가로 스크롤 */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="text-accent animate-spin" />
          </div>
        ) : availableContents.length === 0 ? (
          <div className="text-center py-4 text-text-secondary text-xs">
            {existingContentIds.size > 0 ? "모든 콘텐츠가 플로우에 추가되었습니다" : "서재에 콘텐츠가 없습니다"}
          </div>
        ) : (
          <div className="flex gap-2">
            {availableContents.map(item => (
              <DraggableContentItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// #endregion
