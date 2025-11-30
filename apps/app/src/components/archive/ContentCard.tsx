import React, { useState } from 'react';
import { Book, Film, FileEdit, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import type { ContentType } from '../../types/content';

interface ContentCardProps {
  title: string;
  creator: string;
  thumbnailUrl?: string;
  type: ContentType;
  progress?: number;
  status: 'WISH' | 'EXPERIENCE';
  onWrite?: () => void;
  onViewDetail?: () => void;
  onManageRecords?: () => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  title,
  creator,
  thumbnailUrl,
  type,
  progress = 0,
  status,
  onWrite,
  onViewDetail,
  onManageRecords,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const Icon = type === 'BOOK' ? Book : Film;

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    action?.();
  };

  return (
    <div
      className="group relative flex flex-col gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 포스터 영역 */}
      <div
        onClick={onViewDetail}
        className="relative aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden cursor-pointer shadow-sm group-hover:shadow-md transition-all duration-300"
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <Icon className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Hover Overlay & Actions */}
        <div className={clsx(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 flex flex-col items-center justify-center gap-3 p-4",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          {status === 'EXPERIENCE' && (
            <>
              <button
                onClick={(e) => handleAction(e, onWrite)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200 cursor-pointer"
              >
                <FileEdit className="w-4 h-4" />
                리뷰 쓰기
              </button>
              <button
                onClick={(e) => handleAction(e, onManageRecords)}
                className="w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                기록 관리
              </button>
            </>
          )}
          
          {/* 상세 보기 텍스트 (버튼이 없을 때 혹은 추가적인 힌트) */}
          <span className="text-white/70 text-xs mt-2 font-light">클릭하여 상세 정보</span>
        </div>

        {/* 진행률 표시 (Slim version) */}
        {status === 'EXPERIENCE' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/30">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 콘텐츠 정보 */}
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900 text-base leading-tight truncate px-1">
          {title}
        </h3>
        <p className="text-sm text-gray-500 truncate px-1">{creator}</p>
        
        {/* 진행률 텍스트 (Optional: 호버 시에만 보이거나 항상 보이거나) */}
        {status === 'EXPERIENCE' && progress > 0 && (
          <p className="text-xs text-indigo-600 font-medium px-1 mt-1">
            {progress}% 읽음
          </p>
        )}
      </div>
    </div>
  );
};
