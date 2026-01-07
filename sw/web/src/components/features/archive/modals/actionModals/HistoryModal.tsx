/*
  파일명: /components/features/archive/modals/actionModals/HistoryModal.tsx
  기능: 활동 내역 모달
  책임: 사용자의 활동 로그를 타임라인 형태로 표시한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback } from "react";
import { History } from "lucide-react";
import ActionModal from "../ActionModal";
import ActivityTimeline from "./ActivityTimeline";
import { getActivityLogs } from "@/actions/activity";
import type { ActivityLogWithContent } from "@/types/database";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [logs, setLogs] = useState<ActivityLogWithContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const loadLogs = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const result = await getActivityLogs({ limit: 20, cursor });
      setLogs((prev) => (cursor ? [...prev, ...result.logs] : result.logs));
      setNextCursor(result.nextCursor);
    } catch {
      console.error("[HistoryModal] Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !initialized) {
      loadLogs();
      setInitialized(true);
    }
  }, [isOpen, initialized, loadLogs]);

  const handleClose = () => {
    setLogs([]);
    setNextCursor(null);
    setInitialized(false);
    onClose();
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={handleClose}
      icon={History}
      title="히스토리"
      description="최근 90일간의 활동 내역입니다."
      size="md"
      actions={nextCursor ? [{ label: loading ? "로딩 중..." : "더 보기", onClick: () => loadLogs(nextCursor), variant: "secondary", disabled: loading }] : []}
    >
      <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2">
        <ActivityTimeline logs={logs} loading={loading && logs.length === 0} />
      </div>
    </ActionModal>
  );
}
