/*
  파일명: /components/layout/BottomNav.tsx
  기능: 모바일 하단 네비게이션 바
  책임: 모바일 화면에서 주요 페이지로의 탐색 UI를 제공한다.
*/ // ------------------------------

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Z_INDEX } from "@/constants/zIndex";
import { BOTTOM_NAV_ITEMS } from "@/constants/navigation";
import { LinkPending } from "@/components/ui/pending";
import { setBottomNavDock } from "./bottomNavDock";

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
      className={`relative flex flex-col items-center justify-center gap-1 py-1 flex-1 no-underline
        ${active ? "text-accent" : "text-text-secondary opacity-60 hover:opacity-100"}`}
    >
      <div className={active ? "drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" : ""}>
        {icon}
      </div>
      <span className={`text-[9px] font-serif tracking-tighter ${active ? "font-black" : "font-medium"}`}>{label}</span>
      <LinkPending className="absolute top-1 end-[22%]" />
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { createClient } = await import("@/lib/db/client");
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
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
    // 고정은 바깥 틀 하나만 한다. 위에 붙는 띠(bottomNavDock)도 이 틀 안에서 함께 움직인다.
    // 틀에 backdrop-filter를 걸지 않는다 — 안쪽 띠의 흐림이 본문을 보지 못하게 된다.
    <div
      className="fixed bottom-0 left-0 right-0 md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
      style={{ zIndex: Z_INDEX.bottomNav }}
    >
      <div ref={setBottomNavDock} />
      <nav className="relative h-16 bg-bg-main/80 backdrop-blur-xl border-t border-accent/10 flex items-center safe-area-bottom">
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
              label={t(item.key)}
            />
          );
        })}
      </nav>
    </div>
  );
}
