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
  Brain,
  ChartNoAxesCombined,
  ChartSpline,
  CirclePlay,
  Film,
  MessageSquare,
  Network,
  PenLine,
  Radar,
  Route,
  ShoppingBag,
  Sparkles,
  User,
  Users,
} from "lucide-react";

export const CELEB_SERVICE_ICONS = {
  introduction: User,
  reading: BookOpenText,
  personGuide: BookOpen,
  personExplore: Brain,
  library: BookOpen,
  sourceWorks: BookOpenText,
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
  videos: Film,
  faction: Sparkles,
  guestbook: PenLine,
  relatedFigures: Users,
  affiliateBooks: ShoppingBag,
} as const;
