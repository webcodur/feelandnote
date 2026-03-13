import { useCurrentFrame } from 'remotion'
import { FONT } from './fonts'
import type { BookRecommendScript } from './types'

const FPS = 30
const toFrames = (sec: number) => Math.ceil(sec * FPS) + 15
const BRAND_FRAMES = 120
const CELEB_VISUAL_DELAY = 75
const TITLE_SUMMARY_GAP = 25
const SUMMARY_CONTEXT_GAP = 25
const CONTEXT_QUOTE_GAP = 20
const QUOTE_CONTEXTAFTER_GAP = 20
const BOOK_GAP = 60
const RECAP_FRAMES = 150

type Sub = { start: number; end: number; speaker: string; text: string }

function splitIntoSentences(start: number, end: number, speaker: string, fullText: string): Sub[] {
  const sentences = fullText.split(/(?<=[.?!])\s+/).filter(Boolean)
  if (sentences.length <= 1) return [{ start, end, speaker, text: fullText }]
  const totalFrames = end - start
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const subs: Sub[] = []
  let cursor = start
  for (const sentence of sentences) {
    const frames = Math.round((sentence.length / totalChars) * totalFrames)
    subs.push({ start: cursor, end: cursor + frames, speaker, text: sentence })
    cursor += frames
  }
  return subs
}

function buildSubs(script: BookRecommendScript): Sub[] {
  const { narrator, host, books } = script
  const subs: Sub[] = []

  const celebIntroFrames = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophyFrames = toFrames(host.voiceDuration)
  const hostIntroFrames = celebIntroFrames + philosophyFrames
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 105

  let cursor = BRAND_FRAMES
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  cursor += bridgeFrames

  // 나레이터 셀럽 소개
  const celebVoiceStart = hostIntroStart + CELEB_VISUAL_DELAY
  const celebVoiceEnd = celebVoiceStart + toFrames(narrator.celebIntroDuration)
  subs.push(...splitIntoSentences(celebVoiceStart, celebVoiceEnd, '나레이터', narrator.celebIntro))

  // 셀럽 감상철학
  const philoStart = hostIntroStart + celebIntroFrames
  const philoEnd = philoStart + philosophyFrames
  subs.push(...splitIntoSentences(philoStart, philoEnd, host.nickname, host.philosophy))

  // 도서
  const summaryPhaseEnd = (b: (typeof books)[0]) =>
    toFrames(b.titleDuration) + TITLE_SUMMARY_GAP + toFrames(b.summaryDuration)
  const contextPhaseEnd = (b: (typeof books)[0]) =>
    summaryPhaseEnd(b) + SUMMARY_CONTEXT_GAP + toFrames(b.contextDuration)
  const quotePhaseEnd = (b: (typeof books)[0]) =>
    b.quoteDuration
      ? contextPhaseEnd(b) + CONTEXT_QUOTE_GAP + toFrames(b.quoteDuration)
      : contextPhaseEnd(b)
  const bookTotal = (b: (typeof books)[0]) => {
    if (!b.quoteDuration) return contextPhaseEnd(b)
    const qEnd = quotePhaseEnd(b)
    if (!b.contextAfterDuration) return qEnd
    return qEnd + QUOTE_CONTEXTAFTER_GAP + toFrames(b.contextAfterDuration)
  }

  for (let i = 0; i < books.length; i++) {
    if (i > 0) cursor += BOOK_GAP
    const bs = cursor
    const b = books[i]
    const titleFrames = toFrames(b.titleDuration)
    const summaryFrames = toFrames(b.summaryDuration)
    const contextFrames = toFrames(b.contextDuration)
    const sEnd = summaryPhaseEnd(b)
    const cEnd = contextPhaseEnd(b)

    // 제목+저자
    subs.push({ start: bs, end: bs + titleFrames, speaker: '나레이터', text: `${b.title}, ${b.creator}` })

    // 요약맨
    const summaryStart = bs + titleFrames + TITLE_SUMMARY_GAP
    subs.push(...splitIntoSentences(summaryStart, summaryStart + summaryFrames, '요약', b.summary))

    // 나레이터 맥락
    const contextStart = bs + sEnd + SUMMARY_CONTEXT_GAP
    subs.push(...splitIntoSentences(contextStart, contextStart + contextFrames, '나레이터', b.context))

    // 셀럽 인용 (있을 때만)
    if (b.directQuote && b.quoteDuration) {
      const quoteStart = bs + cEnd + CONTEXT_QUOTE_GAP
      const quoteFrames = toFrames(b.quoteDuration)
      subs.push({ start: quoteStart, end: quoteStart + quoteFrames, speaker: host.nickname, text: `"${b.directQuote}"` })

      // 후속 맥락 (있을 때만)
      if (b.contextAfter && b.contextAfterDuration) {
        const qEnd = cEnd + CONTEXT_QUOTE_GAP + quoteFrames
        const caStart = bs + qEnd + QUOTE_CONTEXTAFTER_GAP
        const caFrames = toFrames(b.contextAfterDuration)
        subs.push(...splitIntoSentences(caStart, caStart + caFrames, '나레이터', b.contextAfter))
      }
    }

    cursor += bookTotal(b)
  }

  // 리캡
  cursor += RECAP_FRAMES

  // 아웃트로
  if (narrator.outroDuration > 0) {
    const outroFrames = toFrames(narrator.outroDuration)
    subs.push(...splitIntoSentences(cursor, cursor + outroFrames, '나레이터', narrator.outro))
  }

  return subs
}

type Props = { script: BookRecommendScript }

export const Subtitles: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const subs = buildSubs(script)

  const current = subs.find((s) => frame >= s.start && frame < s.end)
  if (!current) return null

  const isSummary = current.speaker === '요약'
  const isCeleb = !isSummary && current.speaker !== '나레이터'

  return (
    <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: '10px 24px', maxWidth: 900, textAlign: 'center' }}>
        <div style={{ color: isCeleb ? '#c8a46e' : isSummary ? '#8bb8a8' : '#888', fontSize: 12, fontFamily: FONT.sans, marginBottom: 3, letterSpacing: 1 }}>
          {current.speaker}
        </div>
        <div style={{ color: '#e8e0d0', fontSize: 20, fontFamily: FONT.sans, lineHeight: 1.5 }}>
          {current.text}
        </div>
      </div>
    </div>
  )
}
