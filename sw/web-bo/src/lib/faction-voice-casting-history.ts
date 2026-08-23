import { readFile } from 'fs/promises'
import path from 'path'

export type FactionVoiceUsage = {
  voiceId: string
  slot: 'quote' | 'epithet'
  episode: string
  episodeTitle?: string
  groupName?: string
  clusterLabel?: string
  personName: string
  personNameEn?: string
  role?: string
  org?: string
  lines?: string[]
  quoteSpeaker?: string
  quoteStyle?: string
  quoteEleEmotions?: string[]
  quotePlaybackRate?: number
}

export type FactionVoiceHistoryEntry = {
  voiceId: string
  count: number
  usages: FactionVoiceUsage[]
  roles: string[]
  emotions: string[]
}

export type FactionVoiceHistoryResponse = {
  updatedAt: string
  voices: Record<string, FactionVoiceHistoryEntry>
}

type FactionData = {
  title?: string
  groups?: Array<{
    name?: string
    clusters?: Array<{ label?: string; people?: FactionPersonLike[] }>
    people?: FactionPersonLike[]
  }>
}

type FactionPersonLike = {
  isPerson?: boolean
  name?: string
  nameEn?: string
  role?: string
  org?: string
  lines?: string[]
  quoteSpeaker?: string
  quoteStyle?: string
  quoteElevenlabsVoiceId?: string
  quoteEleEmotions?: string[]
  quotePlaybackRate?: number
  epithetElevenlabsVoiceId?: string
}

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const FACTIONS_ROOT = path.join(REMOTION_ROOT, 'public', 'factions')

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function firstLine(value: unknown): string | undefined {
  return cleanText(value)?.split('\n')[0]?.trim() || undefined
}

function addUniq(list: string[], value: unknown) {
  const cleaned = cleanText(value)
  if (cleaned && !list.includes(cleaned)) list.push(cleaned)
}

function usageText(usage: FactionVoiceUsage) {
  return [
    usage.personName,
    usage.personNameEn,
    usage.role,
    usage.org,
    usage.groupName,
    usage.clusterLabel,
    ...(usage.lines ?? []),
    usage.quoteSpeaker,
    usage.quoteStyle,
    ...(usage.quoteEleEmotions ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
}

function makeUsage({
  voiceId,
  slot,
  episode,
  episodeTitle,
  groupName,
  clusterLabel,
  person,
}: {
  voiceId: string
  slot: 'quote' | 'epithet'
  episode: string
  episodeTitle?: string
  groupName?: string
  clusterLabel?: string
  person: FactionPersonLike
}): FactionVoiceUsage | null {
  const personName = cleanText(person.name)
  if (!personName) return null
  return {
    voiceId,
    slot,
    episode,
    ...(episodeTitle ? { episodeTitle } : {}),
    ...(groupName ? { groupName } : {}),
    ...(clusterLabel ? { clusterLabel } : {}),
    personName,
    ...(cleanText(person.nameEn) ? { personNameEn: cleanText(person.nameEn) } : {}),
    ...(cleanText(person.role) ? { role: cleanText(person.role) } : {}),
    ...(cleanText(person.org) ? { org: cleanText(person.org) } : {}),
    ...(Array.isArray(person.lines) ? { lines: person.lines.filter(Boolean) } : {}),
    ...(cleanText(person.quoteSpeaker) ? { quoteSpeaker: cleanText(person.quoteSpeaker) } : {}),
    ...(cleanText(person.quoteStyle) ? { quoteStyle: cleanText(person.quoteStyle) } : {}),
    ...(Array.isArray(person.quoteEleEmotions) ? { quoteEleEmotions: person.quoteEleEmotions.filter(Boolean) } : {}),
    ...(typeof person.quotePlaybackRate === 'number' ? { quotePlaybackRate: person.quotePlaybackRate } : {}),
  }
}

async function readFactionData(episode: string): Promise<FactionData | null> {
  try {
    const raw = await readFile(path.join(FACTIONS_ROOT, episode, 'faction-data.json'), 'utf-8')
    return JSON.parse(raw.replace(/^\uFEFF/, '')) as FactionData
  } catch {
    return null
  }
}

export async function collectFactionVoiceHistory(): Promise<FactionVoiceHistoryResponse> {
  const voices: Record<string, FactionVoiceHistoryEntry> = {}
  const registered = JSON.parse(
    await readFile(path.join(FACTIONS_ROOT, '_episodes.json'), 'utf-8'),
  ) as string[]

  for (const episode of registered) {
    const data = await readFactionData(episode)
    if (!data?.groups?.length) continue

    for (const group of data.groups) {
      const groupName = firstLine(group.name)
      const clusters = group.clusters?.length
        ? group.clusters
        : group.people?.length
          ? [{ people: group.people }]
          : []

      for (const cluster of clusters) {
        for (const person of cluster.people ?? []) {
          if (person.isPerson === false) continue
          const pairs: Array<{ voiceId?: string; slot: 'quote' | 'epithet' }> = [
            { voiceId: person.quoteElevenlabsVoiceId, slot: 'quote' },
            { voiceId: person.epithetElevenlabsVoiceId, slot: 'epithet' },
          ]

          for (const pair of pairs) {
            const voiceId = cleanText(pair.voiceId)
            if (!voiceId) continue
            const usage = makeUsage({
              voiceId,
              slot: pair.slot,
              episode,
              episodeTitle: firstLine(data.title),
              groupName,
              clusterLabel: firstLine(cluster.label),
              person,
            })
            if (!usage) continue

            const current = voices[voiceId] ?? { voiceId, count: 0, usages: [], roles: [], emotions: [] }
            current.usages.push(usage)
            current.count = current.usages.length
            addUniq(current.roles, usage.role)
            for (const line of usage.lines ?? []) addUniq(current.roles, line)
            for (const emotion of usage.quoteEleEmotions ?? []) addUniq(current.emotions, emotion)
            voices[voiceId] = current
          }
        }
      }
    }
  }

  for (const entry of Object.values(voices)) {
    entry.usages.sort((a, b) => usageText(a).localeCompare(usageText(b)))
    entry.count = entry.usages.length
    entry.usages = entry.usages.slice(0, 8)
    entry.roles = entry.roles.slice(0, 12)
    entry.emotions = entry.emotions.slice(0, 12)
  }

  return { updatedAt: new Date().toISOString(), voices }
}
