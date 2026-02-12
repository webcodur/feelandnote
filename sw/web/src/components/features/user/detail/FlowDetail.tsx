"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Loader } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFlowDetail } from "./flowDetail/useFlowDetail";
import FlowHeader from "./flowDetail/FlowHeader";
import FlowStageList from "./flowDetail/FlowStageList";
import FlowContentEditor from "./flowDetail/FlowContentEditor";
import { addNode, moveNode, reorderNodes } from "@/actions/flows/flowNodes";
import { addStage } from "@/actions/flows/flowStages";
import type { Content } from "@/types/database";

interface FlowDetailProps {
  flowId: string;
}

function DragOverlayContent({ content }: { content: Content }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-accent/50 rounded-lg shadow-xl shadow-accent/20 cursor-grabbing">
      <div className="w-8 h-11 bg-[#222] rounded overflow-hidden shrink-0 relative">
        {content.thumbnail_url ? (
          <Image src={content.thumbnail_url} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[7px] text-white/20">
            {content.title.slice(0, 4)}
          </div>
        )}
      </div>
      <div className="min-w-0 max-w-[120px]">
        <p className="text-xs text-white truncate">{content.title}</p>
        <p className="text-[10px] text-text-secondary truncate">{content.creator}</p>
      </div>
    </div>
  );
}

export default function FlowDetail({ flowId }: FlowDetailProps) {
  const {
    flow,
    isLoading,
    error,
    isEditMode,
    setIsEditMode,
    currentUserId,
    isSaved,
    isOwner,
    expandedStages,
    handleDelete,
    handleTogglePublic,
    toggleStageExpand,
    getCategoryCounts,
    handleToggleSave,
    insertNodeToStage,
    reorderNodeInStage,
    moveNodeAcrossStages,
    loadFlow,
  } = useFlowDetail(flowId);

  const router = useRouter();
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleNodeClick = (contentId: string, contentType: string) => {
    router.push(`/content/${contentId}?category=${contentType}`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "library-content" || data?.type === "stage-node") {
      setDraggingContent(data.content as Content);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingContent(null);

    const { active, over } = event;
    if (!over || isAdding) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "library-content" && overData?.type === "stage-insert") {
      const contentId = activeData.contentId as string;
      const stageId = overData.stageId as string;
      const stage = flow?.stages.find((item) => item.id === stageId);
      const insertIndex = overData.insertIndex as number;
      const boundedInsertIndex = Math.max(0, Math.min(insertIndex ?? 0, stage?.nodes.length ?? 0));

      setIsAdding(true);
      try {
        const createdNode = await addNode({ flowId, stageId, contentId });
        insertNodeToStage({
          stageId,
          nodeId: createdNode.id,
          content: activeData.content as Content,
          insertIndex: boundedInsertIndex,
        });

        if (stage && boundedInsertIndex < stage.nodes.length) {
          const nextIds = [...stage.nodes.map((node) => node.id)];
          nextIds.splice(boundedInsertIndex, 0, createdNode.id);
          await reorderNodes({ stageId, nodeIds: nextIds });
        }
      } catch (err) {
        console.error("콘텐츠 추가 실패:", err);
        alert("콘텐츠 추가에 실패했습니다.");
      } finally {
        setIsAdding(false);
      }
      return;
    }

    if (activeData?.type === "stage-node" && overData?.type === "stage-insert" && flow) {
      const nodeId = activeData.nodeId as string;
      const fromStageId = activeData.stageId as string;
      const toStageId = overData.stageId as string;

      const sourceStage = flow.stages.find((item) => item.id === fromStageId);
      const targetStage = flow.stages.find((item) => item.id === toStageId);
      if (!sourceStage || !targetStage) return;

      const rawInsertIndex = (overData.insertIndex as number) ?? targetStage.nodes.length;
      const boundedInsertIndex = Math.max(0, Math.min(rawInsertIndex, targetStage.nodes.length));

      setIsAdding(true);
      try {
        if (fromStageId === toStageId) {
          const currentIndex = sourceStage.nodes.findIndex((node) => node.id === nodeId);
          if (currentIndex < 0) return;

          const insertIndex = boundedInsertIndex > currentIndex ? boundedInsertIndex - 1 : boundedInsertIndex;
          if (insertIndex === currentIndex) return;

          const nextIds = [...sourceStage.nodes.map((node) => node.id)];
          nextIds.splice(currentIndex, 1);
          nextIds.splice(insertIndex, 0, nodeId);

          await reorderNodes({ stageId: fromStageId, nodeIds: nextIds });
          reorderNodeInStage({ stageId: fromStageId, nodeId, insertIndex });
        } else {
          await moveNode({ nodeId, targetStageId: toStageId });

          const sourceIds = sourceStage.nodes
            .filter((node) => node.id !== nodeId)
            .map((node) => node.id);
          await reorderNodes({ stageId: fromStageId, nodeIds: sourceIds });

          const targetIds = [...targetStage.nodes.map((node) => node.id)];
          targetIds.splice(boundedInsertIndex, 0, nodeId);
          await reorderNodes({ stageId: toStageId, nodeIds: targetIds });

          moveNodeAcrossStages({
            nodeId,
            fromStageId,
            toStageId,
            insertIndex: boundedInsertIndex,
          });
        }
      } catch (err) {
        console.error("노드 재배치 실패:", err);
        alert("노드 재배치에 실패했습니다.");
      } finally {
        setIsAdding(false);
      }
    }
  };

  const handleEnterEditMode = async () => {
    setIsEditMode(true);
    if (flow && flow.stages.length === 0) {
      try {
        await addStage({ flowId, name: "기본" });
        await loadFlow();
      } catch (err) {
        console.error("기본 스테이지 생성 실패:", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size={32} className="text-accent animate-spin" />
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div className="text-center py-20 text-text-secondary">
        <Layers size={48} className="mx-auto mb-4 opacity-50" />
        <p className="font-serif text-lg text-text-primary mb-2">{error || "플로우를 찾을 수 없습니다"}</p>
      </div>
    );
  }

  const stageListContent = (
    <div className="px-4 md:px-10">
      <FlowStageList
        flowId={flowId}
        stages={flow.stages}
        isOwner={isOwner}
        isEditMode={isEditMode}
        expandedStages={expandedStages}
        toggleStageExpand={toggleStageExpand}
        onNodeClick={handleNodeClick}
        setIsEditMode={(edit: boolean) => {
          if (edit) handleEnterEditMode();
          else setIsEditMode(false);
        }}
        onRefresh={loadFlow}
      />
    </div>
  );

  return (
    <div className="w-full">
      <div className="w-full px-6 md:px-10 mb-3 md:mb-4">
        <Link
          href={`/${flow.user_id}/reading/collections`}
          className="inline-flex p-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
      </div>

      <FlowHeader
        flow={flow}
        flowId={flowId}
        isOwner={isOwner}
        isEditMode={isEditMode}
        currentUserId={currentUserId}
        isSaved={isSaved}
        categoryCounts={getCategoryCounts()}
        setIsEditMode={(edit: boolean) => {
          if (edit) handleEnterEditMode();
          else setIsEditMode(false);
        }}
        handleTogglePublic={handleTogglePublic}
        handleDelete={handleDelete}
        handleToggleSave={handleToggleSave}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {stageListContent}

        {isEditMode && <FlowContentEditor flowId={flowId} stages={flow.stages} onClose={() => setIsEditMode(false)} />}

        <DragOverlay>{draggingContent && <DragOverlayContent content={draggingContent} />}</DragOverlay>
      </DndContext>
    </div>
  );
}
