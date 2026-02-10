"use client";

import { useState, useEffect } from "react";
import { Save, PenTool, FileText } from "lucide-react";
import MyReviewPanel from "../MyReviewPanel";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import { updateReview } from "@/actions/contents/updateReview";
import MyNotePanel from "../../user/detail/note/MyNotePanel";
import { Loader2 } from "lucide-react";
import FeaturedWorkInfo from "./FeaturedWorkInfo";
import DecorativeLabel from "@/components/ui/DecorativeLabel";

import type { ScriptureContent } from "@/actions/scriptures";
import type { UserContentPublic } from "@/actions/contents/getUserContents";

export interface SuggestionProps {
    suggestions: ScriptureContent[];
    categoryLabel?: string;
    isSwitchingCategory: boolean;
    localUnreviewedList: UserContentPublic[];
    allReviewedItems: UserContentPublic[];
    onItemClick: (item: any, isWantItem: boolean) => void;
    onDelete: (id: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    events: any;
    isDragging: boolean;
}

export interface ArchiveProps {
    userId?: string;
    unreviewedList: UserContentPublic[];
    allReviewedItems: UserContentPublic[];
    onItemClick: (item: any, isWantItem: boolean) => void;
    onDelete: (id: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    events: any;
    isDragging: boolean;
}

interface HomeEditorAreaProps {
    targetContent: any; // QuickRecordContext targetContent
    onEditorComplete: () => void;
    editorRef: React.RefObject<HTMLDivElement | null>;
    suggestionProps: SuggestionProps;
    archiveProps: ArchiveProps;
}

export function HomeEditorArea({
    targetContent,
    onEditorComplete,
    editorRef,
    suggestionProps,
    archiveProps
}: HomeEditorAreaProps) {
    const [rating, setRating] = useState<number>(targetContent?.initialRating || 0);
    const [review, setReview] = useState(targetContent?.initialReview || "");
    const [presets, setPresets] = useState<string[]>(targetContent?.initialPresets || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNoteDirty, setIsNoteDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
    const [activeNoteTab, setActiveNoteTab] = useState<'memo' | 'sections'>('memo');
    const [activeMainTab, setActiveMainTab] = useState<'REVIEW' | 'NOTE'>('REVIEW');

    // 프리셋 비교: 순서 무관하게 내용이 같은지 확인
    const arePresetsEqual = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false;
        const setA = new Set(a);
        return b.every(item => setA.has(item));
    };

    // targetContent 변경 시 초기화
    useEffect(() => {
        if (targetContent) {
            setRating(targetContent.initialRating || 0);
            setReview(targetContent.initialReview || "");
            setPresets(targetContent.initialPresets || []);
            setIsNoteDirty(false);
            setActiveTab('EDIT');
            setActiveNoteTab('memo');
        }
    }, [targetContent?.id]);

    if (!targetContent) return <div ref={editorRef} />;

    const handleSubmit = async () => {
        if (!targetContent.id) return;
        setIsSubmitting(true);

        // Guest Handling
        if (!archiveProps.userId) {
            try {
                const guestData = {
                    contentId: targetContent.contentId || targetContent.id.replace('guest-', ''),
                    rating,
                    review: review.trim(),
                    presets,
                    type: targetContent.type,
                    title: targetContent.title,
                    creator: targetContent.creator,
                    thumbnailUrl: targetContent.thumbnailUrl,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('guest_content_pending', JSON.stringify(guestData));
                alert("기기에 저장되었습니다. 로그인 후 등록할 수 있습니다.");
                onEditorComplete();
            } catch (e) {
                console.error("로컬 저장 실패", e);
                alert("저장에 실패했습니다.");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        try {
            if (rating !== (targetContent.initialRating || 0)) {
                await updateUserContentRating({
                    userContentId: targetContent.id,
                    rating,
                });
            }

            const initialReview = targetContent.initialReview || "";
            const initialPresets = targetContent.initialPresets || [];

            if (review !== initialReview || !arePresetsEqual(presets, initialPresets)) {
                await updateReview({
                    userContentId: targetContent.id,
                    review: review.trim(),
                    reviewPresets: presets,
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
    const isDirty = (review !== (targetContent.initialReview || "")) || (rating !== (targetContent.initialRating || 0)) || !arePresetsEqual(presets, targetContent.initialPresets || []);

    return (
        <div ref={editorRef} className="w-full mt-6 scroll-mt-28 flex flex-col gap-8">
            {/* 1. Featured Work Info */}
            <div className="flex flex-col gap-4">
                <DecorativeLabel label="선택한 컨텐츠" />
                <FeaturedWorkInfo 
                    targetContent={targetContent} 
                    suggestionProps={suggestionProps}
                    archiveProps={archiveProps}
                />
            </div>

            {/* 2. Unified Editor Area (Review & Note) */}
            <div className="flex flex-col gap-4">
                <DecorativeLabel label="내 기록" />
                
                {/* Unified Tab Header */}
                <div className="flex items-center justify-between pb-1">
                    {/* Main Tabs */}
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setActiveMainTab('REVIEW')}
                            className={`flex items-center gap-2 pb-2 -mb-2.5 transition-all text-lg font-sans font-bold border-b-2 ${
                                activeMainTab === 'REVIEW'
                                ? 'text-accent border-accent'
                                : 'text-text-tertiary border-transparent hover:text-text-secondary'
                            }`}
                        >
                            <PenTool size={20} />
                            리뷰
                        </button>
                        <button 
                            onClick={() => setActiveMainTab('NOTE')}
                            className={`flex items-center gap-2 pb-2 -mb-2.5 transition-all text-lg font-sans font-bold border-b-2 ${
                                activeMainTab === 'NOTE'
                                ? 'text-accent border-accent'
                                : 'text-text-tertiary border-transparent hover:text-text-secondary'
                            }`}
                        >
                            <FileText size={20} />
                            노트
                        </button>
                    </div>

                    {/* Dynamic Controls based on Active Tab */}
                    <div className="flex items-center gap-4">
                        {activeMainTab === 'REVIEW' ? (
                            <>
                                {/* Review Tabs */}
                                <div className="flex bg-black/20 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveTab('EDIT')}
                                        className={`px-3.5 py-2 rounded-md text-xs font-sans font-bold transition-all ${
                                            activeTab === 'EDIT' 
                                            ? 'bg-accent/20 text-accent shadow-sm' 
                                            : 'text-text-tertiary hover:text-text-secondary'
                                        }`}
                                    >
                                        쓰기
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('PREVIEW')}
                                        className={`px-3.5 py-2 rounded-md text-xs font-sans font-bold transition-all ${
                                            activeTab === 'PREVIEW' 
                                            ? 'bg-accent/20 text-accent shadow-sm' 
                                            : 'text-text-tertiary hover:text-text-secondary'
                                        }`}
                                    >
                                        읽기
                                    </button>
                                </div>
                                
                                {/* Review Save Button */}
                                <button 
                                    onClick={handleSubmit}
                                    disabled={!isDirty || isSubmitting}
                                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                                        isDirty 
                                        ? 'bg-accent/15 hover:bg-accent/25 text-accent shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                                        : 'bg-white/5 text-text-tertiary/40 cursor-not-allowed'
                                    }`}
                                    title="저장"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                </button>
                            </>
                        ) : (
                            <>
                                {/* Note Tabs */}
                                <div className="flex bg-black/20 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveNoteTab('memo')}
                                        className={`px-3.5 py-2 rounded-md text-xs font-sans font-bold transition-all ${
                                            activeNoteTab === 'memo' 
                                            ? 'bg-accent/20 text-accent shadow-sm' 
                                            : 'text-text-tertiary hover:text-text-secondary'
                                        }`}
                                    >
                                        자유
                                    </button>
                                    <button
                                        onClick={() => setActiveNoteTab('sections')}
                                        className={`px-3.5 py-2 rounded-md text-xs font-sans font-bold transition-all ${
                                            activeNoteTab === 'sections' 
                                            ? 'bg-accent/20 text-accent shadow-sm' 
                                            : 'text-text-tertiary hover:text-text-secondary'
                                        }`}
                                    >
                                        구획
                                    </button>
                                </div>

                                {/* Note Save Button (Indicator) */}
                                <button 
                                    disabled={!isNoteDirty}
                                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                                        isNoteDirty 
                                        ? 'bg-accent/15 hover:bg-accent/25 text-accent shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                                        : 'bg-white/5 text-text-tertiary/40 cursor-not-allowed'
                                    }`}
                                    title="저장 (자동 저장됨)"
                                >
                                    <Save size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-bg-card/10 rounded-2xl border border-white/5 overflow-hidden min-h-[500px]">
                    {activeMainTab === 'REVIEW' ? (
                        <div className="h-[500px]">
                             <MyReviewPanel
                                review={review}
                                setReview={setReview}
                                rating={rating}
                                setRating={setRating}
                                presets={presets}
                                setPresets={setPresets}
                                initialReview={targetContent.initialReview || ""}
                                initialRating={targetContent.initialRating || 0}
                                initialPresets={targetContent.initialPresets || []}
                                viewMode={activeTab}
                                setViewMode={setActiveTab}
                                onSave={handleSubmit}
                                isSubmitting={isSubmitting}
                                contentTitle={targetContent.title}
                                isRecommendation={targetContent.isRecommendation}
                                hideHeader={true}
                                contentType={targetContent.type}
                            />
                        </div>
                    ) : (
                        <MyNotePanel 
                            contentId={realContentId} 
                            activeTab={activeNoteTab} 
                            onDirtyChange={setIsNoteDirty}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
