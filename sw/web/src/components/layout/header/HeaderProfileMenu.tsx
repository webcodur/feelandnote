"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageTabletIcon, LaurelIcon, ObeliskIcon, CogsIcon, RomanGateIcon } from "@/components/ui/icons/neo-pantheon";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

const MENU_ITEMS = [
  { path: "stats", label: "내 통계", icon: ObeliskIcon },
  { path: "achievements", label: "칭호", icon: LaurelIcon },
  { path: "guestbook", label: "방명록", icon: MessageTabletIcon },
];

interface HeaderProfileMenuProps {
  profile: UserProfile | null;
}

export default function HeaderProfileMenu({ profile }: HeaderProfileMenuProps) {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-profile-dropdown]")) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="relative" data-profile-dropdown>
      <Button unstyled onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5">
        {profile?.avatar_url ? (
          <div className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/10">
            <Image src={profile.avatar_url} alt="프로필" fill unoptimized className="object-cover" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stone-600 to-stone-400 ring-2 ring-white/10" />
        )}
      </Button>

      {showDropdown && (
        <div className="absolute end-0 top-11 w-48 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
          {/* 프로필 헤더 */}
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm truncate">{profile?.nickname || "사용자"}</p>
          </div>

          {/* 메뉴 아이템 */}
          <div className="py-1">
            {profile && MENU_ITEMS.map((item) => {
              const href = `/${profile.id}/${item.path}`;
              return (
                <Link
                  key={item.path}
                  href={href}
                  onClick={() => setShowDropdown(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline ${pathname.startsWith(href) ? "text-accent bg-accent/5" : "text-text-primary"}`}
                >
                  <item.icon size={16} className="text-text-secondary" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/settings"
              onClick={() => setShowDropdown(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline ${pathname === "/settings" ? "text-accent bg-accent/5" : "text-text-primary"}`}
            >
              <CogsIcon size={16} className="text-text-secondary" />
              설정
            </Link>
          </div>

          {/* 로그아웃 */}
          <div className="border-t border-border py-1">
            <Button unstyled onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 w-full">
              <RomanGateIcon size={16} />
              로그아웃
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
