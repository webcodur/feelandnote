"use server";

import { unstable_cache } from "next/cache";
import { getLocale } from "next-intl/server";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { readGamePortraitFigures } from "@/lib/game/figure-portraits";
import type { PortraitFigure } from "@/components/features/game/portrait/types";

const getPortraitFiguresCached = unstable_cache(
  (locale: string) => readGamePortraitFigures(createStaticClient(), locale, false),
  ["portrait-game-figures-historical-v2"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
);

export async function getPortraitFigures(): Promise<PortraitFigure[]> {
  return getPortraitFiguresCached(await getLocale());
}
