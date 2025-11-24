import React, { useEffect, useState } from 'react';
import { Star, Quote, FileText, Book } from 'lucide-react';
import { recordsApi, type Record } from '../../lib/api/records';
import { useAuthStore } from '../../store/useAuthStore';

export const TimelineView: React.FC = () => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const data = await recordsApi.getUserRecords(user.id);
        setRecords(data);
      } catch (error) {
        console.error('Failed to fetch records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">로그인이 필요한 서비스입니다.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-2xl">
        <Book className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">아직 기록이 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">콘텐츠의 '기록하기' 버튼을 눌러 기록을 남겨보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {records.map((record) => (
        <div key={record.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            {record.contents?.thumbnail_url && (
              <div className="w-16 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                <img src={record.contents.thumbnail_url} alt={record.contents.title} className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {record.type === 'REVIEW' && <Star className="w-4 h-4 text-yellow-500" />}
                {record.type === 'NOTE' && <FileText className="w-4 h-4 text-blue-500" />}
                {record.type === 'QUOTE' && <Quote className="w-4 h-4 text-green-500" />}
                <span className="text-xs font-medium text-gray-500">
                  {record.type === 'REVIEW' ? '리뷰' : record.type === 'NOTE' ? '메모' : '인용구'}
                </span>
                {record.rating && (
                  <div className="flex items-center gap-0.5 ml-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${i < record.rating! ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <h4 className="font-medium text-gray-900 mb-1">{record.contents?.title}</h4>
              <p className="text-sm text-gray-500 mb-3">{record.contents?.creator}</p>
              
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{record.content}</p>
              
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                {record.location && (
                  <span>📖 {record.location}</span>
                )}
                <span>{new Date(record.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
