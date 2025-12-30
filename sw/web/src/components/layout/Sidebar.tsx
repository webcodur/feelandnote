"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Newspaper,
  Compass,
  User,
  LogOut,
  LucideIcon,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface NavItemInfo {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemInfo[] = [
  { href: "/archive", label: "기록관", icon: Folder },
  { href: "/feed", label: "피드", icon: Newspaper },
  { href: "/playground", label: "놀이터", icon: Compass },
  { href: "/profile", label: "마이페이지", icon: User },
];

interface SidebarProps {
  isOpen?: boolean;
}

function NavItem({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`w-14 h-14 flex flex-col items-center justify-center gap-1 rounded-xl no-underline transition-all duration-200 relative
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-accent rounded-r" />
      )}
      <Icon size={24} />
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}

export const SIDEBAR_WIDTH = 80;

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    // TODO: 로그아웃 처리
  };

  return (
    <div
      className="fixed top-16 left-0 h-[calc(100vh-64px)] z-50 transition-transform duration-300 ease-in-out"
      style={{
        width: SIDEBAR_WIDTH,
        transform: !isOpen ? `translateX(-${SIDEBAR_WIDTH}px)` : undefined,
      }}
    >
      <nav className="w-20 h-full bg-bg-secondary border-r border-border flex flex-col items-center py-6 gap-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            active={pathname.startsWith(item.href)}
            icon={item.icon}
            label={item.label}
          />
        ))}

        <div className="mt-auto flex flex-col items-center gap-2">
          <Button
            unstyled
            className="w-14 h-14 flex flex-col items-center justify-center gap-1 rounded-xl bg-transparent border-none text-text-secondary hover:bg-white/5 hover:text-text-primary"
            onClick={handleLogout}
          >
            <LogOut size={24} />
            <span className="text-[10px] font-semibold">로그아웃</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
