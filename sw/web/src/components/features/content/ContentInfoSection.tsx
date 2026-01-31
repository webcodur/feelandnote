/*
  파일명: /components/features/content/ContentInfoSection.tsx
  기능: 콘텐츠 정보 섹션
  책임: 썸네일, 메타데이터, 소개, 추가/상태변경 버튼을 표시한다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, Award, User, Calendar, Bookmark, Check, Loader2, Sparkles, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormattedText } from "@/components/ui";
import ContentMetadataDisplay from "@/components/shared/content/ContentMetadataDisplay";
import { addContent } from "@/actions/contents/addContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { removeContent } from "@/actions/contents/removeContent";
import { generateSummary } from "@/actions/ai";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentStatus, ContentType } from "@/types/database";
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

const STATUS_LABELS: Record<ContentStatus, string> = {
  WANT: "관심",
  FINISHED: "감상 완료",
};
// #endregion

interface ContentInfoSectionProps {
  content: ContentDetailData["content"];
  userRecord: ContentDetailData["userRecord"];
  hasApiKey: boolean;
  isLoggedIn: boolean;
  onRecordChange: (record: ContentDetailData["userRecord"]) => void;
}

export default function ContentInfoSection({
  content,
  userRecord,
  hasApiKey,
  isLoggedIn,
  onRecordChange,
}: ContentInfoSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon = TYPE_ICONS[content.type];
  const categoryLabel = CATEGORY_LABELS[content.category];

  // #region 핸들러
  const handleAdd = (status: ContentStatus) => {
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
          status,
        });
        if (!result.success) {
          setError(result.message);
          return;
        }
        onRecordChange({
          id: result.data.userContentId,
          status,
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

  const handleStatusChange = (newStatus: ContentStatus) => {
    if (!userRecord) return;
    startTransition(async () => {
      try {
        await updateStatus({ userContentId: userRecord.id, status: newStatus });
        onRecordChange({ ...userRecord, status: newStatus });
      } catch (err) {
        console.error("상태 변경 실패:", err);
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

  const handleSummarize = async () => {
    if (!content.description) return;
    setIsSummarizing(true);
    try {
      const result = await generateSummary({ contentTitle: content.title, description: content.description });
      setSummary(result.text);
    } catch (err) {
      console.error("AI 요약 실패:", err);
    } finally {
      setIsSummarizing(false);
    }
  };
  // #endregion

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
      {content.metadata && (
        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
          <ContentMetadataDisplay
            category={content.category}
            metadata={content.metadata as Record<string, unknown>}
            subtype={content.metadata?.subtype as VideoSubtype | undefined}
            compact
          />
        </div>
      )}

      {/* 소개 */}
      {content.description && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-text-secondary">소개</h3>
            {hasApiKey && (
              <Button variant="ghost" size="sm" onClick={handleSummarize} disabled={isSummarizing} className="text-xs gap-1">
                {isSummarizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                AI 요약
              </Button>
            )}
          </div>
          {summary && (
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-sm text-text-primary leading-relaxed"><FormattedText text={summary} /></p>
            </div>
          )}
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
            <FormattedText text={content.description} />
          </p>
        </div>
      )}

      {/* 기록 상태 / 추가 버튼 */}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {isLoggedIn && !userRecord && (
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={() => handleAdd("WANT")} disabled={isPending} className="flex-1">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} className="text-yellow-500" />}
            관심 등록
          </Button>
          <Button variant="primary" size="md" onClick={() => handleAdd("FINISHED")} disabled={isPending} className="flex-1">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            감상 등록
          </Button>
        </div>
      )}

      {userRecord && (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${userRecord.status === "FINISHED" ? "text-status-completed" : "text-status-wish"}`}>
              {STATUS_LABELS[userRecord.status]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(userRecord.status === "FINISHED" ? "WANT" : "FINISHED")}
              disabled={isPending}
              className="text-xs"
            >
              {userRecord.status === "FINISHED" ? "관심으로 변경" : "감상 완료로 변경"}
            </Button>
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
