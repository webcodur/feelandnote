/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 목차 아이콘 매핑
 * - 목차 위치: 공통 (전 구획)
 * - 데이터: lucide-react 아이콘
 * - 함께 보기: celebServiceItems.ts
 * ───────────────────────────────────────────── */
import {
  AudioLines,
  BookOpen,
  BookOpenText,
  ChartNoAxesCombined,
  ChartSpline,
  CirclePlay,
  MessageSquare,
  Network,
  PenLine,
  Radar,
  Route,
  Sparkles,
  User,
  Users,
} from "lucide-react";

export const CELEB_SERVICE_ICONS = {
  introduction: User,
  reading: BookOpenText,
  personGuide: BookOpen,
  library: BookOpen,
  works: PenLine,
  connections: Network,
  relations: Network,
  timeline: Route,
  analysis: ChartNoAxesCombined,
  influence: Radar,
  spectrum: ChartSpline,
  media: CirclePlay,
  dialogues: MessageSquare,
  dialogueVoice: AudioLines,
  faction: Sparkles,
  guestbook: PenLine,
  relatedFigures: Users,
  affiliateBooks: BookOpenText,
} as const;
