'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { EpisodeData } from './EpisodeEditor'
import type { R2Summary } from './R2Status'

type Props = {
  episode: EpisodeData
  fileNames: string[]
  r2Summary: R2Summary
  series: string
  name: string
}

function checkText(ep: EpisodeData) {
  return !!(ep.narrator.celebIntro && ep.narrator.bridge && ep.narrator.outro
    && ep.host.philosophy && ep.books.length > 0 && ep.books.every(b => b.summary && b.context))
}

function checkImages(ep: EpisodeData) {
  return !!ep.host.avatar_url && ep.books.every(b => !!b.thumbnail_url)
}

/** 프로덕션 모델 판별 + 엔진별 기대/현황 계산 */
function computeVoice(ep: EpisodeData, fileNames: string[]) {
  const hasEL = !!ep.host.elevenlabsVoiceId
  const model = hasEL ? 'Gemini + ElevenLabs' : 'Gemini'

  // ElevenLabs 대상 키워드
  const elKeys: string[] = []
  if (hasEL) {
    if ((ep.host.voiceDuration ?? 0) > 0) elKeys.push('philosophy')
    if ((ep.host.featuredQuoteDuration ?? 0) > 0) elKeys.push('featured-quote')
    if (ep.shorts) ep.shorts.segments.forEach(s => {
      if (s.role === 'celeb' && (s.duration ?? 0) > 0) elKeys.push(s.id)
    })
  }

  // Gemini 대상 수 계산
  let geminiExp = 0
  const countIf = (d?: number) => { if (d && d > 0) geminiExp++ }
  countIf(ep.narrator.serviceGreetingDuration)
  countIf(ep.narrator.serviceIntroDuration)
  countIf(ep.narrator.celebIntroDuration)
  countIf(ep.narrator.bridgeDuration)
  countIf(ep.narrator.outroDuration)
  countIf(ep.narrator.labelSummaryDuration)
  countIf(ep.narrator.labelContextDuration)
  countIf(ep.narrator.returnIntroDuration)
  countIf(ep.narrator.prevRecapDuration)
  countIf(ep.narrator.interludeDuration)
  for (const b of ep.books) {
    if (b.titleDuration > 0) geminiExp++
    if (b.summaryDuration > 0) geminiExp++
    if (b.contextDuration > 0) geminiExp++
    if ((b.contextAfterDuration ?? 0) > 0) geminiExp++
    // quote는 EL 없을 때 Gemini
    if ((b.quoteDuration ?? 0) > 0 && !hasEL) geminiExp++
  }
  if (!hasEL) {
    countIf(ep.host.voiceDuration)
    countIf(ep.host.featuredQuoteDuration)
    if (ep.shorts) ep.shorts.segments.forEach(s => {
      if (s.role === 'celeb' && (s.duration ?? 0) > 0) geminiExp++
    })
  }
  if (ep.shorts) ep.shorts.segments.forEach(s => {
    if (s.role === 'narrator' && (s.duration ?? 0) > 0) geminiExp++
  })

  const elPresent = elKeys.filter(k => fileNames.some(f => f.includes(k))).length
  const geminiPresent = Math.min(fileNames.length - elPresent, geminiExp)

  return {
    model,
    hasEL,
    gemini: { expected: geminiExp, present: geminiPresent, ok: geminiPresent >= geminiExp },
    el: { expected: elKeys.length, present: elPresent, ok: elPresent >= elKeys.length },
    totalFiles: fileNames.length,
  }
}

/** 에피소드 음성 BOM (Bill of Materials) */
function computeBOM(ep: EpisodeData) {
  const n = ep.books.length
  const quotes = ep.books.filter(b => (b.quoteDuration ?? 0) > 0).length
  const ctxAfter = ep.books.filter(b => (b.contextAfterDuration ?? 0) > 0).length
  const shorts = ep.shorts?.segments.length ?? 0

  // 기본 나레이션 (존재하는 것만)
  let base = 0
  const baseItems: string[] = []
  if ((ep.narrator.serviceGreetingDuration ?? 0) > 0) { base++; baseItems.push('인사') }
  if ((ep.narrator.serviceIntroDuration ?? 0) > 0) { base++; baseItems.push('소개') }
  if ((ep.host.featuredQuoteDuration ?? 0) > 0) { base++; baseItems.push('명언') }
  if ((ep.narrator.celebIntroDuration ?? 0) > 0) { base++; baseItems.push('인물소개') }
  if ((ep.host.voiceDuration ?? 0) > 0) { base++; baseItems.push('감상철학') }
  if ((ep.narrator.labelSummaryDuration ?? 0) > 0) { base++; baseItems.push('라벨×2') }
  if ((ep.narrator.labelContextDuration ?? 0) > 0) base++ // 라벨×2에 포함
  if ((ep.narrator.outroDuration ?? 0) > 0) { base++; baseItems.push('아웃트로') }
  if ((ep.narrator.returnIntroDuration ?? 0) > 0) { base++; baseItems.push('복귀인사') }
  if ((ep.narrator.prevRecapDuration ?? 0) > 0) { base++; baseItems.push('전편요약') }
  if ((ep.narrator.interludeDuration ?? 0) > 0) { base++; baseItems.push('중간안내') }

  const bookBase = n * 3 // title + summary + context
  const total = base + bookBase + quotes + ctxAfter + shorts

  return { n, base, baseItems, bookBase, quotes, ctxAfter, shorts, total }
}

function Dot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <span className="text-success-text">✓</span>
  if (warn) return <span className="text-warning-text">!</span>
  return <span className="text-text-dim">○</span>
}

export function StatusOverview({ episode, fileNames, r2Summary, series, name }: Props) {
  const [counterpart, setCounterpart] = useState<string | null>(null)

  const isEn = name.endsWith('-en')
  const pairName = isEn ? name.replace(/-en$/, '') : `${name}-en`
  const locale = (episode as Record<string, unknown>).locale === 'en' ? 'EN' : 'KO'

  useEffect(() => {
    fetch(`/api/${series}/episodes/${pairName}`)
      .then(r => { if (r.ok) setCounterpart(pairName); else setCounterpart(null) })
      .catch(() => setCounterpart(null))
  }, [series, pairName])

  const textOk = checkText(episode)
  const imageOk = checkImages(episode)
  const voice = computeVoice(episode, fileNames)
  const bom = computeBOM(episode)
  const needUpload = r2Summary.localOnly + r2Summary.unsynced
  const r2Ok = fileNames.length > 0 && needUpload === 0

  // 다음 행동
  let next = ''
  if (!textOk) next = '텍스트 필수 필드를 채우세요'
  else if (!imageOk) next = '이미지(아바타/책 표지)를 등록하세요'
  else if (fileNames.length === 0) next = 'Gemini TTS를 생성하세요'
  else if (!voice.gemini.ok) next = `Gemini 음성 ${voice.gemini.expected - voice.gemini.present}개를 생성하세요`
  else if (voice.hasEL && !voice.el.ok) next = `ElevenLabs 셀럽 음성 ${voice.el.expected - voice.el.present}개를 생성하세요`
  else if (!r2Ok) next = `R2에 ${needUpload}개를 업로드하세요`
  else next = '렌더링 준비 완료'

  return (
    <section className="bg-bg-secondary border border-border rounded-lg px-4 py-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-accent tracking-widest">STATUS</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-main text-text-dim font-mono">{locale}</span>
          <span className="text-[10px] text-text-dim">프로덕션: {voice.model}</span>
        </div>
        {counterpart && (
          <Link href={`/${series}/${counterpart}`} className="text-xs text-accent hover:text-accent-hover">
            {isEn ? 'KO 버전 →' : 'EN 버전 →'}
          </Link>
        )}
      </div>

      {/* BOM — 필요 음성 공식 + 파일 코드 범례 */}
      <div className="mb-2 px-1 text-xs font-mono leading-relaxed space-y-1">
        <div className="text-text-dim">
          <span className="text-text-secondary">기본 {bom.base}</span>
          <span> + </span>
          <span className="text-text-secondary">{bom.n}권×3 = {bom.bookBase}</span>
          {bom.quotes > 0 && <><span> + </span><span className="text-text-secondary">인용 {bom.quotes}</span></>}
          {bom.ctxAfter > 0 && <><span> + </span><span className="text-text-secondary">후속 {bom.ctxAfter}</span></>}
          {bom.shorts > 0 && <><span> + </span><span className="text-text-secondary">쇼츠 {bom.shorts}</span></>}
          <span> = </span>
          <span className="text-accent font-bold">총 {bom.total}개</span>
        </div>
      </div>

      {/* 체크리스트 */}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {/* 텍스트 */}
        <Dot ok={textOk} warn={episode.books.length > 0 && !textOk} />
        <span className={textOk ? 'text-text-primary' : 'text-text-dim'}>텍스트</span>

        {/* 이미지 */}
        <Dot ok={imageOk} warn={!imageOk} />
        <span className={imageOk ? 'text-text-primary' : 'text-text-dim'}>이미지</span>

        {/* Gemini */}
        <Dot ok={voice.gemini.ok && fileNames.length > 0} warn={fileNames.length > 0 && !voice.gemini.ok} />
        <span className={voice.gemini.ok && fileNames.length > 0 ? 'text-text-primary' : 'text-text-dim'}>
          Gemini
          {fileNames.length > 0 && <span className="text-text-dim text-xs ml-1">{voice.gemini.present}/{voice.gemini.expected}</span>}
        </span>

        {/* ElevenLabs (해당 인물만) */}
        {voice.hasEL && <>
          <Dot ok={voice.el.ok} warn={voice.el.present > 0 && !voice.el.ok} />
          <span className={voice.el.ok ? 'text-text-primary' : 'text-text-dim'}>
            ElevenLabs
            <span className="text-text-dim text-xs ml-1">{voice.el.present}/{voice.el.expected}</span>
          </span>
        </>}

        {/* R2 */}
        <Dot ok={r2Ok} warn={needUpload > 0} />
        <span className={r2Ok ? 'text-text-primary' : 'text-text-dim'}>
          R2
          {needUpload > 0 && <span className="text-warning-text text-xs ml-1">{needUpload}개 업로드 필요</span>}
        </span>

        {/* 렌더 */}
        <Dot ok={false} />
        <span className="text-text-dim">렌더</span>
      </div>

      <div className="mt-2 text-xs text-accent">→ {next}</div>
    </section>
  )
}
