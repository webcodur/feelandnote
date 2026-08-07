"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { GripVertical, Layers, Trash2 } from "lucide-react";
import ContentImage from "@/components/ui/ContentImage";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { FlowNodeWithContent } from "@/types/database";

// #region TimelineNode — 수직 타임라인 노드 카드
interface TimelineNodeProps {
  node: FlowNodeWithContent;
  globalIndex: number;
  isEditMode: boolean;
  isLast: boolean;
  onNodeClick: (contentId: string, contentType: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onUpdateDescription: (nodeId: string, description: string) => void;
}

export default function TimelineNode({
  node, globalIndex, isEditMode, isLast, onNodeClick, onRemoveNode, onUpdateDescription
}: TimelineNodeProps) {
  const t = useTranslations("flowDetail");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(node.description || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: node.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined
  };

  useEffect(() => {
    setDescValue(node.description || "");
  }, [node.description]);

  const handleSaveDesc = () => {
    const trimmed = descValue.trim();
    if (trimmed !== (node.description || "")) {
      onUpdateDescription(node.id, trimmed);
    }
    setIsEditingDesc(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative ms-3 ps-6 md:ms-5 md:ps-8">
      {/* 수직 연결선 */}
      <div className={cn(
        "absolute start-3 md:start-5 top-0 w-px bg-white/[0.06]",
        isLast && !isEditMode ? "h-4" : "bottom-0"
      )} />

      {/* 번호 원 */}
      <div className={cn(
        "absolute start-3 md:start-5 top-3 -translate-x-1/2 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-bold z-10 border transition-colors",
        isDragging
          ? "bg-accent/30 border-accent/60 text-accent"
          : "bg-[#141414] border-white/10 text-white/40"
      )}>
        {globalIndex}
      </div>

      {/* 카드 */}
      <div
        className={cn(
          "group flex gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-xl border transition-all mb-1",
          isDragging ? "border-accent/30 shadow-lg shadow-accent/10" : "border-white/[0.06]",
          !isEditMode && "cursor-pointer hover:border-white/15 hover:bg-white/[0.02]"
        )}
        onClick={!isEditMode ? () => onNodeClick(node.content_id, node.content.type) : undefined}
      >
        {/* 썸네일 */}
        <div className="relative w-10 h-14 md:w-12 md:h-16 bg-[#0a0a0a] rounded-lg overflow-hidden shrink-0">
          {node.content.thumbnail_url ? (
            <ContentImage
              src={node.content.thumbnail_url}
              alt={node.content.title}
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Layers size={14} className="text-white/[0.06]" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-xs md:text-sm font-bold text-white/85 line-clamp-1 leading-tight">
            {node.content.title}
          </h4>
          {node.content.creator && (
            <p className="text-[11px] text-text-secondary/50 line-clamp-1 mt-0.5">
              {node.content.creator.replace(/\^/g, ", ")}
            </p>
          )}

          {/* 설명 (뷰 모드) */}
          {!isEditMode && node.description && (
            <p className="text-[11px] text-white/30 line-clamp-2 mt-1.5 leading-relaxed italic">
              {node.description}
            </p>
          )}

          {/* 설명 (편집 모드) */}
          {isEditMode && (
            isEditingDesc ? (
              <textarea
                ref={textareaRef}
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                onBlur={handleSaveDesc}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveDesc(); }
                  if (e.key === "Escape") { setDescValue(node.description || ""); setIsEditingDesc(false); }
                }}
                placeholder={t("reasonPlaceholder")}
                className="w-full mt-1.5 px-2 py-1 bg-white/[0.04] border border-white/10 rounded text-[11px] text-white/60 placeholder:text-white/20 focus:border-accent/40 focus:outline-none resize-none leading-relaxed"
                rows={2}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setIsEditingDesc(true); }}
                className={cn(
                  "text-start text-[11px] mt-1.5 leading-relaxed transition-colors",
                  node.description
                    ? "text-white/30 italic hover:text-white/50"
                    : "text-white/15 hover:text-white/30"
                )}
              >
                {node.description || t("addDesc")}
              </button>
            )
          )}
        </div>

        {/* 편집 모드 액션 버튼 */}
        {isEditMode && (
          <div className="flex flex-col items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <div
              className="p-1 rounded text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={14} />
            </div>
            <button
              onClick={e => { e.stopPropagation(); onRemoveNode(node.id); }}
              className="p-1 rounded text-red-400/30 hover:text-red-400/70"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// #endregion
