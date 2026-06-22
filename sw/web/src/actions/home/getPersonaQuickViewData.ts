'use server';

import { unstable_cache } from 'next/cache';
import { createStaticClient } from '@/lib/supabase/static';
import { STATIC_REVALIDATE } from '@/lib/cache';
import { parsePersonaJsonb, parsePersonaJsonbWithReasons, type PersonaStats, type PersonaStatsWithReasons, type PersonaJsonb } from '@/lib/persona/types';

export interface PersonaQuickViewData {
  stats: PersonaStats | null;
  statsWithReasons: PersonaStatsWithReasons | null;
  rationale: { ko: string; en: string } | null;
  greeting: { ko: string; en: string | null } | null;
}

async function fetchPersonaQuickViewData(celebId: string): Promise<PersonaQuickViewData> {
  const supabase = createStaticClient();

  const [personaResult, dialoguesResult] = await Promise.all([
    supabase
      .from('celeb_persona')
      .select('persona')
      .eq('celeb_id', celebId)
      .maybeSingle(),
    supabase
      .from('celeb_dialogues')
      .select('greeting:lines->greeting, greeting_en:lines_en->greeting')
      .eq('celeb_id', celebId)
      .maybeSingle()
  ]);

  let stats: PersonaStats | null = null;
  let statsWithReasons: PersonaStatsWithReasons | null = null;
  let rationale: { ko: string; en: string } | null = null;
  if (personaResult.data?.persona) {
    const jsonb = personaResult.data.persona as unknown as PersonaJsonb;
    stats = parsePersonaJsonb(jsonb);
    statsWithReasons = parsePersonaJsonbWithReasons(jsonb);
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

export const getPersonaQuickViewData = unstable_cache(
  fetchPersonaQuickViewData,
  ['persona-quick-view'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
);
