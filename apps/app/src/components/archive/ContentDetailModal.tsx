import React from 'react';
import { X, Book, Film } from 'lucide-react';
import { clsx } from 'clsx';
import type { UserContent } from '../../lib/api/contents';

interface ContentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: UserContent | null;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  isOpen,
  onClose,
  content,
}) => {
  if (!isOpen || !content) return null;

  const Icon = content.type === 'BOOK' ? Book : Film;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">콘텐츠 상세</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="flex gap-6">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              <div className="w-48 aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden shadow-md">
                {content.thumbnail_url ? (
                  <img
                    src={content.thumbnail_url}
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="w-20 h-20 text-gray-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h3>
                <p className="text-lg text-gray-600">{content.creator}</p>
              </div>

              {/* Progress */}
              {content.status === 'EXPERIENCE' && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-900">진행률</span>
                    <span className="text-lg font-bold text-indigo-600">{content.progress}%</span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${content.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">상태:</span>
                  <span className={clsx(
                    'px-2 py-1 rounded-md text-xs font-medium',
                    content.status === 'EXPERIENCE' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-700'
                  )}>
                    {content.status === 'EXPERIENCE' ? '경험 중' : '관심 목록'}
                  </span>
                </div>
                {content.lastUpdated && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">마지막 업데이트:</span>
                    <span>{new Date(content.lastUpdated).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-3">향후 기록 및 리뷰 기능이 추가될 예정입니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
