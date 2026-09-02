import {
  Crown,
  Landmark,
  Shield,
  Building2,
  TrendingUp,
  FlaskConical,
  BookOpen,
  Users,
  Film,
  Music,
  Palette,
  PenLine,
  Drama,
  Megaphone,
  Dribbble,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CelebProfession } from "@feelandnote/shared/constants/celeb-professions";

export const PROFESSION_ICONS: Readonly<Record<string, LucideIcon>> = {
  leader: Crown,
  politician: Landmark,
  commander: Shield,
  entrepreneur: Building2,
  investor: TrendingUp,
  scientist: FlaskConical,
  humanities_scholar: BookOpen,
  social_scientist: Users,
  director: Film,
  musician: Music,
  visual_artist: Palette,
  author: PenLine,
  actor: Drama,
  influencer: Megaphone,
  athlete: Dribbble,
  other: Sparkles,
} satisfies Record<CelebProfession, LucideIcon>;

/** 직군별 아이콘 색상 */
export const PROFESSION_COLORS: Readonly<Record<string, string>> = {
  leader: "text-yellow-400",
  politician: "text-blue-400",
  commander: "text-red-400",
  entrepreneur: "text-emerald-400",
  investor: "text-green-400",
  scientist: "text-cyan-400",
  humanities_scholar: "text-amber-300",
  social_scientist: "text-indigo-400",
  director: "text-purple-400",
  musician: "text-pink-400",
  visual_artist: "text-orange-400",
  author: "text-stone-400",
  actor: "text-rose-400",
  influencer: "text-fuchsia-400",
  athlete: "text-sky-400",
  other: "text-stone-300",
} satisfies Record<CelebProfession, string>;
