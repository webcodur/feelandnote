import type { RankingCategory, RankingEntry, RankingScript, TimedCue } from './types'

export const FPS = 60
export const f = (sec: number) => Math.round(sec * FPS)

const INTRO_SEC = 2.8
const CATEGORY_SEC = 2.0
const OUTRO_SEC = 2.4
const MIN_EXPLAIN_SEC = 1.8
const CHAR_PER_SEC = 8
const TAIL_SEC = 0.45

export function entryNarration(entry: RankingEntry): string {
  const head = `${entry.rank}위, ${entry.name}`
  const bits = [head]
  if (entry.line?.trim()) bits.push(entry.line.trim())
  if (entry.note?.trim()) bits.push(entry.note.trim())
  return `${bits.join('. ')}.`
}

export function categoryNarration(category: RankingCategory): string {
  return category.name
}

function speakSec(text: string, floor: number): number {
  const chars = text.replace(/\s/g, '').length
  return Math.max(floor, chars / CHAR_PER_SEC + TAIL_SEC)
}

/** 10위부터 읽어 1위에서 끝낸다 */
export function rankedEntries(category: RankingCategory): RankingEntry[] {
  return [...category.entries].sort((a, b) => b.rank - a.rank)
}

export function buildCues(script: RankingScript): TimedCue[] {
  const cues: TimedCue[] = []
  let at = 0
  const push = (cue: TimedCue['cue'], text: string, sec: number) => {
    const duration = f(sec)
    cues.push({ cue, start: at, duration, text })
    at += duration
  }

  const introText = script.logline?.trim() || script.title.replace(/\n/g, ' ')
  push({ kind: 'intro' }, introText, speakSec(introText, INTRO_SEC))

  const oneAxis = script.categories.length === 1
  script.categories.forEach((category, categoryIndex) => {
    if (!oneAxis) {
      const catText = categoryNarration(category)
      push({ kind: 'category', categoryIndex }, catText, speakSec(catText, CATEGORY_SEC))
    }
    rankedEntries(category).forEach((entry, entryIndex) => {
      const text = entryNarration(entry)
      push({ kind: 'explain', categoryIndex, entryIndex }, text, speakSec(text, MIN_EXPLAIN_SEC))
    })
  })

  push({ kind: 'outro' }, '', OUTRO_SEC)
  return cues
}

export function calcTotalFrames(script: RankingScript): number {
  const cues = buildCues(script)
  const last = cues[cues.length - 1]
  return last ? last.start + last.duration : f(1)
}
