"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Info, BookOpen, ExternalLink, Loader2, MessageSquare, User, Calendar, Award, Building2, Film, Users } from "lucide-react";
import { getContentDetail, type ContentDetailData } from "@/actions/contents/getContentDetail";
import { Avatar, FormattedText } from "@/components/ui";
import StarRatingInput from "@/components/ui/StarRatingInput";

import MediaEmbed from "@/components/features/content/MediaEmbed";
import ReviewCard from "@/components/features/content/ReviewCard";
import type { ReviewFeedItem } from "@/actions/contents/getReviewFeed";

import type { ContentMetadata } from "@/types/content";

// ... existing imports

// ... existing code


type InfoTab = 'BASIC' | 'DETAIL' | 'REVIEW_CELEB' | 'REVIEW_NORMAL';

interface InfoPanelProps {
  content: {
    id: string; // user_contents.id가 아님. 실제 content.id를 받아야 함 (또는 둘 다)
    contentId: string; // items logic에서 contentId 분리 필요
    title: string;
    type: string;
    thumbnailUrl?: string | null;
    creator?: string | null;
  };
}

export default function InfoPanel({
  content,
}: InfoPanelProps) {
  const [activeTab, setActiveTab] = useState<InfoTab>('BASIC');
  const [detailData, setDetailData] = useState<ContentDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const metadata = detailData?.content.metadata as unknown as ContentMetadata | undefined;

  // 데이터 로딩
  useEffect(() => {
    // 상세 정보 로드
    const loadDetail = async () => {
        setIsLoading(true);
        try {
            // ContentType -> CategoryId 매핑
            let categoryId = 'book'; // default
            switch (content.type) {
                case 'BOOK': categoryId = 'book'; break;
                // VIDEO의 경우 보통 'movie' 또는 'drama' 등으로 매핑되어야 함. 
                // api logic 상 video -> movie/video 둘 다 처리 가능여부 확인 필요하지만, 보통 tmdb는 'movie' 사용
                case 'VIDEO': categoryId = 'movie'; break; 
                case 'GAME': categoryId = 'game'; break;
                case 'MUSIC': categoryId = 'music'; break;
                case 'CERTIFICATE': categoryId = 'certificate'; break;
                default: categoryId = 'book';
            }
            
            // API 호출 시 categoryId 전달
            const data = await getContentDetail(content.contentId, categoryId as any);
            setDetailData(data);
        } catch (e) {
            console.error("상세 정보 로드 실패", e);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (content.contentId) {
        loadDetail();
    }
  }, [content.contentId, content.type]);

  // 탭 렌더링 헬퍼
  const getTabStyle = (tab: InfoTab) => `
    flex-1 py-3.5 px-1 text-xs font-sans font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap
    ${activeTab === tab 
      ? 'text-accent border-accent bg-accent/5' 
      : 'text-text-tertiary border-transparent hover:text-text-secondary'}
  `;

  // 리뷰 필터링
  const celebReviews = detailData?.initialReviews.filter(r => r.user.profile_type === 'CELEB') || [];
  const normalReviews = detailData?.initialReviews.filter(r => r.user.profile_type === 'USER') || [];

  return (
    <div className="w-full h-full flex flex-col bg-bg-secondary/30">
      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/10 overflow-x-auto scrollbar-hide shrink-0">
        <button onClick={() => setActiveTab('BASIC')} className={getTabStyle('BASIC')}>
            <Info size={14} /> 기본
        </button>
        <button onClick={() => setActiveTab('DETAIL')} className={getTabStyle('DETAIL')}>
            <BookOpen size={14} /> 상세
        </button>
        <button 
            onClick={() => { if (celebReviews.length > 0) setActiveTab('REVIEW_CELEB'); }} 
            disabled={celebReviews.length === 0}
            className={`${getTabStyle('REVIEW_CELEB')} ${celebReviews.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <Award size={14} /> 셀럽리뷰
        </button>
        <button 
            onClick={() => { if (normalReviews.length > 0) setActiveTab('REVIEW_NORMAL'); }}
            disabled={normalReviews.length === 0}
            className={`${getTabStyle('REVIEW_NORMAL')} ${normalReviews.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <MessageSquare size={14} /> 일반리뷰
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {isLoading && !detailData ? (
             <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/50 backdrop-blur-sm z-10">
                 <Loader2 className="animate-spin text-accent" />
             </div>
        ) : null}

        {activeTab === 'BASIC' && (
             <div className="min-h-full p-4 flex flex-col justify-center gap-12 animate-in fade-in slide-in-from-right-2 duration-300">
                {/* 1행: 2열 구조 (포스터 | 정보) - PC 공간 활용을 위해 크기 및 간격 확대 */}
                <div className="grid grid-cols-2 gap-4 items-center">
                    {/* 1열: 썸네일 */}
                    <div className="w-full max-w-[240px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] shrink-0 bg-black/20 border border-white/10 relative group ring-1 ring-white/5">
                        {content.thumbnailUrl ? (
                            <Image 
                                src={content.thumbnailUrl} 
                                alt={content.title}
                                fill
                                sizes="(max-width: 768px) 50vw, 240px"
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-text-tertiary text-xs">
                                No Image
                            </div>
                        )}
                    </div>
                    
                    {/* 2열: 상세 정보 (중앙 정렬) */}
                    <div className="flex flex-col items-center text-center min-w-0">
                        <div className="w-full space-y-6 flex flex-col items-center">
                            <h3 className="text-2xl font-serif font-bold text-text-primary leading-snug break-keep line-clamp-4 tracking-tight">
                                {content.title}
                            </h3>
                            
                            <div className="w-full space-y-4 flex flex-col items-center">
                                <p className="text-lg text-text-secondary flex items-center justify-center gap-3 w-full">
                                    <User size={18} className="shrink-0 text-accent/70" />
                                    <span className="truncate font-medium">{content.creator || 'Unknown'}</span>
                                </p>
                                
                                <div className="h-px w-12 bg-gradient-to-r from-transparent via-accent/30 to-transparent my-6" />

                                <div className="w-full space-y-3 flex flex-col items-center">
                                    {/* 출판사 (BOOK) */}
                                    {content.type === 'BOOK' && metadata?.publisher && (
                                        <p className="text-sm text-text-tertiary flex items-center justify-center gap-2 w-full">
                                            <Building2 size={14} className="shrink-0 text-text-tertiary/60" />
                                            <span className="truncate">{metadata.publisher}</span>
                                        </p>
                                    )}
                                    
                                    {/* 감독/출연진 일부 (VIDEO) */}
                                    {content.type === 'VIDEO' && (metadata?.director || metadata?.cast?.[0]) && (
                                        <p className="text-sm text-text-tertiary flex items-center justify-center gap-2 w-full">
                                            {metadata.director ? (
                                                <Film size={14} className="shrink-0 text-text-tertiary/60" />
                                            ) : (
                                                <Users size={14} className="shrink-0 text-text-tertiary/60" />
                                            )}
                                            <span className="truncate">{metadata.director || metadata.cast?.[0]?.name}</span>
                                        </p>
                                    )}
 
                                    {/* 출시일 / 출간일 */}
                                    {(detailData?.content?.releaseDate || metadata?.publishDate) && (
                                        <p className="text-sm text-text-tertiary flex items-center justify-center gap-2 w-full">
                                            <Calendar size={14} className="shrink-0 text-text-tertiary/60" />
                                            <span className="font-sans">{detailData?.content?.releaseDate || metadata?.publishDate}</span>
                                        </p>
                                    )}
                                </div>
 
                                {/* 상세 페이지 이동 버튼 */}
                                <div className="pt-8">
                                    <Link 
                                        href={`/content/${content.contentId}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-text-tertiary hover:text-accent transition-all hover:translate-x-1 py-2 px-3 bg-white/5 rounded-lg border border-white/5 hover:border-accent/20"
                                    >
                                        <span>상세 보기</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        )}

        {activeTab === 'DETAIL' && detailData && (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                {/* 1. 영상 전용: 태그라인 */}
                {content.type === 'VIDEO' && metadata?.tagline && (
                    <div className="text-center italic text-text-secondary/80 text-sm px-4 py-2 border-l-2 border-accent/50 bg-accent/5 rounded-r-lg">
                        "{metadata.tagline}"
                    </div>
                )}

                {/* 2. 소개 */}
                {detailData.content.description && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                            <Info size={12} /> 소개
                        </h4>
                        <div className="text-sm text-text-secondary leading-relaxed p-3 bg-white/5 rounded-lg border border-white/5 whitespace-pre-wrap">
                            <FormattedText text={detailData.content.description} />
                        </div>
                    </div>
                )}

                {/* 3. 게임 전용: 스토리라인 */}
                {content.type === 'GAME' && metadata?.storyline && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                            <BookOpen size={12} /> 스토리라인
                        </h4>
                        <div className="text-sm text-text-secondary leading-relaxed p-3 bg-white/5 rounded-lg border border-white/5 max-h-[200px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                            <FormattedText text={metadata.storyline} />
                        </div>
                    </div>
                )}

                {/* 4. 미디어 (트레일러, 스포티파이 등) */}
                {(content.type === 'VIDEO' || content.type === 'MUSIC') && (
                     <div className="space-y-2">
                        <h4 className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                            {content.type === 'VIDEO' ? '트레일러' : '미리듣기'}
                        </h4>
                        <MediaEmbed contentId={content.contentId} type={content.type as any} />
                     </div>
                )}

                {/* 5. 영상 전용: 출연진 & 감독 */}
                {content.type === 'VIDEO' && (
                    <>
                        {metadata?.director && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-text-secondary">감독</h4>
                                <p className="text-sm text-text-primary pl-1">
                                    {metadata.director}
                                </p>
                            </div>
                        )}
                        {metadata?.cast?.length ? (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-text-secondary">출연진</h4>
                                <div className="flex flex-wrap gap-2">
                                    {metadata.cast.map((actor, i) => (
                                        <span key={i} className="text-xs px-2 py-1 bg-white/5 rounded-full border border-white/10">
                                            {actor.name} <span className="text-text-tertiary">({actor.character})</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {metadata?.runtime && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-text-secondary">러닝타임</h4>
                                <p className="text-sm text-text-secondary pl-1">
                                    {metadata.runtime}분
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* 6. 음악 전용: 트랙 목록 & 레이블 */}
                {content.type === 'MUSIC' && (
                    <>
                        {metadata?.tracks?.length ? (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-text-secondary">트랙 목록</h4>
                                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {metadata.tracks.map((track, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 bg-white/5 rounded border border-white/5">
                                            <span className="text-text-secondary">
                                                <span className="text-text-tertiary mr-2">{track.trackNumber}.</span>
                                                {track.name}
                                            </span>
                                            <span className="text-text-tertiary">
                                                {Math.floor(track.durationMs / 60000)}:{String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {metadata?.label && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-text-secondary">레이블</h4>
                                <p className="text-sm text-text-secondary pl-1">
                                    {metadata.label}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* 7. 게임 전용: 스크린샷 갤러리 */}
                {content.type === 'GAME' && metadata?.screenshots?.length ? (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-text-secondary">스크린샷</h4>
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                            {metadata.screenshots.map((url, i) => (
                                <div key={i} className="flex-shrink-0 w-40 aspect-video rounded-lg overflow-hidden border border-white/10">
                                    <Image src={url} alt={`Screenshot ${i + 1}`} width={160} height={90} className="object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* 8. 메타데이터 (출시일) */}
                 {detailData.content.releaseDate && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                            <Calendar size={12} /> 출시일
                        </h4>
                         <p className="text-sm text-text-secondary pl-1">
                            {detailData.content.releaseDate}
                         </p>
                    </div>
                 )}
            </div>
        )}

        {activeTab === 'REVIEW_CELEB' && (
             <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300 p-4">
                 {celebReviews.map((review) => (
                     <ReviewCard 
                        key={review.id} 
                        item={review} 
                        isExpanded={true} 
                        className="shadow-sm hover:bg-white/5 transition-colors"
                     />
                 ))}
             </div>
        )}

        {activeTab === 'REVIEW_NORMAL' && (
             <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300 p-4">
                 {normalReviews.map((review) => (
                     <ReviewCard 
                        key={review.id} 
                        item={review} 
                        isExpanded={true}
                        className="shadow-sm hover:bg-white/5 transition-colors"
                     />
                 ))}
             </div>
        )}
      </div>
    </div>
  );
}
