"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Star, PenTool, Eye, Save, X, Info, Search } from "lucide-react";
import { Avatar } from "@/components/ui";
import Button from "@/components/ui/Button";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import { updateReview } from "@/actions/contents/updateReview";
import FormattedText from "@/components/ui/FormattedText";
import SearchHelper from "./SearchHelper";


export interface QuickRecordEditorProps {
  content: {
    id: string; // user_contents.id
    title: string;
    type: string;
    thumbnailUrl?: string | null;
    creator?: string | null;
    initialRating?: number;
    initialReview?: string | null;
  };
  onComplete: () => void;
  onCancel: () => void;
  onBlogSearch?: (query: string, items: any[]) => void;
}

type ViewMode = 'EDIT' | 'PREVIEW';
type RightTab = 'INFO' | 'INSIGHT';


export default function QuickRecordEditor({
  content,
  onComplete,
  onCancel,
  onBlogSearch,
}: QuickRecordEditorProps) {
  const [rating, setRating] = useState<number>(content.initialRating || 0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('EDIT');
  const [rightTab, setRightTab] = useState<RightTab>('INFO');


  useEffect(() => {
    setRating(content.initialRating || 0);
    setReview(content.initialReview || "");
    setViewMode('EDIT');
  }, [content.id, content.initialRating, content.initialReview]);

  const handleStarClick = (score: number) => {
    setRating(score);
  };

  const handleSubmit = async () => {
    if (!content.id) return;
    setIsSubmitting(true);

    try {
      if (rating > 0) {
        await updateUserContentRating({
          userContentId: content.id,
          rating,
        });
      }

      if (review.trim()) {
        await updateReview({
          userContentId: content.id,
          review: review.trim(),
        });
      }

      onComplete();
    } catch (error) {
      console.error("기록 저장 실패:", error);
      alert("기록 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      <div className="flex flex-col md:flex-row h-full md:h-[500px]">
        
        {/* Left Column: Review Editor (Main) */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-white/10">
          {/* Editor/Preview Toggle Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2">
             <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                <button
                    onClick={() => setViewMode('EDIT')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'EDIT' 
                        ? 'bg-accent/20 text-accent shadow-sm' 
                        : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                    }`}
                >
                    <PenTool size={14} />
                    <span>작성</span>
                </button>
                <button
                    onClick={() => setViewMode('PREVIEW')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'PREVIEW' 
                        ? 'bg-accent/20 text-accent shadow-sm' 
                        : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                    }`}
                >
                    <Eye size={14} />
                    <span>미리보기</span>
                </button>
             </div>

             <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent font-bold text-sm transition-all disabled:opacity-50"
             >
                <Save size={16} />
                <span>저장</span>
             </button>
             
          </div>

          {/* Editor Content Area */}
          <div className="flex-1 flex flex-col bg-bg-main/30">
             {viewMode === 'EDIT' ? (
                <div className="flex flex-col h-full">
                    <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        placeholder="작품에서 어떤 영감을 받으셨나요?&#13;&#10;자유롭게 기록해보세요."
                        className="w-full flex-1 p-6 bg-transparent border-none outline-none resize-none text-text-primary leading-relaxed text-base font-sans placeholder:text-text-tertiary/30 placeholder:font-light"
                    />
                </div>
             ) : (
                <div className="w-full h-full p-6 overflow-y-auto">
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
        </div>

         {/* Right Column: Tabbed Info & Insight */}
        <div className="w-full md:w-[320px] flex flex-col bg-bg-secondary/30">
            {/* Right Column Tabs */}
            <div className="flex border-b border-white/10 bg-black/10">
                <button
                    onClick={() => setRightTab('INFO')}
                    className={`flex-1 py-3 px-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                        rightTab === 'INFO' 
                        ? 'text-accent border-accent bg-accent/5' 
                        : 'text-text-tertiary border-transparent hover:text-text-secondary'
                    }`}
                >
                    <Info className="w-3.5 h-3.5" />
                    <span>작품 정보</span>
                </button>
                <button
                    onClick={() => setRightTab('INSIGHT')}
                    className={`flex-1 py-3 px-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                        rightTab === 'INSIGHT' 
                        ? 'text-accent border-accent bg-accent/5' 
                        : 'text-text-tertiary border-transparent hover:text-text-secondary'
                    }`}
                >
                    <Search className="w-3.5 h-3.5" />
                    <span>외부 자료 탐색</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {rightTab === 'INFO' ? (
                    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                        {/* 1. Meta Info */}
                        <div className="p-6 flex flex-col items-center text-center border-b border-white/5">
                            <div className="w-28 aspect-[2/3] rounded-lg overflow-hidden shadow-xl mb-4 group relative bg-black/20">
                                {content.thumbnailUrl ? (
                                    <Image 
                                        src={content.thumbnailUrl} 
                                        alt={content.title}
                                        fill
                                        sizes="112px"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-text-tertiary">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-serif font-bold text-text-primary leading-tight mb-1 px-2 break-keep line-clamp-2">
                                {content.title}
                            </h3>
                            <p className="text-xs text-text-secondary line-clamp-1">
                                {content.creator}
                            </p>
                        </div>

                        {/* 2. Rating Area */}
                        <div className="p-6 flex flex-col items-center justify-center space-y-4">
                             <span className="text-[10px] font-medium text-text-tertiary tracking-widest uppercase">Your Rating</span>
                             <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleStarClick(star)}
                                        className="p-1 transition-all hover:scale-110 focus:outline-none"
                                    >
                                        <Star
                                            size={24}
                                            className={`${
                                                rating >= star 
                                                ? "text-accent fill-accent shadow-[0_0_12px_rgba(212,175,55,0.4)]" 
                                                : "text-text-tertiary/20"
                                            } transition-colors duration-200`}
                                            strokeWidth={1.5}
                                        />
                                    </button>
                                ))}
                             </div>
                             <div className="h-4 text-center">
                                {rating > 0 && <span className="text-accent font-bold text-lg">{rating.toFixed(1)}</span>}
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        <SearchHelper 
                            title={content.title} 
                            creator={content.creator} 
                            type={content.type} 
                            onSearchResult={onBlogSearch || (() => {})}
                        />
                    </div>
                )}
            </div>



        </div>
      </div>
    </div>
  );
}
