'use server';

import { createClient } from '@/lib/supabase/server';
import { parsePersonaJsonb, type PersonaStats, type PersonaJsonb } from '@/lib/persona/types';

export interface PersonaQuickViewData {
  stats: PersonaStats | null;
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
  if (personaResult.data?.persona) {
    stats = parsePersonaJsonb(personaResult.data.persona as unknown as PersonaJsonb);
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
    greeting
  };
}
