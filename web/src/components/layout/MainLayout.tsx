"use client";

import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <Header onMenuClick={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} />
      <main
        className={`mt-16 h-[calc(100vh-64px)] overflow-y-auto p-8 transition-[margin-left] duration-300 ease-in-out
          ${isSidebarOpen ? "ml-[340px]" : "ml-0"}`}
      >
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
