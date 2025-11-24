import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const handleLogoClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleOpenSearch = () => {
    setIsSearchModalOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onLogoClick={handleLogoClick} 
        onSearchClick={handleOpenSearch}
        isSearchModalOpen={isSearchModalOpen}
        onCloseSearchModal={handleCloseSearch}
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onAddContent={handleOpenSearch}
      />
      <main className={`pt-16 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
