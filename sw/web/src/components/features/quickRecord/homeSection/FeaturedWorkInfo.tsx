import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BookOpen, MessageSquare, Award, Search, ExternalLink, Loader2, List } from "lucide-react";
import { getContentDetail, type ContentDetailData } from "@/actions/contents/getContentDetail";
import { type QuickRecordTarget } from "@/contexts/QuickRecordContext";
import type { ContentMetadata } from "@/types/content";
import type { CategoryId } from "@/constants/categories";
import type { SuggestionProps, ArchiveProps } from "./HomeEditorArea";
import FeaturedWorkModal, { type ModalType, type SelectionTab } from "./FeaturedWorkModal";
import FeaturedWorkMetadata from "./FeaturedWorkMetadata";

import ClassicalBox from "@/components/ui/ClassicalBox";
import { useTranslations } from "next-intl";

interface FeaturedWorkInfoProps {
    targetContent: QuickRecordTarget;
    suggestionProps: SuggestionProps;
    archiveProps: ArchiveProps;
}

export default function FeaturedWorkInfo({ targetContent, suggestionProps, archiveProps }: FeaturedWorkInfoProps) {
    const t = useTranslations("quickRecord.home");
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [selectionTab, setSelectionTab] = useState<SelectionTab>('SUGGESTION');

    const [detailData, setDetailData] = useState<ContentDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const metadata = detailData?.content.metadata as unknown as ContentMetadata | undefined;

    // 상세 정보 로드 (InfoPanel 로직 복사)
    useEffect(() => {
        const loadDetail = async () => {
            setIsLoading(true);
            try {
                // ContentType -> CategoryId 매핑
                let categoryId = 'book'; // default
                switch (targetContent.type) {
                    case 'BOOK': categoryId = 'book'; break;
                    case 'VIDEO': categoryId = 'movie'; break; // Default to movie for now
                    case 'GAME': categoryId = 'game'; break;
                    case 'MUSIC': categoryId = 'music'; break;
                    default: categoryId = 'book';
                }

                // VIDEO일 때 'movie'는 CategoryId에 없는 값이다(외부 API 폴백 경로에서 미매칭). 동작 보존을 위해 캐스트 유지
                const data = await getContentDetail(targetContent.contentId || targetContent.id, categoryId as CategoryId);
                setDetailData(data);
            } catch (e) {
                console.error("상세 정보 로드 실패", e);
            } finally {
                setIsLoading(false);
            }
        };

        if (targetContent.contentId || targetContent.id) {
            loadDetail();
        }
    }, [targetContent.contentId, targetContent.id, targetContent.type]);

    // 카테고리 매핑 (링크용)
    const getLinkCategory = () => {
        switch (targetContent.type) {
            case 'BOOK': return 'book';
            case 'VIDEO': return 'movie'; // 임시
            case 'GAME': return 'game';
            case 'MUSIC': return 'music';
            default: return 'book';
        }
    };
    const contentLink = `/content/${targetContent.contentId || targetContent.id}?category=${getLinkCategory()}`;

    return (
        <div className="w-fit mx-auto mb-8">
            <ClassicalBox className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-[2px]">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start p-6">
                     {/* Thumbnail (Link to Detail) */}
                    {/* Left Column: Thumbnail & Select Button */}
                    <div className="flex flex-col gap-3 shrink-0 items-center">
                        <Link
                            href={contentLink}
                            target="_blank"
                            className="w-48 aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 group cursor-pointer block"
                        >
                            {targetContent.thumbnailUrl ? (
                                <Image
                                    src={targetContent.thumbnailUrl}
                                    alt={targetContent.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center text-text-tertiary">
                                    No Image
                                </div>
                            )}
                             <div className="absolute inset-0 ring-1 ring-inset ring-black/20 group-hover:ring-accent/50 transition-all" />

                             {/* Hover Effect Hint */}
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                                <ExternalLink size={24} className="text-white drop-shadow-md" />
                             </div>
                        </Link>

                        {/* Select Content Button */}
                        <button
                            onClick={() => setActiveModal('SELECT_CONTENT')}
                            className="w-48 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/5 hover:border-accent/30 flex items-center justify-center gap-2 group transition-all"
                        >
                            <List size={16} className="text-text-tertiary group-hover:text-accent transition-colors" />
                            <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary">{t("selectContent")}</span>
                        </button>
                    </div>

                    {/* Info & Actions */}
                    <div className="flex-1 w-full flex flex-col items-center text-center space-y-6">
                        <div className="space-y-4 w-full flex flex-col items-center">
                            {/* Dynamic Title Size */}
                            <h2 className={`${
                                targetContent.title.length > 20 ? 'text-xl md:text-2xl' :
                                targetContent.title.length > 10 ? 'text-2xl md:text-3xl' :
                                'text-3xl md:text-4xl'
                            } font-serif font-bold text-text-primary leading-tight break-keep mt-2`}>
                                {targetContent.title}
                            </h2>

                             <div className="inline-flex px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-bold tracking-wider mb-2">
                                {targetContent.type}
                            </div>

                            {/* Metadata (Icon + Value layout) */}
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-text-tertiary justify-center">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>{t("loadingInfo")}</span>
                                </div>
                            ) : (
                                <FeaturedWorkMetadata
                                    targetContent={targetContent}
                                    metadata={metadata}
                                    releaseDate={detailData?.content?.releaseDate}
                                />
                            )}
                        </div>

                        {/* Action Buttons Grid */}
                        <div className="grid grid-cols-2 gap-2 w-full md:w-fit pt-4">
                            <button
                                onClick={() => setActiveModal('DETAIL')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <BookOpen size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">{t("detailInfo")}</span>
                            </button>

                             <button
                                onClick={() => setActiveModal('REVIEW_CELEB')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <Award size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">{t("celebReview")}</span>
                            </button>

                             <button
                                onClick={() => setActiveModal('REVIEW_NORMAL')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <MessageSquare size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">{t("normalReview")}</span>
                            </button>

                             <button
                                onClick={() => setActiveModal('EXTERNAL')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <Search size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">{t("externalSearchBtn")}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </ClassicalBox>

            {/* Modals */}
            {activeModal && (
                <FeaturedWorkModal
                    type={activeModal}
                    onClose={() => setActiveModal(null)}
                    title={
                        activeModal === 'DETAIL' ? t("modalDetailTitle") :
                        activeModal === 'REVIEW_CELEB' ? t("modalCelebTitle") :
                        activeModal === 'REVIEW_NORMAL' ? t("modalNormalTitle") :
                        activeModal === 'SELECT_CONTENT' ? t("modalSelectTitle") :
                        t("modalExternalTitle")
                    }
                    icon={
                        activeModal === 'DETAIL' ? BookOpen :
                        activeModal === 'REVIEW_CELEB' ? Award :
                        activeModal === 'REVIEW_NORMAL' ? MessageSquare :
                        activeModal === 'SELECT_CONTENT' ? List :
                        Search
                    }
                    targetContent={targetContent}
                    suggestionProps={suggestionProps}
                    archiveProps={archiveProps}
                    selectionTab={selectionTab}
                    setSelectionTab={setSelectionTab}
                />
            )}
        </div>
    );
}
