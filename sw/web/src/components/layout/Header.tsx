"use client";

import { useState } from "react";
import { Menu, Bell, Heart, MessageCircle, UserPlus, Trophy } from "lucide-react";
import HeaderSearch from "./HeaderSearch";
import Logo from "@/components/ui/Logo";

interface HeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export default function Header({ onMenuClick, isMobile }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      type: "like",
      icon: <Heart size={16} className="text-red-400" />,
      message: "마법사A님이 회원님의 리뷰를 좋아합니다",
      time: "10분 전",
      read: false,
    },
    {
      id: 2,
      type: "comment",
      icon: <MessageCircle size={16} className="text-blue-400" />,
      message: "BookLover님이 댓글을 남겼습니다: \"정말 공감돼요!\"",
      time: "2시간 전",
      read: false,
    },
    {
      id: 3,
      type: "follow",
      icon: <UserPlus size={16} className="text-green-400" />,
      message: "독서광님이 회원님을 팔로우하기 시작했습니다",
      time: "5시간 전",
      read: true,
    },
    {
      id: 4,
      type: "achievement",
      icon: <Trophy size={16} className="text-yellow-400" />,
      message: "새 칭호를 획득했습니다: \"백 권의 무게\" (+50점)",
      time: "1일 전",
      read: true,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="w-full h-16 bg-bg-secondary border-b border-border flex items-center px-3 gap-3 md:px-6 md:gap-6 fixed top-0 left-0 z-[100]">
      {!isMobile && (
        <button
          className="w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:bg-white/5"
          onClick={onMenuClick}
        >
          <Menu size={24} className="text-text-primary" />
        </button>
      )}
      <Logo size="md" href="/" />
      <HeaderSearch />
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:bg-white/5 relative"
          >
            <Bell size={22} className="text-text-primary" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-14 w-[calc(100vw-24px)] sm:w-80 md:w-96 max-w-[400px] bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-base">알림</h3>
                <button className="text-sm text-accent hover:underline">모두 읽음</button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 md:px-6 md:py-4 border-b border-border transition-colors duration-200 hover:bg-white/5 cursor-pointer
                      ${!notif.read ? "bg-accent/5" : ""}`}
                  >
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        {notif.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-text-primary leading-relaxed">{notif.message}</p>
                        <p className="text-xs text-text-secondary mt-1">{notif.time}</p>
                      </div>
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 md:px-6 md:py-3 text-center border-t border-border">
                <button className="text-sm text-accent hover:underline">모든 알림 보기</button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden sm:inline font-semibold text-sm">WebCoder</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 cursor-pointer"></div>
        </div>
      </div>
    </header>
  );
}
