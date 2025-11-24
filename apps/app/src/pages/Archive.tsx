import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutGrid, List } from 'lucide-react';
import { clsx } from 'clsx';
import { ArchiveTabs } from '../components/archive/ArchiveTabs';
import { ContentCard } from '../components/archive/ContentCard';
import { ContentDetailModal } from '../components/archive/ContentDetailModal';
import { TimelineView } from '../components/archive/TimelineView';
import { RecordModal } from '../components/records/RecordModal';
import { contentApi, type UserContent } from '../lib/api/contents';
import { useAuthStore } from '../store/useAuthStore';
import type { ContentType } from '../types/content';

export const Archive: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  
  // URL 경로로 콘텐츠 타입 판별
  const contentType: ContentType = location.pathname === '/books' ? 'BOOK' : 'MOVIE';
  
  const [viewMode, setViewMode] = useState<'SHELF' | 'TIMELINE'>('SHELF');
  const [activeStatus, setActiveStatus] = useState<'EXPERIENCE' | 'WISH'>('EXPERIENCE');
  
  const [items, setItems] = useState<UserContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Record Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedContentForRecord, setSelectedContentForRecord] = useState<{id: string, title: string} | null>(null);

  // Content Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedContentForDetail, setSelectedContentForDetail] = useState<UserContent | null>(null);

  const handleOpenRecordModal = (content: UserContent) => {
    setSelectedContentForRecord({ id: content.id, title: content.title });
    setIsRecordModalOpen(true);
  };

  const handleOpenDetailModal = (content: UserContent) => {
    setSelectedContentForDetail(content);
    setIsDetailModalOpen(true);
  };

  const handleManageRecords = (content: UserContent) => {
    // 향후 기록관리 기능 구현 예정
    alert('기록관리 기능은 곧 추가될 예정입니다.\n챕터별 기록, 진행률 관리 등 다양한 기능을 제공할 예정입니다.');
  };

  const handleRecordSuccess = () => {
    // Refresh data if needed
  };

  useEffect(() => {
    const fetchArchive = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const data = await contentApi.getUserArchive(user.id);
        // 현재 콘텐츠 타입만 필터링
        const filteredData = data.filter(item => item.type === contentType);
        setItems(filteredData);
      } catch (error) {
        console.error('Failed to fetch archive:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchive();
  }, [user, contentType]);

  // Filter items based on status
  const filteredItems = items.filter(item => item.status === activeStatus);

  // Calculate counts for tabs
  const experienceCount = items.filter(i => i.status === 'EXPERIENCE').length;
  const wishCount = items.filter(i => i.status === 'WISH').length;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-gray-500">로그인이 필요한 서비스입니다.</p>
      </div>
    );
  }

  const pageTitle = contentType === 'BOOK' ? '도서 보관함' : '영화 보관함';

  return (
    <div className="space-y-8">
      {/* Top Controls */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          
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
                      onViewDetail={() => handleOpenDetailModal(item)}
                      onManageRecords={() => handleManageRecords(item)}
                    />
                  ))}
                </div>

                {filteredItems.length === 0 && (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500">해당하는 콘텐츠가 없습니다.</p>
                    <p className="text-gray-400 text-sm mt-2">상단 검색창에서 새로운 콘텐츠를 추가해보세요</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <TimelineView />
        )}
      </div>

      {/* Content Detail Modal */}
      <ContentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        content={selectedContentForDetail}
      />

      {/* Record Modal */}
      {selectedContentForRecord && (
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          contentId={selectedContentForRecord.id}
          contentTitle={selectedContentForRecord.title}
          onSuccess={handleRecordSuccess}
        />
      )}
    </div>
  );
};

