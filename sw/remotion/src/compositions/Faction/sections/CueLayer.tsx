import React from 'react'
import { AbsoluteFill, interpolate, Easing } from 'remotion'
import type { FactionScript, Orientation } from '../types'
import { CROSSFADE_SEC, OUTRO_CROSSFADE_SEC, CHAPTER_FADE_SEC, personQuoteEndSec, f, type TimedCue } from '../timing'
import { HEADER_H, SAFE_BOTTOM, BG } from '../constants'
import { imgSrc, clustersOf, personCutKind, resolveHoldMotion, resolveGroupHoldMotion, resolveGlitchHold, resolveHoldShake, resolveZoomSpeed, resolveEnterMotion, resolveOutroImage } from '../utils'
import { CutEnter, transitionEnterSec, isSlideKind, slideDir } from '../transitions'
import { vnPersonQuote, vnTimingKey } from '../voice-names'
import { IntroCard } from './IntroCard'
import { GroupCard, ClusterCard } from './GroupCard'
import { PersonCard } from './PersonCard'
import { EraCard } from './EraCard'
import { ChapterCard } from './ChapterCard'
import { FilledImage } from './FilledImage'
// import { BrandLogo } from '../../BookRecommend/utils' // 종료 화면 브랜드 로고 미노출(주석 처리)

/** 마지막 화면(아웃트로) — 종료 화면(이미지·영상)이 있으면 화면 가득(비율 유지+여백 블러), 없으면 브랜드 로고(FEEL & NOTE). 롱폼이면 롱폼 전용(outroImageLong) 우선. */
const OutroCard: React.FC<{ script: FactionScript; episodeName: string; isShorts: boolean; part?: number; startFrame?: number }> = ({ script, episodeName, isShorts, part, startFrame }) => {
  const [err, setErr] = React.useState(false)
  const outroMedia = resolveOutroImage(script, isShorts, part)
  if (outroMedia && !err) {
    return (
      <AbsoluteFill style={{ background: BG }}>
        {/* 종료 화면이 영상이면 이 컷이 뜨는 시점(startFrame)부터 0초로 재생 — 안 넘기면 영상 끝 프레임에 멈춰 사진처럼 보인다 */}
        <FilledImage src={imgSrc(episodeName, outroMedia)} objPos="center center" scale={1} startFrame={startFrame} fit="contain" onError={() => setErr(true)} />
      </AbsoluteFill>
    )
  }
  // 종료 화면(이미지·영상) 미설정 시 — FEEL & NOTE 브랜드 로고는 노출하지 않는다(주석 처리). 검정 화면으로 둔다.
  // return (
  //   <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  //     <BrandLogo variant="full" fontSize={96} />
  //   </div>
  // )
  return <AbsoluteFill style={{ background: BG }} />
}

export const CueLayer: React.FC<{ tc: TimedCue; script: FactionScript; episodeName: string; frame: number; orientation: Orientation; part?: number; lvPart?: number; nextCutKind?: string | null; nextKind?: string | null; isLast?: boolean; isLastPerson?: boolean; isShorts?: boolean }> = ({ tc, script, episodeName, frame, orientation, part, lvPart, nextCutKind, nextKind, isLast, isLastPerson, isShorts = false }) => {
  const { start, duration, cue } = tc
  const end = start + duration
  // 최종화면(outro) 진입은 더 완만한 크로스페이드, 챕터 검정 브릿지는 마지막 인물이 검정으로 서서히 덮이도록 길게, 그 외는 기본값.
  const crossSec = cue.kind === 'outro' ? OUTRO_CROSSFADE_SEC
    : cue.kind === 'chapterBlack' ? CHAPTER_FADE_SEC
    : CROSSFADE_SEC
  const cf = f(crossSec)
  const clampLR = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

  // 자기 컷 전환(진입 효과) 종류 — 세로 쇼츠 인물 컷만.
  const cutKind = personCutKind(script, cue, orientation)

  // 진입: 자기 컷 전환이면 이전 컷 끝보다 앞당겨 시작(이전 인물 위로). 아니면 크로스페이드.
  const enterSec = cutKind ? transitionEnterSec(cutKind) : crossSec
  const enterStart = start - f(enterSec)
  // 챕터 검정 브릿지 직전 컷 — 브릿지가 시작되기 전에 완전히 사라져야 한다.
  // 기본 크로스페이드(컷이 끝난 뒤 cf 동안 서서히 소멸)를 그대로 두면, 검정 브릿지(0.25초)가 이 컷보다 먼저 걷혀
  // 아직 남아 있던 이전 화면이 되살아나 보인다(전환점에서 이전 챕터 마지막 화면이 잠깐 되돌아오는 현상).
  const toBlack = nextKind === 'chapterBlack'
  // 화면 밖 컷은 내용을 만들기 전에 즉시 종료 — 매 프레임 전체 컷을 돌므로 여기서 끊어야 싸다.
  if (frame < enterStart || frame > (toBlack ? end : end + cf)) return null

  const noZoom = !!script.noZoom
  let content: React.ReactNode = null
  if (cue.kind === 'intro') content = <IntroCard script={script} episodeName={episodeName} orientation={orientation} part={part} lvPart={lvPart} isShorts={isShorts} />
  // 종료 화면 영상은 크로스페이드가 시작되는 시점(enterStart)부터 재생·존재하게 해야 교차가 보인다.
  // start부터로 잡으면 페이드인 구간엔 영상이 아직 없어 교차 없이 툭 나타난다.
  else if (cue.kind === 'outro') content = <OutroCard script={script} episodeName={episodeName} isShorts={isShorts} part={part} startFrame={enterStart} />
  else if (cue.kind === 'era') content = <EraCard label={cue.label} />
  // 챕터 전환 검정 브릿지 — 순수 검정 컷. 앞뒤 크로스페이드가 이전 챕터를 검정으로 닫고 표지를 검정에서 연다(검정 경유 전환).
  else if (cue.kind === 'chapterBlack') content = <AbsoluteFill style={{ background: BG }} />
  else if (cue.kind === 'chapter') content = <ChapterCard chapter={cue.chapter} episodeName={episodeName} cueStart={start} cueDuration={duration} />

  else if (cue.kind === 'group') {
    const g = script.groups[cue.groupIndex]
    content = <GroupCard episodeName={episodeName} group={g} frame={frame} cueStart={start} orientation={orientation} noZoom={noZoom} hold={resolveGroupHoldMotion(g, script)} shake={resolveHoldShake(undefined, g, script)} zoomSpeed={resolveZoomSpeed(undefined, g, script)} />
  } else if (cue.kind === 'cluster') {
    const g = script.groups[cue.groupIndex]
    const cl = clustersOf(g)[cue.clusterIndex]
    // 그룹샷 지지직 — 미지정이면 전 세력 기본 켜짐
    content = <ClusterCard episodeName={episodeName} group={g} cluster={cl} frame={frame} cueStart={start} cueDuration={end - start} orientation={orientation} noZoom={noZoom} hold={resolveGroupHoldMotion(g, script, cl)} shake={resolveHoldShake(cl.holdShake, g, script)} enter={resolveEnterMotion(cl.enterMotion, g, script)} glitch={resolveGlitchHold(cl.holdGlitch, g, script, true)} zoomSpeed={resolveZoomSpeed(cl.zoomSpeed, g, script)} />
  } else if (cue.kind === 'person') {
    const g = script.groups[cue.groupIndex]
    const person = clustersOf(g)[cue.clusterIndex].people[cue.personIndex]
    const stem = vnTimingKey(vnPersonQuote(cue.groupIndex, cue.personIndex, cue.clusterIndex))
    // 마지막 인물 컷이면 대사 끝 시점부터 줌인을 멈추고 종료 꼬리 동안 정지시킨다.
    const zoomFreezeSec = isLast ? personQuoteEndSec(person, cue.steps, isShorts, { script }) : undefined
    // 지속 효과 — 인물→세력→에피소드 계승(레거시 zoom 승계 포함)을 여기서 풀어 카드에 넘긴다.
    const hold = resolveHoldMotion(person, g, script)
    // 개인샷 지지직 — 미지정이면 기본 꺼짐(데이터로 켤 수 있음)
    const glitch = resolveGlitchHold(person.holdGlitch, g, script, false)
    const shake = resolveHoldShake(person.holdShake, g, script)
    const zoomSpeed = resolveZoomSpeed(person.zoomSpeed, g, script)
    const enter = resolveEnterMotion(person.enterMotion, g, script)
    // 대사 표시 방식 — 인물 단위가 있으면 우선, 없으면 에피소드 전역 기본, 둘 다 없으면 박스.
    const quoteDisplay = person.quoteDisplay ?? script.quoteDisplay ?? 'box'
    const quoteCaptionPos = person.quoteCaptionPos ?? script.quoteCaptionPos ?? 'bottom'
    const quoteCaptionStyle = person.quoteCaptionStyle ?? script.quoteCaptionStyle ?? 'default'
    content = <PersonCard episodeName={episodeName} group={g} person={person} frame={frame} cueStart={start} cueDuration={end - start} orientation={orientation} groupIndex={cue.groupIndex} personIndex={cue.personIndex} clusterIndex={cue.clusterIndex} steps={cue.steps} voiceTiming={script.voiceTimings?.[stem]} zoomFreezeSec={zoomFreezeSec} isShorts={isShorts} isLast={isLastPerson} noZoom={noZoom} hold={hold} enter={enter} glitch={glitch} shake={shake} zoomSpeed={zoomSpeed} quoteDisplay={quoteDisplay} quoteCaptionPos={quoteCaptionPos} quoteCaptionStyle={quoteCaptionStyle} />
  }

  // 종료: 다음 컷이 슬라이드면 이 컷도 함께 그 방향으로 밀려난다(두 인물 동시 슬라이드).
  const nextSlide = isSlideKind(nextCutKind)
  const exitStart = nextSlide ? end - f(transitionEnterSec(nextCutKind!)) : end

  // ── 슬라이드 transform(두 컷이 함께 미끄러짐) ──
  let slideX = 0
  const selfSlide = isSlideKind(cutKind)
  if (selfSlide && frame < start) {
    const p = interpolate(frame, [enterStart, start], [0, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
    // slideLeft(dir -1): 다음은 오른쪽(+100)에서 옴 / slideRight(dir +1): 왼쪽(-100)에서
    const fromX = slideDir(cutKind) === 1 ? -100 : 100
    slideX = fromX * (1 - p)
  }
  if (nextSlide && frame >= exitStart) {
    const p = interpolate(frame, [exitStart, end], [0, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
    // slideLeft: 화면이 왼쪽으로 흐름 → 이 컷은 왼쪽(-100)으로 / slideRight: 오른쪽(+100)
    const toX = slideDir(nextCutKind) === 1 ? 100 : -100
    slideX = toX * p
  }

  // 불투명도 — 컷 전환/슬라이드는 효과·이동이 담당(불투명 유지), 그 외는 크로스페이드.
  const fadeIn = cutKind ? 1 : interpolate(frame, [start - cf, start], [0, 1], clampLR)
  const fadeOut = nextSlide ? 1
    : toBlack ? interpolate(frame, [end - f(CHAPTER_FADE_SEC), end], [1, 0], clampLR)
    : interpolate(frame, [end, end + cf], [1, 0], clampLR)
  const opacity = Math.min(fadeIn, fadeOut)

  // 세로: 본문 컷은 상·하단 블랙바 사이(MID)에 그려 위아래 잘림을 통일한다.
  // 종료 화면도 이미지를 쓰면 시작 화면과 똑같이 MID에 가둬 위아래 블러가 블랙바 밖으로 새지 않게 한다.
  // 이미지 없는 브랜드 로고 엔딩만 예외로 풀스크린에 그려 로고를 화면 정중앙에 둔다.
  const isBrandOutro = cue.kind === 'outro' && !script.outroImage
  const useHeader = orientation === 'portrait' && !isBrandOutro

  // 슬라이드는 transform(이동)으로만 — A·B 원본은 흐리지 않는다(선명 유지).
  // 두 컷 경계의 완충(ab) 블러 띠는 화면 좌표에서 단일 레이어로 MAIN이 따로 얹는다.
  const enterProgress = cutKind ? interpolate(frame, [enterStart, start], [0, 1], clampLR) : 1
  const useCutEnter = cutKind != null && !selfSlide
  const wrapped = useCutEnter ? <CutEnter kind={cutKind!} progress={enterProgress} frame={frame}>{content}</CutEnter> : content
  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    ...(useHeader ? { top: HEADER_H, left: 0, right: 0, bottom: SAFE_BOTTOM } : { inset: 0 }),
    overflow: 'hidden',
    opacity,
    transform: slideX !== 0 ? `translateX(${slideX}%)` : undefined,
  }
  return <div style={wrapStyle}>{wrapped}</div>
}
