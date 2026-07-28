"use client";

import { useState, useEffect } from "react";
import { PenTool, FileText, Eye } from "lucide-react";
import MyReviewPanel from "../MyReviewPanel";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import { updateReview } from "@/actions/contents/updateReview";
import MyNotePanel from "../../user/detail/note/MyNotePanel";
import FeaturedWorkInfo from "./FeaturedWorkInfo";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import { useTranslations } from "next-intl";

import type { ScriptureContent } from "@/actions/scriptures";
import type { UserContentPublic } from "@/actions/contents/getUserContents";
import type { ContentType } from "@/types/database";
import type { CategoryId } from "@/constants/categories";
import type { QuickRecordTarget } from "@/contexts/QuickRecordContext";
import type { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

// 가로 스크롤 훅이 반환하는 마우스 이벤트 핸들러 묶음
export type HorizontalScrollEvents = ReturnType<typeof useHorizontalScroll>["events"];

// 보관함 밖(추천 목록·검색 결과)에서 선택한 콘텐츠
export interface PickedContentItem {
    id: string;
    type: ContentType;
    title: string;
    creator?: string | null;
    thumbnailUrl?: string | null;
    thumbnail?: string | null;
    thumbnail_url?: string | null;
}

// isWantItem이 true면 보관함 항목(UserContentPublic), false면 PickedContentItem을 전달한다
export type HomeItemClickHandler = (item: UserContentPublic | PickedContentItem, isWantItem: boolean) => void;

export interface SuggestionProps {
    suggestions: ScriptureContent[];
    categoryLabel?: string;
    isSwitchingCategory: boolean;
    localUnreviewedList: UserContentPublic[];
    allReviewedItems: UserContentPublic[];
    onItemClick: HomeItemClickHandler;
    onDelete: (id: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    events: HorizontalScrollEvents;
    isDragging: boolean;
}

export interface ArchiveProps {
    userId?: string;
    unreviewedList: UserContentPublic[];
    allReviewedItems: UserContentPublic[];
    onItemClick: HomeItemClickHandler;
    onDelete: (id: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    events: HorizontalScrollEvents;
    isDragging: boolean;
}

interface HomeEditorAreaProps {
    targetContent: QuickRecordTarget | null;
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
    const t = useTranslations("quickRecord.home");
    const tEditor = useTranslations("quickRecord.editor");
    const tSection = useTranslations("quickRecord.section");
    const [rating, setRating] = useState<number>(targetContent?.initialRating || 0);
    const [review, setReview] = useState(targetContent?.initialReview || "");
    const [presets, setPresets] = useState<string[]>(targetContent?.initialPresets || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNoteDirty, setIsNoteDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
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
                alert(t("savedLocally"));
                onEditorComplete();
            } catch (e) {
                console.error("로컬 저장 실패", e);
                alert(t("saveFailed"));
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
            alert(tSection("saveError"));
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
                <DecorativeLabel label={t("selectedContent")} />
                <FeaturedWorkInfo 
                    targetContent={targetContent} 
                    suggestionProps={suggestionProps}
                    archiveProps={archiveProps}
                />
            </div>

            {/* 2. Unified Editor Area (Review & Note) */}
            <div className="flex flex-col gap-4">
                <DecorativeLabel label={t("myRecord")} />
                
                {/* Unified Tab Header */}
                <div className="flex items-center justify-between pb-1">
                    {/* Main Tabs */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setActiveMainTab('REVIEW')}
                            className={`pb-2 -mb-2.5 transition-all text-lg font-sans font-bold border-b-2 ${
                                activeMainTab === 'REVIEW'
                                ? 'text-accent border-accent'
                                : ' border-transparent hover:text-text-secondary'
                            }`}
                        >
                            {t("review")}
                        </button>
                        <button
                            onClick={() => setActiveMainTab('NOTE')}
                            className={`pb-2 -mb-2.5 transition-all text-lg font-sans font-bold border-b-2 ${
                                activeMainTab === 'NOTE'
                                ? 'text-accent border-accent'
                                : ' border-transparent hover:text-text-secondary'
                            }`}
                        >
                            {t("note")}
                        </button>
                    </div>

                    {/* Dynamic Controls based on Active Tab */}
                    <div className="flex items-center gap-4">
                        {activeMainTab === 'REVIEW' && (
                            <div className="flex bg-black/20 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('EDIT')}
                                    className={`flex items-center justify-center p-2 rounded-md transition-all ${
                                        activeTab === 'EDIT'
                                        ? 'bg-accent/20 text-accent shadow-sm'
                                        : ' hover:text-text-secondary'
                                    }`}
                                    title={tEditor("writeMode")}
                                >
                                    <PenTool size={14} />
                                </button>
                                <button
                                    onClick={() => setActiveTab('PREVIEW')}
                                    className={`flex items-center justify-center p-2 rounded-md transition-all ${
                                        activeTab === 'PREVIEW'
                                        ? 'bg-accent/20 text-accent shadow-sm'
                                        : ' hover:text-text-secondary'
                                    }`}
                                    title={tEditor("readMode")}
                                >
                                    <Eye size={14} />
                                </button>
                            </div>
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
                                contentCreator={targetContent.creator}
                                isRecommendation={targetContent.isRecommendation}
                                hideHeader={true}
                                // 기존 런타임은 대문자 ContentType을 그대로 넘긴다(CategoryId 소문자와 불일치, 카테고리 프리셋이 빈 배열로 동작). 동작 보존을 위해 캐스트 유지
                                contentType={targetContent.type as string as CategoryId}
                            />
                        </div>
                    ) : (
                        <MyNotePanel
                            contentId={realContentId}
                            onDirtyChange={setIsNoteDirty}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
