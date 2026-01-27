"use client";

import { useState, useEffect } from "react";
import { TempleBellIcon, SacredFlameIcon, MessageTabletIcon, BustIcon, LaurelIcon, ScrollIcon } from "@/components/ui/icons/neo-pantheon";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const ICON_BUTTON_CLASS = "w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors";
const ICON_SIZE = 20;

export default function HeaderNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch initial data
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
      setLoading(false);

      // Realtime subscription
      const channel = supabase
        .channel("header-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            
            // Sound effect
            new Audio("/sounds/미사용/notification1.mp3").play().catch(() => {});
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    init();
  }, []);

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

  const handleRead = async (notif: Notification) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
    }

    if (notif.link) {
      router.push(notif.link);
      setShowDropdown(false);
    }
  };

  const handleReadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <SacredFlameIcon size={16} />;
      case "comment": return <MessageTabletIcon size={16} />;
      case "follow": return <BustIcon size={16} />;
      case "achievement": return <LaurelIcon size={16} />;
      case "guestbook": return <ScrollIcon size={16} />;
      default: return <TempleBellIcon size={16} />;
    }
  };

  return (
    <div className="relative" data-notification-dropdown>
      <Button unstyled onClick={() => setShowDropdown(!showDropdown)} className={`${ICON_BUTTON_CLASS} relative`}>
        <TempleBellIcon size={ICON_SIZE} />
        {unreadCount > 0 && (
          <span className="absolute top-1 end-1 min-w-[14px] h-[14px] px-0.5 bg-accent rounded-full text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute end-0 top-11 w-[calc(100vw-24px)] sm:w-80 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ zIndex: Z_INDEX.dropdown }}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-bg-primary/50 backdrop-blur-sm">
            <span className="font-serif font-bold text-sm">알림 보관함</span>
            {unreadCount > 0 && <span className="text-xs text-accent font-medium">{unreadCount}개의 새 소식</span>}
          </div>
          
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
               <div className="p-8 flex justify-center text-text-secondary text-xs">로딩 중...</div>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleRead(notif)}
                  className={`px-4 py-3 flex gap-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-border/40 last:border-0 ${!notif.is_read ? "bg-accent/5" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? "bg-accent/20 text-accent" : "bg-bg-secondary text-text-secondary"}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.is_read ? "text-text-primary font-medium" : "text-text-secondary"}`}>
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-1.5 flex items-center gap-1">
                        {notif.created_at && formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ko })}
                    </p>
                  </div>
                  {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-text-secondary text-sm flex flex-col items-center gap-2">
                <TempleBellIcon size={24} className="opacity-20" />
                <span>새로운 알림이 없습니다</span>
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 flex justify-between items-center border-t border-border bg-bg-primary/30">
              <Button unstyled onClick={handleReadAll} className="text-xs text-text-secondary hover:text-text-primary transition-colors">모두 읽음</Button>
              <Link href="/notifications" onClick={() => setShowDropdown(false)} className="text-xs text-accent hover:underline decoration-accent/50 underline-offset-2 font-medium">
                전체 기록 보기
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
