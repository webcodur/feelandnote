"use client";

import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

const PRIMARY_WIDTH = 80;
const DEFAULT_SECONDARY_WIDTH = 260;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [secondaryWidth, setSecondaryWidth] = useState(DEFAULT_SECONDARY_WIDTH);

  const totalSidebarWidth = PRIMARY_WIDTH + secondaryWidth;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B (KeyB는 물리적 키 위치 기반, 한/영 상관없이 동작)
      if (e.ctrlKey && e.code === "KeyB") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Header onMenuClick={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} secondaryWidth={secondaryWidth} onWidthChange={setSecondaryWidth} />
      <main
        className="mt-16 h-[calc(100vh-64px)] overflow-y-auto scrollbar-stable p-8 transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: isSidebarOpen ? totalSidebarWidth : 0 }}
      >
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
