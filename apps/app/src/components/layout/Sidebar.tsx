import React from 'react';
import { Book, Film, User, Settings, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onAddContent?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onAddContent }) => {
  const location = useLocation();

  const contentTypes = [
    { icon: Book, label: '도서', path: '/books', disabled: false },
    { icon: Film, label: '영화', path: '/movies', disabled: true },
  ];

  const userMenus = [
    { icon: User, label: '프로필', path: '/profile' },
    { icon: Settings, label: '설정', path: '/settings' },
  ];

  return (
    <aside className={clsx(
      'fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto py-6 px-4 transition-transform duration-300',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      {/* 콘텐츠 추가 버튼 */}
      <div className="mb-6">
        <button 
          onClick={onAddContent}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>콘텐츠 추가</span>
        </button>
      </div>

      <nav className="space-y-6">
        {/* 콘텐츠 타입 */}
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            콘텐츠
          </h3>
          <div className="space-y-1">
            {contentTypes.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              if (item.disabled) {
                return (
                  <div
                    key={item.path}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 cursor-not-allowed"
                    title="준비 중입니다"
                  >
                    <Icon className="w-5 h-5 text-gray-300" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-gray-400">준비중</span>
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className={clsx('w-5 h-5', isActive ? 'text-indigo-600' : 'text-gray-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 사용자 */}
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-1">
            {userMenus.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className={clsx('w-5 h-5', isActive ? 'text-indigo-600' : 'text-gray-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
};
