import React from 'react';
import { Search, Bell, User, LogOut, X, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { ContentSearch } from '../contents/ContentSearch';

interface HeaderProps {
  onLogoClick: () => void;
  onSidebarToggle: () => void;
  onSearchClick: () => void;
  isSearchModalOpen: boolean;
  onCloseSearchModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onLogoClick, 
  onSidebarToggle,
  onSearchClick,
  isSearchModalOpen,
  onCloseSearchModal 
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onSidebarToggle}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            onClick={onLogoClick}
            className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
          >
            FeelNNote
          </button>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="새로운 콘텐츠 검색..."
              onClick={onSearchClick}
              readOnly
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer hover:bg-gray-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
              <div className="flex items-center gap-2">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                    {user.name[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 hidden md:block">{user.name}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-red-600 transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
              <User className="w-5 h-5" />
            </Link>
          )}
        </div>
      </header>

      {/* 검색 모달 */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">새로운 콘텐츠 추가</h2>
              <button
                onClick={onCloseSearchModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <ContentSearch />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
