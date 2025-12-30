"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Newspaper,
  Compass,
  User,
} from "lucide-react";

interface NavItemProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ href, active, icon, label }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 no-underline transition-colors duration-200
        ${active ? "text-accent" : "text-text-secondary"}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/archive", icon: <Folder size={20} />, label: "기록관" },
    { href: "/feed", icon: <Newspaper size={20} />, label: "피드" },
    { href: "/playground", icon: <Compass size={20} />, label: "놀이터" },
    { href: "/profile", icon: <User size={20} />, label: "마이페이지" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border flex items-center z-[100] md:hidden">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          active={pathname.startsWith(item.href)}
          icon={item.icon}
          label={item.label}
        />
      ))}
    </nav>
  );
}
