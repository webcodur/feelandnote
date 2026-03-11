'use server';

import { createClient } from '@/lib/supabase/server';
import { parsePersonaJsonb, parsePersonaJsonbWithReasons, type PersonaStats, type PersonaStatsWithReasons, type PersonaJsonb } from '@/lib/persona/types';

export interface PersonaQuickViewData {
  stats: PersonaStats | null;
  statsWithReasons: PersonaStatsWithReasons | null;
  rationale: { ko: string; en: string } | null;
  greeting: { ko: string; en: string | null } | null;
}

export async function getPersonaQuickViewData(celebId: string): Promise<PersonaQuickViewData> {
  const supabase = await createClient();

  const [personaResult, dialoguesResult] = await Promise.all([
    supabase
      .from('celeb_persona')
      .select('persona')
      .eq('celeb_id', celebId)
      .maybeSingle(),
    supabase
      .from('celeb_dialogues')
      .select('lines, lines_en')
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
  const dialogues = dialoguesResult.data as { lines: Record<string, string[]>, lines_en: Record<string, string[]> | null } | null;

  if (dialogues?.lines?.greeting && dialogues.lines.greeting.length > 0) {
    greeting = {
      ko: dialogues.lines.greeting[0],
      en: dialogues.lines_en?.greeting?.[0] ?? null
    };
  }

  return {
    stats,
    statsWithReasons,
    rationale,
    greeting
  };
}
