import type { VoiceSection } from '../voice-utils'
import type { CinematicImage, ImageField, VoiceInfo } from './types'

export function bookKey(i: number, phase: string) {
  return `D${String(i + 1).padStart(2, '0')}${phase}`
}

export function shortsKey(i: number, segId: string) {
  return `S${String(i + 1).padStart(2, '0')}-${segId}`
}

export function lookupVoice(sectionMap: Map<string, VoiceSection>, key: string, durationFromJson?: number): VoiceInfo {
  const sec = sectionMap.get(key)
  const exists = !!(sec?.gemini || sec?.elevenlabs || sec?.common)
  const fileDur = sec?.gemini?.duration ?? sec?.elevenlabs?.duration ?? sec?.common?.duration
  return { sectionKey: key, duration: durationFromJson ?? fileDur, exists }
}

export function matchImagesToField(
  images: CinematicImage[] | undefined,
  fieldName: ImageField,
  fieldText: string,
  isFirst: boolean,
): CinematicImage[] {
  if (!images?.length) return []
  return images.filter((img, i) => {
    if (i === 0) return img.field ? img.field === fieldName : isFirst
    if (img.field) return img.field === fieldName
    if (img.text) return fieldText.includes(img.text)
    return false
  })
}

export function unmatchedImages(
  images: CinematicImage[] | undefined,
  texts: string[],
): CinematicImage[] {
  if (!images?.length) return []
  return images.filter((img, i) => {
    if (i === 0) return false
    if (img.field) return false
    if (!img.text) return true
    return !texts.some(t => t.includes(img.text!))
  })
}

export function splitHighlights(text: string, anchors: string[]): { text: string; highlight: boolean }[] {
  if (!anchors.length) return [{ text, highlight: false }]
  const parts: { text: string; highlight: boolean }[] = []
  const sorted = anchors
    .map(a => ({ anchor: a, idx: text.indexOf(a) }))
    .filter(a => a.idx >= 0)
    .sort((a, b) => a.idx - b.idx)
  let cursor = 0
  for (const { anchor, idx } of sorted) {
    const pos = text.indexOf(anchor, cursor)
    if (pos < 0) continue
    if (pos > cursor) parts.push({ text: text.slice(cursor, pos), highlight: false })
    parts.push({ text: anchor, highlight: true })
    cursor = pos + anchor.length
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false })
  return parts.length ? parts : [{ text, highlight: false }]
}

export const stripExt = (f: string) => f.replace(/\.[^.]+$/, '')
