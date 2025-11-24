import React, { useState } from 'react';

import { Search, Book, Film, Loader2, Check, Plus } from 'lucide-react';
import { searchContent } from '../../lib/api/search';
import { contentApi } from '../../lib/api/contents';
import { useAuthStore } from '../../store/useAuthStore';
import type { Content, ContentType } from '../../types/content';
import { clsx } from 'clsx';

export const ContentSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [type, setType] = useState<ContentType>('BOOK');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { user } = useAuthStore();
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Search effect
  React.useEffect(() => {
    const fetchContents = async () => {
      if (!debouncedQuery) {
        setContents([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchContent(debouncedQuery, type);
        setContents(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContents();
  }, [debouncedQuery, type]);

  const handleAddToArchive = async (content: Content, status: 'WISH' | 'EXPERIENCE') => {
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      return;
    }

    try {
      setAddingId(content.id);
      await contentApi.addToArchive(user.id, content, status);
      // Optional: Show success toast
      alert(status === 'WISH' ? '관심 목록에 추가되었습니다.' : '경험이 시작되었습니다.');
      // Ideally we should invalidate queries here to refresh Home
      window.location.reload(); // Temporary refresh to show changes
    } catch (error) {
      console.error('Failed to add content:', error);
      alert('콘텐츠 추가에 실패했습니다.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setType('BOOK')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              type === 'BOOK' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Book className="w-4 h-4" />
            도서
          </button>
          <button
            disabled
            title="영화 검색 기능은 준비 중입니다"
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              'text-gray-300 cursor-not-allowed'
            )}
          >
            <Film className="w-4 h-4" />
            영화
            <span className="text-xs">(준비중)</span>
          </button>
        </div>
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${type === 'BOOK' ? '도서' : '영화'} 검색...`}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}

        {contents?.map((content) => (
          <div key={content.id} className="flex gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-24 h-36 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
              {content.thumbnail_url ? (
                <img src={content.thumbnail_url} alt={content.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {type === 'BOOK' ? <Book /> : <Film />}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{content.title}</h3>
              <p className="text-gray-600 mb-1">{content.creator}</p>
              <p className="text-sm text-gray-500 mb-2">{content.publisher} • {content.release_date}</p>
              <p className="text-sm text-gray-500 line-clamp-2">{content.description}</p>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <button 
                onClick={() => handleAddToArchive(content, 'EXPERIENCE')}
                disabled={!!addingId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap disabled:opacity-50"
              >
                {addingId === content.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '경험 시작'}
              </button>
              <button 
                onClick={() => handleAddToArchive(content, 'WISH')}
                disabled={!!addingId}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm whitespace-nowrap disabled:opacity-50"
              >
                관심 추가
              </button>
            </div>
          </div>
        ))}

        {debouncedQuery && !isLoading && contents?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            "{debouncedQuery}"에 대한 검색 결과가 없습니다
          </div>
        )}
      </div>
    </div>
  );
};
