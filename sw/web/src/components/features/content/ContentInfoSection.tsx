/*
  파일명: /components/features/content/ContentInfoSection.tsx
  기능: 콘텐츠 정보 섹션
  책임: 썸네일, 메타데이터, 소개, 추가/상태변경 버튼을 표시한다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, Award, User, Calendar, Bookmark, Check, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormattedText } from "@/components/ui";
import ContentMetadataDisplay from "@/components/shared/content/ContentMetadataDisplay";
import MediaEmbed from "./MediaEmbed";
import { addContent } from "@/actions/contents/addContent";
import { removeContent } from "@/actions/contents/removeContent";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import StarRatingInput from "@/components/ui/StarRatingInput";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentType } from "@/types/database";
import type { ContentMetadata } from "@/types/content";
import type { CategoryId, VideoSubtype } from "@/constants/categories";

// #region 상수
const TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

const CATEGORY_LABELS: Record<CategoryId, string> = {
  book: "도서",
  video: "영상",
  game: "게임",
  music: "음악",
  certificate: "자격증",
  all: "전체",
};
// #endregion

interface ContentInfoSectionProps {
  content: ContentDetailData["content"];
  userRecord: ContentDetailData["userRecord"];
  isLoggedIn: boolean;
  onRecordChange: (record: ContentDetailData["userRecord"]) => void;
}

export default function ContentInfoSection({
  content,
  userRecord,
  isLoggedIn,
  onRecordChange,
}: ContentInfoSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const Icon = TYPE_ICONS[content.type];
  const categoryLabel = CATEGORY_LABELS[content.category];

  // #region 핸들러
  // 콘텐츠 기록 추가 (상태 파라미터 제거 - 리뷰 기반으로 전환)
  const handleAdd = () => {
    startTransition(async () => {
      try {
        const result = await addContent({
          id: content.id,
          type: content.type,
          title: content.title,
          creator: content.creator,
          thumbnailUrl: content.thumbnail,
          description: content.description,
          releaseDate: content.releaseDate,
        });
        if (!result.success) {
          setError(result.message);
          return;
        }
        onRecordChange({
          id: result.data.userContentId,
          status: 'FINISHED', // deprecated - 레거시 호환용
          rating: null,
          review: null,
          isSpoiler: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "추가 실패");
      }
    });
  };


  const handleDelete = () => {
    if (!userRecord || !confirm("이 콘텐츠를 기록관에서 삭제하시겠습니까?")) return;
    startTransition(async () => {
      try {
        await removeContent(userRecord.id);
        onRecordChange(null);
      } catch (err) {
        console.error("삭제 실패:", err);
      }
    });
  };



  const handleRatingChange = async (rating: number) => {
    if (!userRecord) return;
    try {
      const result = await updateUserContentRating({
        userContentId: userRecord.id,
        rating,
      });
      if (result.success) {
        onRecordChange({ ...userRecord, rating });
      } else {
        console.error(result.error);
      }
    } catch (e) {
      console.error("별점 수정 실패", e);
    }
  };

  // #endregion

  const metadata = content.metadata as unknown as ContentMetadata | null;

  return (
    <div className="pt-4 space-y-4">
      {/* 상단: 썸네일 + 기본 정보 */}
      <div className="flex gap-4">
        {/* 썸네일 */}
        <div className="relative w-24 h-36 md:w-28 md:h-42 rounded-lg shadow-lg shrink-0 overflow-hidden border border-white/10">
          {content.thumbnail ? (
            <Image src={content.thumbnail} alt={content.title} fill unoptimized className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Icon size={32} className="text-gray-500" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-accent/20 text-accent rounded text-[10px] font-medium mb-2">
            <Icon size={10} /> {categoryLabel}
          </span>
          <h1 className="text-lg font-bold leading-tight line-clamp-2 mb-1">{content.title}</h1>
          {content.creator && (
            <p className="text-sm text-text-secondary flex items-center gap-1.5 truncate mb-1">
              <User size={12} /> {content.creator}
            </p>
          )}
          {content.releaseDate && (
            <p className="text-xs text-text-tertiary flex items-center gap-1.5">
              <Calendar size={12} /> {content.releaseDate}
            </p>
          )}
        </div>
      </div>

      {/* 메타데이터 */}
      {metadata && (
        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
          <ContentMetadataDisplay
            category={content.category}
            metadata={metadata}
            subtype={metadata.subtype}
            compact
          />
        </div>
      )}

      {/* 태그라인 (영상) */}
      {content.type === 'VIDEO' && metadata?.tagline && (
        <div className="text-center italic text-text-secondary/80 text-sm px-6 py-3 border-y border-white/5 bg-black/20">
            "{metadata.tagline}"
        </div>
      )}

      {/* 소개 */}
      {content.description && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-text-secondary">소개</h3>
          <div className="text-sm text-text-secondary leading-relaxed p-3 bg-white/5 rounded-lg border border-white/5 whitespace-pre-wrap">
            <FormattedText text={content.description} />
          </div>
        </div>
      )}
      
      {/* 3. 게임 전용: 스토리라인 */}
      {content.type === 'GAME' && metadata?.storyline && (
          <div className="space-y-2">
              <h3 className="text-xs font-medium text-text-secondary">스토리라인</h3>
              <div className="text-sm text-text-secondary leading-relaxed p-3 bg-white/5 rounded-lg border border-white/5 whitespace-pre-wrap">
                  <FormattedText text={metadata.storyline} />
              </div>
          </div>
      )}

      {/* 5. 영상 전용: 출연진 & 감독 */}
      {content.type === 'VIDEO' && metadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.director && (
                  <div className="space-y-2">
                      <h3 className="text-xs font-medium text-text-secondary">감독</h3>
                      <p className="text-sm text-text-primary pl-1">
                          {metadata.director}
                      </p>
                  </div>
              )}
              {metadata.runtime && (
                  <div className="space-y-2">
                      <h3 className="text-xs font-medium text-text-secondary">러닝타임</h3>
                      <p className="text-sm text-text-secondary pl-1">
                          {metadata.runtime}분
                      </p>
                  </div>
              )}
              {metadata.cast?.length ? (
                  <div className="space-y-2 col-span-full">
                      <h3 className="text-xs font-medium text-text-secondary">출연진</h3>
                      <div className="flex flex-wrap gap-2">
                          {metadata.cast?.map((actor, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-white/5 rounded-full border border-white/10">
                                  {actor.name} <span className="text-text-tertiary">({actor.character})</span>
                              </span>
                          ))}
                      </div>
                  </div>
              ) : null}
          </div>
      )}

      {/* 6. 음악 전용: 트랙 목록 & 레이블 */}
      {content.type === 'MUSIC' && metadata && (
          <div className="space-y-4">
              {metadata.tracks?.length ? (
                  <div className="space-y-2">
                      <h3 className="text-xs font-medium text-text-secondary">트랙 목록</h3>
                      <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar border border-white/5 rounded-lg">
                          {metadata.tracks?.map((track, i) => (
                              <div key={i} className="flex items-center justify-between text-xs px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0">
                                  <span className="text-text-secondary">
                                      <span className="text-text-tertiary mr-3 w-4 inline-block text-right">{track.trackNumber}.</span>
                                      {track.name}
                                  </span>
                                  <span className="text-text-tertiary font-mono">
                                      {Math.floor(track.durationMs / 60000)}:{String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0')}
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : null}
              {metadata.label && (
                  <div className="space-y-1">
                      <h3 className="text-xs font-medium text-text-secondary">레이블</h3>
                      <p className="text-sm text-text-secondary pl-1">
                          {metadata.label}
                      </p>
                  </div>
              )}
          </div>
      )}

      {/* 7. 게임 전용: 스크린샷 갤러리 */}
      {content.type === 'GAME' && metadata?.screenshots?.length ? (
          <div className="space-y-2">
              <h3 className="text-xs font-medium text-text-secondary">스크린샷</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {metadata.screenshots?.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group">
                          <Image 
                            src={url} 
                            alt={`Screenshot ${i + 1}`} 
                            fill 
                            className="object-cover transition-transform duration-500 group-hover:scale-110" 
                          />
                      </div>
                  ))}
              </div>
          </div>
      ) : null}

      {/* 미디어 임베드 */}
      <MediaEmbed contentId={content.id} type={content.type} />

      {/* 기록 상태 / 추가 버튼 */}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {isLoggedIn && !userRecord && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleAdd} disabled={isPending}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
            기록하기
          </Button>
        </div>
      )}

      {userRecord && (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-green-400" />
            <span className="text-xs font-medium text-text-secondary">
              기록 완료
            </span>
            <div className="flex items-center">
              <StarRatingInput 
                value={userRecord.rating || 0} 
                onChange={handleRatingChange} 
                size={16} 
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending} className="text-red-400 hover:text-red-300">
            <Trash2 size={14} />
          </Button>
        </div>
      )}

      {!isLoggedIn && (
        <p className="text-center text-sm text-text-tertiary py-4">로그인하면 기록관에 추가할 수 있습니다</p>
      )}
    </div>
  );
}
