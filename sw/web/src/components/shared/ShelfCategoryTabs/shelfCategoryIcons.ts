import { BookOpen, Briefcase, Film, Gamepad2, Hash, Music, Pencil, Telescope, Theater, UserRound, type LucideIcon } from 'lucide-react'

/** 인물 책장 분류 아이콘. 메인과 인물 상세가 같은 그림을 쓴다. */
export const SHELF_CATEGORY_ICONS = {
  direct: UserRound, explore: Telescope,
  BOOK: BookOpen, VIDEO: Film, MUSIC: Music, GAME: Gamepad2,
  appeared: Theater, authored: Pencil, profession: Briefcase, theme: Hash,
} satisfies Record<string, LucideIcon>
