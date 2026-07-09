'use client'

import type { FactionPerson } from '@/lib/faction-types'
import type { EleVoiceNote } from '@/lib/ele-voice-notes'
import type { FactionVoiceHistoryEntry } from '@/lib/faction-voice-casting-history'
import type { EleVoiceLike } from '../../../../../../voice-utils'

export type FactionEleVoiceRecommendation = {
  voiceId: string
  score: number
  reasons: string[]
}

type VoiceNeedRule = {
  id: string
  label: string
  triggers: string[]
  age?: string[]
  useCase?: string[]
  category?: string[]
  voiceTerms: string[]
  weight: number
}

type BuildRecommendationArgs = {
  person: FactionPerson
  voices: EleVoiceLike[]
  currentVoiceId?: string
  targetGender?: 'male' | 'female' | null
  style?: string
  emotions?: string[]
  voiceNotes?: Record<string, EleVoiceNote>
  voiceHistory?: Record<string, FactionVoiceHistoryEntry>
  blockedVoiceIds?: Set<string>
  limit?: number
}

const RULES: VoiceNeedRule[] = [
  {
    id: 'authority',
    label: '권력자형',
    triggers: [
      'ceo', 'founder', 'co-founder', 'chairman', 'president', 'leader', 'investor', 'venture', 'capital',
      'board', 'king', 'emperor', 'general', 'commander', '창업', '대표', '회장', '대통령', '지도자',
      '투자', '자본', '제왕', '황제', '장군', '권력',
    ],
    age: ['middle_aged', 'old'],
    useCase: ['narration', 'news'],
    category: ['professional', 'cloned'],
    voiceTerms: ['deep', 'authoritative', 'confident', 'serious', 'mature', 'commanding', 'powerful', 'leader'],
    weight: 4,
  },
  {
    id: 'researcher',
    label: '연구자형',
    triggers: [
      'research', 'researcher', 'scientist', 'professor', 'engineer', 'architect', 'ai', 'deepmind', 'openai',
      'google brain', 'paper', 'lab', '연구', '과학', '교수', '엔지니어', '개발', '설계자', '논문', '실험실',
    ],
    age: ['middle_aged'],
    useCase: ['narration', 'education', 'conversational'],
    category: ['professional', 'generated'],
    voiceTerms: ['calm', 'clear', 'thoughtful', 'intelligent', 'precise', 'soft', 'balanced'],
    weight: 3,
  },
  {
    id: 'hacker',
    label: '해커형',
    triggers: [
      'hacker', 'coder', 'developer', 'cypherpunk', 'cryptographer', 'privacy', 'open source', 'activist',
      'whistleblower', 'resistance', '해커', '코더', '개발자', '암호', '프라이버시', '오픈소스', '운동가',
      '활동가', '내부고발', '저항',
    ],
    age: ['young', 'middle_aged'],
    useCase: ['conversational', 'narration'],
    category: ['generated', 'professional'],
    voiceTerms: ['fast', 'sharp', 'tense', 'serious', 'quiet', 'focused', 'intense', 'whisper'],
    weight: 3.5,
  },
  {
    id: 'warm',
    label: '부드러운 톤',
    triggers: ['gentle', 'warm', 'seamless', 'soft', 'calm', '부드럽', '온화', '따뜻', '차분', '담담'],
    age: ['young', 'middle_aged'],
    useCase: ['conversational', 'narration'],
    category: ['professional', 'generated'],
    voiceTerms: ['gentle', 'warm', 'soft', 'calm', 'friendly', 'smooth', 'natural'],
    weight: 2.5,
  },
  {
    id: 'dark',
    label: '어두운 긴장감',
    triggers: [
      'serious', 'heavy', 'dark', 'warning', 'war', 'spy', 'mafia', 'cartel', 'state', 'military',
      '진중', '묵직', '경고', '전쟁', '스파이', '마피아', '국가', '군사', '냉정',
    ],
    age: ['middle_aged', 'old'],
    useCase: ['narration', 'news'],
    category: ['professional', 'cloned'],
    voiceTerms: ['deep', 'serious', 'dark', 'grave', 'dramatic', 'heavy', 'low', 'stern'],
    weight: 3,
  },
  {
    id: 'energetic',
    label: '빠른 추진력',
    triggers: ['fast', 'bold', 'passionate', 'playful', 'startup', 'product', 'builder', '빠르게', '대담', '열정', '제품'],
    age: ['young', 'middle_aged'],
    useCase: ['conversational', 'social'],
    category: ['generated', 'professional'],
    voiceTerms: ['fast', 'energetic', 'bright', 'bold', 'dynamic', 'confident', 'upbeat'],
    weight: 2.8,
  },
]

const EMOTION_TERMS: Record<string, string[]> = {
  serious: ['serious', 'grave', 'calm', 'focused', 'stern'],
  heavy: ['deep', 'heavy', 'low', 'dark', 'serious'],
  fast: ['fast', 'dynamic', 'energetic', 'quick'],
  confident: ['confident', 'authoritative', 'clear', 'bold'],
  bold: ['bold', 'powerful', 'strong', 'commanding'],
  declaring: ['authoritative', 'clear', 'announcer', 'commanding'],
  whisper: ['whisper', 'quiet', 'soft', 'low'],
  gentle: ['gentle', 'soft', 'warm', 'calm'],
  warm: ['warm', 'friendly', 'soft'],
  passionate: ['passionate', 'energetic', 'emotional', 'dynamic'],
  angry: ['angry', 'intense', 'stern', 'sharp'],
  playful: ['playful', 'bright', 'upbeat'],
  seamless: ['smooth', 'natural', 'calm'],
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase()
}

function includesAny(source: string, tokens: readonly string[]) {
  return tokens.some(token => source.includes(token))
}

function uniqPush(list: string[], value: string) {
  if (!list.includes(value)) list.push(value)
}

function personSearchText(person: FactionPerson, style?: string, emotions?: string[]) {
  return normalize([
    person.name,
    person.nameEn,
    person.role,
    person.org,
    person.epithet,
    person.epithetEn,
    person.quoteSpeaker,
    person.quoteStyle,
    style,
    ...(emotions ?? []),
    ...(person.lines ?? []),
    ...(person.linesEn ?? []),
    person.quote,
    person.quoteOrigin,
    person.quoteEn,
  ].filter(Boolean).join(' '))
}

function voiceSearchText(voice: EleVoiceLike) {
  return normalize([
    voice.name,
    voice.category,
    voice.description,
    ...(voice.labels ? Object.values(voice.labels) : []),
  ].filter(Boolean).join(' '))
}

function labelMatches(voice: EleVoiceLike, key: string, values: readonly string[] | undefined) {
  if (!values?.length) return false
  const current = key === 'category' ? voice.category : voice.labels?.[key]
  return !!current && values.includes(current)
}

function voiceGender(voice: EleVoiceLike) {
  const gender = voice.labels?.gender
  return gender === 'male' || gender === 'female' ? gender : null
}

function isGenderAllowed(voice: EleVoiceLike, targetGender: 'male' | 'female' | null | undefined) {
  if (!targetGender) return true
  const gender = voiceGender(voice)
  return !gender || gender === targetGender
}

function matchedRules(personText: string) {
  return RULES.filter(rule => includesAny(personText, rule.triggers))
}

function historyMatchesPerson(personText: string, history: FactionVoiceHistoryEntry | undefined, emotions: string[]) {
  if (!history) return false
  const terms = [
    ...history.roles,
    ...history.emotions,
    ...history.usages.flatMap(usage => [
      usage.groupName,
      usage.clusterLabel,
      usage.org,
      usage.role,
      usage.quoteSpeaker,
      usage.quoteStyle,
      ...(usage.lines ?? []),
      ...(usage.quoteEleEmotions ?? []),
    ]),
  ]
    .filter((term): term is string => typeof term === 'string' && term.trim().length >= 3)
    .map(term => term.toLowerCase())

  return terms.some(term => personText.includes(term)) || emotions.some(em => history.emotions.includes(em))
}

export function buildFactionEleVoiceRecommendations({
  person,
  voices,
  currentVoiceId,
  targetGender,
  style,
  emotions = [],
  voiceNotes = {},
  voiceHistory = {},
  blockedVoiceIds,
  limit = 5,
}: BuildRecommendationArgs): FactionEleVoiceRecommendation[] {
  if (!voices.length) return []

  const personText = personSearchText(person, style, emotions)
  const rules = matchedRules(personText)
  const emotionTerms = emotions.flatMap(em => EMOTION_TERMS[em.toLowerCase()] ?? [em.toLowerCase()])

  return voices
    .filter(voice => !blockedVoiceIds?.has(voice.voice_id))
    .filter(voice => isGenderAllowed(voice, targetGender))
    .map(voice => {
      const reasons: string[] = []
      const text = voiceSearchText(voice)
      const note = voiceNotes[voice.voice_id]
      const history = voiceHistory[voice.voice_id]
      let score = 0

      if (voice.voice_id === currentVoiceId) {
        score += 1.5
        uniqPush(reasons, '현재 선택')
      }

      if (voice.preview_url) {
        score += 0.6
        uniqPush(reasons, '샘플 있음')
      }

      if (targetGender && voiceGender(voice) === targetGender) {
        score += 3.5
        uniqPush(reasons, '성별 일치')
      }

      if (note?.status === 'good') {
        score += 3
        uniqPush(reasons, '좋음 메모')
      } else if (note?.status === 'maybe') {
        score += 1.2
        uniqPush(reasons, '보류 메모')
      }

      if (history?.count) {
        score += Math.min(2, 0.5 + history.count * 0.25)
        uniqPush(reasons, `기존 ${history.count}회`)
        if (historyMatchesPerson(personText, history, emotions)) {
          score += 2
          uniqPush(reasons, '기존 매칭 유사')
        }
      }

      for (const rule of rules) {
        let matched = false

        if (labelMatches(voice, 'age', rule.age)) {
          score += rule.weight * 0.6
          matched = true
        }
        if (labelMatches(voice, 'use_case', rule.useCase)) {
          score += rule.weight * 0.45
          matched = true
        }
        if (labelMatches(voice, 'category', rule.category)) {
          score += rule.weight * 0.35
          matched = true
        }
        if (includesAny(text, rule.voiceTerms)) {
          score += rule.weight
          matched = true
        }

        if (matched) uniqPush(reasons, rule.label)
      }

      if (emotionTerms.length && includesAny(text, emotionTerms)) {
        score += 2.4
        uniqPush(reasons, '감정 태그 일치')
      }

      if (!rules.length && voice.preview_url) {
        score += 0.8
        uniqPush(reasons, '비교용 후보')
      }

      if ((voice.category === 'professional' || voice.category === 'cloned') && !reasons.includes('권력자형')) {
        score += 0.4
      }

      return { voiceId: voice.voice_id, score, reasons }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
