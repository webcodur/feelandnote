"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

function PrimaryNavItem({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      className={`w-14 h-14 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-all duration-200 relative bg-transparent border-none
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
      onClick={onClick}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-accent rounded-r" />
      )}
      {children}
      {label && <span className="text-[10px] font-semibold">{label}</span>}
    </button>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`p-3 rounded-xl no-underline text-[15px] font-medium flex items-center gap-3 transition-all duration-200 cursor-pointer
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
    >
      {children}
    </Link>
  );
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname();
  const [activePrimary, setActivePrimary] = useState<string>("home");

  useEffect(() => {
    if (
      pathname === "/" ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/stats") ||
      pathname.startsWith("/achievements") ||
      pathname.startsWith("/social")
    ) {
      setActivePrimary("home");
    } else if (pathname.startsWith("/archive")) {
      setActivePrimary("archive");
    } else if (pathname.startsWith("/feed")) {
      setActivePrimary("feed");
    } else if (pathname.startsWith("/playground")) {
      setActivePrimary("playground");
    }
  }, [pathname]);

  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-64px)] flex z-50 transition-transform duration-300 ease-in-out
        ${!isOpen ? "-translate-x-[340px]" : ""}`}
    >
      {/* Primary Sidebar */}
      <nav className="w-20 bg-bg-secondary border-r border-border flex flex-col items-center py-6 gap-2">
        <PrimaryNavItem
          active={activePrimary === "home"}
          onClick={() => setActivePrimary("home")}
          label="홈"
        >
          <Home size={24} />
        </PrimaryNavItem>
        <PrimaryNavItem
          active={activePrimary === "archive"}
          onClick={() => setActivePrimary("archive")}
          label="기록관"
        >
          <Folder size={24} />
        </PrimaryNavItem>
        <PrimaryNavItem
          active={activePrimary === "feed"}
          onClick={() => setActivePrimary("feed")}
          label="피드"
        >
          <Newspaper size={24} />
        </PrimaryNavItem>
        <PrimaryNavItem
          active={activePrimary === "playground"}
          onClick={() => setActivePrimary("playground")}
          label="놀이터"
        >
          <Compass size={24} />
        </PrimaryNavItem>

        <div className="mt-auto flex flex-col gap-2">
          <PrimaryNavItem active={false} onClick={() => {}}>
            <Settings size={24} />
          </PrimaryNavItem>
          <PrimaryNavItem active={false} onClick={() => {}}>
            <LogOut size={24} />
          </PrimaryNavItem>
        </div>
      </nav>

      {/* Secondary Sidebar */}
      <aside className="w-[260px] bg-bg-main border-r border-border p-6 overflow-y-auto">
        {activePrimary === "home" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-text-primary">대시보드</h2>
            <div className="flex flex-col gap-2 mb-8">
              <NavItem href="/dashboard" active={pathname === "/dashboard"}>
                <LayoutDashboard size={18} /> 개요
              </NavItem>
              <NavItem href="/stats" active={pathname === "/stats"}>
                <BarChart2 size={18} /> 통계
              </NavItem>
              <NavItem href="/achievements" active={pathname === "/achievements"}>
                <ScrollText size={18} /> 업적서
              </NavItem>
              <NavItem href="/social" active={pathname === "/social"}>
                <Users size={18} /> 소셜
              </NavItem>
            </div>
          </div>
        )}

        {activePrimary === "archive" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-text-primary">기록관</h2>
            <div className="flex flex-col gap-2 mb-8">
              <NavItem href="/archive" active={pathname === "/archive"}>
                <Folder size={18} /> 전체 보기
              </NavItem>
            </div>
            <div className="flex flex-col gap-2 mb-8">
              <div className="text-xs text-text-secondary font-semibold mb-2 pl-3">카테고리</div>
              <NavItem href="/archive" active={false}>
                <Book size={18} /> 도서
              </NavItem>
              <NavItem href="/archive" active={false}>
                <Film size={18} /> 영화
              </NavItem>
              <NavItem href="/archive" active={false}>
                <Tv size={18} /> 드라마
              </NavItem>
              <NavItem href="/archive" active={false}>
                <Gamepad2 size={18} /> 게임
              </NavItem>
              <NavItem href="/archive" active={false}>
                <Drama size={18} /> 공연
              </NavItem>
            </div>
          </div>
        )}

        {activePrimary === "feed" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-text-primary">피드</h2>
            <div className="flex flex-col gap-2 mb-8">
              <NavItem href="/feed" active={pathname === "/feed"}>
                <Newspaper size={18} /> 전체 피드
              </NavItem>
            </div>
            <div className="flex flex-col gap-2 mb-8">
              <div className="text-xs text-text-secondary font-semibold mb-2 pl-3">필터</div>
              <NavItem href="/feed" active={false}>
                <Star size={18} /> 셀럽
              </NavItem>
              <NavItem href="/feed" active={false}>
                <Users size={18} /> 친구
              </NavItem>
              <NavItem href="/feed" active={false}>
                <Search size={18} /> 발견
              </NavItem>
            </div>
          </div>
        )}

        {activePrimary === "playground" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-text-primary">놀이터</h2>
            <div className="flex flex-col gap-2 mb-8">
              <NavItem href="/playground" active={pathname === "/playground"}>
                <Trophy size={18} /> 티어리스트
              </NavItem>
              <NavItem href="/playground/blind-game" active={pathname === "/playground/blind-game"}>
                <Target size={18} /> 블라인드 게임
              </NavItem>
              <NavItem href="/achievements" active={false}>
                <ScrollText size={18} /> 업적서
              </NavItem>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
