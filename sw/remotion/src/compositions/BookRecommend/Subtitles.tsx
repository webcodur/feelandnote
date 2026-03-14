import { useMemo } from 'react'
import { useCurrentFrame } from 'remotion'
import { FONT } from './fonts'
import type { BookRecommendScript } from './types'
import {
  toFrames, toAudioFrames, BRAND_FRAMES, CELEB_VISUAL_DELAY,
  TITLE_SUMMARY_GAP, SUMMARY_CONTEXT_GAP, CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, SENTENCE_BREATH,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, OUTRO_FALLBACK,
  summaryPhaseEnd as calcSummaryEnd, contextPhaseEnd as calcContextEnd,
  quotePhaseEnd as calcQuoteEnd, bookTotalFrames,
} from './timing'

type Sub = { start: number; end: number; speaker: string; text: string }

function splitIntoSentences(start: number, end: number, speaker: string, fullText: string): Sub[] {
  const sentences = fullText.split(/(?<=[.?!])\s+/).filter(Boolean)
  if (sentences.length <= 1) return [{ start, end, speaker, text: fullText }]
  const totalFrames = end - start
  // 문장 사이 호흡 간격을 빼고 남은 프레임을 글자 수 비례 배분
  const breathTotal = (sentences.length - 1) * SENTENCE_BREATH
  const distributableFrames = Math.max(totalFrames - breathTotal, totalFrames * 0.7)
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const subs: Sub[] = []
  let cursor = start
  for (let i = 0; i < sentences.length; i++) {
    if (i > 0) cursor += SENTENCE_BREATH  // 호흡 간격
    const frames = Math.round((sentences[i].length / totalChars) * distributableFrames)
    subs.push({ start: cursor, end: cursor + frames, speaker, text: sentences[i] })
    cursor += frames
  }
  return subs
}

function buildSubs(script: BookRecommendScript): Sub[] {
  const { narrator, host, books } = script
  const subs: Sub[] = []

  const celebIntroFrames = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : CELEB_INTRO_FALLBACK)
  const philosophyFrames = toFrames(host.voiceDuration)
  const hostIntroFrames = celebIntroFrames + philosophyFrames
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK

  const svcIntroFrames = narrator.serviceIntroDuration > 0 ? toFrames(narrator.serviceIntroDuration) : 0
  const fQuoteFrames = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0

  let cursor = BRAND_FRAMES + svcIntroFrames + fQuoteFrames
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  cursor += bridgeFrames

  // 서비스 인트로 자막
  if (svcIntroFrames > 0 && narrator.serviceIntro) {
    const svcStart = BRAND_FRAMES
    const svcEnd = svcStart + toAudioFrames(narrator.serviceIntroDuration)
    subs.push(...splitIntoSentences(svcStart, svcEnd, '나레이터', narrator.serviceIntro))
  }

  // 명언 자막
  if (fQuoteFrames > 0 && host.featuredQuote) {
    const fqStart = BRAND_FRAMES + svcIntroFrames
    const fqEnd = fqStart + toAudioFrames(host.featuredQuoteDuration!)
    subs.push(...splitIntoSentences(fqStart, fqEnd, host.nickname, host.featuredQuote))
  }

  // 나레이터 셀럽 소개 (순수 오디오 길이로 자막 분배)
  const celebVoiceStart = hostIntroStart + CELEB_VISUAL_DELAY
  const celebVoiceEnd = celebVoiceStart + toAudioFrames(narrator.celebIntroDuration)
  subs.push(...splitIntoSentences(celebVoiceStart, celebVoiceEnd, '나레이터', narrator.celebIntro))

  // 셀럽 감상철학 (순수 오디오 길이로 자막 분배)
  const philoStart = hostIntroStart + celebIntroFrames
  const philoEnd = philoStart + toAudioFrames(host.voiceDuration)
  subs.push(...splitIntoSentences(philoStart, philoEnd, host.nickname, host.philosophy))

  // 도서
  const hasInterlude = books.length > 10
  const interludeIndex = hasInterlude ? Math.ceil(books.length / 2) : -1
  const interludeFrames = hasInterlude
    ? (narrator.interludeDuration && narrator.interludeDuration > 0 ? toFrames(narrator.interludeDuration) : INTERLUDE_FRAMES)
    : 0

  for (let i = 0; i < books.length; i++) {
    if (i > 0) cursor += BOOK_GAP
    // 중간 리캡 + 인터루드 삽입
    if (i === interludeIndex) {
      cursor += RECAP_FRAMES // 중간 리캡 (자막 없음)
      if (narrator.interlude && narrator.interludeDuration && narrator.interludeDuration > 0) {
        const intAudioStart = cursor + 20 // 오디오는 20프레임 후 시작 (BookRecommend.tsx와 동기)
        subs.push(...splitIntoSentences(intAudioStart, intAudioStart + toAudioFrames(narrator.interludeDuration), '나레이터', narrator.interlude))
      }
      cursor += interludeFrames
    }
    const bs = cursor
    const b = books[i]
    const titleFrames = toFrames(b.titleDuration)
    const sEnd = calcSummaryEnd(b)
    const cEnd = calcContextEnd(b)

    // 제목+저자 (순수 오디오)
    subs.push({ start: bs, end: bs + toAudioFrames(b.titleDuration), speaker: '나레이터', text: `${b.title}, ${b.creator}` })

    // 요약맨 (순수 오디오)
    const summaryStart = bs + titleFrames + TITLE_SUMMARY_GAP
    subs.push(...splitIntoSentences(summaryStart, summaryStart + toAudioFrames(b.summaryDuration), '요약', b.summary))

    // 나레이터 맥락 (순수 오디오)
    const contextStart = bs + sEnd + SUMMARY_CONTEXT_GAP
    subs.push(...splitIntoSentences(contextStart, contextStart + toAudioFrames(b.contextDuration), '나레이터', b.context))

    // 셀럽 인용 (있을 때만, 순수 오디오)
    if (b.directQuote && b.quoteDuration) {
      const quoteStart = bs + cEnd + CONTEXT_QUOTE_GAP
      const quoteAudioFrames = toAudioFrames(b.quoteDuration)
      subs.push({ start: quoteStart, end: quoteStart + quoteAudioFrames, speaker: host.nickname, text: `"${b.directQuote}"` })

      // 후속 맥락 (있을 때만, 순수 오디오)
      if (b.contextAfter && b.contextAfterDuration) {
        const quoteFrames = toFrames(b.quoteDuration)
        const qEnd = cEnd + CONTEXT_QUOTE_GAP + quoteFrames
        const caStart = bs + qEnd + QUOTE_CONTEXTAFTER_GAP
        subs.push(...splitIntoSentences(caStart, caStart + toAudioFrames(b.contextAfterDuration), '나레이터', b.contextAfter))
      }
    }

    cursor += bookTotalFrames(b)
  }

  // 리캡
  cursor += RECAP_FRAMES

  // 아웃트로 (순수 오디오)
  if (narrator.outroDuration > 0) {
    subs.push(...splitIntoSentences(cursor, cursor + toAudioFrames(narrator.outroDuration), '나레이터', narrator.outro))
  }

  return subs
}

type Props = { script: BookRecommendScript }

export const Subtitles: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const subs = useMemo(() => buildSubs(script), [script])

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
