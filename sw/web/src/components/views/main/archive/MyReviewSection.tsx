"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";

interface RecordData {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
}

interface MyReviewSectionProps {
  reviewText: string;
  reviewRating: number | null;
  myReview: RecordData | null;
  isSaving: boolean;
  onReviewTextChange: (text: string) => void;
  onRatingChange: (rating: number | null) => void;
  onSave: () => void;
  // AI 기능
  hasApiKey?: boolean;
  onGenerateExample?: () => void;
  isGenerating?: boolean;
}

export default function MyReviewSection({
  reviewText,
  reviewRating,
  myReview,
  isSaving,
  onReviewTextChange,
  onRatingChange,
  onSave,
  hasApiKey = false,
  onGenerateExample,
  isGenerating = false,
}: MyReviewSectionProps) {
  return (
    <div className="animate-fade-in">
      <Card className="p-0 mb-4">
        <div className="p-3 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
          <h3 className="font-semibold text-sm">내 리뷰</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  unstyled
                  key={star}
                  onClick={() => onRatingChange(reviewRating === star ? null : star)}
                  className={`text-lg ${
                    (reviewRating ?? 0) >= star ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400/50"
                  }`}
                >
                  ★
                </Button>
              ))}
            </div>
            {reviewRating && <span className="text-xs font-medium text-yellow-400">{reviewRating}.0</span>}
          </div>
        </div>
        <div className="p-3">
          {/* AI 예시 생성 버튼 */}
          {onGenerateExample && (
            <div className="mb-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onGenerateExample}
                disabled={!hasApiKey || isGenerating}
                title={hasApiKey ? "AI로 리뷰 예시 생성" : "마이페이지 > 설정에서 API 키를 등록하세요"}
                className="text-xs gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                AI 예시
              </Button>
            </div>
          )}

          <textarea
            className="w-full h-24 bg-black/20 border border-border rounded-lg p-2.5 text-text-primary text-sm resize-y outline-none mb-3 font-sans focus:border-accent placeholder:text-text-secondary"
            placeholder="이 작품에 대한 생각을 자유롭게 기록해보세요."
            value={reviewText}
            onChange={(e) => onReviewTextChange(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {["#판타지", "#성장", "+ 태그"].map((tag) => (
                <span
                  key={tag}
                  className="py-0.5 px-2 bg-white/5 border border-border rounded-full text-[11px] text-text-secondary cursor-pointer hover:border-accent hover:text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="flex items-center gap-1 cursor-pointer text-text-secondary text-[11px]">
                <input type="checkbox" className="w-3 h-3" /> 스포일러
              </label>
              <Button variant="primary" size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {myReview && (
        <Card className="p-0">
          <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
            <div className="w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary">📝</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs">내 리뷰</div>
              <div className="text-[10px] text-text-secondary">
                {new Date(myReview.created_at).toLocaleDateString("ko-KR")}
              </div>
            </div>
            <div className="text-yellow-400 text-xs">{"★".repeat(myReview.rating ?? 0)}</div>
          </div>
          <div className="p-2.5">
            <div className="text-xs leading-relaxed text-text-secondary">{myReview.content}</div>
          </div>
        </Card>
      )}
    </div>
  );
}
