/*
  파일명: /components/features/archive/modals/actionModals/ActivityTimeline.tsx
  기능: 히스토리 모달용 활동 타임라인
  책임: ActivityLogWithContent 목록을 타임라인 형태로 렌더링한다.
*/ // ------------------------------
"use client";

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
  ADD_CONTENT: { icon: Plus, label: "콘텐츠 추가", color: "#7c4dff" },
  UPDATE_PROGRESS: { icon: Clock, label: "진행도 업데이트", color: "#10b981" },
  UPDATE_STATUS: { icon: CheckCircle, label: "상태 변경", color: "#06b6d4" },
  UPDATE_REVIEW: { icon: Edit3, label: "리뷰 작성", color: "#f59e0b" },
  UPDATE_RATING: { icon: Star, label: "평점 변경", color: "#eab308" },
  REMOVE_CONTENT: { icon: Trash2, label: "콘텐츠 삭제", color: "#ef4444" },
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
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <Clock size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">아직 활동 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log, index) => {
        const config = ACTION_CONFIG[log.action_type] || { icon: Clock, label: log.action_type, color: "#8b949e" };
        const Icon = config.icon;
        const ContentIcon = log.content?.type ? TYPE_ICONS[log.content.type] : null;

        return (
          <div key={log.id} className="relative flex gap-3 pb-4">
            {/* 연결선 */}
            {index !== logs.length - 1 && (
              <div className="absolute left-[15px] top-9 w-[2px] h-[calc(100%-20px)] bg-border/50" />
            )}

            {/* 아이콘 */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative z-10"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon size={14} style={{ color: config.color }} />
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-text-tertiary">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
                </span>
              </div>

              {log.content && (
                <div className="flex items-center gap-2 mt-1">
                  {log.content.thumbnail_url ? (
                    <img
                      src={log.content.thumbnail_url}
                      alt={log.content.title}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : ContentIcon ? (
                    <div className="w-8 h-8 rounded bg-surface flex items-center justify-center">
                      <ContentIcon size={14} className="text-text-tertiary" />
                    </div>
                  ) : null}
                  <span className="text-xs text-text-secondary truncate">{log.content.title}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
