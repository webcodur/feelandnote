import { Plus, Star, Trash2, RefreshCw, FileText, Edit } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityActionType } from "@/types/database";

// 활동 타입별 설정
export interface ActionConfig {
  icon: LucideIcon;
  verb: string;
  color: string;
}

export const ACTION_CONFIG: Record<ActivityActionType, ActionConfig> = {
  CONTENT_ADD: { icon: Plus, verb: "추가했어요", color: "text-green-400" },
  REVIEW_UPDATE: { icon: Star, verb: "리뷰를 남겼어요", color: "text-yellow-400" },
  CONTENT_REMOVE: { icon: Trash2, verb: "삭제했어요", color: "text-red-400" },
  STATUS_CHANGE: { icon: RefreshCw, verb: "상태 변경", color: "text-blue-400" },
  RECORD_CREATE: { icon: FileText, verb: "기록 생성", color: "text-purple-400" },
  RECORD_UPDATE: { icon: Edit, verb: "기록 수정", color: "text-blue-400" },
  RECORD_DELETE: { icon: Trash2, verb: "기록 삭제", color: "text-red-400" },
};
