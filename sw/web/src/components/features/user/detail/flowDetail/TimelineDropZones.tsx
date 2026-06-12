"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

// #region TimelineDropZone — 노드 사이 드롭 영역
export function TimelineDropZone({ nodeId, stageId }: { nodeId: string; stageId: string }) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-slot-${nodeId}`,
    data: { type: "drop-slot", nodeId, stageId }
  });

  const isDragging = active?.data.current?.type === "library-content";
  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative ms-3 ps-6 md:ms-5 md:ps-8 py-1 transition-all",
        isOver ? "py-3" : ""
      )}
    >
      {/* 연결선 */}
      <div className="absolute start-3 md:start-5 top-0 bottom-0 w-px bg-white/[0.06]" />
      <div
        className={cn(
          "border-2 border-dashed rounded-lg flex items-center justify-center transition-all",
          isOver ? "border-accent/50 bg-accent/5 h-14" : "border-white/[0.06] h-8"
        )}
      >
        <Plus size={14} className={cn(isOver ? "text-accent" : "text-white/15")} />
      </div>
    </div>
  );
}
// #endregion

// #region EndDropZone — 스테이지 마지막 드롭 영역
export function EndDropZone({ stageId }: { stageId: string }) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-end-drop-${stageId}`,
    data: { type: "stage-drop", stageId }
  });

  const isDragging = active?.data.current?.type === "library-content";
  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className="relative ms-3 ps-6 md:ms-5 md:ps-8 py-1"
    >
      <div className="absolute start-3 md:start-5 top-0 h-1/2 w-px bg-white/[0.06]" />
      <div
        className={cn(
          "border-2 border-dashed rounded-lg flex items-center justify-center transition-all h-14",
          isOver ? "border-accent/50 bg-accent/5" : "border-white/[0.06]"
        )}
      >
        <Plus size={14} className={cn(isOver ? "text-accent" : "text-white/15")} />
      </div>
    </div>
  );
}
// #endregion

// #region EmptyStageDropZone — 빈 스테이지 드롭 영역
export function EmptyStageDropZone({ stageId }: { stageId: string }) {
  const t = useTranslations("flowDetail");
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-drop-${stageId}`,
    data: { type: "stage-drop", stageId }
  });

  const isDragging = active?.data.current?.type === "library-content";

  return (
    <div ref={setNodeRef} className="relative ms-3 ps-6 md:ms-5 md:ps-8 py-2">
      <div className="absolute start-3 md:start-5 top-0 h-full w-px bg-white/[0.06]" />
      <div
        className={cn(
          "border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-200",
          isOver && isDragging
            ? "min-h-[100px] border-accent/50 bg-accent/5"
            : "min-h-[60px] border-white/[0.04]"
        )}
      >
        <span className="text-xs text-white/20">
          {isOver && isDragging ? t("dropHere") : t("dragGuide")}
        </span>
      </div>
    </div>
  );
}
// #endregion
