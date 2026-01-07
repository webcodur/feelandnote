/*
  파일명: /components/features/stats/ActivityTimeline.tsx
  기능: 최근 활동 타임라인 표시
  책임: 사용자의 최근 활동 이력을 타임라인 형태로 렌더링
*/ // ------------------------------
"use client";

import { Card } from "@/components/ui";
import {
  FileText,
  Plus,
  Sparkles,
  Edit3,
  Heart,
  MessageCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

interface ActivityTimelineProps {
  activities: Array<{
    id: number;
    type: string;
    title: string;
    time: string;
    points: number;
    icon: string;
  }>;
}

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Plus,
  Sparkles,
  Edit: Edit3,
  Heart,
  MessageCircle,
};

const TYPE_COLORS: Record<string, string> = {
  review: "#f59e0b",
  content: "#7c4dff",
  creation: "#ec4899",
  note: "#10b981",
  like: "#ef4444",
  comment: "#06b6d4",
};

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const totalPoints = activities.reduce((sum, a) => sum + a.points, 0);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">최근 활동</h3>
        <div className="text-sm">
          <span className="text-accent font-semibold">+{totalPoints}</span>
          <span className="text-text-secondary">점</span>
        </div>
      </div>

      <div className="space-y-1">
        {activities.map((activity, index) => {
          const IconComponent = ICON_MAP[activity.icon] || FileText;
          const color = TYPE_COLORS[activity.type] || "#8b949e";

          return (
            <div key={activity.id} className="relative flex gap-3 pb-4">
              {index !== activities.length - 1 && (
                <div className="absolute left-[19px] top-10 w-[2px] h-[calc(100%-24px)] bg-white/10" />
              )}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}20`, zIndex: Z_INDEX.sticky }}
              >
                <IconComponent size={18} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{activity.title}</span>
                  <span className="text-xs font-semibold shrink-0" style={{ color }}>
                    +{activity.points}
                  </span>
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {activity.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button unstyled className="w-full mt-2 py-2 text-sm text-text-secondary hover:text-text-primary">
        전체 활동 보기 →
      </Button>
    </Card>
  );
}
