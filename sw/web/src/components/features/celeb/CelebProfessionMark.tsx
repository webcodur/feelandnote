/*
  파일명: /components/features/celeb/CelebProfessionMark.tsx
  기능: 직군 물건 표식
  책임: 직군마다 다른 물건을 구획 제목 옆에 놓는다.

  왜 여기인가
  - 배너 그림은 스크롤하면 사라진다. 구획 제목은 내려가는 내내 반복해서 나오므로
    인물마다 다르다는 인상이 유지된다.
  - 지난 시도가 실패한 이유는 도형이라서가 아니라 배경에 흐리게 깔았기 때문이다.
    여기서는 제목과 같은 줄에, 읽히는 크기로, 강조색으로 놓는다.
*/

import {
  Atom, Brush, Clapperboard, Coins, Crown, Drama, Feather, Landmark, Lightbulb,
  Megaphone, Music, Scale, ScrollText, Sparkle, Swords, Trophy, type LucideIcon,
} from "lucide-react";
import type { CelebProfession } from "@feelandnote/shared/constants/celeb-professions";

/* 공유 직군 단일원천의 값을 모두 명시한다. 직군이 늘면 여기도 함께 늘린다.
   물건은 그 직군이 평생 다루는 것으로 고른다. 특정 회사·사건을 떠올리게 하는 물건은 쓰지 않는다
   (기업가에 로켓을 놓으면 우주 사업을 한 사람만 가리키게 된다). */
const PROFESSION_MARKS: Readonly<Record<string, LucideIcon>> = {
  leader: Crown,
  politician: Landmark,
  commander: Swords,
  humanities_scholar: ScrollText,
  author: Feather,
  scientist: Atom,
  social_scientist: Scale,
  director: Clapperboard,
  actor: Drama,
  influencer: Megaphone,
  musician: Music,
  visual_artist: Brush,
  entrepreneur: Lightbulb,
  investor: Coins,
  athlete: Trophy,
  other: Sparkle,
} satisfies Record<CelebProfession, LucideIcon>;

interface CelebProfessionMarkProps {
  profession?: string | null;
  /** 구획 제목 옆에 쓰는 기본 크기. 대문에 크게 놓을 때만 큰 값을 준다 */
  size?: number;
  className?: string;
}

export default function CelebProfessionMark({
  profession,
  size = 20,
  className = "",
}: CelebProfessionMarkProps) {
  const Mark = (profession && PROFESSION_MARKS[profession]) || Sparkle;
  return (
    <Mark
      size={size}
      strokeWidth={1.4}
      className={`shrink-0 text-accent ${className}`}
      aria-hidden="true"
    />
  );
}

export { PROFESSION_MARKS };
