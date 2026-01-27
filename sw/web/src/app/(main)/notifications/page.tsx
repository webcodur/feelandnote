"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { 
  TempleBellIcon, 
  SacredFlameIcon, 
  MessageTabletIcon, 
  BustIcon, 
  LaurelIcon, 
  ScrollIcon
} from "@/components/ui/icons/neo-pantheon";
import { Trash2 as TrashIcon, CheckCheck as CheckDoubleIcon } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    
    // 알림 읽음 처리 시 실시간 반영을 위해 필요하다면 구독을 추가할 수 있음
    // 여기서는 간단히 페이지 진입 시 로드로 처리
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100); // 최대 100개까지만 노출

      if (data) {
        setNotifications(data);
      }
    }
    setLoading(false);
  };

  const handleRead = async (notif: Notification) => {
    if (!notif.is_read) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
      }
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleReadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // UI 낙관적 업데이트
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    if (!confirm("이 알림을 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleDeleteAllRead = async () => {
    if (!confirm("읽은 알림을 모두 삭제하시겠습니까?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // UI 낙관적 업데이트
    setNotifications(prev => prev.filter(n => !n.is_read));

    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("is_read", true);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <SacredFlameIcon size={20} />;
      case "comment": return <MessageTabletIcon size={20} />;
      case "follow": return <BustIcon size={20} />;
      case "achievement": return <LaurelIcon size={20} />;
      case "guestbook": return <ScrollIcon size={20} />;
      default: return <TempleBellIcon size={20} />;
    }
  };

  const filteredNotifications = filter === "all" 
    ? notifications 
    : notifications.filter(n => !n.is_read);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-20">
      {/* 헤더 */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-text-primary mb-1">
            소식 보관함
          </h1>
          <p className="text-sm text-text-secondary">
            회원님의 활동에 대한 지난 기록들을 모아두었습니다.
          </p>
        </div>
        
        <div className="flex gap-2">
           <Button 
            size="sm" 
            variant="secondary"
            className="text-xs border-border/40 hover:bg-white/5"
            onClick={handleReadAll}
            disabled={notifications.every(n => n.is_read)}
          >
            <CheckDoubleIcon size={14} className="mr-1.5" />
            모두 읽음
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            className="text-xs border-border/40 hover:bg-white/5 text-red-400 hover:text-red-300 hover:border-red-400/30"
            onClick={handleDeleteAllRead}
            disabled={!notifications.some(n => n.is_read)}
          >
            <TrashIcon size={14} className="mr-1.5" />
            읽은 알림 삭제
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-white/10 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            filter === "all" 
              ? "text-accent" 
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          전체 ({notifications.length})
          {filter === "all" && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            filter === "unread" 
              ? "text-accent" 
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          안 읽음 ({notifications.filter(n => !n.is_read).length})
          {filter === "unread" && (
            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
          )}
        </button>
      </div>

      {/* 알림 목록 */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-text-secondary">
            기록을 불러오는 중...
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <Card 
              key={notif.id}
              className={`p-0 transition-all duration-200 group border overflow-hidden ${
                !notif.is_read 
                  ? "bg-accent/5 border-accent/20 shadow-[0_0_15px_-5px_var(--accent)]" 
                  : "hover:bg-white/5 border-white/5"
              }`}
            >
              <div 
                onClick={() => handleRead(notif)}
                className="flex items-start gap-4 p-4 cursor-pointer relative"
              >
                {/* 아이콘 */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  !notif.is_read 
                    ? "bg-accent text-bg-primary shadow-glow" 
                    : "bg-bg-secondary text-text-secondary"
                }`}>
                  {getIcon(notif.type)}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-base leading-snug mb-1.5 ${!notif.is_read ? "font-bold text-text-primary" : "text-text-primary/90"}`}>
                      {notif.message}
                    </p>
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="text-text-tertiary hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="삭제"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    <span>{notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ko }) : ''}</span>
                    {/* 메타데이터 정보가 있다면 여기에 추가 표시 가능 */}
                  </div>
                </div>

                {/* 읽지 않음 표시 (우측 데코레이션) */}
                {!notif.is_read && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-accent" />
                )}
              </div>
            </Card>
          ))
        ) : (
          <div className="py-24 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
            <TempleBellIcon size={48} className="mx-auto text-text-tertiary mb-4 opacity-50" />
            <p className="text-text-secondary">
              {filter === "all" ? "도착한 소식이 없습니다." : "모든 소식을 확인하셨습니다."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
