/*
  파일명: components/features/game/duel/shared/ArenaAvatar.tsx
  기능: 일기토 인물 얼굴
  책임: 둥근 얼굴 사진을 진영 색 테두리로 그린다. 사진이 없으면 이름 첫 글자를 둔다.
*/

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { BattleCard } from "@/lib/game/types";
import type { Side } from "@/lib/game/hegemony/types";

const SIZE = { sm: "size-9", lg: "size-14" } as const;
const BORDER: Record<Side, string> = { player: "border-accent/70", ai: "border-hg-enemy/70" };

export default function ArenaAvatar({ card, side, size = "sm" }: { card: BattleCard; side: Side; size?: keyof typeof SIZE }) {
  return (
    <span className={`relative shrink-0 overflow-hidden rounded-full border-2 bg-hg-raised ${SIZE[size]} ${BORDER[side]}`}>
      {card.avatarUrl && <CelebAvatarImage src={card.avatarUrl} alt="" className="object-cover object-top" />}
      {!card.avatarUrl && (
        <span aria-hidden="true" className="flex size-full items-center justify-center text-base font-black text-text-secondary">
          {card.nickname.slice(0, 1)}
        </span>
      )}
    </span>
  );
}
