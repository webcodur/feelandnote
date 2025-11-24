import React, { useState } from 'react';
import { X, Star, BookOpen, Quote, FileText, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { recordsApi, type RecordType } from '../../lib/api/records';
import { useAuthStore } from '../../store/useAuthStore';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  onSuccess: () => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const [type, setType] = useState<RecordType>('REVIEW');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsLoading(true);
      await recordsApi.createRecord({
        userId: user.id,
        contentId,
        type,
        content,
        rating: type === 'REVIEW' ? rating : undefined,
        location: location || undefined,
      });
      onSuccess();
      onClose();
      // Reset form
      setContent('');
      setRating(0);
      setLocation('');
      setType('REVIEW');
    } catch (error) {
      console.error('Failed to create record:', error);
      alert('기록 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">기록 남기기</h2>
            <p className="text-sm text-gray-500 mt-1">{contentTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {(['REVIEW', 'NOTE', 'QUOTE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                  type === t
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t === 'REVIEW' && <Star className="w-4 h-4" />}
                {t === 'NOTE' && <FileText className="w-4 h-4" />}
                {t === 'QUOTE' && <Quote className="w-4 h-4" />}
                {t === 'REVIEW' ? '리뷰' : t === 'NOTE' ? '메모' : '인용구'}
              </button>
            ))}
          </div>

          {/* Dynamic Fields */}
          <div className="space-y-4">
            {type === 'REVIEW' && (
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={clsx(
                      'p-1 transition-transform hover:scale-110',
                      rating >= star ? 'text-yellow-400' : 'text-gray-200'
                    )}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
            )}

            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === 'REVIEW'
                    ? '이 작품에 대한 전반적인 감상을 남겨주세요.'
                    : type === 'NOTE'
                    ? '기억하고 싶은 내용이나 떠오른 생각을 적어보세요.'
                    : '인상 깊었던 구절을 기록해보세요.'
                }
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={type === 'QUOTE' ? '페이지 (예: p.123)' : '위치 정보 (선택)'}
                className="flex-1 bg-transparent border-b border-gray-200 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
