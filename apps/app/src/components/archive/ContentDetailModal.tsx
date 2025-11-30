import React from 'react';
import { X, Book, Film } from 'lucide-react';
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

  // Format release date (YYYYMMDD -> YYYY.MM.DD)
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    if (dateString.length === 8) {
      return `${dateString.slice(0, 4)}.${dateString.slice(4, 6)}.${dateString.slice(6, 8)}`;
    }
    return dateString;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">콘텐츠 상세</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Thumbnail */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
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
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{content.title}</h3>
                <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">{content.creator}</span>
                  {content.publisher && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{content.publisher}</span>
                    </>
                  )}
                  {content.release_date && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{formatDate(content.release_date)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {content.description && (
                <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {content.description}
                  </p>
                </div>
              )}

              {/* Metadata / Links */}
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                {content.metadata?.isbn && (
                  <div className="text-xs text-gray-400">
                    ISBN: {content.metadata.isbn}
                  </div>
                )}
                
                {content.metadata?.link && (
                  <a 
                    href={content.metadata.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors w-fit cursor-pointer"
                  >
                    네이버 책에서 보기
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
