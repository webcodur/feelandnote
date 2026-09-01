'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { unstable_cache } from 'next/cache'

import { STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import {
  DIALOGUE_BRIEF_SELECT,
  getDisplayDialogueQuote,
  type DialogueBrief,
} from '@/lib/utils/celeb-dialogues'

export interface CelebGreetingProfile {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  greeting: string[] | null
  greeting_en: string[] | null
  quotes: string | null
  quotes_en: string | null
  speech_tone: string | null
  has_voice: boolean
  voice_v: number
  voice_speed: number
}

async function fetchCelebGreetingProfile(celebId: string): Promise<CelebGreetingProfile | null> {
  const supabase = createStaticClient()
  const [profileResult, dialogueResult] = await Promise.all([
    supabase
      .from('celebs')
      .select('id, nickname, nickname_en, avatar_url, speech_tone, has_voice, voice_v, voice_speed')
      .eq('id', celebId)
      .eq('publication_status', 'active')
      .maybeSingle(),
    supabase
      .from('celeb_dialogues')
      .select(DIALOGUE_BRIEF_SELECT)
      .eq('celeb_id', celebId)
      .maybeSingle(),
  ])

  throwOnQueryError('getCelebGreetingProfile profile', profileResult.error)
  throwOnQueryError('getCelebGreetingProfile dialogue', dialogueResult.error)
  if (!profileResult.data) return null

  const profile = profileResult.data
  const dialogue = dialogueResult.data as DialogueBrief | null
  return {
    id: profile.id,
    nickname: profile.nickname || 'Unknown',
    nickname_en: profile.nickname_en ?? null,
    avatar_url: profile.avatar_url,
    greeting: dialogue?.greeting ?? null,
    greeting_en: dialogue?.greeting_en ?? null,
    quotes: getDisplayDialogueQuote(dialogue?.quote),
    quotes_en: getDisplayDialogueQuote(dialogue?.quote_en),
    speech_tone: profile.speech_tone ?? null,
    has_voice: profile.has_voice ?? false,
    voice_v: profile.voice_v ?? 0,
    voice_speed: profile.voice_speed ?? 1,
  }
}

export const getCelebGreetingProfile = unstable_cache(
  fetchCelebGreetingProfile,
  ['celeb-greeting-profile'],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES],
  },
)
