import React from 'react';
import { clsx } from 'clsx';
import { Book, Film, LayoutGrid } from 'lucide-react';

export type GenreFilter = 'ALL' | 'BOOK' | 'MOVIE';

interface GenreTabsProps {
  activeGenre: GenreFilter;
  onGenreChange: (genre: GenreFilter) => void;
}

export const GenreTabs: React.FC<GenreTabsProps> = ({
  activeGenre,
  onGenreChange,
}) => {
  const tabs: { id: GenreFilter; label: string; icon: React.ElementType }[] = [
    { id: 'ALL', label: '전체', icon: LayoutGrid },
    { id: 'BOOK', label: '도서', icon: Book },
    { id: 'MOVIE', label: '영화', icon: Film },
  ];

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeGenre === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onGenreChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border',
              isActive
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
