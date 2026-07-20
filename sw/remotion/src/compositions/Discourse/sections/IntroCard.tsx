import React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import type { DiscourseScript } from '../types'
import { INTRO_SEC, INTRO_FADE_OUT_SEC, f } from '../timing'
import { BG, FG, FONT, FONT_SERIF, DEFAULT_ACCENT, CONTENT_PAD, TEXT_PAINT } from '../constants'
import { imgSrc, nameHead, nameTail, resolveNotice } from '../utils'
import { FilledImage } from '../../Faction/sections/FilledImage'

/**
 * 시작 화면 — 논제(무엇을 다투는가) + 시작문구 + **고지 카드**.
 *
 * 영상 명칭은 상단 헤더가 프레임 0부터 계속 들고 있으므로 여기서 다시 크게 쓰지 않는다(중복 제거 — 팩션과 동일).
 * 논제가 비어 있는 편(1인 독백 등)만 영상 명칭을 논제 자리에 올린다.
 *
 * 고지 카드는 이 시리즈의 존재 조건이다(§3 고지 원칙 1번째 겹).
 * 하단 상시 소자막(Discourse.tsx)·아웃트로와 함께 3중으로 건다. **조건부로 지우지 않는다.**
 */
export const IntroCard: React.FC<{
  script: DiscourseScript
  episodeName: string
  isEn: boolean
  part?: number
  lvPart?: number
}> = ({ script, episodeName, isEn, part, lvPart }) => {
  const frame = useCurrentFrame()

  // 논제 — 없으면 영상 명칭(편별 지정 우선)으로 대체한다.
  const titleCap = (part != null && script.titleByPart?.[part]) || (lvPart != null && script.titleByLvPart?.[lvPart]) || script.title
  const headline = script.topic?.trim() || nameHead(titleCap)
  // 부제 — 영상 명칭 뒷부분. 논제를 머리로 올린 편에서는 상단 헤더가 이미 명칭을 통째로 들고 있으므로 생략한다(중복 제거).
  const subline = script.topic?.trim() ? '' : nameTail(titleCap)
  const logline = (part != null && script.loglineByPart?.[part]) || script.logline
  const notice = resolveNotice(script, isEn)

  // 배경·문구 동기 — 컷 끝에서 함께 꺼져 첫 인물 컷 크로스페이드와 겹친다(검정 텀 최소화).
  const introSec = script.introSec ?? INTRO_SEC
  const fadeOut0 = f(Math.max(0, introSec - INTRO_FADE_OUT_SEC))
  const fadeOut1 = Math.max(fadeOut0 + 1, f(introSec))
  const outOp = interpolate(frame, [fadeOut0, fadeOut1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // 등장 — 검정 페이드인과 같은 구간에서 문구가 살짝 떠오른다.
  const inOp = interpolate(frame, [0, f(0.8)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const inTy = interpolate(frame, [0, f(0.8)], [26, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })

  const hasBg = !!script.introImage

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill style={{ opacity: outOp }}>
        {/* 시작 화면 이미지 — 있으면 배경. 문구가 읽히도록 위에 어두운 막을 덮는다. */}
        {hasBg && (
          <>
            <FilledImage src={imgSrc(episodeName, script.introImage as string)} objPos="center center" scale={1} fit="cover" onError={() => {}} />
            <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}d9 0%, ${BG}a6 45%, ${BG}e6 100%)` }} />
          </>
        )}
        <AbsoluteFill style={{
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: `0 ${CONTENT_PAD + 24}px`, gap: 34,
          opacity: inOp, transform: `translateY(${inTy}px)`,
        }}>
          {/* 논제 — 이 자리에서 무엇을 다투는가. 화면에서 가장 큰 글자. */}
          <div style={{
            color: FG, fontFamily: FONT_SERIF, fontSize: 84, fontWeight: 800,
            letterSpacing: 1, lineHeight: 1.25, textAlign: 'center', wordBreak: 'keep-all',
            ...TEXT_PAINT,
          }}>{headline}</div>
          {subline && (
            <div style={{
              color: DEFAULT_ACCENT, fontFamily: FONT_SERIF, fontSize: 44, fontWeight: 700,
              letterSpacing: 2, lineHeight: 1.35, textAlign: 'center', wordBreak: 'keep-all',
              ...TEXT_PAINT,
            }}>{subline}</div>
          )}
          {/* 시작문구 */}
          {logline && (
            <div style={{
              color: '#E8B84B', fontFamily: FONT_SERIF, fontSize: 42, fontWeight: 700,
              letterSpacing: 1, lineHeight: 1.4, textAlign: 'center', whiteSpace: 'pre-line', wordBreak: 'keep-all',
              textShadow: '0 2px 30px rgba(0,0,0,0.92), 0 0 34px rgba(0,0,0,0.86)',
            }}>{logline}</div>
          )}
          {/* 고지 카드 — 실존 인물이 실제로 하지 않은 말을 하는 시리즈의 최소 방어선. 지우지 않는다. */}
          <div style={{
            marginTop: 22, maxWidth: 860,
            border: '2px solid rgba(255,255,255,0.22)', borderRadius: 16,
            background: 'rgba(0,0,0,0.55)', padding: '26px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              color: 'rgba(255,255,255,0.55)', fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: 6,
            }}>{isEn ? 'NOTICE' : '안내'}</div>
            <div style={{
              color: 'rgba(255,255,255,0.88)', fontFamily: FONT, fontSize: 30, fontWeight: 600,
              lineHeight: 1.5, textAlign: 'center', wordBreak: 'keep-all',
            }}>{notice}</div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
