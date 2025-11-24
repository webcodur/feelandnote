import React from 'react';
import { clsx } from 'clsx';

interface ArchiveTabsProps {
  activeTab: 'EXPERIENCE' | 'WISH';
  onTabChange: (tab: 'EXPERIENCE' | 'WISH') => void;
  counts?: {
    experience: number;
    wish: number;
  };
}

export const ArchiveTabs: React.FC<ArchiveTabsProps> = ({
  activeTab,
  onTabChange,
  counts = { experience: 0, wish: 0 },
}) => {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      <button
        onClick={() => onTabChange('EXPERIENCE')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
          activeTab === 'EXPERIENCE'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        경험
        <span className={clsx(
          'px-1.5 py-0.5 rounded-md text-xs',
          activeTab === 'EXPERIENCE' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'
        )}>
          {counts.experience}
        </span>
      </button>
      
      <button
        onClick={() => onTabChange('WISH')}
        className={clsx(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
          activeTab === 'WISH'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        관심
        <span className={clsx(
          'px-1.5 py-0.5 rounded-md text-xs',
          activeTab === 'WISH' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'
        )}>
          {counts.wish}
        </span>
      </button>
    </div>
  );
};
