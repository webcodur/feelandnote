"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Layers, Plus } from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { removeNode, updateNode } from "@/actions/flows/flowNodes";
import { addStage, deleteStage, updateStage } from "@/actions/flows/flowStages";
import type { FlowStageWithNodes } from "@/types/database";
import TimelineNode from "./TimelineNode";
import TimelineStageHeader from "./TimelineStageHeader";
import { TimelineDropZone, EndDropZone, EmptyStageDropZone } from "./TimelineDropZones";

interface FlowStageListProps {
  flowId: string;
  stages: FlowStageWithNodes[];
  isOwner: boolean;
  isEditMode?: boolean;
  onNodeClick: (contentId: string, contentType: string) => void;
  setIsEditMode: (edit: boolean) => void;
  onRefresh?: () => Promise<void>;
}

// #region Main Component
export default function FlowStageList({
  flowId, stages, isOwner, isEditMode = false, onNodeClick, setIsEditMode, onRefresh
}: FlowStageListProps) {
  const t = useTranslations("flowDetail");
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
        <p className="font-serif text-base text-white/60 mb-2">{t("emptyFlow")}</p>
        <p className="text-sm text-white/25 mb-6">{t("emptyFlowGuide")}</p>
        {isOwner && (
          <Button onClick={() => setIsEditMode(true)} className="px-5 py-2 bg-accent text-black font-bold hover:bg-accent-hover rounded-full text-sm">
            {t("startEdit")}
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
                  <p className="text-xs text-white/15 py-4">{t("emptyStage")}</p>
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
            {t("addStage")}
          </Button>
        </div>
      )}
    </div>
  );
}
// #endregion
