"use client";

import { useRef } from "react";
import { PenTool, Eye, Save, Loader2, Star } from "lucide-react";
import FormattedText from "@/components/ui/FormattedText";
import StarRatingInput from "@/components/ui/StarRatingInput";

interface MyReviewPanelProps {
  review: string;
  setReview: (value: string) => void;
  rating: number;
  setRating: (value: number) => void;
  initialReview?: string;
  initialRating?: number;
  viewMode: 'EDIT' | 'PREVIEW';
  setViewMode: (mode: 'EDIT' | 'PREVIEW') => void;
  contentTitle?: string;
  isRecommendation?: boolean;
  onSave: () => void;
  isSubmitting: boolean;
}

export default function MyReviewPanel({
  review,
  setReview,
  rating,
  setRating,
  initialReview = "",
  initialRating = 0,
  viewMode,
  setViewMode,
  onSave,
  isSubmitting,
  contentTitle,
  isRecommendation,
}: MyReviewPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = (review !== initialReview) || (rating !== initialRating);

  // 추천 모드일 때 안내 문구 표시 로직
  // 리뷰가 비어있고 isRecommendation이 true일 때만 placeholder가 다르게 보이거나, 아예 오버레이가 보일 수 있음.
  // 여기서는 textarea placeholder를 동적으로 변경하는 방식을 사용.
  
  const placeholderText = isRecommendation 
    ? `셀럽들이 최고로 추천하는 《${contentTitle}》입니다.\n작품을 경험하셨다면 솔직한 리뷰를 남겨보세요.` 
    : `작품에서 발견한 영감을 자유롭게 기록해 보세요.

 다음의 문장 부호로 텍스트를 꾸밀 수 있습니다.
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
    
    // 커서 위치 조정 (삽입된 텍스트 사이로 이동)
    // requestAnimationFrame을 사용하여 React 상태 업데이트 이후에 커서 이동 보장
    requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPos = start + startChar.length + selectedText.length + (selectedText ? endChar.length : 0);
        // 선택된 텍스트가 있었다면 감싼 뒤 전체 끝으로, 없었다면 사이로
        if (selectedText) {
             textarea.setSelectionRange(newCursorPos, newCursorPos);
        } else {
             textarea.setSelectionRange(start + startChar.length, start + startChar.length);
        }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-auto md:h-full">
      {/* Editor/Preview Toggle Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-white/2 flex items-center justify-between shadow-sm shrink-0 min-h-[52px]">
        {/* 좌측: 탭 */}
        <div className="flex-1 flex items-center">
            <div className="flex bg-black/20 p-1 rounded-lg">
                <button
                    onClick={() => setViewMode('EDIT')}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                        viewMode === 'EDIT' 
                        ? 'bg-accent/20 text-accent shadow-sm' 
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                >
                    쓰기
                </button>
                <button
                    onClick={() => setViewMode('PREVIEW')}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                        viewMode === 'PREVIEW' 
                        ? 'bg-accent/20 text-accent shadow-sm' 
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                >
                    읽기
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

      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col bg-bg-main/30 overflow-hidden relative">
         {viewMode === 'EDIT' ? (
            <div className="flex flex-col h-full relative">
                {/* Custom Placeholder with FormattedText */}
                {!review && (
                    <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center p-8">
                        <div className="text-text-tertiary/20 leading-relaxed text-base font-sans font-normal whitespace-pre-wrap text-center">
                            <FormattedText text={placeholderText} className="opacity-60" />
                        </div>
                    </div>
                )}
                
                <textarea
                    ref={textareaRef}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full flex-1 p-6 bg-transparent border-none outline-none resize-none text-text-primary leading-relaxed text-base font-sans font-normal custom-scrollbar z-10 relative bg-transparent"
                />

                {/* 포맷팅 버튼 에디터 내부 우측 하단 배치 */}
                <div className="absolute right-4 bottom-4 flex items-center gap-1.5 z-20">
                    <button
                      onClick={() => insertText('《', '》')}
                      className="flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold bg-white/10 hover:bg-accent/20 text-white border border-white/10 hover:border-accent/40 transition-all backdrop-blur-md shadow-lg"
                      title="제목/강조: 《작품명》"
                    >
                      《》
                    </button>
                    <button
                      onClick={() => insertText('"', '"')}
                      className="flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold bg-white/10 hover:bg-accent/20 text-accent border border-white/10 hover:border-accent/40 transition-all backdrop-blur-md shadow-lg"
                      title="인용/강조: '문장'"
                    >
                      " "
                    </button>
                    <button
                      onClick={() => insertText('<', '>')}
                      className="flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold bg-white/10 hover:bg-accent/20 text-accent font-serif border border-white/10 hover:border-accent/40 transition-all backdrop-blur-md shadow-lg"
                      title="소주제/강조: <키워드>"
                    >
                      &lt;&gt;
                    </button>
                </div>
            </div>
         ) : (
            <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar">
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
    </div>
  );
}
