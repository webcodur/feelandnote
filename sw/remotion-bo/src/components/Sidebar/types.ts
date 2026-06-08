export type EpisodeStatus = 'todo' | 'live' | 'done'

export type EpisodeSummary = {
  name: string
  nickname: string
  booksCount: number
  hasShorts: boolean
  voiceCount: number
  birthYear: number | null
  status: EpisodeStatus
  group: string
}

export type PartEntry = {
  partNum: number
  baseName: string
  status: EpisodeStatus
  group: string
  ko?: EpisodeSummary
  en?: EpisodeSummary
}

export type PersonGroup = {
  personKey: string
  nickname: string
  birthYear: number | null
  status: EpisodeStatus
  group: string
  parts: PartEntry[]
}

export type CandidateSummary = { name: string; nickname: string; booksCount: number; birthYear: number | null }

export type TabKey =
  | { kind: 'group'; group: string }
  | { kind: 'draft' }
