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
  lastUpdated?: string;
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
  lastUpdated,
  onWrite,
  onViewDetail,
  onManageRecords,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const Icon = type === 'BOOK' ? Book : Film;

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 포스터 영역 - 클릭 시 상세 모달 */}
      <div
        onClick={onViewDetail}
        className="relative aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden mb-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {/* 진행률 표시 */}
        {status === 'EXPERIENCE' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex items-center justify-between text-white text-xs mb-1">
              <span>진행률</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-1.5">
              <div
                className="bg-indigo-400 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Hover 오버레이 */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <p className="text-white text-sm font-medium">상세보기</p>
          </div>
        )}
      </div>

      {/* 콘텐츠 정보 */}
      <div className="space-y-2">
        <div>
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight">
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{creator}</p>
        </div>

        {/* 액션 버튼 */}
        {status === 'EXPERIENCE' && (
          <div className="flex gap-1.5">
            <button
              onClick={onManageRecords}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
              title="챕터별 기록 등 상세한 기록 관리"
            >
              <Settings className="w-3.5 h-3.5" />
              기록관리
            </button>
            <button
              onClick={onWrite}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              <FileEdit className="w-3.5 h-3.5" />
              리뷰 쓰기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
