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
  Star,
  Search,
  Trophy,
  Target,
} from "lucide-react";
import { CATEGORIES } from "@/constants/categories";

interface SidebarProps {
  isOpen?: boolean;
  secondaryWidth: number;
  onWidthChange: (width: number) => void;
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

const PRIMARY_WIDTH = 80; // w-20 = 80px
const MIN_SECONDARY_WIDTH = 180;
const MAX_SECONDARY_WIDTH = 400;

export default function Sidebar({ isOpen = true, secondaryWidth, onWidthChange }: SidebarProps) {
  const pathname = usePathname();
  const [activePrimary, setActivePrimary] = useState<string>("home");
  const [isResizing, setIsResizing] = useState(false);

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

  const totalWidth = PRIMARY_WIDTH + secondaryWidth;

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newSecondaryWidth = e.clientX - PRIMARY_WIDTH;
      const clampedWidth = Math.max(MIN_SECONDARY_WIDTH, Math.min(MAX_SECONDARY_WIDTH, newSecondaryWidth));
      onWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, onWidthChange]);

  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-64px)] flex z-50 transition-transform duration-300 ease-in-out
        ${!isOpen ? `-translate-x-[${totalWidth}px]` : ""}`}
      style={{ transform: !isOpen ? `translateX(-${totalWidth}px)` : undefined }}
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
      <aside
        className="bg-bg-main border-r border-border p-6 overflow-y-auto relative"
        style={{ width: secondaryWidth }}
      >
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
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <NavItem key={cat.id} href={`/archive?category=${cat.id}`} active={false}>
                    <Icon size={18} /> {cat.label}
                  </NavItem>
                );
              })}
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
              <NavItem href="/playground/tier-list" active={pathname === "/playground/tier-list"}>
                <Trophy size={18} /> 티어리스트
              </NavItem>
              <NavItem href="/playground/blind-game" active={pathname === "/playground/blind-game"}>
                <Target size={18} /> 블라인드 게임
              </NavItem>
            </div>
          </div>
        )}

        {/* Resize Handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-accent/50 transition-colors
            ${isResizing ? "bg-accent" : "bg-transparent"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 rounded-full bg-border group-hover:bg-accent transition-colors" />
        </div>
      </aside>
    </div>
  );
}
