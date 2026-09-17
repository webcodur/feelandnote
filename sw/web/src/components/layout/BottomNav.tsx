/*
  파일명: /components/layout/BottomNav.tsx
  기능: 모바일 하단 네비게이션 바
  책임: 모바일 화면에서 주요 페이지로의 탐색 UI를 제공하고, 마지막 칸을 음악 재생기에 내준다.
*/ // ------------------------------

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Z_INDEX } from "@/constants/zIndex";
import { BOTTOM_NAV_ITEMS } from "@/constants/navigation";
import { LinkPending } from "@/components/ui/pending";
import { setBottomNavDock } from "./bottomNavDock";
import { setMusicNavPanelSlot, setMusicNavTabSlot } from "./musicPlayerSlots";

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
  // 홈("/")은 모든 경로의 앞머리라 정확히 일치할 때만 켠다
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    // 고정은 바깥 틀 하나만 한다. 위에 붙는 띠(bottomNavDock)도 이 틀 안에서 함께 움직인다.
    // 틀에 backdrop-filter를 걸지 않는다 — 안쪽 띠의 흐림이 본문을 보지 못하게 된다.
    <div
      className="fixed bottom-0 left-0 right-0 md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
      style={{ zIndex: Z_INDEX.bottomNav }}
    >
      {/* 음악 창이 포털로 들어가는 자리. 이 고정 틀 안에 있어야 창(화면 가운데 모달)이 내비와 같은 층에서 뜬다. 높이가 없어 아래를 가리지 않는다 */}
      <div ref={setMusicNavPanelSlot} className="pointer-events-none absolute inset-x-0 bottom-full" />
      <div ref={setBottomNavDock} />
      <nav className="relative h-16 bg-bg-main/80 backdrop-blur-xl border-t border-accent/10 flex items-center safe-area-bottom">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            href={item.href}
            active={isActive(item.href)}
            icon={<item.icon size={20} />}
            label={t(item.key)}
          />
        ))}
        {/* 마지막 칸은 음악 재생기가 여는 단추로 채운다 */}
        <div ref={setMusicNavTabSlot} className="flex h-full flex-1" />
      </nav>
    </div>
  );
}
