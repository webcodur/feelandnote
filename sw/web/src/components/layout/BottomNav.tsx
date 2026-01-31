/*
  파일명: /components/layout/BottomNav.tsx
  기능: 모바일 하단 네비게이션 바
  책임: 모바일 화면에서 주요 페이지로의 탐색 UI를 제공한다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Z_INDEX } from "@/constants/zIndex";
import { BOTTOM_NAV_ITEMS } from "@/constants/navigation";

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
      className={`flex flex-col items-center justify-center gap-1 py-1 flex-1 no-underline
        ${active ? "text-accent" : "text-text-secondary opacity-60 hover:opacity-100"}`}
    >
      <div className={active ? "drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" : ""}>
        {icon}
      </div>
      <span className={`text-[9px] font-serif tracking-tighter ${active ? "font-black" : "font-medium"}`}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    checkAuth();
  }, []);

  const resolveHref = (href: string) => {
    if (href.includes("{userId}")) {
      return userId ? href.replace("{userId}", userId) : "/login";
    }
    return href;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-bg-main/80 backdrop-blur-xl border-t border-accent/10 flex items-center md:hidden pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
      style={{ zIndex: Z_INDEX.bottomNav }}
    >
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      {BOTTOM_NAV_ITEMS.map((item) => {
        const href = resolveHref(item.href);
        const isActive = item.href.includes("{userId}")
          ? userId ? pathname.startsWith(`/${userId}`) : false
          : pathname.startsWith(item.href);

        return (
          <NavItem
            key={item.key}
            href={href}
            active={isActive}
            icon={<item.icon size={20} />}
            label={item.label}
          />
        );
      })}
    </nav>
  );
}
