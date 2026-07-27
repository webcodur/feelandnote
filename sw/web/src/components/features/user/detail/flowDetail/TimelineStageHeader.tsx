"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { FlowStageWithNodes } from "@/types/database";

// #region TimelineStageHeader — 스테이지 구분선
interface TimelineStageHeaderProps {
  stage: FlowStageWithNodes;
  stageIndex: number;
  isFirst: boolean;
  isOwner: boolean;
  isEditMode: boolean;
  onDeleteStage: () => void;
  onRenameStage: (newName: string) => void;
}

export default function TimelineStageHeader({
  stage, stageIndex, isFirst, isOwner, isEditMode, onDeleteStage, onRenameStage
}: TimelineStageHeaderProps) {
  const t = useTranslations("flowDetail");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(stage.name);

  const handleSaveRename = () => {
    const trimmed = newName.trim();
    if (!trimmed) { alert(t("stageNameRequired")); return; }
    if (trimmed === stage.name) { setIsRenaming(false); return; }
    onRenameStage(trimmed);
    setIsRenaming(false);
  };

  return (
    <div className={cn("relative ms-3 ps-6 md:ms-5 md:ps-8 flex items-center gap-2 md:gap-3", isFirst ? "pt-0" : "pt-5 md:pt-6")}>
      {/* 수직 연결선 (첫 번째 이후만) */}
      {!isFirst && (
        <div className="absolute start-3 md:start-5 top-0 h-5 md:h-6 w-px bg-white/[0.06]" />
      )}

      {/* 큰 번호 원 */}
      <div className="absolute start-3 md:start-5 top-auto -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center z-10">
        <span className="text-xs md:text-sm font-black text-accent">{stageIndex + 1}</span>
      </div>

      {/* 스테이지 이름 */}
      <div className="flex-1 flex items-center gap-2 min-w-0 ms-2 md:ms-4">
        {isRenaming ? (
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-transparent border-b border-accent/50 text-sm md:text-base font-serif font-bold text-white focus:outline-none focus:border-accent py-0.5"
            autoFocus
            onBlur={handleSaveRename}
            onKeyDown={e => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") { setIsRenaming(false); setNewName(stage.name); }
            }}
          />
        ) : (
          <h3 className="text-sm md:text-base font-serif font-bold text-white/80 truncate">
            {stage.name}
          </h3>
        )}
        <span className="text-[10px] text-white/20 shrink-0 tabular-nums">
          {t("itemCount", { count: stage.nodes.length })}
        </span>
      </div>

      {/* 편집 버튼 */}
      {isOwner && isEditMode && (
        <div className="flex items-center gap-1 shrink-0">
          {isRenaming ? (
            <>
              <Button unstyled onClick={handleSaveRename} className="w-6 h-6 flex items-center justify-center rounded border border-accent/30 text-accent hover:bg-accent/10 transition-colors" aria-label={t("save")}><Check size={11} /></Button>
              <Button unstyled onClick={() => { setIsRenaming(false); setNewName(stage.name); }} className="w-6 h-6 flex items-center justify-center rounded border border-white/10 text-white/40 hover:bg-white/5 transition-colors" aria-label={t("cancel")}><X size={11} /></Button>
            </>
          ) : (
            <>
              <Button unstyled onClick={() => { setIsRenaming(true); setNewName(stage.name); }} className="w-6 h-6 flex items-center justify-center rounded text-white/20 hover:text-white/50 transition-colors" aria-label={t("rename")}><Pencil size={11} /></Button>
              <Button unstyled onClick={onDeleteStage} className="w-6 h-6 flex items-center justify-center rounded text-red-400/20 hover:text-red-400/50 transition-colors" aria-label={t("delete")}><Trash2 size={11} /></Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
// #endregion
