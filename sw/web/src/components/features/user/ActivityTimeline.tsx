"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  Edit3,
  Star,
  Trash2,
  Clock,
  CheckCircle,
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Award,
} from "lucide-react";
import type { ActivityLogWithContent } from "@/types/database";

interface ActivityTimelineProps {
  logs: ActivityLogWithContent[];
  loading?: boolean;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  CONTENT_ADD: { icon: Plus, label: "고 결 한 추 가", color: "#d4af37" },
  STATUS_CHANGE: { icon: CheckCircle, label: "상 태 의 진 화", color: "#d4af37" },
  REVIEW_UPDATE: { icon: Edit3, label: "새 겨 진 감 상", color: "#d4af37" },
  RECORD_CREATE: { icon: Star, label: "천 상 의 평 가", color: "#d4af37" },
  CONTENT_REMOVE: { icon: Trash2, label: "기 록 의 말 소", color: "#ef4444" },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  BOOK: BookOpen,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

export default function ActivityTimeline({ logs, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-accent-dim/30 rounded-sm bg-bg-card/10">
        <Clock size={48} className="mx-auto mb-6 text-accent opacity-20" />
        <p className="text-lg font-serif text-accent tracking-widest font-black">역 사 의 침 묵</p>
        <p className="text-xs text-text-tertiary mt-2 font-serif font-medium">아직 기록된 활동이 존재하지 않습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {logs.map((log, index) => {
        const config = ACTION_CONFIG[log.action_type] || { icon: Clock, label: log.action_type, color: "#a0a0a0" };
        const Icon = config.icon;
        const ContentIcon = log.content?.type ? TYPE_ICONS[log.content.type] : null;

        return (
          <div key={log.id} className="relative flex gap-4 sm:gap-8 pb-10 group">
            {/* 연결선 */}
            {index !== logs.length - 1 && (
              <div className="absolute left-[15px] sm:left-[19px] top-10 sm:top-12 w-[1.5px] sm:w-[2px] h-[calc(100%-12px)] bg-gradient-to-b from-accent/50 via-accent/20 to-transparent" />
            )}

            {/* 아이콘 */}
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0 relative z-10 border-2 border-accent bg-bg-card shadow-[0_0_15px_rgba(212,175,55,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
            >
              <Icon size={20} className="text-accent drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
              {/* Corner accent for icon box */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-s-2 border-accent" />
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-serif font-black text-accent tracking-tight">{config.label}</span>
                <span className="text-[10px] sm:text-xs text-text-secondary font-serif font-bold italic">
                   {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
                </span>
              </div>

              {log.content && (
                <div className="relative group/content overflow-hidden rounded-sm border-2 border-accent-dim/20 bg-black/40 hover:bg-black/60 hover:border-accent/40 shadow-inner transition-all duration-500 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-5 relative z-10">
                    {log.content.thumbnail_url ? (
                      <div className="relative w-12 h-16 sm:w-16 sm:h-20 rounded-sm overflow-hidden border-2 border-accent-dim/40 shadow-xl transform group-hover/content:scale-105 transition-transform duration-500">
                        <Image
                          src={log.content.thumbnail_url}
                          alt={log.content.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : ContentIcon ? (
                      <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-sm bg-bg-stone-light flex items-center justify-center border-2 border-accent-dim/40">
                        <ContentIcon size={24} className="text-accent opacity-30" />
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="text-base sm:text-xl font-serif font-black text-text-primary group-hover/content:text-accent transition-colors tracking-tight leading-tight mb-1 sm:mb-2 truncate sm:whitespace-normal sm:line-clamp-2">
                        {log.content.title}
                      </p>
                      <div className="flex items-center gap-2 sm:gap-3">
                         <div className="h-[2px] w-4 sm:w-6 bg-accent opacity-40 shadow-[0_0_5px_rgba(212,175,55,0.3)]" />
                         <p className="text-[9px] sm:text-xs text-accent font-cinzel font-black tracking-[0.2em] opacity-80 uppercase">
                            {log.content.type}
                         </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative faint background title */}
                  <div className="absolute -bottom-4 -right-6 text-7xl font-cinzel font-black text-white/[0.03] pointer-events-none select-none group-hover/content:text-white/[0.06] transition-opacity uppercase">
                    {log.content.type}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
