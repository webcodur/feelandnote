import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import type { Speaker, DiscourseHoldMotion, DiscourseImageCrop } from '../types'
import { f } from '../timing'
import { BG, FONT, FONT_SERIF, TEXT_PAINT, CONTENT_PAD, accentClarityPaint } from '../constants'
import { imgSrc, initials, holdMotionTransform, isPushinZoom } from '../utils'
import { FactionMedia } from '../../Faction/sections/FactionMedia'
import { CaptionBackdrop } from '../../Faction/sections/CaptionBackdrop'

/** 직함 줄 등장 간격(초) — 한 줄씩 이어 뜬다 */
const LINE_STAGGER_SEC = 0.22
/** 줄 페이드인 길이(초) */
const LINE_FADE_SEC = 0.3

/**
 * 인물 소개 컷 — 이 자리에 누가 앉았는지 알린다.
 *
 * 이미지가 없어도 깨지지 않는다: 이니셜 + 인물색 그라데이션으로 자리를 지킨다.
 * (담화는 이미지·음성보다 대본이 먼저 서는 시리즈다 — 빈손 상태에서도 구조가 보여야 한다.)
 */
export const CastCard: React.FC<{
  episodeName: string
  speaker: Speaker
  color: string
  frame: number
  cueStart: number
  cueDuration: number
  hold: DiscourseHoldMotion
}> = ({ episodeName, speaker, color, frame, cueStart, cueDuration, hold }) => {
  const [imgErr, setImgErr] = React.useState(false)
  const local = frame - cueStart
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

  const lines = (speaker.lines ?? []).filter(l => l?.trim()).slice(0, 3)

  const styleFor = (crop?: DiscourseImageCrop): React.CSSProperties => {
    const x = crop?.x ?? 50
    const y = crop?.y ?? 50
    return {
      width: '100%', height: '100%', objectFit: 'cover',
      objectPosition: `${x}% ${y}%`,
      transformOrigin: isPushinZoom(hold) ? '50% 50%' : `${x}% ${y}%`,
      transform: holdMotionTransform(hold, Math.max(0, local), crop?.scale ?? 1, {
        focusX: crop?.x, focusY: crop?.y, spanFrames: Math.max(1, cueDuration),
      }),
    }
  }

  const photo = !speaker.image || imgErr ? (
    // 이미지 없는 인물 — 이니셜 + 인물색. 색이 인물마다 갈리므로 이 상태로도 누구 자리인지 읽힌다.
    <AbsoluteFill style={{
      alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(160deg, ${color}33 0%, ${BG} 62%)`,
      transform: holdMotionTransform(hold, Math.max(0, local), 1, { spanFrames: Math.max(1, cueDuration) }),
    }}>
      <span style={{ color: `${color}66`, fontFamily: FONT, fontSize: 300, fontWeight: 800 }}>{initials(speaker.name)}</span>
    </AbsoluteFill>
  ) : (
    <FactionMedia src={imgSrc(episodeName, speaker.image)} startFrame={cueStart} onError={() => setImgErr(true)} style={styleFor(speaker.imageCrop)} />
  )

  // 텍스트 등장 — 이름이 먼저 박히고 직함이 한 줄씩 이어 뜬다.
  const nameOp = interpolate(local, [0, f(0.35)], [0, 1], clamp)
  const nameTy = interpolate(local, [0, f(0.35)], [22, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
  // 컷이 끝나기 직전 텍스트 선퇴장 — 경계에서 펑 하고 사라지지 않게(사진 전환은 CueLayer 담당).
  const exitOp = interpolate(local, [Math.max(0, cueDuration - f(0.45)), cueDuration], [1, 0], clamp)

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill>{photo}</AbsoluteFill>
      {/* 하단 어둠 — 이름·직함이 어떤 사진 위에서도 읽히게 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.9) 100%)` }} />
      <AbsoluteFill style={{
        flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        padding: `0 ${CONTENT_PAD + 16}px 76px`, gap: 16, opacity: exitOp,
      }}>
        {/* 수식어 — 인물을 규정하는 한 문장. 이름 위에 얹는다. */}
        {speaker.epithet && (
          <div style={{
            opacity: interpolate(local, [f(0.5), f(0.5 + LINE_FADE_SEC)], [0, 1], clamp),
            maxWidth: 900, marginBottom: 10,
            color: 'rgba(255,255,255,0.82)', fontFamily: FONT, fontSize: 30, fontWeight: 600,
            lineHeight: 1.4, textAlign: 'center', wordBreak: 'keep-all', ...TEXT_PAINT,
          }}>{speaker.epithet}</div>
        )}
        {/* 이름 — 인물색으로. 담화는 누가 말하는지가 전부라 이름과 색을 한 몸으로 묶는다. */}
        <div style={{
          opacity: nameOp, transform: `translateY(${nameTy}px)`,
          color: color, fontFamily: FONT_SERIF, fontSize: 78, fontWeight: 800,
          letterSpacing: 2, lineHeight: 1.1, textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)',
          WebkitTextStroke: '1px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
          ...accentClarityPaint(color),
        }}><CaptionBackdrop>{speaker.name}</CaptionBackdrop></div>
        {/* 생몰 — 시대 초월 조합에서 대비로 읽힌다 */}
        {speaker.era && (
          <div style={{
            opacity: interpolate(local, [f(0.4), f(0.4 + LINE_FADE_SEC)], [0, 1], clamp),
            color: 'rgba(255,255,255,0.6)', fontFamily: FONT, fontSize: 26, fontWeight: 600, letterSpacing: 1.5,
            ...TEXT_PAINT,
          }}>{speaker.era}</div>
        )}
        {/* 직함 3줄 — 한 줄씩 순차 등장. 1번째가 짧은 대표 직함(작성 원칙은 팩션과 동일) */}
        {lines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {lines.map((line, i) => {
              const ls = f(0.55 + i * LINE_STAGGER_SEC)
              const op = interpolate(local, [ls, ls + f(LINE_FADE_SEC)], [0, 1], clamp)
              const ty = interpolate(local, [ls, ls + f(LINE_FADE_SEC)], [14, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
              return (
                <div key={i} style={{
                  opacity: op, transform: `translateY(${ty}px)`,
                  color: i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)',
                  fontFamily: FONT, fontSize: i === 0 ? 34 : 28, fontWeight: i === 0 ? 800 : 600,
                  lineHeight: 1.35, textAlign: 'center', wordBreak: 'keep-all', ...TEXT_PAINT,
                }}>{line}</div>
              )
            })}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
