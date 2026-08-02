/**
 * 세력도감(Faction) 컷 전환 효과 — 이전 인물 위로 다음 인물이 효과적으로 들어온다.
 *
 * CueLayer가 컷 진입 구간(이전 컷이 아직 살아있는 동안)에 진행도(progress 0→1)를 넘기면,
 * 여기서 그 진행도에 맞춰 컨텐츠를 감싸 전환 효과를 입힌다.
 *
 * 슬라이드(slide·slideLeft·slideRight)는 두 컷이 함께 미끄러지므로 CueLayer가 직접 transform을
 * 처리한다(여기선 방향 판정 헬퍼만 제공). 나머지 효과는 다음 컷만 감싸 등장시킨다.
 *
 * 중요: 컨텐츠(children)는 항상 1겹만 쓴다 — 인물 컷의 Audio가 여러 겹으로 복제돼
 * 중복 재생되는 사고를 막기 위함. 멀티레이어가 필요한 효과도 오버레이만 덧댄다.
 */

import React from 'react'
import { interpolate, Easing } from 'remotion'

/** 컷 전환 효과 종류(이어지는 전환). 나머지(zoomin·kenburns)는 크로스페이드. */
export const CUT_TRANSITIONS = new Set<string>([
  'slide', 'slideLeft', 'slideRight',
  'glitch', 'tear', 'crt', 'zoompunch', 'whip', 'filmburn', 'pixelate', 'shutter',
])

/** 좌우 슬라이드 여부·방향 — slide/slideLeft는 왼쪽으로, slideRight는 오른쪽으로 흐른다. */
export const isSlideKind = (k: string | null | undefined) => k === 'slide' || k === 'slideLeft' || k === 'slideRight'
/** 슬라이드 방향: -1=왼쪽으로 흐름(다음은 오른쪽에서), +1=오른쪽으로 흐름(다음은 왼쪽에서) */
export const slideDir = (k: string | null | undefined): -1 | 1 => (k === 'slideRight' ? 1 : -1)

/** 효과별 진입 시간(초) — 이전 컷 끝보다 이만큼 앞당겨 시작한다. */
export function transitionEnterSec(kind: string): number {
  switch (kind) {
    case 'slide': case 'slideLeft': case 'slideRight': return 0.42
    case 'glitch': return 0.45
    case 'tear': return 0.55
    case 'crt': return 0.5
    case 'zoompunch': return 0.4
    case 'whip': return 0.32
    case 'filmburn': return 0.6
    case 'pixelate': return 0.5
    case 'shutter': return 0.5
    default: return 0.3
  }
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const easeOut = { ...clamp, easing: Easing.out(Easing.cubic) }
/** 결정적 의사난수 — frame·seed 기반(Math.random 금지: 렌더 재현성). -1~1 */
export const noise = (frame: number, seed: number) => {
  const v = Math.sin(frame * 12.9898 + seed * 78.233) * 43758.5453
  return (v - Math.floor(v)) * 2 - 1
}

/* ── 지속 글리치 — 그룹샷이 머무는 내내 옅게 지직거리고 불규칙하게 확 튄다(아날로그 TV) ──
 * 컷 전환용 GlitchEnter와 달리 진행도 없이 시간 내내 유지된다.
 * 평상시: 미세 떨림 + 옅은 색수차 + 늘 깔린 스캔라인.
 * 스파이크: 난수가 임계를 넘는 순간에만 색수차·가로 찢김·노이즈가 확 강해진다. */
export const HoldGlitch: React.FC<{ frame: number; startFrame: number; level?: 'light' | 'heavy' | 'tail'; gateFromLocal?: number; children: React.ReactNode }> = ({ frame, startFrame, level = 'heavy', gateFromLocal = 0, children }) => {
  const t = Math.max(0, frame - startFrame)
  // gateFromLocal>0이면 그 로컬프레임 전까지는 지직 없이 화면만 — 라이트가 컷 끝나기 직전 구간에만 지직거리게.
  if (t < gateFromLocal) return <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
  // 라이트는 떨림·밀림·색번짐·찢김을 확 줄여 내내 은은하게, 헤비·막판은 기존 강도.
  // 전역 30% 축소(0.7배) — 떨림·밀림·색번짐·찢김(스파이크 밴드 포함) 일괄.
  const k = (level === 'light' ? 0.3 : 1) * 0.7
  // 2프레임마다 갱신되는 거친 난수가 0.5를 넘는 순간만 0→1로 솟구친다(불규칙 지직).
  const burst = Math.max(0, noise(Math.floor(t / 2), 42) - 0.5) / 0.5
  const amp = (0.35 + burst * 1.0) * k
  // 스파이크 순간 화면 전체가 한쪽으로 확 밀린다(가로 슬립). 2프레임 단위로 유지돼 "밀렸다 돌아온다"가 보인다.
  const shove = burst * noise(Math.floor(t / 2), 71) * 24 * k
  const jitterX = noise(t, 1) * 1.4 * amp + shove
  const jitterY = noise(t, 7) * 0.7 * amp
  const rgb = 0.7 + burst * 6 * k
  const bands = burst > (level === 'light' ? 0.25 : 0.03)
    ? [0, 1, 2].map(i => ({
        top: (noise(t, i * 13 + 3) + 1) * 45,
        h: 3 + (noise(t, i * 5 + 2) + 1) * 3,
        dx: noise(t, i * 17 + 9) * 26 * burst * k,
        i,
      }))
    : []
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${jitterX.toFixed(2)}px, ${jitterY.toFixed(2)}px)`,
        filter: `drop-shadow(${rgb.toFixed(2)}px 0 0 rgba(255,0,60,0.35)) drop-shadow(${(-rgb).toFixed(2)}px 0 0 rgba(0,225,255,0.35))`,
      }}>
        {children}
      </div>
      {bands.map(b => (
        <div key={b.i} style={{
          position: 'absolute', left: 0, right: 0, top: `${b.top}%`, height: `${b.h}%`,
          transform: `translateX(${b.dx.toFixed(2)}px)`, background: 'rgba(255,255,255,0.05)',
          mixBlendMode: 'screen', borderTop: '1px solid rgba(255,255,255,0.14)', borderBottom: '1px solid rgba(0,0,0,0.3)',
        }} />
      ))}
      {/* 스캔라인 — 늘 옅게 깔린다 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.18, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0 2px, rgba(255,255,255,0.015) 2px 4px)', mixBlendMode: 'multiply' }} />
      {/* 노이즈 플래시 — 스파이크 순간만 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: '#ffffff', opacity: burst * Math.max(0, noise(t, 99)) * 0.08, mixBlendMode: 'screen' }} />
    </div>
  )
}

/* ── 글리치(아날로그 TV) — 색수차·가로 찢김·스캔라인·떨림으로 지직거리다 안정 ── */
const GlitchEnter: React.FC<{ progress: number; frame: number; children: React.ReactNode }> = ({ progress, frame, children }) => {
  const g = 1 - progress
  const jitterX = g * noise(frame, 1) * 16
  const jitterY = g * noise(frame, 7) * 4
  const rgb = g * 9
  const bands = g > 0.02
    ? [0, 1, 2].map(i => ({
        top: (noise(frame, i * 13 + 3) + 1) * 45,
        h: 5 + (noise(frame, i * 5 + 2) + 1) * 4,
        dx: noise(frame, i * 17 + 9) * 40 * g,
        i,
      }))
    : []
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${jitterX}px, ${jitterY}px)`,
        filter: rgb > 0.1
          ? `drop-shadow(${rgb}px 0 0 rgba(255,0,60,0.5)) drop-shadow(${-rgb}px 0 0 rgba(0,225,255,0.5)) saturate(${1 + g * 0.6}) contrast(${1 + g * 0.25})`
          : undefined,
      }}>
        {children}
      </div>
      {bands.map(b => (
        <div key={b.i} style={{
          position: 'absolute', left: 0, right: 0, top: `${b.top}%`, height: `${b.h}%`,
          transform: `translateX(${b.dx}px)`, background: 'rgba(255,255,255,0.06)',
          mixBlendMode: 'screen', borderTop: '1px solid rgba(255,255,255,0.18)', borderBottom: '1px solid rgba(0,0,0,0.35)',
        }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, opacity: g * 0.55, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0 2px, rgba(255,255,255,0.02) 2px 4px)', mixBlendMode: 'multiply' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: '#ffffff', opacity: g * Math.max(0, noise(frame, 99)) * 0.12, mixBlendMode: 'screen' }} />
    </div>
  )
}

/* ── 찢기 — 화면 가운데가 좌우로 갈라지며 다음 인물이 벌어져 나온다 ── */
const TearEnter: React.FC<{ progress: number; children: React.ReactNode }> = ({ progress, children }) => {
  const p = interpolate(progress, [0, 1], [0, 1], easeOut)
  const inset = (1 - p) * 50
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${inset}% 0 ${inset}%)` }}>
      {children}
      {progress < 1 && (
        <>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${inset}%`, width: 4, transform: 'translateX(-2px)', background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 16px 3px rgba(255,255,255,0.7)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: `${inset}%`, width: 4, transform: 'translateX(2px)', background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 16px 3px rgba(255,255,255,0.7)' }} />
        </>
      )}
    </div>
  )
}

/* ── CRT 켜짐 — 가로 한 줄에서 세로로 확 펼쳐진 뒤 가로로 펴지며 켜진다 ── */
const CrtEnter: React.FC<{ progress: number; children: React.ReactNode }> = ({ progress, children }) => {
  const sy = interpolate(progress, [0, 0.45], [0.012, 1], easeOut)
  const sx = interpolate(progress, [0.35, 1], [0.5, 1], easeOut)
  const bright = interpolate(progress, [0, 0.18, 1], [3.2, 1.5, 1], clamp)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scaleY(${sy}) scaleX(${sx})`, transformOrigin: 'center', filter: `brightness(${bright})` }}>
        {children}
      </div>
      {/* 켜지는 순간 가로 백색 섬광 */}
      {progress < 0.5 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, transform: 'translateY(-50%)', background: '#fff', opacity: interpolate(progress, [0, 0.5], [0.9, 0], clamp), boxShadow: '0 0 24px 6px rgba(255,255,255,0.8)' }} />
      )}
    </div>
  )
}

/* ── 줌 펀치 — 다음 인물이 확 다가오며(과확대→정지) 모션블러로 꽂힌다 ── */
const ZoomPunchEnter: React.FC<{ progress: number; children: React.ReactNode }> = ({ progress, children }) => {
  const s = interpolate(progress, [0, 1], [1.5, 1], easeOut)
  const blur = interpolate(progress, [0, 0.7, 1], [18, 6, 0], clamp)
  const op = interpolate(progress, [0, 0.3], [0, 1], clamp)
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `scale(${s})`, filter: blur > 0.1 ? `blur(${blur}px)` : undefined, opacity: op }}>
      {children}
    </div>
  )
}

/* ── 휙(whip pan) — 빠른 가로 쓸기 + 방향 모션블러로 순간 이동 ── */
const WhipEnter: React.FC<{ progress: number; children: React.ReactNode }> = ({ progress, children }) => {
  const x = interpolate(progress, [0, 1], [55, 0], easeOut)
  const blur = interpolate(progress, [0, 0.55, 1], [34, 10, 0], clamp)
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translateX(${x}%)`, filter: blur > 0.1 ? `blur(${blur}px)` : undefined }}>
      {children}
    </div>
  )
}

/* ── 필름 타들어감 — 가운데부터 드러나며 가장자리에 불자국 테두리 ── */
const FilmBurnEnter: React.FC<{ progress: number; children: React.ReactNode }> = ({ progress, children }) => {
  const r = interpolate(progress, [0, 1], [0, 150], clamp) // 드러나는 반경(%)
  const mask = `radial-gradient(circle at 50% 50%, #000 ${Math.max(0, r - 18)}%, transparent ${r}%)`
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask }}>
        {children}
      </div>
      {progress < 1 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen', background: `radial-gradient(circle at 50% 50%, transparent ${Math.max(0, r - 20)}%, rgba(255,140,0,0.55) ${Math.max(0, r - 9)}%, rgba(150,40,0,0.9) ${r}%, transparent ${r + 6}%)` }} />
      )}
    </div>
  )
}

/* ── 블러 디졸브 — 뿌옇게 뭉갰다 서서히 또렷하게. 데이터 값 'pixelate'는 호환용 옛 이름 ── */
const BlurDissolveEnter: React.FC<{ progress: number; children: React.ReactNode }> = ({ progress, children }) => {
  const blur = interpolate(progress, [0, 0.8, 1], [16, 4, 0], clamp)
  const op = interpolate(progress, [0, 0.35], [0, 1], clamp)
  const contrast = interpolate(progress, [0, 1], [1.5, 1], clamp)
  return (
    <div style={{ position: 'absolute', inset: 0, filter: `blur(${blur}px) contrast(${contrast})`, opacity: op, imageRendering: 'pixelated' }}>
      {children}
    </div>
  )
}

/* ── 셔터(블라인드) — 가로 띠들이 열리며 다음 인물이 드러난다 ── */
const ShutterEnter: React.FC<{ progress: number; children: React.ReactNode }> = ({ progress, children }) => {
  const bands = 8
  const closed = (1 - interpolate(progress, [0, 1], [0, 1], easeOut)) * (100 / bands)
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {children}
      {progress < 1 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `repeating-linear-gradient(0deg, #07070b 0 ${closed}%, transparent ${closed}% ${100 / bands}%)` }} />
      )}
    </div>
  )
}

/**
 * 컷 전환 래퍼 — kind에 맞는 진입 효과로 children(컷 컨텐츠)을 감싼다.
 * 슬라이드류는 CueLayer가 transform으로 직접 처리하므로 여기선 children 그대로 둔다.
 */
export const CutEnter: React.FC<{ kind: string; progress: number; frame: number; children: React.ReactNode }> = ({ kind, progress, frame, children }) => {
  if (progress >= 1) return <>{children}</>
  switch (kind) {
    case 'glitch': return <GlitchEnter progress={progress} frame={frame}>{children}</GlitchEnter>
    case 'tear': return <TearEnter progress={progress}>{children}</TearEnter>
    case 'crt': return <CrtEnter progress={progress}>{children}</CrtEnter>
    case 'zoompunch': return <ZoomPunchEnter progress={progress}>{children}</ZoomPunchEnter>
    case 'whip': return <WhipEnter progress={progress}>{children}</WhipEnter>
    case 'filmburn': return <FilmBurnEnter progress={progress}>{children}</FilmBurnEnter>
    case 'pixelate': return <BlurDissolveEnter progress={progress}>{children}</BlurDissolveEnter>
    case 'shutter': return <ShutterEnter progress={progress}>{children}</ShutterEnter>
    default: return <>{children}</> // 슬라이드류 등은 CueLayer가 처리
  }
}
