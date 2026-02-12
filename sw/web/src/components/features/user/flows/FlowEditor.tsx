/*
  파일명: /components/features/user/flows/FlowEditor.tsx
  기능: 플로우 에디터 (3단 위계 생성)
  책임: Flow 메타정보 입력 + Stage별 콘텐츠 추가 UI를 제공한다.
*/
"use client";

import { useState } from "react";
import { X, Plus, GripVertical, Trash2, Layers, ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/Button";
import { createFlow } from "@/actions/flows/createFlow";
import { Z_INDEX } from "@/constants/zIndex";

interface StageData {
  id: string;
  name: string;
  description: string;
  contentIds: string[];
  isExpanded: boolean;
}

interface FlowEditorProps {
  onClose: () => void;
  onSuccess: () => void;
}

let stageCounter = 0;

export default function FlowEditor({ onClose, onSuccess }: FlowEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [stages, setStages] = useState<StageData[]>([
    { id: `stage-${++stageCounter}`, name: "1단계", description: "", contentIds: [], isExpanded: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 스테이지 추가
  const addStage = () => {
    setStages([
      ...stages,
      {
        id: `stage-${++stageCounter}`,
        name: `${stages.length + 1}단계`,
        description: "",
        contentIds: [],
        isExpanded: true,
      },
    ]);
  };

  // 스테이지 삭제
  const removeStage = (stageId: string) => {
    if (stages.length <= 1) return;
    setStages(stages.filter((s) => s.id !== stageId));
  };

  // 스테이지 이름 변경
  const updateStageName = (stageId: string, newName: string) => {
    setStages(stages.map((s) => (s.id === stageId ? { ...s, name: newName } : s)));
  };

  // 스테이지 설명 변경
  const updateStageDescription = (stageId: string, newDesc: string) => {
    setStages(stages.map((s) => (s.id === stageId ? { ...s, description: newDesc } : s)));
  };

  // 스테이지 접기/펼치기
  const toggleStageExpand = (stageId: string) => {
    setStages(stages.map((s) => (s.id === stageId ? { ...s, isExpanded: !s.isExpanded } : s)));
  };

  // 제출
  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("플로우 제목을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createFlow({
        name,
        description,
        isPublic,
        stages: stages.map((s) => ({
          name: s.name,
          description: s.description || undefined,
          contentIds: s.contentIds,
        })),
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(typeof result.error === 'object' && result.error && 'message' in result.error ? (result.error as { message: string }).message : "플로우 생성에 실패했습니다.");
      }
    } catch (err) {
      setError("플로우 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.modal }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#111] border border-accent/20 rounded-xl overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-accent" />
            <h2 className="text-lg font-serif font-bold text-white">새 플로우 만들기</h2>
          </div>
          <Button unstyled onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </Button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 플로우 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-serif text-text-secondary mb-1">플로우 제목 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 프론트엔드 입문 로드맵"
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-serif text-text-secondary mb-1">설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="플로우에 대한 간단한 설명"
                rows={2}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-accent/50 focus:outline-none transition-colors resize-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-sm text-text-secondary">공개</span>
            </label>
          </div>

          {/* 구분선 */}
          <div className="h-[1px] bg-white/5" />

          {/* 스테이지 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-white">스테이지 구성</h3>
              <Button
                unstyled
                onClick={addStage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition-colors"
              >
                <Plus size={14} /> 스테이지 추가
              </Button>
            </div>

            {stages.map((stage, index) => (
              <div key={stage.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
                {/* 스테이지 헤더 */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <GripVertical size={16} className="text-white/30 cursor-grab" />
                  <span className="text-xs font-bold text-accent/60 font-serif">{index + 1}</span>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateStageName(stage.id, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none border-b border-transparent hover:border-white/10 focus:border-accent/30 transition-colors py-1"
                    placeholder="스테이지 이름"
                  />
                  <Button
                    unstyled
                    onClick={() => toggleStageExpand(stage.id)}
                    className="p-1.5 text-white/40 hover:text-white transition-colors"
                  >
                    {stage.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                  {stages.length > 1 && (
                    <Button
                      unstyled
                      onClick={() => removeStage(stage.id)}
                      className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>

                {/* 스테이지 내용 (펼쳐진 경우) */}
                {stage.isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                    <textarea
                      value={stage.description}
                      onChange={(e) => updateStageDescription(stage.id, e.target.value)}
                      placeholder="이 단계의 목표나 설명 (선택)"
                      rows={2}
                      className="w-full mt-3 px-3 py-2 bg-[#111] border border-white/5 rounded text-sm text-white placeholder:text-white/20 focus:border-accent/30 focus:outline-none transition-colors resize-none"
                    />
                    <div className="text-center py-4 border border-dashed border-white/10 rounded text-sm text-text-secondary">
                      콘텐츠 추가는 플로우 생성 후 상세 페이지에서 할 수 있습니다
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <Button unstyled onClick={onClose} className="px-5 py-2.5 text-sm text-text-secondary hover:text-white transition-colors">
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-accent text-black font-bold text-sm hover:bg-accent-hover disabled:opacity-50 transition-colors rounded"
            >
              {isSubmitting ? "생성 중..." : "플로우 생성"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
