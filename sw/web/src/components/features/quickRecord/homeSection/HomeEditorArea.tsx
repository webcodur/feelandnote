"use client";

import { useState, useEffect } from "react";
import { Search, X, FileText, ExternalLink, Info as InfoIcon, LayoutList, Save } from "lucide-react";
import InfoPanel from "../InfoPanel";
import MyReviewPanel from "../MyReviewPanel";
import ExternalResourceSearch from "../ExternalResourceSearch";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import { updateReview } from "@/actions/contents/updateReview";
import MyNotePanel from "../../user/detail/note/MyNotePanel";

interface HomeEditorAreaProps {
    targetContent: any; // QuickRecordContext targetContent
    onEditorComplete: () => void;
    editorRef: React.RefObject<HTMLDivElement | null>;
}

export function HomeEditorArea({
    targetContent,
    onEditorComplete,
    editorRef
}: HomeEditorAreaProps) {
    const [rating, setRating] = useState<number>(targetContent?.initialRating || 0);
    const [review, setReview] = useState(targetContent?.initialReview || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNoteDirty, setIsNoteDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
    const [activeNoteTab, setActiveNoteTab] = useState<'memo' | 'sections'>('memo');

    // targetContent 변경 시 초기화
    useEffect(() => {
        if (targetContent) {
            setRating(targetContent.initialRating || 0);
            setReview(targetContent.initialReview || "");
            setIsNoteDirty(false);
            setActiveTab('EDIT');
            setActiveNoteTab('memo');
        }
    }, [targetContent?.id]);

    if (!targetContent) return <div ref={editorRef} />;

    const handleSubmit = async () => {
        if (!targetContent.id) return;
        setIsSubmitting(true);

        try {
            if (rating !== (targetContent.initialRating || 0)) {
                await updateUserContentRating({
                    userContentId: targetContent.id,
                    rating,
                });
            }

            if (review !== (targetContent.initialReview || "")) {
                await updateReview({
                    userContentId: targetContent.id,
                    review: review.trim(),
                });
            }

            onEditorComplete();
        } catch (error) {
            console.error("기록 저장 실패:", error);
            alert("기록 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const realContentId = targetContent.contentId || targetContent.id;

    return (
        <div ref={editorRef} className="w-full mt-6 scroll-mt-28 flex flex-col gap-8">
            {/* 정보 섹션 (1열: 정보, 2열: 외부 검색) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* 1열: 작품 정보 */}
                <div className="bg-bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl h-auto lg:h-[550px] flex flex-col">
                    <div className="px-4 py-2 border-b border-white/5 bg-white/2 flex items-center justify-between shadow-sm shrink-0 min-h-[52px]">
                        <div className="flex-1" /> {/* Left spacer */}
                        <div className="flex-none flex items-center justify-center gap-2 text-white whitespace-nowrap">
                            <InfoIcon size={16} className="text-accent" />
                            <span className="text-sm font-bold uppercase tracking-wider">현재 선택된 작품 정보</span>
                        </div>
                        <div className="flex-1" /> {/* Right spacer */}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <InfoPanel
                            content={{
                                id: targetContent.id,
                                contentId: realContentId,
                                title: targetContent.title,
                                type: targetContent.type,
                                thumbnailUrl: targetContent.thumbnailUrl,
                                creator: targetContent.creator
                            }}
                        />
                    </div>
                </div>

                {/* 2열: 외부 자료 검색/결과 */}
                <ExternalResourceSearch 
                    title={targetContent.title}
                    creator={targetContent.creator}
                    type={targetContent.type}
                    className="h-auto lg:h-[550px]"
                />
            </div>

            {/* 에디터 및 내 노트 섹션 (PC에서 2단 분할) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* 1열: 리뷰 에디터 */}
                <div className="bg-bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl h-auto min-h-[400px] lg:h-[600px] flex flex-col">
                    <MyReviewPanel
                        review={review}
                        setReview={setReview}
                        rating={rating}
                        setRating={setRating}
                        initialReview={targetContent.initialReview || ""}
                        initialRating={targetContent.initialRating || 0}
                        viewMode={activeTab}
                        setViewMode={setActiveTab}
                        onSave={handleSubmit}
                        isSubmitting={isSubmitting}
                        contentTitle={targetContent.title}
                        isRecommendation={targetContent.isRecommendation}
                    />
                </div>

                {/* 2열: 내 노트 */}
                <div className="bg-bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl h-auto lg:h-[600px] flex flex-col">
                    <div className="px-4 py-2 border-b border-white/5 bg-white/2 flex items-center justify-between shadow-sm shrink-0 min-h-[52px]">
                        {/* 좌측: 탭 */}
                        <div className="flex-1 flex items-center">
                            <div className="flex bg-black/20 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveNoteTab('memo')}
                                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                                        activeNoteTab === 'memo' 
                                        ? 'bg-accent/20 text-accent shadow-sm' 
                                        : 'text-text-tertiary hover:text-text-secondary'
                                    }`}
                                >
                                    자유
                                </button>
                                <button
                                    onClick={() => setActiveNoteTab('sections')}
                                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                                        activeNoteTab === 'sections' 
                                        ? 'bg-accent/20 text-accent shadow-sm' 
                                        : 'text-text-tertiary hover:text-text-secondary'
                                    }`}
                                >
                                    구획
                                </button>
                            </div>
                        </div>

                        {/* 중앙: 타이틀 */}
                        <div className="flex-none flex items-center justify-center gap-2 text-white whitespace-nowrap px-4">
                            <FileText size={16} className="text-accent" />
                            <span className="text-sm font-bold uppercase tracking-wider">내 노트</span>
                        </div>

                        {/* 우측: 저장 버튼 */}
                        <div className="flex-1 flex items-center justify-end">
                            <button 
                                onClick={() => {
                                    // NoteEditor는 현재 자동 저장 로직을 가짐 (NoteEditor.tsx)
                                }}
                                disabled={!isNoteDirty}
                                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                                    isNoteDirty 
                                    ? 'bg-accent/15 hover:bg-accent/25 text-accent shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                                    : 'bg-white/5 text-text-tertiary/40 cursor-not-allowed'
                                }`}
                                title="저장"
                            >
                                <Save size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        <MyNotePanel 
                            contentId={realContentId} 
                            activeTab={activeNoteTab} 
                            onDirtyChange={setIsNoteDirty}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
