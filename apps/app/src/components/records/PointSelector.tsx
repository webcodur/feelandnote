import React, { useEffect, useState } from 'react';
import { Check, Quote } from 'lucide-react';
import { getPointsByContent } from '../../lib/api/points';
import type { Point } from '@feelnnote/api-types';
import { useAuthStore } from '../../store/useAuthStore';

interface PointSelectorProps {
  contentId: string;
  selectedPointIds: string[];
  onChange: (pointIds: string[]) => void;
}

export const PointSelector: React.FC<PointSelectorProps> = ({
  contentId,
  selectedPointIds,
  onChange,
}) => {
  const { user } = useAuthStore();
  const [points, setPoints] = useState<Point[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPoints = async () => {
      setIsLoading(true);
      try {
        const data = await getPointsByContent(contentId);
        setPoints(data);
      } catch (error) {
        console.error('Failed to fetch points:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoints();
  }, [contentId, user]);

  const togglePoint = (pointId: string) => {
    if (selectedPointIds.includes(pointId)) {
      onChange(selectedPointIds.filter((id) => id !== pointId));
    } else {
      onChange([...selectedPointIds, pointId]);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-2">문장 보관함을 불러오는 중...</div>;
  }

  if (points.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-2 italic">
        이 작품에 대해 저장된 문장이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        문장 연결하기 ({selectedPointIds.length}개 선택됨)
      </label>
      <div className="grid gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
        {points.map((point) => {
          const isSelected = selectedPointIds.includes(point.id);
          return (
            <div
              key={point.id}
              onClick={() => togglePoint(point.id)}
              className={`
                relative p-3 rounded-lg border cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <Quote className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`} />
                <div className="flex-1 text-sm line-clamp-2">{point.description || point.text}</div> {/* description 우선 표시, 없으면 text */}
                {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
              </div>
              {point.location && (
                <div className="mt-1 ml-7 text-xs text-gray-400">
                  {point.location}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
