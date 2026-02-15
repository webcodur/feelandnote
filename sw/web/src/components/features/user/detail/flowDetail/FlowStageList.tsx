"use client";

import { useState, useEffect, useRef } from "react";
import { Check, GripVertical, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { removeNode, updateNode } from "@/actions/flows/flowNodes";
import { addStage, deleteStage, updateStage } from "@/actions/flows/flowStages";
import type { FlowNodeWithContent, FlowStageWithNodes } from "@/types/database";

interface FlowStageListProps {
  flowId: string;
  stages: FlowStageWithNodes[];
  isOwner: boolean;
  isEditMode?: boolean;
  onNodeClick: (contentId: string, contentType: string) => void;
  setIsEditMode: (edit: boolean) => void;
  onRefresh?: () => Promise<void>;
}

// #region TimelineDropZone — 노드 사이 드롭 영역
function TimelineDropZone({ nodeId, stageId }: { nodeId: string; stageId: string }) {
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
function EndDropZone({ stageId }: { stageId: string }) {
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

function TimelineNode({
  node, globalIndex, isEditMode, isLast, onNodeClick, onRemoveNode, onUpdateDescription
}: TimelineNodeProps) {
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
            <Image
              src={node.content.thumbnail_url}
              alt={node.content.title}
              fill
              unoptimized
              className="object-cover"
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
                placeholder="이 콘텐츠를 여기에 둔 이유..."
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
                {node.description || "+ 설명 추가"}
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

function TimelineStageHeader({
  stage, stageIndex, isFirst, isOwner, isEditMode, onDeleteStage, onRenameStage
}: TimelineStageHeaderProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(stage.name);

  const handleSaveRename = () => {
    const trimmed = newName.trim();
    if (!trimmed) { alert("단계 이름을 입력해 주세요."); return; }
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
          {stage.nodes.length}개
        </span>
      </div>

      {/* 편집 버튼 */}
      {isOwner && isEditMode && (
        <div className="flex items-center gap-1 shrink-0">
          {isRenaming ? (
            <>
              <Button unstyled onClick={handleSaveRename} className="w-6 h-6 flex items-center justify-center rounded border border-accent/30 text-accent hover:bg-accent/10 transition-colors" aria-label="저장"><Check size={11} /></Button>
              <Button unstyled onClick={() => { setIsRenaming(false); setNewName(stage.name); }} className="w-6 h-6 flex items-center justify-center rounded border border-white/10 text-white/40 hover:bg-white/5 transition-colors" aria-label="취소"><X size={11} /></Button>
            </>
          ) : (
            <>
              <Button unstyled onClick={() => { setIsRenaming(true); setNewName(stage.name); }} className="w-6 h-6 flex items-center justify-center rounded text-white/20 hover:text-white/50 transition-colors" aria-label="이름 수정"><Pencil size={11} /></Button>
              <Button unstyled onClick={onDeleteStage} className="w-6 h-6 flex items-center justify-center rounded text-red-400/20 hover:text-red-400/50 transition-colors" aria-label="삭제"><Trash2 size={11} /></Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
// #endregion

// #region EmptyStageDropZone — 빈 스테이지 드롭 영역
function EmptyStageDropZone({ stageId }: { stageId: string }) {
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
          {isOver && isDragging ? "여기에 배치" : "우측 패널에서 콘텐츠를 드래그하세요"}
        </span>
      </div>
    </div>
  );
}
// #endregion

// #region Main Component
export default function FlowStageList({
  flowId, stages, isOwner, isEditMode = false, onNodeClick, setIsEditMode, onRefresh
}: FlowStageListProps) {
  const router = useRouter();
  const [localStages, setLocalStages] = useState<FlowStageWithNodes[]>(stages);

  useEffect(() => { setLocalStages(stages); }, [stages]);

  const refresh = async () => {
    if (onRefresh) await onRefresh();
    else router.refresh();
  };

  const handleAddStage = async () => {
    const input = prompt("새 단계 이름", `${localStages.length + 1}단계`);
    if (input === null) return;
    const name = input.trim();
    if (!name) { alert("단계 이름을 입력해 주세요."); return; }
    try {
      await addStage({ flowId, name });
      await refresh();
    } catch (error) {
      console.error("단계 추가 실패:", error);
      alert("단계 추가에 실패했습니다.");
    }
  };

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    if (!confirm(`"${stageName}" 단계를 삭제할까요?`)) return;
    try {
      await deleteStage(stageId);
      await refresh();
    } catch (error) {
      console.error("단계 삭제 실패:", error);
      alert("단계 삭제에 실패했습니다.");
    }
  };

  const handleRenameStage = async (stageId: string, newName: string) => {
    try {
      await updateStage({ stageId, name: newName });
      await refresh();
    } catch (error) {
      console.error("단계 이름 변경 실패:", error);
      alert("단계 이름 변경에 실패했습니다.");
    }
  };

  const handleRemoveNode = async (nodeId: string) => {
    if (!confirm("이 콘텐츠를 플로우에서 제거할까요?")) return;
    try {
      await removeNode(nodeId);
      await refresh();
    } catch (error) {
      console.error("콘텐츠 제거 실패:", error);
      alert("콘텐츠 제거에 실패했습니다.");
    }
  };

  const handleUpdateNodeDescription = async (nodeId: string, description: string) => {
    try {
      await updateNode({ nodeId, description });
      await refresh();
    } catch (error) {
      console.error("설명 수정 실패:", error);
      alert("설명 수정에 실패했습니다.");
    }
  };

  // 전역 노드 번호 계산
  let globalNodeIndex = 0;

  if (localStages.length === 0 && !isEditMode) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-white/[0.04] rounded-2xl">
        <Layers size={40} className="mx-auto mb-4 text-white/10" />
        <p className="font-serif text-base text-white/60 mb-2">아직 단계가 없습니다</p>
        <p className="text-sm text-white/25 mb-6">단계를 추가하고 콘텐츠를 연결해 보세요.</p>
        {isOwner && (
          <Button onClick={() => setIsEditMode(true)} className="px-5 py-2 bg-accent text-black font-bold hover:bg-accent-hover rounded-full text-sm">
            편집 시작
          </Button>
        )}
      </div>
    );
  }

  // 전체 노드 ID 목록 (SortableContext용)
  const allNodeIds = localStages.flatMap(s => s.nodes.map(n => n.id));

  return (
    <div className={cn("pb-20", isEditMode && "pb-10")}>
      <SortableContext items={allNodeIds} strategy={verticalListSortingStrategy}>
        {localStages.map((stage, stageIndex) => {
          const stageStartIndex = globalNodeIndex;

          return (
            <div key={stage.id}>
              {/* 스테이지 헤더 */}
              <TimelineStageHeader
                stage={stage}
                stageIndex={stageIndex}
                isFirst={stageIndex === 0}
                isOwner={isOwner}
                isEditMode={isEditMode}
                onDeleteStage={() => handleDeleteStage(stage.id, stage.name)}
                onRenameStage={n => handleRenameStage(stage.id, n)}
              />

              {/* 노드 목록 */}
              {stage.nodes.length > 0 ? (
                <div className="mt-2">
                  {stage.nodes.map((node, nodeIndex) => {
                    globalNodeIndex++;
                    const isLastNode = nodeIndex === stage.nodes.length - 1;
                    const isLastStage = stageIndex === localStages.length - 1;

                    return (
                      <div key={node.id}>
                        {/* 노드 사이 드롭 존 (편집 모드) */}
                        {isEditMode && nodeIndex === 0 && (
                          <TimelineDropZone nodeId={node.id} stageId={stage.id} />
                        )}

                        <TimelineNode
                          node={node}
                          globalIndex={stageStartIndex + nodeIndex + 1}
                          isEditMode={isEditMode}
                          isLast={isLastNode && isLastStage && !isEditMode}
                          onNodeClick={onNodeClick}
                          onRemoveNode={handleRemoveNode}
                          onUpdateDescription={handleUpdateNodeDescription}
                        />

                        {/* 노드 사이 드롭 존 (편집 모드, 마지막 아닌 노드 뒤에만) */}
                        {isEditMode && !isLastNode && (
                          <TimelineDropZone nodeId={stage.nodes[nodeIndex + 1].id} stageId={stage.id} />
                        )}
                      </div>
                    );
                  })}

                  {/* 스테이지 끝 드롭 존 */}
                  {isEditMode && <EndDropZone stageId={stage.id} />}
                </div>
              ) : isEditMode ? (
                <EmptyStageDropZone stageId={stage.id} />
              ) : (
                <div className="relative ms-3 ps-6 md:ms-5 md:ps-8 py-2">
                  <div className="absolute start-3 md:start-5 top-0 h-full w-px bg-white/[0.06]" />
                  <p className="text-xs text-white/15 py-4">아직 콘텐츠가 없습니다</p>
                </div>
              )}
            </div>
          );
        })}
      </SortableContext>

      {/* 단계 추가 버튼 */}
      {isOwner && isEditMode && (
        <div className="ms-3 ps-6 md:ms-5 md:ps-8 mt-4">
          <Button
            onClick={handleAddStage}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 text-accent text-sm font-bold rounded-lg hover:bg-accent/20 transition-colors"
          >
            <Plus size={14} />
            단계 추가
          </Button>
        </div>
      )}
    </div>
  );
}
// #endregion
