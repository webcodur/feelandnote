/*
  파일명: /components/layout/Sidebar.tsx
  기능: 데스크톱 사이드바 네비게이션
  책임: 섹션별로 그룹화된 네비게이션 메뉴와 배지를 표시한다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Folder,
  ListMusic,
  Compass,
  Newspaper,
  Gamepad2,
  BarChart2,
  Trophy,
  Settings,
  BookOpen,
  Megaphone,
  MessageSquare,
  LucideIcon,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { getUnreadGuestbookCount } from "@/actions/guestbook";

export const SIDEBAR_WIDTH_MIN = 160;
export const SIDEBAR_WIDTH_MAX = 320;
export const SIDEBAR_WIDTH_DEFAULT = 200;

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "기록관",
    defaultOpen: true,
    items: [
      { href: "/", label: "홈", icon: Home },
      { href: "/archive", label: "기록관", icon: Folder },
      { href: "/archive/playlists", label: "재생목록", icon: ListMusic },
      { href: "/archive/explore", label: "탐색", icon: Compass },
      { href: "/archive/feed", label: "피드", icon: Newspaper },
      { href: "/archive/lounge", label: "휴게실", icon: Gamepad2 },
    ],
  },
  {
    title: "마이페이지",
    defaultOpen: true,
    items: [
      { href: "/profile/stats", label: "통계", icon: BarChart2 },
      { href: "/profile/achievements", label: "업적", icon: Trophy },
      { href: "/profile/settings", label: "설정", icon: Settings },
      { href: "/profile/guestbook", label: "방명록", icon: BookOpen },
    ],
  },
  {
    title: "게시판",
    defaultOpen: false,
    items: [
      { href: "/board/notice", label: "공지사항", icon: Megaphone },
      { href: "/board/free", label: "자유게시판", icon: MessageSquare },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  width: number;
  onWidthChange: (width: number) => void;
}

function NavItemLink({
  href,
  active,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium no-underline
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function NavSectionComponent({
  section,
  pathname,
  badges,
}: {
  section: NavSection;
  pathname: string;
  badges: Record<string, number>;
}) {
  const [isOpen, setIsOpen] = useState(section.defaultOpen ?? true);
  const hasActiveItem = section.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const activeItems = section.items.filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <div className="mb-2">
      <Button
        unstyled
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider hover:text-text-secondary cursor-pointer"
      >
        <span>{section.title}</span>
        <ChevronRight size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
      </Button>

      {/* 전체 항목 (열림/닫힘 애니메이션) */}
      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-1 space-y-0.5">
            {section.items.map((item) => (
              <NavItemLink
                key={item.href}
                href={item.href}
                active={pathname === item.href || (item.href !== "/archive" && pathname.startsWith(item.href + "/")) || (item.href === "/archive" && (pathname === "/archive" || pathname.startsWith("/archive/user/")))}
                icon={item.icon}
                label={item.label}
                badge={badges[item.href]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 닫혔을 때 활성 항목만 표시 */}
      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: !isOpen && hasActiveItem ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-1 space-y-0.5">
            {activeItems.map((item) => (
              <NavItemLink
                key={item.href}
                href={item.href}
                active
                icon={item.icon}
                label={item.label}
                badge={badges[item.href]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen = true, width, onWidthChange }: SidebarProps) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 읽지 않은 방명록 개수 조회
  useEffect(() => {
    const fetchBadges = async () => {
      const unreadCount = await getUnreadGuestbookCount();
      setBadges((prev) => ({ ...prev, "/profile/guestbook": unreadCount }));
    };
    fetchBadges();
  }, [pathname]);

  // 리사이즈 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, e.clientX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, onWidthChange]);

  return (
    <div
      ref={sidebarRef}
      className="fixed top-16 left-0 h-[calc(100vh-64px)]"
      style={{
        width,
        transform: !isOpen ? `translateX(-${width}px)` : undefined,
        zIndex: Z_INDEX.sidebar,
      }}
    >
      <nav className="w-full h-full bg-bg-secondary border-r border-border flex flex-col py-4 px-2 overflow-y-auto scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <NavSectionComponent key={section.title} section={section} pathname={pathname} badges={badges} />
        ))}
      </nav>

      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/50 ${isResizing ? "bg-accent" : ""}`}
      />
    </div>
  );
}
