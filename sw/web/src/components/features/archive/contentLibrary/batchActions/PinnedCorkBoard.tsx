/*
  파일명: /components/features/archive/PinnedCorkBoard.tsx
  기능: 핀된 콘텐츠를 표시하는 코르크 보드 섹션
  책임: 핀된 콘텐츠를 시각적으로 표시하고 핀 해제 기능을 제공한다.
*/ // ------------------------------
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pin, X } from "lucide-react";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface PinnedCorkBoardProps {
  items: UserContentWithContent[];
  isPinMode: boolean;
  onUnpin: (userContentId: string) => void;
}

interface PinnedCardProps {
  item: UserContentWithContent;
  isPinMode: boolean;
  onUnpin: (userContentId: string) => void;
}
// #endregion

// #region PinnedCard
function PinnedCard({ item, isPinMode, onUnpin }: PinnedCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (isPinMode) {
      onUnpin(item.id);
      return;
    }
    router.push(`/archive/${item.content_id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative group flex flex-col items-center gap-1.5 p-2 rounded-lg
        bg-surface/60 border border-border/40 cursor-pointer
        ${isPinMode ? "hover:border-red-500/50 hover:bg-red-500/10" : "hover:border-accent/50 hover:bg-accent/10"}
      `}
    >
      {/* 핀 아이콘 */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10">
        <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shadow-md">
          <Pin size={10} className="text-white rotate-45" />
        </div>
      </div>

      {/* 썸네일 */}
      <div className="relative w-14 h-20 rounded overflow-hidden bg-surface mt-1">
        {item.content.thumbnail_url ? (
          <Image
            src={item.content.thumbnail_url}
            alt={item.content.title}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary text-[10px]">
            No Image
          </div>
        )}

        {/* 핀 모드일 때 삭제 오버레이 */}
        {isPinMode && (
          <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center">
            <X size={16} className="text-red-500" />
          </div>
        )}
      </div>

      {/* 제목 */}
      <p className="text-[10px] text-text-secondary text-center line-clamp-2 w-full px-0.5">
        {item.content.title}
      </p>
    </div>
  );
}
// #endregion

// #region PinnedCorkBoard
export default function PinnedCorkBoard({ items, isPinMode, onUnpin }: PinnedCorkBoardProps) {
  // 핀된 콘텐츠가 없고 핀 모드도 아니면 렌더링 안 함
  if (items.length === 0 && !isPinMode) return null;

  return (
    <div className="mb-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Pin size={14} className="text-accent" />
        <span className="text-sm font-medium text-text-primary">고정됨</span>
        <span className="text-xs text-text-tertiary">({items.length}/10)</span>
        {isPinMode && (
          <span className="text-xs text-accent ml-auto">클릭하여 해제</span>
        )}
      </div>

      {/* 코르크 보드 */}
      <div
        className={`
          relative p-3 rounded-xl border
          bg-amber-900/10 border-amber-700/20
          ${isPinMode ? "ring-2 ring-accent/30" : ""}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a87c4f' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-text-tertiary">
              콘텐츠를 클릭하여 여기에 고정하세요
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <PinnedCard
                key={item.id}
                item={item}
                isPinMode={isPinMode}
                onUnpin={onUnpin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// #endregion
