"use client";

import { useState, useEffect } from "react";
import { TempleBellIcon, SacredFlameIcon, MessageTabletIcon, BustIcon, LaurelIcon } from "@/components/ui/icons/neo-pantheon";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

const ICON_BUTTON_CLASS = "w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5";
const ICON_SIZE = 20;

// 더미 알림 데이터
const NOTIFICATIONS = [
  { id: 1, type: "like", icon: <SacredFlameIcon size={16} />, message: "마법사A님이 회원님의 리뷰를 좋아합니다", time: "10분 전", read: false },
  { id: 2, type: "comment", icon: <MessageTabletIcon size={16} />, message: "BookLover님이 댓글을 남겼습니다", time: "2시간 전", read: false },
  { id: 3, type: "follow", icon: <BustIcon size={16} />, message: "독서광님이 회원님을 팔로우하기 시작했습니다", time: "5시간 전", read: true },
  { id: 4, type: "achievement", icon: <LaurelIcon size={16} />, message: "새 칭호를 획득했습니다", time: "1일 전", read: true },
];

export default function HeaderNotifications() {
  const [showDropdown, setShowDropdown] = useState(false);
  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-notification-dropdown]")) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div className="relative" data-notification-dropdown>
      <Button unstyled onClick={() => setShowDropdown(!showDropdown)} className={`${ICON_BUTTON_CLASS} relative`}>
        <TempleBellIcon size={ICON_SIZE} />
        {unreadCount > 0 && (
          <span className="absolute top-1 end-1 min-w-[14px] h-[14px] px-0.5 bg-accent rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute end-0 top-11 w-[calc(100vw-24px)] sm:w-80 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">알림</span>
            {unreadCount > 0 && <span className="text-xs text-accent">{unreadCount}개의 새 알림</span>}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {NOTIFICATIONS.length > 0 ? (
              NOTIFICATIONS.map((notif) => (
                <div key={notif.id} className={`px-4 py-3 flex gap-3 hover:bg-white/5 cursor-pointer ${!notif.read ? "bg-accent/5" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">{notif.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-snug">{notif.message}</p>
                    <p className="text-xs text-text-secondary mt-1">{notif.time}</p>
                  </div>
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-text-secondary text-sm">알림이 없습니다</div>
            )}
          </div>
          {NOTIFICATIONS.length > 0 && (
            <div className="px-4 py-2.5 flex justify-between items-center border-t border-border">
              <Button unstyled className="text-xs text-text-secondary hover:text-text-primary">모두 읽음</Button>
              <Button unstyled className="text-xs text-accent hover:underline">전체보기</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
