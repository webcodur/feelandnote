"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getFlow } from "@/actions/flows/getFlow";
import { deleteFlow } from "@/actions/flows/deleteFlow";
import { updateFlow } from "@/actions/flows/updateFlow";
import { saveFlow, unsaveFlow, checkFlowSaved } from "@/actions/flows/savedFlows";
import { createClient } from "@/lib/supabase/client";
import type { Content, FlowNodeWithContent, FlowWithStages } from "@/types/database";

export function useFlowDetail(flowId: string) {
  const router = useRouter();

  const [flow, setFlow] = useState<FlowWithStages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const isOwner = currentUserId === flow?.user_id;

  // 데이터 로드
  const loadFlow = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFlow(flowId);
      setFlow(data);
      // 첫 로드 시 모든 스테이지 펼치기
      const stageIds = new Set(data.stages.map(s => s.id));
      setExpandedStages(stageIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "플로우를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  // 현재 사용자 및 저장 여부 확인
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        const saved = await checkFlowSaved(flowId);
        setIsSaved(saved);
      }
    };
    init();
  }, [flowId]);

  // 핸들러
  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!confirm("이 플로우를 삭제하시겠습니까?")) return;
    try {
      await deleteFlow(flowId);
      if (currentUserId) {
        router.push(`/${currentUserId}/reading/collections`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다");
    }
  };

  const handleTogglePublic = async () => {
    if (!flow) return;
    try {
      await updateFlow({ flowId, isPublic: !flow.is_public });
      setFlow({ ...flow, is_public: !flow.is_public });
    } catch (err) {
      alert(err instanceof Error ? err.message : "설정 변경에 실패했습니다");
    }
    setIsMenuOpen(false);
  };

  const toggleStageExpand = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const getCategoryCounts = () => {
    if (!flow) return {};
    const counts: Record<string, number> = {};
    flow.stages.forEach(stage => {
      stage.nodes.forEach(node => {
        const type = node.content.type;
        counts[type] = (counts[type] || 0) + 1;
      });
    });
    return counts;
  };

  const handleEditSuccess = () => {
    setIsEditMode(false);
    loadFlow();
  };

  const handleToggleSave = async () => {
    try {
      if (isSaved) {
        await unsaveFlow(flowId);
        setIsSaved(false);
      } else {
        await saveFlow(flowId);
        setIsSaved(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다");
    }
  };

  const insertNodeToStage = (params: {
    stageId: string;
    nodeId: string;
    content: Content;
    insertIndex?: number;
    description?: string | null;
  }) => {
    setFlow((prev) => {
      if (!prev) return prev;

      let didAdd = false;
      const stages = prev.stages.map((stage) => {
        if (stage.id !== params.stageId) return stage;
        if (stage.nodes.some((node) => node.id === params.nodeId || node.content_id === params.content.id)) {
          return stage;
        }

        const newNode: FlowNodeWithContent = {
          id: params.nodeId,
          flow_id: prev.id,
          stage_id: params.stageId,
          content_id: params.content.id,
          description: params.description ?? null,
          sort_order: stage.nodes.length,
          difficulty: null,
          is_optional: false,
          bonus_content_ids: null,
          theme_color: null,
          content: params.content,
        };

        const insertIndex = Math.max(0, Math.min(params.insertIndex ?? stage.nodes.length, stage.nodes.length));
        const nextNodes = [...stage.nodes];
        nextNodes.splice(insertIndex, 0, newNode);

        didAdd = true;
        return {
          ...stage,
          nodes: nextNodes.map((node, index) => ({ ...node, sort_order: index })),
        };
      });

      if (!didAdd) return prev;
      return { ...prev, stages, node_count: prev.node_count + 1 };
    });
  };

  const reorderNodeInStage = (params: {
    stageId: string;
    nodeId: string;
    insertIndex: number;
  }) => {
    setFlow((prev) => {
      if (!prev) return prev;

      const stages = prev.stages.map((stage) => {
        if (stage.id !== params.stageId) return stage;

        const fromIndex = stage.nodes.findIndex((node) => node.id === params.nodeId);
        if (fromIndex < 0) return stage;

        const nextNodes = [...stage.nodes];
        const [moved] = nextNodes.splice(fromIndex, 1);
        const bounded = Math.max(0, Math.min(params.insertIndex, nextNodes.length));
        nextNodes.splice(bounded, 0, moved);

        return {
          ...stage,
          nodes: nextNodes.map((node, index) => ({ ...node, sort_order: index })),
        };
      });

      return { ...prev, stages };
    });
  };

  const moveNodeAcrossStages = (params: {
    nodeId: string;
    fromStageId: string;
    toStageId: string;
    insertIndex: number;
  }) => {
    setFlow((prev) => {
      if (!prev) return prev;

      const sourceStage = prev.stages.find((stage) => stage.id === params.fromStageId);
      const targetStage = prev.stages.find((stage) => stage.id === params.toStageId);
      if (!sourceStage || !targetStage) return prev;

      const movingNode = sourceStage.nodes.find((node) => node.id === params.nodeId);
      if (!movingNode) return prev;

      const stages = prev.stages.map((stage) => {
        if (stage.id === params.fromStageId) {
          const nextNodes = stage.nodes
            .filter((node) => node.id !== params.nodeId)
            .map((node, index) => ({ ...node, sort_order: index }));
          return { ...stage, nodes: nextNodes };
        }

        if (stage.id === params.toStageId) {
          const nextNodes = [...stage.nodes];
          const bounded = Math.max(0, Math.min(params.insertIndex, nextNodes.length));
          nextNodes.splice(bounded, 0, { ...movingNode, stage_id: params.toStageId });
          return {
            ...stage,
            nodes: nextNodes.map((node, index) => ({ ...node, sort_order: index })),
          };
        }

        return stage;
      });

      return { ...prev, stages };
    });
  };

  return {
    flow,
    isLoading,
    error,
    isMenuOpen,
    setIsMenuOpen,
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
    handleEditSuccess,
    handleToggleSave,
    insertNodeToStage,
    reorderNodeInStage,
    moveNodeAcrossStages,
    loadFlow,
    router,
  };
}
