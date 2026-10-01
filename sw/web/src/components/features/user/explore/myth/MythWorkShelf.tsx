"use client";

import { useLocale } from "next-intl";
import type { MythWork } from "@/actions/home/mythTypes";
import type { FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import { getThemeBookTextScope } from "@/lib/figure-books/themeBooks";
import ThemeBookShelf from "@/components/features/faction/entry/ThemeBookShelf";

interface Props { works: MythWork[]; memberIds: string[]; mythName: string; mythSlug: string }

/** 신화 자료를 공통 책장의 자료로 연결한다. */
export default function MythWorkShelf({ works, memberIds, mythName, mythSlug }: Props) {
  const locale = useLocale();
  const books: FactionFigureBook[] = works.filter(work => work.category === "book").map(work => {
    const scope = getThemeBookTextScope(work.id, mythSlug);
    const volume = locale === "ko" && scope ? work.editions?.find(edition => edition.textScope === scope) : undefined;
    return {
      contentId: work.id, editionId: volume?.id ?? work.editionId,
      title: volume?.title ?? work.title, creator: (volume?.creator ?? work.creator) || undefined,
      thumbnail: (volume?.thumbnailUrl ?? work.thumbnailUrl) || undefined,
      url: volume?.coupangUrl ?? work.coupangUrl ?? "", titleBadge: work.titleBadge,
      memberIds: work.personIds, appearedIds: work.appearedIds, authoredIds: work.authorIds,
    };
  });
  return <ThemeBookShelf books={books} memberIds={memberIds} name={mythName} slug={mythSlug} isMyth />;
}
