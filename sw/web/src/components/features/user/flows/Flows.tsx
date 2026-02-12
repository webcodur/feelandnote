/*
  파일명: /components/features/user/flows/Flows.tsx
  기능: 플로우 목록 컴포넌트
  책임: 사용자의 플로우 목록을 그리드로 표시한다.
*/
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers } from "lucide-react";
import { getFlows } from "@/actions/flows";
import type { FlowSummary } from "@/types/database";
import FlowCard from "./FlowCard";
import FlowEditor from "./FlowEditor";
import Button from "@/components/ui/Button";

interface FlowsProps {
  userId: string;
  isOwner: boolean;
}

export default function Flows({ userId, isOwner }: FlowsProps) {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadFlows();
  }, [userId]);

  const loadFlows = async () => {
    setIsLoading(true);
    try {
      const data = await getFlows(userId);
      setFlows(data);
    } catch (error) {
      console.error("플로우 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlowClick = (flowId: string) => {
    router.push(`/${userId}/reading/collections/${flowId}`);
  };

  const handleEditorSuccess = () => {
    setShowEditor(false);
    loadFlows();
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/5] bg-[#1a1a1a] border border-white/5 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Layers size={20} className="text-accent" />
          <h2 className="text-xl md:text-2xl font-serif font-black text-white">
            플로우
          </h2>
          <span className="text-sm text-text-secondary font-serif">
            {flows.length}
          </span>
        </div>

        {isOwner && (
          <Button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-accent text-black font-bold text-sm hover:bg-accent-hover transition-colors flex items-center gap-2 rounded"
          >
            <Plus size={16} /> 새 플로우
          </Button>
        )}
      </div>

      {/* 목록 */}
      {flows.length === 0 ? (
        <div className="text-center py-20 text-text-secondary border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
          <Layers size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-serif text-lg text-text-primary mb-2">
            아직 플로우가 없습니다
          </p>
          <p className="text-sm opacity-60 mb-6">
            콘텐츠를 단계별로 구성하여 나만의 학습 경로를 만들어보세요.
          </p>
          {isOwner && (
            <Button
              onClick={() => setShowEditor(true)}
              className="px-6 py-2 bg-accent text-black font-bold hover:bg-accent-hover rounded-full"
            >
              첫 번째 플로우 만들기
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onClick={() => handleFlowClick(flow.id)}
            />
          ))}
        </div>
      )}

      {/* 에디터 모달 */}
      {showEditor && (
        <FlowEditor
          onClose={() => setShowEditor(false)}
          onSuccess={handleEditorSuccess}
        />
      )}
    </div>
  );
}
