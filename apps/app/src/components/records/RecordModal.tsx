import React, { useState, useEffect } from 'react';
import { X, Star, BookOpen, Loader2, PenTool, CheckCircle2 } from 'lucide-react';
import { createRecord } from '../../lib/api/records';
import type { RecordPart, RecordSubtype } from '@feelnnote/api-types';
import { useAuthStore } from '../../store/useAuthStore';
import { PointSelector } from './PointSelector';

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
  
  // State
  const [part, setPart] = useState<RecordPart>('PART2'); // Default to Review (Part 2)
  const [subtype, setSubtype] = useState<RecordSubtype>('EXPERIENCE_SNAPSHOT');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [location, setLocation] = useState('');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset subtype when part changes
  useEffect(() => {
    if (part === 'PART1') {
      setSubtype('MOMENT_NOTE');
      setIsPublic(false);
    } else {
      setSubtype('EXPERIENCE_SNAPSHOT');
      setIsPublic(true); // Default public for reviews
    }
  }, [part]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsLoading(true);
      await createRecord({
        user_id: user.id, // Note: DTO expects user_id, not userId
        content_id: contentId,
        part,
        subtype,
        content,
        rating: part === 'PART2' ? rating : undefined, // Rating only for reviews
        location: location || undefined,
        is_public: isPublic,
        point_ids: selectedPointIds,
        metadata: {}, // Future: Add specific metadata based on subtype
      } as any); // Type assertion needed due to DTO mismatch in frontend/backend types temporarily
      
      onSuccess();
      onClose();
      
      // Reset form
      setContent('');
      setRating(0);
      setLocation('');
      setSelectedPointIds([]);
    } catch (error) {
      console.error('Failed to create record:', error);
      alert('기록 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSubtypeOptions = () => {
    if (part === 'PART1') {
      return (
        <div className="flex gap-2">
          {[
            { value: 'MOMENT_NOTE', label: '순간 포착' },
            { value: 'PROGRESS_NOTE', label: '진행 노트' },
            { value: 'PERSONAL_REACTION', label: '개인 반응' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSubtype(option.value as RecordSubtype)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                subtype === option.value
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="flex gap-2">
        {[
          { value: 'EXPERIENCE_SNAPSHOT', label: '경험 스냅샷' },
          { value: 'KEY_CAPTURE', label: '핵심 포착' },
          { value: 'CREATIVE_PLAYGROUND', label: '재창작' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSubtype(option.value as RecordSubtype)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              subtype === option.value
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Part Selection (Tabs) */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setPart('PART1')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                part === 'PART1'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PenTool className="w-4 h-4" />
              기록 관리 (진행 중)
            </button>
            <button
              type="button"
              onClick={() => setPart('PART2')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                part === 'PART2'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              리뷰 (완료 후)
            </button>
          </div>

          {/* Subtype Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">기록 유형</label>
            {renderSubtypeOptions()}
          </div>

          {/* Rating (Part 2 only) */}
          {part === 'PART2' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">평점</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="relative cursor-pointer group" onClick={() => setRating(star)}>
                    <Star className={`w-8 h-8 ${rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-200 fill-current group-hover:text-yellow-200'}`} />
                    <div 
                      className="absolute inset-y-0 left-0 w-1/2" 
                      onClick={(e) => { e.stopPropagation(); setRating(star - 0.5); }}
                    />
                  </div>
                ))}
                <span className="ml-2 text-lg font-medium text-gray-600">{rating > 0 ? rating : '-'}</span>
              </div>
            </div>
          )}

          {/* Content Input */}
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                part === 'PART1' 
                  ? "지금 읽고 있는 부분에 대한 생각이나 메모를 남겨주세요." 
                  : "이 작품에 대한 전반적인 감상, 인상 깊었던 점을 자유롭게 기록해보세요."
              }
              className="w-full h-[200px] p-4 bg-gray-50 text-base leading-relaxed border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none placeholder:text-gray-400"
              required
            />
          </div>

          {/* Location & Public Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="위치 (p.123, 15:30 등)"
                className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-gray-400"
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">공개하기</span>
            </label>
          </div>

          {/* Points Selection */}
          <div className="pt-4 border-t border-gray-100">
            <PointSelector 
              contentId={contentId}
              selectedPointIds={selectedPointIds}
              onChange={setSelectedPointIds}
            />
          </div>

          {/* Footer */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '기록 저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
