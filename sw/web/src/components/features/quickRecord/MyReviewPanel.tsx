import { useRef, useState } from "react";
import { PenTool, Eye, Save, Loader2, Star, Plus, X } from "lucide-react";
import FormattedText from "@/components/ui/FormattedText";
import StarRatingInput from "@/components/ui/StarRatingInput";
import ReviewPresetModal from "./ReviewPresetModal";
import { 
    type ReviewPreset, 
    getAllCommonPresets, 
    getPresetsByCategory,
    getPresetByKeyword,
    getSentimentColorClasses
} from "@/constants/review-presets";
import type { CategoryId } from "@/constants/categories";

interface MyReviewPanelProps {
  review: string;
  setReview: (value: string) => void;
  rating: number;
  setRating: (value: number) => void;
  presets: string[];
  setPresets: (value: string[]) => void;
  initialReview?: string;
  initialRating?: number;
  initialPresets?: string[];
  viewMode: 'EDIT' | 'PREVIEW';
  setViewMode: (mode: 'EDIT' | 'PREVIEW') => void;
  contentTitle?: string;
  contentCreator?: string | null;
  isRecommendation?: boolean;
  onSave: () => void;
  isSubmitting: boolean;
  hideHeader?: boolean;
  contentType: CategoryId; // 필수
}

export default function MyReviewPanel({
  review,
  setReview,
  rating,
  setRating,
  presets,
  setPresets,
  initialReview = "",
  initialRating = 0,
  initialPresets = [],
  viewMode,
  setViewMode,
  onSave,
  isSubmitting,
  contentTitle,
  contentCreator,
  isRecommendation,
  hideHeader = false,
  contentType,
}: MyReviewPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // 프리셋 비교: 순서 무관하게 내용이 같은지 확인
  const arePresetsEqual = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      const setA = new Set(a);
      return b.every(item => setA.has(item));
  };

  const isDirty = (review !== initialReview) || (rating !== initialRating) || !arePresetsEqual(presets, initialPresets);

  // 추천 모드일 때 안내 문구 표시 로직
  const placeholderText = isRecommendation 
    ? `셀럽들이 최고로 추천하는 《${contentTitle}》입니다.\n작품을 경험하셨다면 솔직한 리뷰를 남겨보세요.` 
    : `작품에서 발견한 영감을 자유롭게 기록하세요.

 다음 부호로 텍스트를 꾸밀 수 있습니다.
 
 • 《작품명》 : 제목이나 큰 주제 강조 (Bold)
 • "명언" : 중요한 문장이나 인용구 (Accent)
 • <키워드> : 특정 단어나 소주제 강조 (Serif)
 `;

  // 텍스트 삽입 헬퍼
  const insertText = (startChar: string, endChar: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = before + startChar + selectedText + endChar + after;

    setReview(newText);

    requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPos = start + startChar.length + selectedText.length + (selectedText ? endChar.length : 0);
        if (selectedText) {
             textarea.setSelectionRange(newCursorPos, newCursorPos);
        } else {
             textarea.setSelectionRange(start + startChar.length, start + startChar.length);
        }
    });
  };

  // 프리셋 텍스트 삽입 헬퍼
  const insertPresetText = (text: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(start);

    const newText = before + text + after;
    setReview(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + text.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  // 프리셋 선택 핸들러 (모달용)
  const handleSelectPreset = (preset: ReviewPreset) => {
      if (!presets.includes(preset.keyword)) {
          setPresets([...presets, preset.keyword]);
      }
  };

  const handleDeselectPreset = (preset: ReviewPreset) => {
      setPresets(presets.filter(p => p !== preset.keyword));
      // 텍스트 제거는 복잡하므로 하지 않음 (유저가 직접 수정)
  };

  // 퀵 프리셋 (상단 노출용) - 공통 3개 + 카테고리 3개
  const commonPresets = getAllCommonPresets().slice(0, 3);
  const categoryPresets = getPresetsByCategory(contentType).slice(0, 3);
  const quickPresets = [...commonPresets, ...categoryPresets];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Editor/Preview Toggle Header */}
      {!hideHeader && (
          <div className="px-4 py-2 border-b border-white/5 bg-white/2 flex items-center justify-between shadow-sm shrink-0 min-h-[52px]">
            {/* 좌측: 탭 */}
            <div className="flex-1 flex items-center">
                <div className="flex bg-black/20 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('EDIT')}
                        className={`flex items-center justify-center p-2 rounded-md transition-all ${
                            viewMode === 'EDIT'
                            ? 'bg-accent/20 text-accent shadow-sm'
                            : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                        title="쓰기"
                    >
                        <PenTool size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode('PREVIEW')}
                        className={`flex items-center justify-center p-2 rounded-md transition-all ${
                            viewMode === 'PREVIEW'
                            ? 'bg-accent/20 text-accent shadow-sm'
                            : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                        title="읽기"
                    >
                        <Eye size={14} />
                    </button>
                </div>
            </div>

            {/* 중앙: 타이틀 */}
            <div className="flex-none flex items-center justify-center gap-2 text-white whitespace-nowrap px-4">
                <PenTool size={16} className="text-accent" />
                <span className="text-sm font-bold uppercase tracking-wider">내 리뷰</span>
            </div>

            {/* 우측: 저장 버튼 */}
            <div className="flex-1 flex items-center justify-end">
                  <button 
                    onClick={onSave} 
                    disabled={!isDirty || isSubmitting}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                        isDirty 
                        ? 'bg-accent/15 hover:bg-accent/25 text-accent shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                        : 'bg-white/5 text-text-tertiary/40 cursor-not-allowed'
                    }`}
                    title="저장"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  </button>
            </div>
          </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col bg-bg-main/30 overflow-hidden relative">
         {viewMode === 'EDIT' ? (
            <div className="flex flex-col h-full relative">
                {/* Review Presets Chips Area */}
                <div className="px-4 py-3 flex flex-wrap gap-2 items-center border-b border-white/5 bg-black/10">
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mr-1">Keywords</span>
                    
                    {/* Selected Presets (Always visible) */}
                    {presets.map((presetKeyword) => {
                        const preset = getPresetByKeyword(presetKeyword);
                        const sentiment = preset?.sentiment || "etc";
                        const colorClasses = getSentimentColorClasses(sentiment);

                        return (
                            <button
                                key={presetKeyword}
                                onClick={() => {
                                    // 선택 해제
                                    setPresets(presets.filter(p => p !== presetKeyword));
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans border transition-all animate-in zoom-in-50 ${colorClasses} hover:opacity-80`}
                            >
                                <span>{presetKeyword}</span>
                                <X size={10} strokeWidth={3} className="text-current" />
                            </button>
                        );
                    })}

                    {/* Add More Button */}
                    <button
                        onClick={() => setIsPresetModalOpen(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-text-tertiary text-xs font-sans border border-white/10 hover:bg-white/10 hover:text-text-secondary transition-all"
                    >
                        <Plus size={10} />
                        <span>키워드 추가</span>
                    </button>
                </div>

                {/* Custom Placeholder with FormattedText */}
                {!review && (
                    <div className="absolute inset-0 top-[50px] pointer-events-none z-0 flex items-center justify-center p-8">
                        <div className="text-text-tertiary/20 leading-relaxed text-base font-sans font-normal whitespace-pre-wrap text-center">
                            <FormattedText text={placeholderText} className="opacity-60" />
                        </div>
                    </div>
                )}
                
                <textarea
                    ref={textareaRef}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full flex-1 p-6 bg-transparent border border-transparent outline-none resize-none text-text-primary leading-relaxed text-base font-sans font-normal custom-scrollbar z-10 relative transition-all focus:border-accent/30 focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] focus:bg-accent/5"
                />

                {/* 포맷팅 버튼 */}
                <div className="absolute right-4 bottom-4 z-20">
                    <button
                      onClick={() => insertText('《', '》')}
                      className="flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold bg-white/10 hover:bg-accent/20 text-white border border-white/10 hover:border-accent/40 transition-all backdrop-blur-md shadow-lg"
                      title="제목/강조: 《작품명》"
                    >
                      《》
                    </button>
                </div>
            </div>
         ) : (
            <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                 {/* Preview Presets */}
                 {presets.length > 0 && (
                     <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
                         {presets.map((presetKeyword) => {
                             const preset = getPresetByKeyword(presetKeyword);
                             const sentiment = preset?.sentiment || "etc";
                             const colorClasses = getSentimentColorClasses(sentiment);

                             return (
                                 <span key={presetKeyword} className={`px-2.5 py-1 rounded-full text-xs font-sans font-bold border ${colorClasses}`}>
                                     {presetKeyword}
                                 </span>
                             );
                         })}
                     </div>
                 )}

                {review ? (
                    <div className="text-text-primary/90 leading-relaxed whitespace-pre-wrap">
                        <FormattedText text={review} />
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-text-tertiary/30 italic">
                        작성된 내용이 없습니다.
                    </div>
                )}
            </div>
         )}
      </div>

      {/* Unified Rating Bar (Moved to Bottom) */}
      <div className="px-6 py-4 flex items-center justify-between bg-white/2 border-t border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-accent/60 tracking-widest uppercase mt-0.5">Rating</span>
              <StarRatingInput
                  value={rating}
                  onChange={setRating}
                  size={24}
                  className="gap-1.5"
              />
          </div>
          <div className="flex items-center gap-2 min-w-[60px] justify-end">
              {rating > 0 ? (
                  <div className="flex items-center gap-2 animate-in zoom-in-50 duration-300">
                      <Star size={16} className="text-accent fill-accent shadow-glow" />
                      <span className="text-2xl font-serif font-black text-accent drop-shadow-glow">
                          {rating.toFixed(1)}
                      </span>
                  </div>
              ) : (
                  <span className="text-[10px] text-text-tertiary italic">평가 전</span>
              )}
          </div>
      </div>

      <ReviewPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        category={contentType}
        selectedPresets={presets}
        onSelectPreset={handleSelectPreset}
        onDeselectPreset={handleDeselectPreset}
      />
    </div>
  );
}
