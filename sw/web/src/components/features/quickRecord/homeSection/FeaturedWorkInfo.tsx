import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Info, BookOpen, MessageSquare, Award, Search, X, User, Calendar, Building2, Film, Users, ExternalLink, Loader2, Music, Disc, Gamepad2, Monitor, Briefcase, Code } from "lucide-react";
import { getContentDetail, type ContentDetailData } from "@/actions/contents/getContentDetail";
import InfoPanel from "../InfoPanel";
import ExternalResourceSearch, { type ExternalResourceSearchHandle } from "../ExternalResourceSearch";
import { type QuickRecordTarget } from "@/contexts/QuickRecordContext";
import { useRef } from "react";
import type { ContentMetadata } from "@/types/content";
import { HomeSuggestions } from "./HomeSuggestions";
import { HomeArchiveArea } from "./HomeArchiveArea";
import type { SuggestionProps, ArchiveProps } from "./HomeEditorArea";
import { List } from "lucide-react";

import ClassicalBox from "@/components/ui/ClassicalBox";

type ModalType = 'DETAIL' | 'REVIEW_CELEB' | 'REVIEW_NORMAL' | 'EXTERNAL' | 'SELECT_CONTENT' | null;

interface FeaturedWorkInfoProps {
    targetContent: QuickRecordTarget;
    suggestionProps: SuggestionProps;
    archiveProps: ArchiveProps;
}

export default function FeaturedWorkInfo({ targetContent, suggestionProps, archiveProps }: FeaturedWorkInfoProps) {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [selectionTab, setSelectionTab] = useState<'SUGGESTION' | 'ARCHIVE'>('SUGGESTION');
    const searchRef = useRef<ExternalResourceSearchHandle>(null);

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
                    case 'CERTIFICATE': categoryId = 'certificate'; break;
                    default: categoryId = 'book';
                }
                
                const data = await getContentDetail(targetContent.contentId || targetContent.id, categoryId as any);
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

    const ModalContainer = ({ type, onClose, title, icon: Icon }: { type: ModalType, onClose: () => void, title: string, icon: any }) => {
        if (!type) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                <div 
                    className="w-full max-w-4xl h-[80vh] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                        <h3 className="text-lg font-serif font-bold text-text-primary flex items-center gap-2">
                            <Icon size={20} className="text-accent" />
                            {title}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-tertiary hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-hidden bg-bg-secondary/30 relative">
                        {type === 'EXTERNAL' ? (
                            <div className="bg-bg-main/30 h-full overflow-y-auto custom-scrollbar p-6">
                                <ExternalResourceSearch 
                                    ref={searchRef}
                                    title={targetContent.title}
                                    creator={targetContent.creator}
                                    type={targetContent.type}
                                    className="border-0 shadow-none rounded-none bg-transparent"
                                    hideHeader={true}
                                />
                            </div>
                        ) : type === 'SELECT_CONTENT' ? (
                            <div className="flex flex-col h-full bg-bg-main/30">
                                {/* Tabs */}
                                <div className="flex border-b border-white/10 shrink-0">
                                    <button 
                                        onClick={() => setSelectionTab('SUGGESTION')}
                                        className={`flex-1 py-4 text-sm font-bold transition-all ${selectionTab === 'SUGGESTION' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-tertiary hover:text-text-primary'}`}
                                    >
                                        셀럽들의 추천
                                    </button>
                                    <button 
                                        onClick={() => setSelectionTab('ARCHIVE')}
                                        className={`flex-1 py-4 text-sm font-bold transition-all ${selectionTab === 'ARCHIVE' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-tertiary hover:text-text-primary'}`}
                                    >
                                        보관함
                                    </button>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                                    {selectionTab === 'SUGGESTION' ? (
                                        <HomeSuggestions {...suggestionProps} />
                                    ) : (
                                        <HomeArchiveArea {...archiveProps} />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <InfoPanel 
                                content={{
                                    id: targetContent.id,
                                    contentId: targetContent.contentId || targetContent.id,
                                    title: targetContent.title,
                                    type: targetContent.type,
                                    thumbnailUrl: targetContent.thumbnailUrl,
                                    creator: targetContent.creator
                                }}
                                initialTab={
                                    type === 'DETAIL' ? 'DETAIL' : 
                                    type === 'REVIEW_CELEB' ? 'REVIEW_CELEB' : 
                                    'REVIEW_NORMAL'
                                }
                                hideTabs={true}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

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
                            <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary">기록할 컨텐츠 선택</span>
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
                            
                            <div className="flex flex-col gap-2 items-center text-sm">
                                <p className="text-lg text-text-secondary flex items-center gap-2">
                                    <User size={18} className="text-accent/70" />
                                    {targetContent.creator || 'Unknown Creator'}
                                </p>

                                {/* Additional Metadata (Restored) */}
                                {isLoading ? (
                                    <div className="flex items-center gap-2 text-text-tertiary">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>정보 로딩 중...</span>
                                    </div>
                                ) : (
                                    <div className="text-text-tertiary space-y-1">
                                         {/* 출판사 (BOOK) */}
                                        {targetContent.type === 'BOOK' && metadata?.publisher && (
                                            <p className="flex items-center gap-2 justify-center">
                                                <Building2 size={14} className="shrink-0 opacity-70" />
                                                <span>{metadata.publisher}</span>
                                            </p>
                                        )}
                                        
                                        {/* 감독 (VIDEO) */}
                                        {targetContent.type === 'VIDEO' && metadata?.director && (
                                            <p className="flex items-center gap-2 justify-center">
                                                <Film size={14} className="shrink-0 opacity-70" />
                                                <span>{metadata.director}</span>
                                            </p>
                                        )}

                                        {/* 출연진 (VIDEO) - 첫 번째만 */}
                                        {targetContent.type === 'VIDEO' && !metadata?.director && metadata?.cast?.[0] && (
                                            <p className="flex items-center gap-2 justify-center">
                                                <Users size={14} className="shrink-0 opacity-70" />
                                                <span>{metadata.cast[0].name}</span>
                                            </p>
                                        )}

                                        {/* 출시일 / 출간일 */}
                                        {(detailData?.content?.releaseDate || metadata?.publishDate) && (
                                            <p className="flex items-center gap-2 justify-center">
                                                <Calendar size={14} className="shrink-0 opacity-70" />
                                                <span>{detailData?.content?.releaseDate || metadata?.publishDate}</span>
                                            </p>
                                        )}

                                        {/* MUSIC */}
                                        {targetContent.type === 'MUSIC' && (
                                            <>
                                                {metadata?.albumType && (
                                                    <p className="flex items-center gap-2 justify-center">
                                                        <Disc size={14} className="shrink-0 opacity-70" />
                                                        <span className="capitalize">{metadata.albumType}</span>
                                                    </p>
                                                )}
                                                {metadata?.totalTracks && (
                                                    <p className="flex items-center gap-2 justify-center">
                                                        <Music size={14} className="shrink-0 opacity-70" />
                                                        <span>{metadata.totalTracks} Tracks</span>
                                                    </p>
                                                )}
                                                {metadata?.label && (
                                                    <p className="flex items-center gap-2 justify-center">
                                                        <Building2 size={14} className="shrink-0 opacity-70" />
                                                        <span>{metadata.label}</span>
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {/* GAME */}
                                        {targetContent.type === 'GAME' && (
                                            <>
                                                {metadata?.developer && (
                                                    <p className="flex items-center gap-2 justify-center">
                                                        <Code size={14} className="shrink-0 opacity-70" />
                                                        <span>{metadata.developer}</span>
                                                    </p>
                                                )}
                                                {metadata?.platforms && metadata.platforms.length > 0 && (
                                                    <p className="flex items-center gap-2 justify-center">
                                                        <Gamepad2 size={14} className="shrink-0 opacity-70" />
                                                        <span>{metadata.platforms.slice(0, 3).join(', ')}</span>
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {/* CERTIFICATE */}
                                        {targetContent.type === 'CERTIFICATE' && (
                                            <>
                                                {metadata?.qualificationType && (
                                                    <p className="flex items-center gap-2 justify-center">
                                                        <Award size={14} className="shrink-0 opacity-70" />
                                                        <span>{metadata.qualificationType}</span>
                                                    </p>
                                                )}
                                                {(metadata?.majorField || metadata?.series) && (
                                                    <p className="flex items-center gap-2 justify-center">
                                                        <Briefcase size={14} className="shrink-0 opacity-70" />
                                                        <span>
                                                            {[metadata.majorField, metadata.series].filter(Boolean).join(' / ')}
                                                        </span>
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons Grid */}
                        <div className="grid grid-cols-2 gap-2 w-full md:w-fit pt-4">
                            <button 
                                onClick={() => setActiveModal('DETAIL')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <BookOpen size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">상세 정보</span>
                            </button>

                             <button 
                                onClick={() => setActiveModal('REVIEW_CELEB')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <Award size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">셀럽 리뷰</span>
                            </button>

                             <button 
                                onClick={() => setActiveModal('REVIEW_NORMAL')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <MessageSquare size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">일반 리뷰</span>
                            </button>

                             <button 
                                onClick={() => setActiveModal('EXTERNAL')}
                                className="flex flex-row items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group"
                            >
                                <Search size={18} className="text-text-tertiary group-hover:text-accent transition-colors" />
                                <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary">외부 탐색</span>
                            </button>
                        </div>
                    </div>
                </div>
            </ClassicalBox>

            {/* Modals */}
            {activeModal && (
                <ModalContainer 
                    type={activeModal} 
                    onClose={() => setActiveModal(null)}
                    title={
                        activeModal === 'DETAIL' ? '작품 상세 정보' :
                        activeModal === 'REVIEW_CELEB' ? '셀럽들의 시선' :
                        activeModal === 'REVIEW_NORMAL' ? '독자들의 리뷰' :
                        activeModal === 'SELECT_CONTENT' ? '기록할 컨텐츠 선택' :
                        '외부 자료 탐색'
                    }
                    icon={
                        activeModal === 'DETAIL' ? BookOpen :
                        activeModal === 'REVIEW_CELEB' ? Award :
                        activeModal === 'REVIEW_NORMAL' ? MessageSquare :
                        activeModal === 'SELECT_CONTENT' ? List :
                        Search
                    }
                />
            )}
        </div>
    );
}
