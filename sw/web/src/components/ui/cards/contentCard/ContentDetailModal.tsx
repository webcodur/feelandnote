/*
  파일명: /components/features/cards/ContentDetailModal.tsx
  기능: 콘텐츠 상세 정보 모달
  책임: 콘텐츠의 상세 정보(썸네일, 제목, 설명 등)를 모달로 표시한다.
*/ // ------------------------------
"use client";

import Image from "next/image";
import { createPortal } from "react-dom";

import { X, BookOpen, Film, Gamepad2, Music, Award } from "lucide-react";

import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

// #region 타입
interface ContentForModal {
  id: string;
  type: string;
  title: string;
  creator: string | null;
  thumbnail_url: string | null;
  description: string | null;
  publisher: string | null;
  release_date: string | null;
  metadata: Record<string, unknown> | null;
  genre?: string | null;
}

interface ContentDetailModalProps {
  content: ContentForModal;
  onClose: () => void;
}
// #endregion

// #region 상수
const TYPE_CONFIG = {
  BOOK: { icon: BookOpen, label: "도서", color: "text-blue-400" },
  VIDEO: { icon: Film, label: "영상", color: "text-red-400" },
  GAME: { icon: Gamepad2, label: "게임", color: "text-green-400" },
  MUSIC: { icon: Music, label: "음악", color: "text-purple-400" },
  CERTIFICATE: { icon: Award, label: "자격증", color: "text-yellow-400" },
};
// #endregion

// #region 유틸
function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
// #endregion

export default function ContentDetailModal({ content, onClose }: ContentDetailModalProps) {
  // #region 파생 값
  const typeConfig = TYPE_CONFIG[content.type as keyof typeof TYPE_CONFIG];
  const TypeIcon = typeConfig?.icon;
  // #endregion

  // #region 렌더링
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/80" />

      {/* 모달 컨텐츠 */}
      <div
        className="relative bg-bg-card border-t sm:border border-border sm:rounded-2xl rounded-t-2xl w-full sm:w-[90%] sm:max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        style={{ zIndex: Z_INDEX.modal + 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3" />

        {/* 닫기 버튼 */}
        <Button
          unstyled
          type="button"
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
          onClick={onClose}
        >
          <X size={20} />
        </Button>

        {/* 썸네일 영역 */}
        <div className="relative w-full aspect-[3/2] bg-surface shrink-0">
          {content.thumbnail_url ? (
            <Image
              src={content.thumbnail_url}
              alt={content.title}
              fill
              unoptimized
              className="object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary">
              {TypeIcon && <TypeIcon size={64} />}
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* 타입 뱃지 */}
          {typeConfig && (
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${typeConfig.color} mb-2`}>
              <TypeIcon size={14} />
              <span>{typeConfig.label}</span>
              {content.genre && <span className="text-text-tertiary">· {content.genre}</span>}
            </div>
          )}

          {/* 제목 */}
          <h2 className="text-xl font-bold mb-1">{content.title}</h2>

          {/* 저자/출판사/출시일 */}
          <div className="text-sm text-text-secondary mb-4 space-y-0.5">
            {content.creator && <p>{content.creator.replace(/\^/g, ', ')}</p>}
            <p className="text-text-tertiary">
              {[content.publisher, formatDate(content.release_date)].filter(Boolean).join(" · ") || "\u00A0"}
            </p>
          </div>

          {/* 설명 */}
          {content.description && (
            <div className="text-sm text-text-secondary leading-relaxed border-t border-border/30 pt-4">
              <p className="whitespace-pre-line">{content.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
  // #endregion
}
