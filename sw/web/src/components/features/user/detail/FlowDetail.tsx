"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Loader } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useFlowDetail } from "./flowDetail/useFlowDetail";
import FlowHeader from "./flowDetail/FlowHeader";
import FlowStageList from "./flowDetail/FlowStageList";
import FlowContentEditor from "./flowDetail/FlowContentEditor";
import { addNode, reorderNodes } from "@/actions/flows/flowNodes";
import { addStage, reorderStages } from "@/actions/flows/flowStages";
import type { Content, FlowStageWithNodes } from "@/types/database";

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
    handleDelete,
    handleTogglePublic,
    getCategoryCounts,
    handleToggleSave,
    loadFlow,
  } = useFlowDetail(flowId);

  const router = useRouter();
  const [draggingContent, setDraggingContent] = useState<Content | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [localStages, setLocalStages] = useState<FlowStageWithNodes[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  // flow가 변경되면 localStages 업데이트
  useEffect(() => {
    if (flow) {
      setLocalStages(flow.stages);
    }
  }, [flow]);

  // 헬퍼: 노드가 속한 스테이지 찾기
  const findStageForNode = (nodeId: string | number) =>
    localStages.find(s => s.nodes.some(n => n.id === nodeId));

  const handleNodeClick = (contentId: string, contentType: string) => {
    router.push(`/content/${contentId}?category=${contentType}`);
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

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "library-content") {
      setDraggingContent(data.content as Content);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingContent(null);

    const { active, over } = event;
    if (!over || isAdding || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // 라이브러리에서 스테이지로 드래그
    if (activeData?.type === "library-content") {
      const contentId = activeData.contentId as string;

      // 빈 스테이지에 드롭
      if (overData?.type === "stage-drop") {
        const stageId = overData.stageId as string;

        setIsAdding(true);
        try {
          const newNode = await addNode({ flowId, stageId, contentId });

          setLocalStages(prev => prev.map(stage =>
            stage.id === stageId
              ? { ...stage, nodes: [...stage.nodes, newNode] }
              : stage
          ));
        } catch (err) {
          console.error("콘텐츠 추가 실패:", err);
          alert("콘텐츠 추가에 실패했습니다.");
        } finally {
          setIsAdding(false);
        }
        return;
      }

      // 드롭 슬롯에 드롭 (stageId 포함)
      if (overData?.type === "drop-slot") {
        const targetNodeId = overData.nodeId as string;
        const stageId = overData.stageId as string;

        setIsAdding(true);
        try {
          const newNode = await addNode({
            flowId,
            stageId,
            contentId,
            insertBeforeNodeId: targetNodeId
          });

          setLocalStages(prev => prev.map(stage => {
            if (stage.id !== stageId) return stage;

            const targetIndex = stage.nodes.findIndex(n => n.id === targetNodeId);
            const newNodes = [...stage.nodes];
            newNodes.splice(targetIndex, 0, newNode);

            return { ...stage, nodes: newNodes };
          }));
        } catch (err) {
          console.error("콘텐츠 추가 실패:", err);
          alert("콘텐츠 추가에 실패했습니다.");
        } finally {
          setIsAdding(false);
        }
        return;
      }

      // 노드 위에 직접 드롭 (폴백)
      const targetStage = findStageForNode(over.id);
      if (targetStage) {
        const overNode = targetStage.nodes.find(n => n.id === over.id);
        if (overNode) {
          setIsAdding(true);
          try {
            const newNode = await addNode({
              flowId,
              stageId: targetStage.id,
              contentId,
              insertBeforeNodeId: overNode.id
            });

            setLocalStages(prev => prev.map(stage => {
              if (stage.id !== targetStage.id) return stage;

              const targetIndex = stage.nodes.findIndex(n => n.id === overNode.id);
              const newNodes = [...stage.nodes];
              newNodes.splice(targetIndex, 0, newNode);

              return { ...stage, nodes: newNodes };
            }));
          } catch (err) {
            console.error("콘텐츠 추가 실패:", err);
            alert("콘텐츠 추가에 실패했습니다.");
          } finally {
            setIsAdding(false);
          }
          return;
        }
      }
    }

    // 스테이지 순서 변경
    const activeStageIndex = localStages.findIndex(s => s.id === active.id);
    const overStageIndex = localStages.findIndex(s => s.id === over.id);

    if (activeStageIndex !== -1 && overStageIndex !== -1) {
      const newStages = arrayMove(localStages, activeStageIndex, overStageIndex);
      setLocalStages(newStages);

      try {
        await reorderStages({
          flowId,
          stageIds: newStages.map(s => s.id)
        });
      } catch (error) {
        console.error("스테이지 순서 변경 실패:", error);
        if (flow) setLocalStages(flow.stages);
        alert("스테이지 순서 변경에 실패했습니다.");
      }
      return;
    }

    // 노드 순서 변경
    const activeNodeStage = findStageForNode(active.id);
    if (activeNodeStage) {
      const activeNodeIndex = activeNodeStage.nodes.findIndex(n => n.id === active.id);
      const overNodeIndex = activeNodeStage.nodes.findIndex(n => n.id === over.id);

      if (activeNodeIndex !== -1 && overNodeIndex !== -1) {
        const newNodes = arrayMove(activeNodeStage.nodes, activeNodeIndex, overNodeIndex);

        setLocalStages(localStages.map(s =>
          s.id === activeNodeStage.id ? { ...s, nodes: newNodes } : s
        ));

        try {
          await reorderNodes({
            stageId: activeNodeStage.id,
            nodeIds: newNodes.map(n => n.id)
          });
        } catch (error) {
          console.error("노드 순서 변경 실패:", error);
          if (flow) setLocalStages(flow.stages);
          alert("노드 순서 변경에 실패했습니다.");
        }
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
        <p className="font-serif text-lg text-text-primary mb-2">
          {error || "플로우를 찾을 수 없습니다"}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        {/* 뒤로가기 */}
        <div className="w-full px-6 md:px-10 mb-3 md:mb-4">
          <Link
            href={`/${flow.user_id}/reading/collections`}
            className="inline-flex p-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
        </div>

        {/* 헤더 */}
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

        {/* 스테이지 목록 (편집 모드 시 사이드 패널 폭만큼 마진) */}
        <div className={cn("flex-1 min-w-0 px-4 md:px-10", isEditMode && "md:me-80")}>
          <FlowStageList
            flowId={flowId}
            stages={localStages}
            isOwner={isOwner}
            isEditMode={isEditMode}
            onNodeClick={handleNodeClick}
            setIsEditMode={(edit: boolean) => {
              if (edit) handleEnterEditMode();
              else setIsEditMode(false);
            }}
            onRefresh={loadFlow}
          />
        </div>

        {/* 우측 사이드 콘텐츠 패널 */}
        {isEditMode && (
          <FlowContentEditor
            flowId={flowId}
            stages={localStages}
            isDragging={draggingContent !== null}
            onClose={() => setIsEditMode(false)}
            onRefresh={loadFlow}
          />
        )}

        {/* 드래그 오버레이 */}
        <DragOverlay>
          {draggingContent && <DragOverlayContent content={draggingContent} />}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
