import React, { useState, useEffect } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { clsx } from 'clsx';
import { ContentSearch } from '../components/contents/ContentSearch';
import { ArchiveTabs } from '../components/archive/ArchiveTabs';
import { ContentCard } from '../components/archive/ContentCard';
import { GenreTabs, type GenreFilter } from '../components/archive/GenreTabs';
import { TimelineView } from '../components/archive/TimelineView';
import { RecordModal } from '../components/records/RecordModal';
import { contentApi, type UserContent } from '../lib/api/contents';
import { useAuthStore } from '../store/useAuthStore';

export const Home: React.FC = () => {
  const { user } = useAuthStore();
  const [activeGenre, setActiveGenre] = useState<GenreFilter>('ALL');
  const [viewMode, setViewMode] = useState<'SHELF' | 'TIMELINE'>('SHELF');
  const [activeStatus, setActiveStatus] = useState<'EXPERIENCE' | 'WISH'>('EXPERIENCE');
  
  const [items, setItems] = useState<UserContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Record Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{id: string, title: string} | null>(null);

  const handleOpenRecordModal = (content: UserContent) => {
    setSelectedContent({ id: content.id, title: content.title });
    setIsRecordModalOpen(true);
  };

  const handleRecordSuccess = () => {
    // Refresh data if needed, or just close modal
    // Maybe switch to Timeline view to see the new record?
    // For now just close
  };

  useEffect(() => {
    const fetchArchive = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const data = await contentApi.getUserArchive(user.id);
        setItems(data);
      } catch (error) {
        console.error('Failed to fetch archive:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchive();
  }, [user]);

  // Filter items based on genre and status
  const filteredItems = items.filter(item => {
    const genreMatch = activeGenre === 'ALL' || item.type === activeGenre;
    const statusMatch = item.status === activeStatus;
    return genreMatch && statusMatch;
  });

  // Calculate counts for tabs
  const experienceCount = items.filter(i => 
    (activeGenre === 'ALL' || i.type === activeGenre) && i.status === 'EXPERIENCE'
  ).length;
  
  const wishCount = items.filter(i => 
    (activeGenre === 'ALL' || i.type === activeGenre) && i.status === 'WISH'
  ).length;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-gray-500">로그인이 필요한 서비스입니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Controls */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">보관함</h1>
          
          {/* View Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('SHELF')}
              className={clsx(
                'p-2 rounded-md transition-all',
                viewMode === 'SHELF' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
              title="서재 모드"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={clsx(
                'p-2 rounded-md transition-all',
                viewMode === 'TIMELINE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
              title="기록 모드"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Genre Tabs */}
        <GenreTabs activeGenre={activeGenre} onGenreChange={setActiveGenre} />

        {/* View Content */}
        {viewMode === 'SHELF' ? (
          <div className="space-y-6">
            {/* Status Tabs (Only for Shelf Mode) */}
            <ArchiveTabs
              activeTab={activeStatus}
              onTabChange={setActiveStatus}
              counts={{
                experience: experienceCount,
                wish: wishCount,
              }}
            />

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {filteredItems.map((item) => (
                    <ContentCard
                      key={item.id}
                      title={item.title}
                      creator={item.creator}
                      thumbnailUrl={item.thumbnail_url}
                      type={item.type}
                      progress={item.progress}
                      status={item.status}
                      lastUpdated={item.lastUpdated}
                      onWrite={() => handleOpenRecordModal(item)}
                    />
                  ))}
                </div>

                {filteredItems.length === 0 && (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500">해당하는 콘텐츠가 없습니다.</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <TimelineView />
        )}
      </div>

      {/* Search Section */}
      <div className="pt-12 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">새로운 콘텐츠 찾기</h2>
        <ContentSearch />
      </div>

      {selectedContent && (
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          contentId={selectedContent.id}
          contentTitle={selectedContent.title}
          onSuccess={handleRecordSuccess}
        />
      )}
    </div>
  );
};
