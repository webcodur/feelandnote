'use server';

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags';
import { createStaticClient } from '@/lib/supabase/static';
import { STATIC_REVALIDATE } from '@/lib/cache';
import { parseSpectrumJsonb, parseSpectrumJsonbWithReasons, type SpectrumStats, type SpectrumStatsWithReasons, type SpectrumJsonb } from '@/lib/spectrum/types';

export interface SpectrumQuickViewData {
  stats: SpectrumStats | null;
  statsWithReasons: SpectrumStatsWithReasons | null;
  rationale: { ko: string; en: string } | null;
  greeting: { ko: string; en: string | null } | null;
}

async function fetchSpectrumQuickViewData(celebId: string): Promise<SpectrumQuickViewData> {
  const supabase = createStaticClient();

  const [spectrumResult, dialoguesResult] = await Promise.all([
    supabase
      .from('celeb_persona')
      .select('spectrum:persona')
      .eq('celeb_id', celebId)
      .maybeSingle(),
    supabase
      .from('celeb_dialogues')
      .select('greeting:lines->greeting, greeting_en:lines_en->greeting')
      .eq('celeb_id', celebId)
      .maybeSingle()
  ]);

  let stats: SpectrumStats | null = null;
  let statsWithReasons: SpectrumStatsWithReasons | null = null;
  let rationale: { ko: string; en: string } | null = null;
  if (spectrumResult.data?.spectrum) {
    const jsonb = spectrumResult.data.spectrum as unknown as SpectrumJsonb;
    stats = parseSpectrumJsonb(jsonb);
    statsWithReasons = parseSpectrumJsonbWithReasons(jsonb);
    if (jsonb.rationale_ko) {
      rationale = { ko: jsonb.rationale_ko, en: jsonb.rationale_en };
    }
  }

  let greeting: { ko: string; en: string | null } | null = null;
  const dialogues = dialoguesResult.data as { greeting: string[] | null; greeting_en: string[] | null } | null;

  if (dialogues?.greeting && dialogues.greeting.length > 0) {
    greeting = {
      ko: dialogues.greeting[0],
      en: dialogues.greeting_en?.[0] ?? null
    };
  }

  return {
    stats,
    statsWithReasons,
    rationale,
    greeting
  };
}

export const getSpectrumQuickViewData = unstable_cache(
  fetchSpectrumQuickViewData,
  ['spectrum-quick-view'],
  // celeb_persona + celeb_dialogues
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.SPECTRUM, CACHE_TAGS.DIALOGUES] }
);
