"use server";

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { readGamePortraitFigures } from "@/lib/game/figure-portraits";
import type { MemoryFigure } from "@/components/features/game/memory/types";

const getMemoryFiguresCached = unstable_cache(
  (locale: string) => readGamePortraitFigures(createStaticClient(), locale, true),
  ["memory-game-figures-historical-v2"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] },
);

export async function getMemoryFigures(): Promise<MemoryFigure[]> {
  return getMemoryFiguresCached(await getLocale());
}
