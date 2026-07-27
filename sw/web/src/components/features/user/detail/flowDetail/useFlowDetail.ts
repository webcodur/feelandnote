"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { getFlow } from "@/actions/flows/getFlow";
import { deleteFlow } from "@/actions/flows/deleteFlow";
import { updateFlow } from "@/actions/flows/updateFlow";
import { saveFlow, unsaveFlow, checkFlowSaved } from "@/actions/flows/savedFlows";
import { createClient } from "@/lib/supabase/client";
import type { FlowWithStages } from "@/types/database";
import { useTranslations } from "next-intl";

export function useFlowDetail(flowId: string) {
  const router = useRouter();
  const t = useTranslations("flowDetail");

  const [flow, setFlow] = useState<FlowWithStages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const isOwner = currentUserId === flow?.user_id;

  const loadFlow = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFlow(flowId);
      setFlow(data);
    } catch (err) {
      console.error("[useFlowDetail:load]", err);
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [flowId, t]);

  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

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

  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteFlow(flowId);
      if (currentUserId) {
        router.push(`/${currentUserId}/reading/collections`);
      }
    } catch (err) {
      console.error("[useFlowDetail:delete]", err);
      alert(t("deleteError"));
    }
  };

  const handleTogglePublic = async () => {
    if (!flow) return;
    try {
      await updateFlow({ flowId, isPublic: !flow.is_public });
      setFlow({ ...flow, is_public: !flow.is_public });
    } catch (err) {
      console.error("[useFlowDetail:visibility]", err);
      alert(t("visibilityError"));
    }
  };

  const handleToggleSave = async () => {
    if (!currentUserId) return;
    try {
      if (isSaved) {
        await unsaveFlow(flowId);
        setIsSaved(false);
      } else {
        await saveFlow(flowId);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("[useFlowDetail:save-state]", err);
      alert(t("saveStateError"));
    }
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

  return {
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
    handleToggleSave,
    getCategoryCounts,
    loadFlow,
  };
}
