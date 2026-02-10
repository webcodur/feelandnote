import { useState } from "react";
import { X, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { CategoryId } from "@/constants/categories";
import { 
  type ReviewPreset, 
  getAllCommonPresets, 
  getPresetsByCategory,
  getSentimentColorClasses
} from "@/constants/review-presets";

interface ReviewPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryId;
  selectedPresets: string[];
  onSelectPreset: (preset: ReviewPreset) => void;
  onDeselectPreset: (preset: ReviewPreset) => void;
}

export default function ReviewPresetModal({
  isOpen,
  onClose,
  category,
  selectedPresets,
  onSelectPreset,
  onDeselectPreset,
}: ReviewPresetModalProps) {
  // const [activeTab, setActiveTab] = useState<"common" | "category">("category");

  const commonPresets = getAllCommonPresets();
  // const categoryPresets = getPresetsByCategory(category);
  // 카테고리별 프리셋이 없으면 공통 탭을 기본으로
  // const hasCategoryPresets = categoryPresets.length > 0;
  
  // 탭 전환 핸들러
  // const handleTabChange = (tab: "common" | "category") => {
  //   setActiveTab(tab);
  // };

  // 현재 탭에 맞는 프리셋 목록
  // 일단 공통 키워드만 지원 (요청사항: "일단 이것만 지원하자")
  const currentPresets = commonPresets;

  const handlePresetClick = (preset: ReviewPreset) => {
    const isSelected = selectedPresets.includes(preset.keyword);
    if (isSelected) {
      onDeselectPreset(preset);
    } else {
      onSelectPreset(preset);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="리뷰 키워드 선택"
      size="md"
    >
      <div className="flex flex-col h-[60vh] max-h-[500px]">
        {/* 탭 네비게이션 제거됨 */}

        {/* 프리셋 목록 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
            {currentPresets.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 p-4">
                    {currentPresets.map((preset) => {
                        const isSelected = selectedPresets.includes(preset.keyword);
                        
                        let sentimentStyle = "";
                        switch (preset.sentiment) {
                            case "positive":
                                sentimentStyle = isSelected
                                    ? "bg-green-500/20 border-green-500/50 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                                    : "bg-green-500/5 border-green-500/10 text-green-500/60 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-500/90";
                                break;
                            case "negative":
                                sentimentStyle = isSelected
                                    ? "bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                    : "bg-red-500/5 border-red-500/10 text-red-500/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500/90";
                                break;
                            case "neutral":
                                sentimentStyle = isSelected
                                    ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                    : "bg-yellow-500/5 border-yellow-500/10 text-yellow-500/60 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-500/90";
                                break;
                            case "etc":
                            default:
                                sentimentStyle = isSelected
                                    ? "bg-zinc-500/20 border-zinc-500/50 text-zinc-400 shadow-[0_0_15px_rgba(113,113,122,0.2)]"
                                    : "bg-zinc-500/5 border-zinc-500/10 text-zinc-500/60 hover:bg-zinc-500/10 hover:border-zinc-500/30 hover:text-zinc-400/90";
                                break;
                        }
                        
                        return (
                            <button
                                key={preset.id}
                                onClick={() => handlePresetClick(preset)}
                                className={`w-full text-left px-3 py-3 rounded-lg border transition-none flex flex-col justify-center gap-1 group relative overflow-hidden ${sentimentStyle}`}
                            >
                                <span className="font-sans font-bold text-sm">
                                    {preset.keyword}
                                </span>
                                {preset.description && (
                                    <span className={`text-[10px] line-clamp-1 ${isSelected ? 'opacity-80' : 'opacity-60 group-hover:opacity-100'}`}>
                                        {preset.description}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="flex items-center justify-center h-40 text-text-tertiary text-sm">
                    등록된 키워드가 없습니다.
                </div>
            )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t border-white/10 flex justify-end">
            <button
                onClick={onClose}
                className="px-6 py-2.5 bg-accent text-bg-main font-sans font-bold rounded-lg hover:bg-accent-hover transition-colors shadow-glow"
            >
                선택 완료
            </button>
        </div>
      </div>
    </Modal>
  );
}
