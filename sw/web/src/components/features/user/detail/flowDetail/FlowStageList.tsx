"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, GripVertical, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { useDndMonitor, useDraggable, useDroppable } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import ContentCard from "@/components/ui/cards/ContentCard/ContentCard";
import { removeNode, updateNode } from "@/actions/flows/flowNodes";
import { addStage, deleteStage, reorderStages, updateStage } from "@/actions/flows/flowStages";
import type { FlowNodeWithContent, FlowStageWithNodes } from "@/types/database";

interface FlowStageListProps {
  flowId: string;
  stages: FlowStageWithNodes[];
  isOwner: boolean;
  isEditMode?: boolean;
  expandedStages: Set<string>;
  toggleStageExpand: (stageId: string) => void;
  onNodeClick: (contentId: string, contentType: string) => void;
  setIsEditMode: (edit: boolean) => void;
  onRefresh?: () => Promise<void>;
}

interface FlowNodeWrapperProps {
  node: FlowNodeWithContent;
  stageId: string;
  index: number;
  total: number;
  isOwner: boolean;
  isEditMode: boolean;
  onNodeClick: (contentId: string, contentType: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onEditNodeDescription: (node: FlowNodeWithContent) => void;
}

interface DroppableStageProps {
  stage: FlowStageWithNodes;
  stageIndex: number;
  totalStages: number;
  isOwner: boolean;
  isEditMode: boolean;
  editingStageId: string | null;
  editingStageName: string;
  setEditingStageName: (value: string) => void;
  startRenameStage: (stage: FlowStageWithNodes) => void;
  cancelRenameStage: () => void;
  saveRenameStage: (stage: FlowStageWithNodes) => Promise<void>;
  onNodeClick: (contentId: string, contentType: string) => void;
  handleRemoveNode: (nodeId: string) => void;
  handleDeleteStage: (stage: FlowStageWithNodes) => void;
  handleEditNodeDescription: (node: FlowNodeWithContent) => void;
}

function FlowNodeWrapper({
  node,
  stageId,
  index,
  total,
  isOwner,
  isEditMode,
  onNodeClick,
  onRemoveNode,
  onEditNodeDescription,
}: FlowNodeWrapperProps) {
  const hasNext = index < total - 1;
  const isDraggable = isOwner && isEditMode;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `flow-node-${node.id}`,
    data: {
      type: "stage-node",
      nodeId: node.id,
      stageId,
      contentId: node.content_id,
      content: node.content,
    },
    disabled: !isDraggable,
  });

  const dragStyle = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    ...(isDraggable ? { cursor: isDragging ? "grabbing" : "grab" } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`relative ${isDragging ? "z-20 opacity-70" : ""} ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className={`rounded-xl border bg-[#121212] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${
        isDragging ? "border-accent/60 ring-1 ring-accent/40" : "border-white/10"
      }`}>
        <div
          style={{ cursor: isDraggable ? (isDragging ? "grabbing" : "grab") : "default" }}
          className={`mb-3 w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 select-none pointer-events-auto relative z-10 [&_*]:cursor-inherit transition-all hover:ring-2 hover:ring-accent/70 ${
            isDraggable
              ? "border-accent/40 bg-gradient-to-b from-[#1c1a12] to-[#13120e] text-accent cursor-grab active:cursor-grabbing"
              : "border-white/10 bg-gradient-to-b from-[#1a1a1a] to-[#141414] text-text-secondary"
          }`}
          {...(isDraggable ? { ...listeners, ...attributes } : {})}
          onPointerDown={(event) => {
            if (!isDraggable) return;
            event.preventDefault();
          }}
          role={isDraggable ? "button" : undefined}
          tabIndex={isDraggable ? 0 : undefined}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical size={13} />
            <span className="text-[11px] font-semibold">{index + 1}/{total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwner && (
              <Button
                unstyled
                onClick={() => onEditNodeDescription(node)}
                className="h-6 w-6 rounded border border-white/20 bg-black/30 text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-center"
                aria-label="노드 설명 수정"
                title="노드 설명 수정"
              >
                <Pencil size={12} />
              </Button>
            )}
            {isOwner && (
              <Button
                unstyled
                onClick={() => onRemoveNode(node.id)}
                className="h-6 w-6 rounded border border-red-400/30 bg-red-500/5 text-red-300 hover:bg-red-500/15 flex items-center justify-center"
                aria-label="노드 삭제"
                title="노드 삭제"
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-stretch gap-3">
          <div className="w-24 sm:w-28 shrink-0">
            <ContentCard
              contentId={node.content.id}
              thumbnail={node.content.thumbnail_url}
              title={node.content.title}
              creator={node.content.creator}
              contentType={node.content.type}
              onClick={() => onNodeClick(node.content_id, node.content.type)}
              className="bg-[#151515] border-white/5 hover:border-accent/40"
              aspectRatio="2/3"
            />
          </div>

          <div className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                이유
              </div>
              <p className="flex-1 text-xs leading-relaxed text-text-secondary">
                {node.description || "아직 이유가 없습니다. 이 단계에 포함한 이유를 입력해 주세요."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasNext && (
        <div className="pointer-events-none flex flex-col items-center py-2">
          <div className="h-6 w-px bg-gradient-to-b from-accent/70 to-accent/20" />
          <div className="h-2 w-2 rounded-full bg-accent/70" />
        </div>
      )}
    </div>
  );
}

function StageTabButton({
  stage,
  isActive,
  isOwner,
  isEditMode,
  isReordering,
  onClick,
  showBeforeIndicator,
  showAfterIndicator,
}: {
  stage: FlowStageWithNodes;
  isActive: boolean;
  isOwner: boolean;
  isEditMode: boolean;
  isReordering: boolean;
  onClick: () => void;
  showBeforeIndicator: boolean;
  showAfterIndicator: boolean;
}) {
  const isTabDraggable = isOwner && isEditMode && !isReordering;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    data: { type: "stage-tab", stageId: stage.id },
    disabled: !isTabDraggable,
  });

  return (
    <div ref={setNodeRef} className="relative shrink-0" style={{ transform: CSS.Transform.toString(transform), transition }}>
      {showBeforeIndicator && (
        <div className="pointer-events-none absolute -left-1 top-1 bottom-1 w-0.5 rounded-full bg-accent" />
      )}
      {showAfterIndicator && (
        <div className="pointer-events-none absolute -right-1 top-1 bottom-1 w-0.5 rounded-full bg-accent" />
      )}
      <button
        type="button"
        onClick={onClick}
        className={`rounded-lg border px-3 py-2 text-left ${
          isActive ? "border-accent/40 bg-accent/15" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
        } ${isDragging ? "opacity-60" : ""} ${isTabDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        {...(isTabDraggable ? { ...attributes, ...listeners } : {})}
      >
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-white/80"}`}>{stage.name}</p>
        </div>
      </button>
    </div>
  );
}

function InsertDropSlot({
  stageId,
  insertIndex,
  isEditMode,
}: {
  stageId: string;
  insertIndex: number;
  isEditMode: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `stage-${stageId}-slot-${insertIndex}`,
    data: { type: "stage-insert", stageId, insertIndex },
  });

  if (!isEditMode) return null;

  return (
    <div ref={setNodeRef} className="relative h-4">
      <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full transition-colors ${
        isOver ? "bg-accent" : "bg-white/10"
      }`} />
      {isOver && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-accent bg-[#0f0f0f] px-1.5 py-0.5 rounded border border-accent/30">
          여기에 놓기
        </div>
      )}
    </div>
  );
}

function DroppableStage({
  stage,
  stageIndex,
  totalStages,
  isOwner,
  isEditMode,
  editingStageId,
  editingStageName,
  setEditingStageName,
  startRenameStage,
  cancelRenameStage,
  saveRenameStage,
  onNodeClick,
  handleRemoveNode,
  handleDeleteStage,
  handleEditNodeDescription,
}: DroppableStageProps) {
  const isRenaming = editingStageId === stage.id;

  return (
    <div className="bg-[#111] border rounded-xl overflow-hidden border-white/10">
      <div className="w-full px-4 py-3 border-b border-white/5">
        <div className="relative flex items-center min-h-8">
          <div className="w-32 text-xs font-semibold text-text-secondary">
            스테이지 {stageIndex + 1}/{totalStages}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 w-[min(58%,420px)]">
            {isRenaming ? (
              <input
                value={editingStageName}
                onChange={(event) => setEditingStageName(event.target.value)}
                className="w-full bg-transparent border-b border-accent/50 text-center text-base font-serif font-bold text-white focus:outline-none focus:border-accent"
                autoFocus
                onBlur={async () => saveRenameStage(stage)}
                onKeyDown={async (event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    await saveRenameStage(stage);
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelRenameStage();
                  }
                }}
              />
            ) : (
              <h3 className="text-center text-base font-serif font-bold text-white truncate">{stage.name}</h3>
            )}
          </div>

          <div className="ml-auto w-32 flex items-center justify-end gap-1">
            {isOwner && isEditMode && !isRenaming && (
              <Button
                unstyled
                onClick={() => startRenameStage(stage)}
                className="w-8 h-8 flex items-center justify-center rounded border border-white/15 bg-black/30 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="단계 이름 수정"
              >
                <Pencil size={14} />
              </Button>
            )}
            {isOwner && isEditMode && isRenaming && (
              <>
                <Button
                  unstyled
                  onClick={() => saveRenameStage(stage)}
                  className="w-8 h-8 flex items-center justify-center rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                  aria-label="단계 이름 저장"
                >
                  <Check size={14} />
                </Button>
                <Button
                  unstyled
                  onClick={cancelRenameStage}
                  className="w-8 h-8 flex items-center justify-center rounded border border-white/15 bg-black/30 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="단계 이름 취소"
                >
                  <X size={14} />
                </Button>
              </>
            )}
            {isOwner && isEditMode && (
              <Button
                unstyled
                onClick={() => handleDeleteStage(stage)}
                className="w-8 h-8 flex items-center justify-center rounded border border-red-400/30 bg-red-500/5 text-red-300 hover:bg-red-500/15"
                aria-label="단계 삭제"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {stage.nodes.length > 0 && (
        <div className="p-4">
          <div className="space-y-4">
            <InsertDropSlot stageId={stage.id} insertIndex={0} isEditMode={isEditMode} />
            {stage.nodes.map((node, nodeIndex) => (
              <div key={node.id}>
                <FlowNodeWrapper
                  node={node}
                  stageId={stage.id}
                  index={nodeIndex}
                  total={stage.nodes.length}
                  isOwner={isOwner}
                  isEditMode={isEditMode}
                  onNodeClick={onNodeClick}
                  onRemoveNode={handleRemoveNode}
                  onEditNodeDescription={handleEditNodeDescription}
                />
                <InsertDropSlot stageId={stage.id} insertIndex={nodeIndex + 1} isEditMode={isEditMode} />
              </div>
            ))}
          </div>
        </div>
      )}

      {stage.nodes.length === 0 && (
        <div
          className={`p-8 text-center text-sm ${
            isEditMode
              ? "text-accent/60 border-2 border-dashed border-accent/20 mx-4 mb-4 rounded-lg bg-accent/[0.02] space-y-3"
              : "text-text-secondary"
          }`}
        >
          {isEditMode && <InsertDropSlot stageId={stage.id} insertIndex={0} isEditMode={isEditMode} />}
          {isEditMode ? "하단 패널의 콘텐츠 카드를 여기로 드래그해 추가하세요." : "아직 이 단계에 콘텐츠가 없습니다."}
        </div>
      )}
    </div>
  );
}

export default function FlowStageList({
  flowId,
  stages,
  isOwner,
  isEditMode = false,
  onNodeClick,
  setIsEditMode,
  onRefresh,
}: FlowStageListProps) {
  const router = useRouter();
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [orderedStages, setOrderedStages] = useState<FlowStageWithNodes[]>(stages);
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const [draggingOverStageId, setDraggingOverStageId] = useState<string | null>(null);
  const [dragSnapshot, setDragSnapshot] = useState<string[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState("");
  const orderedStagesRef = useRef<FlowStageWithNodes[]>(orderedStages);
  const dragSnapshotRef = useRef<string[]>(dragSnapshot);

  useEffect(() => {
    setOrderedStages(stages);
  }, [stages]);

  useEffect(() => {
    orderedStagesRef.current = orderedStages;
  }, [orderedStages]);

  useEffect(() => {
    dragSnapshotRef.current = dragSnapshot;
  }, [dragSnapshot]);

  const activeStage = useMemo(() => {
    if (orderedStages.length === 0) return null;
    if (activeStageId) {
      const selected = orderedStages.find((stage) => stage.id === activeStageId);
      if (selected) return selected;
    }
    return orderedStages[0];
  }, [activeStageId, orderedStages]);

  const refresh = async () => {
    if (onRefresh) await onRefresh();
    else router.refresh();
  };

  useDndMonitor({
    onDragStart: (event) => {
      if (!isOwner || !isEditMode || isReordering) return;
      if (event.active.data.current?.type !== "stage-tab") return;
      setDraggingStageId(String(event.active.id));
      setDragSnapshot(orderedStagesRef.current.map((stage) => stage.id));
    },
    onDragOver: (event) => {
      if (!draggingStageId || event.active.data.current?.type !== "stage-tab" || isReordering) return;
      if (!event.over || event.over.data.current?.type !== "stage-tab") {
        setDraggingOverStageId(null);
        return;
      }

      const activeId = String(event.active.id);
      const overId = String(event.over.id);
      setDraggingOverStageId(overId);
      if (activeId === overId) return;

      setOrderedStages((prev) => {
        const oldIndex = prev.findIndex((stage) => stage.id === activeId);
        const newIndex = prev.findIndex((stage) => stage.id === overId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    onDragCancel: () => {
      if (!draggingStageId || dragSnapshotRef.current.length === 0) return;
      const snapshot = dragSnapshotRef.current;
      setOrderedStages((prev) =>
        snapshot
          .map((stageId) => prev.find((stage) => stage.id === stageId))
          .filter((stage): stage is FlowStageWithNodes => !!stage)
      );
      setDraggingStageId(null);
      setDraggingOverStageId(null);
      setDragSnapshot([]);
    },
    onDragEnd: async (event) => {
      if (event.active.data.current?.type !== "stage-tab") return;

      const snapshot = dragSnapshotRef.current;
      const nextOrder = orderedStagesRef.current;
      const nextOrderIds = nextOrder.map((stage) => stage.id);
      const hasChanged = snapshot.length > 0 && snapshot.join("|") !== nextOrderIds.join("|");

      setDraggingStageId(null);
      setDraggingOverStageId(null);
      setDragSnapshot([]);

      if (!hasChanged || isReordering) return;

      try {
        setIsReordering(true);
        await reorderStages({ flowId, stageIds: nextOrderIds });
      } catch (error) {
        console.error("단계 순서 변경 실패:", error);
        alert("단계 순서 변경에 실패했습니다.");
        setOrderedStages((prev) =>
          snapshot
            .map((stageId) => prev.find((stage) => stage.id === stageId))
            .filter((stage): stage is FlowStageWithNodes => !!stage)
        );
      } finally {
        setIsReordering(false);
      }
    },
  });

  const handleAddStage = async () => {
    const input = prompt("새 단계 이름", `${orderedStages.length + 1}단계`);
    if (input === null) return;

    const name = input.trim();
    if (!name) {
      alert("단계 이름을 입력해 주세요.");
      return;
    }

    try {
      await addStage({ flowId, name });
      await refresh();
      setActiveStageId(null);
    } catch (error) {
      console.error("단계 추가 실패:", error);
      alert("단계 추가에 실패했습니다.");
    }
  };

  const handleDeleteStage = async (stage: FlowStageWithNodes) => {
    const ok = confirm(`"${stage.name}" 단계를 삭제할까요?`);
    if (!ok) return;

    try {
      await deleteStage(stage.id);
      await refresh();
      if (activeStageId === stage.id) setActiveStageId(null);
    } catch (error) {
      console.error("단계 삭제 실패:", error);
      alert("단계 삭제에 실패했습니다.");
    }
  };

  const handleRemoveNode = async (nodeId: string) => {
    const ok = confirm("이 콘텐츠를 플로우에서 제거할까요?");
    if (!ok) return;

    try {
      await removeNode(nodeId);
      await refresh();
    } catch (error) {
      console.error("콘텐츠 제거 실패:", error);
      alert("콘텐츠 제거에 실패했습니다.");
    }
  };

  const startRenameStage = (stage: FlowStageWithNodes) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
  };

  const cancelRenameStage = () => {
    setEditingStageId(null);
    setEditingStageName("");
  };

  const saveRenameStage = async (stage: FlowStageWithNodes) => {
    const trimmed = editingStageName.trim();
    if (!trimmed) {
      alert("단계 이름을 입력해 주세요.");
      return;
    }

    if (trimmed === stage.name) {
      cancelRenameStage();
      return;
    }

    try {
      await updateStage({ stageId: stage.id, name: trimmed });
      await refresh();
      cancelRenameStage();
    } catch (error) {
      console.error("단계 이름 변경 실패:", error);
      alert("단계 이름 변경에 실패했습니다.");
    }
  };

  const handleEditNodeDescription = async (node: FlowNodeWithContent) => {
    const nextDescription = prompt("이 콘텐츠를 이 단계에 둔 이유", node.description || "");
    if (nextDescription === null) return;

    try {
      await updateNode({ nodeId: node.id, description: nextDescription });
      await refresh();
    } catch (error) {
      console.error("이유 수정 실패:", error);
      alert("이유 수정에 실패했습니다.");
    }
  };

  if (orderedStages.length === 0 && !isEditMode) {
    return (
      <div className="text-center py-20 text-text-secondary border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
        <Layers size={48} className="mx-auto mb-4 opacity-50" />
        <p className="font-serif text-lg text-text-primary mb-2">아직 단계가 없습니다</p>
        <p className="text-sm opacity-60 mb-6">단계를 추가하고 이유를 연결해 학습 흐름을 구성해 보세요.</p>
        {isOwner && (
          <Button
            onClick={() => setIsEditMode(true)}
            className="px-6 py-2 bg-accent text-black font-bold hover:bg-accent-hover rounded-full"
          >
            편집 시작
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isEditMode ? "pb-36" : "pb-20"}`}>
      {orderedStages.length > 0 && (
        <div className="flex items-stretch gap-2">
          <div className="flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SortableContext items={orderedStages.map((stage) => stage.id)} strategy={horizontalListSortingStrategy}>
              <div className="inline-flex min-w-full items-center gap-2 rounded-xl border border-white/10 bg-[#101010] p-2">
              {orderedStages.map((stage) => {
                const isActive = activeStage?.id === stage.id;
                const draggingIndex = orderedStages.findIndex((item) => item.id === draggingStageId);
                const overIndex = orderedStages.findIndex((item) => item.id === draggingOverStageId);
                const tabIndex = orderedStages.findIndex((item) => item.id === stage.id);
                const showBefore = draggingStageId !== null && draggingOverStageId === stage.id && draggingIndex > overIndex;
                const showAfter = draggingStageId !== null && draggingOverStageId === stage.id && draggingIndex < overIndex;

                return (
                  <StageTabButton
                    key={stage.id}
                    stage={stage}
                    isActive={isActive}
                    isOwner={isOwner}
                    isEditMode={isEditMode}
                    isReordering={isReordering}
                    onClick={() => setActiveStageId(stage.id)}
                    showBeforeIndicator={showBefore && tabIndex === overIndex}
                    showAfterIndicator={showAfter && tabIndex === overIndex}
                  />
                );
              })}
              </div>
            </SortableContext>
          </div>

          {isOwner && isEditMode && (
            <Button
              onClick={handleAddStage}
              className="h-[44px] w-[44px] shrink-0 p-0 bg-accent text-black rounded-xl hover:bg-accent-hover flex items-center justify-center"
              aria-label="단계 추가"
              title="단계 추가"
            >
              <Plus size={14} />
            </Button>
          )}
        </div>
      )}

      {activeStage && (
        <DroppableStage
          key={activeStage.id}
          stage={activeStage}
          stageIndex={orderedStages.findIndex((stage) => stage.id === activeStage.id)}
          totalStages={orderedStages.length}
          isOwner={isOwner}
          isEditMode={isEditMode}
          editingStageId={editingStageId}
          editingStageName={editingStageName}
          setEditingStageName={setEditingStageName}
          startRenameStage={startRenameStage}
          cancelRenameStage={cancelRenameStage}
          saveRenameStage={saveRenameStage}
          onNodeClick={onNodeClick}
          handleRemoveNode={handleRemoveNode}
          handleDeleteStage={handleDeleteStage}
          handleEditNodeDescription={handleEditNodeDescription}
        />
      )}
    </div>
  );
}
