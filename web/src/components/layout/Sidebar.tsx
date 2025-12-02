"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Folder,
  Newspaper,
  Compass,
  LayoutDashboard,
  BarChart2,
  ScrollText,
  Users,
  Settings,
  LogOut,
  Book,
  Film,
  Tv,
  Gamepad2,
  Drama,
  Star,
  Search,
  Trophy,
  Target,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePrimary, setActivePrimary] = useState<string>("home");

  // URL 변경 시 activePrimary 상태 동기화
  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/stats") || pathname.startsWith("/achievements") || pathname.startsWith("/social")) {
      setActivePrimary("home");
    } else if (pathname.startsWith("/archive")) {
      setActivePrimary("archive");
    } else if (pathname.startsWith("/feed")) {
      setActivePrimary("feed");
    } else if (pathname.startsWith("/playground")) {
      setActivePrimary("playground");
    }
  }, [pathname]);

  const handlePrimaryClick = (key: string, defaultPath: string) => {
    setActivePrimary(key);
  };

  return (
    <div className={`sidebar-container ${!isOpen ? "hidden" : ""}`}>
      {/* Primary Sidebar */}
      <nav className="sidebar-primary">
        <button
          className={`primary-nav-item ${activePrimary === "home" ? "active" : ""}`}
          onClick={() => handlePrimaryClick("home", "/")}
        >
          <Home size={24} />
          <span className="primary-label">홈</span>
        </button>
        <button
          className={`primary-nav-item ${activePrimary === "archive" ? "active" : ""}`}
          onClick={() => handlePrimaryClick("archive", "/archive")}
        >
          <Folder size={24} />
          <span className="primary-label">기록관</span>
        </button>
        <button
          className={`primary-nav-item ${activePrimary === "feed" ? "active" : ""}`}
          onClick={() => handlePrimaryClick("feed", "/feed")}
        >
          <Newspaper size={24} />
          <span className="primary-label">피드</span>
        </button>
        <button
          className={`primary-nav-item ${activePrimary === "playground" ? "active" : ""}`}
          onClick={() => handlePrimaryClick("playground", "/playground")}
        >
          <Compass size={24} />
          <span className="primary-label">놀이터</span>
        </button>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button className="primary-nav-item">
            <Settings size={24} />
          </button>
          <button className="primary-nav-item">
            <LogOut size={24} />
          </button>
        </div>
      </nav>

      {/* Secondary Sidebar */}
      <aside className="sidebar-secondary">
        {/* Dashboard Menu (Home) */}
        {activePrimary === "home" && (
          <div className="menu-content active">
            <h2 className="secondary-title">대시보드</h2>
            <div className="nav-group">
              <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}>
                <LayoutDashboard size={18} /> 개요
              </Link>
              <Link href="/stats" className={`nav-item ${pathname === "/stats" ? "active" : ""}`}>
                <BarChart2 size={18} /> 통계
              </Link>
              <Link
                href="/achievements"
                className={`nav-item ${pathname === "/achievements" ? "active" : ""}`}
              >
                <ScrollText size={18} /> 업적서
              </Link>
              <Link href="/social" className={`nav-item ${pathname === "/social" ? "active" : ""}`}>
                <Users size={18} /> 소셜
              </Link>
            </div>
          </div>
        )}

        {/* Archive Menu */}
        {activePrimary === "archive" && (
          <div className="menu-content active">
            <h2 className="secondary-title">기록관</h2>
            <div className="nav-group">
              <Link href="/archive" className={`nav-item ${pathname === "/archive" ? "active" : ""}`}>
                <Folder size={18} /> 전체 보기
              </Link>
            </div>
            <div className="nav-group">
              <div className="nav-section-title">카테고리</div>
              <Link href="/archive" className="nav-item">
                <Book size={18} /> 도서
              </Link>
              <Link href="/archive" className="nav-item">
                <Film size={18} /> 영화
              </Link>
              <Link href="/archive" className="nav-item">
                <Tv size={18} /> 드라마
              </Link>
              <Link href="/archive" className="nav-item">
                <Gamepad2 size={18} /> 게임
              </Link>
              <Link href="/archive" className="nav-item">
                <Drama size={18} /> 공연
              </Link>
            </div>
          </div>
        )}

        {/* Feed Menu */}
        {activePrimary === "feed" && (
          <div className="menu-content active">
            <h2 className="secondary-title">피드</h2>
            <div className="nav-group">
              <Link href="/feed" className={`nav-item ${pathname === "/feed" ? "active" : ""}`}>
                <Newspaper size={18} /> 전체 피드
              </Link>
            </div>
            <div className="nav-group">
              <div className="nav-section-title">필터</div>
              <Link href="/feed" className="nav-item">
                <Star size={18} /> 셀럽
              </Link>
              <Link href="/feed" className="nav-item">
                <Users size={18} /> 친구
              </Link>
              <Link href="/feed" className="nav-item">
                <Search size={18} /> 발견
              </Link>
            </div>
          </div>
        )}

        {/* Playground Menu */}
        {activePrimary === "playground" && (
          <div className="menu-content active">
            <h2 className="secondary-title">놀이터</h2>
            <div className="nav-group">
              <Link href="/playground" className={`nav-item ${pathname === "/playground" ? "active" : ""}`}>
                <Trophy size={18} /> 티어리스트
              </Link>
              <Link href="/playground/blind-game" className={`nav-item ${pathname === "/playground/blind-game" ? "active" : ""}`}>
                <Target size={18} /> 블라인드 게임
              </Link>
              <Link href="/achievements" className="nav-item">
                <ScrollText size={18} /> 업적서
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
