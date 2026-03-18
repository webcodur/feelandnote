import React from 'react'
import { AbsoluteFill, Audio, Img, interpolate, spring, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../BookRecommend/fonts'
import { BrandLogo, fadeInOut, safeImg } from '../BookRecommend/utils'
import { BrandIntro } from '../BookRecommend/sections/BrandIntro'
import { RadarChart } from './sections/RadarChart'
import { DispositionBars } from './sections/DispositionBars'
import { HexChart } from './sections/HexChart'
import { ScoreGauge } from './sections/ScoreGauge'
import { ProfileOverlay, type Section } from './sections/Overlay'
import { ProfileStudioSubtitles } from './StudioSubtitles'
import { SectionTitle } from './sections/SectionTitle'
import { WordReveal } from './sections/WordReveal'
import { AnimatedScore } from './sections/AnimatedScore'
import {
  FPS, f, toFrames,
  BRAND_FRAMES, LOGO_FRAMES,
  INTRO_FALLBACK, TRANSITION_FALLBACK,
  STAT_ITEM_FALLBACK, DISPOSITION_ITEM_FALLBACK,
  RATIONALE_FALLBACK, INFLUENCE_AXIS_FALLBACK,
  TRANSHISTORICITY_FALLBACK, BRIDGE_FALLBACK,
  SERIES_INTRO_FALLBACK, LABEL_FRAMES,
} from './timing'
import type { CelebProfileScript, StatEntry, DispositionEntry, InfluenceAxis } from './types'

type Props = { script: CelebProfileScript; episodeName: string }

const dur = (d: number | undefined, fallback: number) => d ? toFrames(d) : fallback
const vf = (epName: string, file: string) => staticFile(`voice-profile/${epName}/${file}`)
const lf = (file: string) => staticFile(`voice-profile/common/${file}`)
const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

// --- 라벨 ---
const ABILITY_LABELS: Record<string, string> = { command: '통솔', martial: '무력', intellect: '지력', charm: '매력' }
const INNER_LABELS: Record<string, string> = { temperance: '절제', diligence: '근면', reflection: '성찰', courage: '용기' }
const OUTER_LABELS: Record<string, string> = { loyalty: '충성', benevolence: '인자', fairness: '공정', humility: '겸양' }
const ALL_VIRTUE_LABELS: Record<string, string> = { ...INNER_LABELS, ...OUTER_LABELS }

// --- 레이아웃 (화면 중앙) ---
const COL_L = 480, COL_R = 580, GAP = 60
const TOTAL_W = COL_L + GAP + COL_R
const X_L = Math.round((1920 - TOTAL_W) / 2)
const X_R = X_L + COL_L + GAP
const Y_TOP = 110, Y_BOT = 90

export const CelebProfile: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { host, persona, influence, narrator: n } = script
  const v = (file: string) => vf(episodeName, file)

  // ═══════════════════ 타임라인 ═══════════════════
  let cursor = 0
  const at = (frames: number) => { const s = cursor; cursor += frames; return s }

  const brandStart = at(BRAND_FRAMES)
  const siStart = at(dur(n.seriesIntroDuration, SERIES_INTRO_FALLBACK))
  const introStart = at(dur(n.introDuration, INTRO_FALLBACK))
  const b2pStart = at(dur(n.bioToPersonaDuration, TRANSITION_FALLBACK))

  const aE = Object.entries(persona.abilities) as [string, StatEntry][]
  const aLS: number[] = [], aRS: number[] = []
  for (const [, e] of aE) { aLS.push(at(LABEL_FRAMES)); aRS.push(at(dur(e.duration, STAT_ITEM_FALLBACK))) }
  const a2vStart = at(dur(n.abilitiesToVirtuesDuration, f(2)))

  const ivE = Object.entries(persona.innerVirtues) as [string, StatEntry][]
  const ovE = Object.entries(persona.outerVirtues) as [string, StatEntry][]
  const allVE = [...ivE, ...ovE]
  const vLS: number[] = [], vRS: number[] = []
  for (const [, e] of allVE) { vLS.push(at(LABEL_FRAMES)); vRS.push(at(dur(e.duration, STAT_ITEM_FALLBACK))) }
  const v2dStart = at(dur(n.virtuesToDispositionsDuration, f(2)))

  const dE = Object.entries(persona.dispositions) as [string, DispositionEntry][]
  const dLS: number[] = [], dRS: number[] = []
  for (const [, e] of dE) { dLS.push(at(LABEL_FRAMES)); dRS.push(at(dur(e.duration, DISPOSITION_ITEM_FALLBACK))) }

  const ratStart = at(dur(persona.rationaleDuration, RATIONALE_FALLBACK))
  const p2iStart = at(dur(n.personaToInfluenceDuration, f(2)))

  const iE = Object.entries(influence.axes) as [string, InfluenceAxis][]
  const iLS: number[] = [], iRS: number[] = []
  for (const [, a] of iE) { iLS.push(at(LABEL_FRAMES)); iRS.push(at(dur(a.duration, INFLUENCE_AXIS_FALLBACK))) }

  const tLS = at(LABEL_FRAMES)
  const tRS = at(dur(influence.transhistoricity.duration, TRANSHISTORICITY_FALLBACK))
  const tsStart = at(dur(n.totalScoreLineDuration, f(2)))
  const brStart = at(dur(n.bridgeDuration, BRIDGE_FALLBACK))
  const lgStart = at(LOGO_FRAMES)
  const totalF = cursor

  // ═══════════════════ 페이즈 ═══════════════════
  const pStart = aLS[0], pEnd = ratStart + dur(persona.rationaleDuration, RATIONALE_FALLBACK)
  const inP = frame >= pStart && frame < pEnd

  const inAb = frame >= aLS[0] && frame < a2vStart
  const inIV = frame >= a2vStart && frame < vRS[ivE.length] // inner virtues end
  const inOV = frame >= vLS[ivE.length] && frame < v2dStart
  const inDp = frame >= v2dStart && frame < ratStart
  const inRat = frame >= ratStart && frame < pEnd

  const infStart = iLS[0] ?? tLS
  const infEnd = tsStart + dur(n.totalScoreLineDuration, f(2))
  const inInf = frame >= infStart && frame < infEnd

  // 활성 인덱스
  const findActive = (starts: number[]) => starts.findIndex((s, i) => frame >= s && (i === starts.length - 1 || frame < starts[i + 1]))
  const activeA = inAb ? findActive(aLS) : -1
  const activeV = (inIV || inOV) ? findActive(vLS) : -1
  const activeI = inInf ? findActive(iLS) : -1

  // 차트 데이터
  const abilityAxes = aE.map(([k, e]) => ({ key: k, label: ABILITY_LABELS[k] ?? k, score: e.score }))
  const innerAxes = ivE.map(([k, e]) => ({ key: k, label: INNER_LABELS[k] ?? k, score: e.score }))
  const outerAxes = ovE.map(([k, e]) => ({ key: k, label: OUTER_LABELS[k] ?? k, score: e.score }))
  const infAxes = iE.map(([k, a]) => ({ key: k, label: a.label, score: a.score }))
  const dispItems = dE.map(([k, d]) => ({ key: k, label: d.label, score: d.score }))

  // 현재 항목
  const curItem = (() => {
    if (inAb && activeA >= 0) { const [k, e] = aE[activeA]; return { label: ABILITY_LABELS[k], score: e.score, reason: e.reason, max: 100, start: aRS[activeA] } }
    if ((inIV || inOV) && activeV >= 0) { const [k, e] = allVE[activeV]; return { label: ALL_VIRTUE_LABELS[k], score: e.score, reason: e.reason, max: 100, start: vRS[activeV] } }
    if (inDp) { const idx = findActive(dLS); if (idx >= 0) { const [, d] = dE[idx]; return { label: `${d.label[0]} / ${d.label[1]}`, score: d.score, reason: d.reason, max: 50, start: dRS[idx] } } }
    if (inInf && activeI >= 0) { const [, a] = iE[activeI]; return { label: a.label, score: a.score, reason: a.exp, max: 10, start: iRS[activeI] } }
    return null
  })()

  // ═══════════════════ 오버레이 섹션 ═══════════════════
  const sections: Section[] = [
    { start: 0, end: BRAND_FRAMES, label: '' },
    { start: siStart, end: introStart, label: '인물 열전' },
    { start: introStart, end: b2pStart, label: host.nickname },
    ...aE.map(([k], i) => ({ start: aLS[i], end: i < aLS.length - 1 ? aLS[i + 1] : a2vStart, label: `능력 · ${ABILITY_LABELS[k]}` })),
    ...allVE.map(([k], i) => ({ start: vLS[i], end: i < vLS.length - 1 ? vLS[i + 1] : v2dStart, label: `${i < ivE.length ? '내적' : '외적'} · ${ALL_VIRTUE_LABELS[k]}` })),
    ...dE.map(([, d], i) => ({ start: dLS[i], end: i < dLS.length - 1 ? dLS[i + 1] : ratStart, label: `성향 · ${d.label[1]}` })),
    { start: ratStart, end: p2iStart, label: '종합 분석' },
    ...iE.map(([, a], i) => ({ start: iLS[i], end: i < iLS.length - 1 ? iLS[i + 1] : tLS, label: `영향력 · ${a.label}` })),
    { start: tLS, end: tsStart, label: '통시성' },
    { start: tsStart, end: brStart, label: '종합 점수' },
    { start: brStart, end: lgStart, label: '' },
    { start: lgStart, end: totalF, label: '' },
  ]

  // 배경 슬로우 줌 (intro~persona)
  const bgZoom = interpolate(frame, [siStart, pEnd], [1, 1.08], CL)

  // ═══════════════════ 렌더 ═══════════════════
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* 배경 그리드 + 비네팅 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(200,164,110,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,110,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />

      {/* ═══ Brand ═══ */}
      <Sequence from={brandStart} durationInFrames={BRAND_FRAMES}>
        <BrandIntro durationFrames={BRAND_FRAMES} locale={script.locale} />
      </Sequence>

      {/* ═══ Phase A: 시리즈 인트로 — 실루엣 리빌 (서재탐방 PreIntro 패턴) ═══ */}
      {frame >= siStart && frame < introStart && (() => {
        const local = frame - siStart
        const siDur = dur(n.seriesIntroDuration, SERIES_INTRO_FALLBACK)

        // 아바타 실루엣: 어둡게, 서서히 등장
        const avatarOp = interpolate(local, [0, f(0.5), siDur - f(0.5), siDur], [0, 1, 1, 0.5], CL)
        // "?" 오버레이
        const qOp = interpolate(local, [f(0.3), f(0.8), siDur - f(1), siDur], [0, 0.8, 0.8, 0], CL)
        // 시리즈명
        const siOp = fadeInOut(frame, siStart, siDur)
        const siLetterSp = interpolate(local, [0, f(1)], [12, 6], CL)

        return (
          <AbsoluteFill>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', opacity: avatarOp }}>
                <Img
                  src={safeImg(host.avatar_url)}
                  style={{
                    width: 300, height: 300, borderRadius: '50%', objectFit: 'cover',
                    filter: 'brightness(0.08) saturate(0.6)',
                    border: '2px solid rgba(200,164,110,0.1)',
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 80, fontFamily: FONT.cinzel, color: '#c8a46e', opacity: qOp, fontWeight: 700,
                }}>?</div>
              </div>
            </div>
            <div style={{
              position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center',
              fontSize: 22, color: '#c8a46e', fontFamily: FONT.cinzel,
              letterSpacing: siLetterSp, opacity: siOp,
            }}>CELEB PROFILE</div>
          </AbsoluteFill>
        )
      })()}

      {/* ═══ Phase B: HostIntro — 좌우 레이아웃 Bio (서재탐방 HostIntro 패턴) ═══ */}
      {frame >= introStart && frame < b2pStart && (() => {
        const local = frame - introStart
        const bioDur = dur(n.introDuration, INTRO_FALLBACK)

        // 좌측 아바타: spring 등장
        const avatarEnter = spring({ frame: Math.max(0, local - f(0.17)), fps, config: { damping: 14, stiffness: 160 } })
        const avatarY = interpolate(local, [0, f(0.5)], [30, 0], CL)

        // 우측 메타: 스태거 등장
        const infoOp = interpolate(local, [f(0.5), f(1)], [0, 1], CL)
        const lineW = interpolate(local, [f(0.83), f(1.5)], [0, 400], CL)
        const bioOp = interpolate(local, [f(1.33), f(1.83)], [0, 1], CL)

        // 전체 페이드아웃
        const fadeOut = interpolate(local, [bioDur - f(1), bioDur], [1, 0], CL)

        // 상단 "인물 열전" 라벨
        const labelOp = interpolate(local, [f(0.17), f(0.67)], [0, 1], CL)

        return (
          <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>
            {/* 상단 라벨 */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              padding: '40px 120px 0', opacity: labelOp,
            }}>
              <div style={{
                fontFamily: FONT.cinzel, fontSize: 16, color: '#c8a46e',
                fontWeight: 600, letterSpacing: 6,
              }}>인물 열전</div>
            </div>

            {/* 메인 좌우 레이아웃 */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '60px 120px 0', gap: 80,
            }}>
              {/* 좌측: 아바타 */}
              <div style={{
                flexShrink: 0, opacity: avatarEnter,
                transform: `translateY(${avatarY}px) scale(${avatarEnter})`,
              }}>
                <div style={{
                  width: 280, height: 280, borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid #c8a46e',
                  boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.15)',
                }}>
                  <Img src={safeImg(host.avatar_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>

              {/* 우측: 인물 정보 + bio */}
              <div style={{ flex: 1, maxWidth: 850, display: 'flex', flexDirection: 'column' }}>
                {/* 메타 */}
                <div style={{ opacity: infoOp }}>
                  <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.sans, marginBottom: 6 }}>
                    {host.title}
                  </div>
                  <div style={{ color: '#e8e0d0', fontSize: 48, fontWeight: 700, fontFamily: FONT.sans, lineHeight: 1.3, marginBottom: 4 }}>
                    {host.nickname}
                  </div>
                  <div style={{ color: '#777', fontSize: 20, fontFamily: FONT.cormorant, marginBottom: 20 }}>
                    {host.nickname_en}
                  </div>
                  <div style={{ width: lineW, height: 1, backgroundColor: '#c8a46e', opacity: 0.3, marginBottom: 24 }} />
                </div>

                {/* Bio 텍스트 */}
                <div style={{ opacity: bioOp }}>
                  <div style={{ color: '#ccc', fontSize: 22, fontFamily: FONT.sans, lineHeight: 1.8 }}>
                    {n.intro}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ Bio→Persona 전환 (단어별 등장) ═══ */}
      {frame >= b2pStart && frame < aLS[0] && (
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WordReveal text={n.bioToPersona} startFrame={b2pStart} durationFrames={dur(n.bioToPersonaDuration, TRANSITION_FALLBACK)} />
        </AbsoluteFill>
      )}

      {/* ═══ Persona 2열 ═══ */}
      {inP && !inRat && (
        <AbsoluteFill>
          {/* 우상단: 아바타 + 이름 */}
          <div style={{
            position: 'absolute', right: X_L - 20, top: Y_TOP - 40,
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: interpolate(frame, [pStart, pStart + f(0.5)], [0, 1], CL),
          }}>
            <Img src={safeImg(host.avatar_url)} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(200,164,110,0.2)' }} />
            <div>
              <div style={{ fontSize: 18, color: '#e8e0d0', fontFamily: FONT.serif, fontWeight: 600 }}>{host.nickname}</div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: FONT.sans }}>PERSONA ANALYSIS</div>
            </div>
          </div>

          {/* 좌측 열 — 차트 + 섹션 타이틀 */}
          <div style={{
            position: 'absolute', left: X_L, top: Y_TOP, bottom: Y_BOT, width: COL_L,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16,
          }}>
            {/* 섹션 타이틀 */}
            {inAb && <SectionTitle title="ABILITIES" subtitle="능력" startFrame={aLS[0]} durationFrames={a2vStart - aLS[0]} />}
            {inIV && <SectionTitle title="INNER VIRTUES" subtitle="내적 덕목" startFrame={a2vStart} durationFrames={vLS[ivE.length] - a2vStart} />}
            {inOV && <SectionTitle title="OUTER VIRTUES" subtitle="외적 덕목" startFrame={vLS[ivE.length]} durationFrames={v2dStart - vLS[ivE.length]} />}
            {inDp && <SectionTitle title="DISPOSITIONS" subtitle="성향" startFrame={v2dStart} durationFrames={ratStart - v2dStart} />}

            {/* 차트 — 크로스페이드 */}
            <div style={{ position: 'relative', width: COL_L, height: 420 }}>
              {inAb && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: interpolate(frame, [a2vStart - f(0.5), a2vStart], [1, 0], CL) }}>
                  <RadarChart axes={abilityAxes} startFrame={aLS[0]} size={400} activeIndex={activeA} />
                </div>
              )}
              {inIV && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: interpolate(frame, [a2vStart, a2vStart + f(0.5), vLS[ivE.length] - f(0.5), vLS[ivE.length]], [0, 1, 1, 0], CL) }}>
                  <RadarChart axes={innerAxes} startFrame={a2vStart + f(0.3)} size={400} activeIndex={activeV < ivE.length ? activeV : -1} />
                </div>
              )}
              {inOV && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: interpolate(frame, [vLS[ivE.length], vLS[ivE.length] + f(0.5), v2dStart - f(0.5), v2dStart], [0, 1, 1, 0], CL) }}>
                  <RadarChart axes={outerAxes} startFrame={vLS[ivE.length] + f(0.3)} size={400} activeIndex={activeV >= ivE.length ? activeV - ivE.length : -1} />
                </div>
              )}
              {inDp && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: interpolate(frame, [v2dStart, v2dStart + f(0.5)], [0, 1], CL) }}>
                  <DispositionBars items={dispItems} startFrame={v2dStart + f(0.3)} width={430} />
                </div>
              )}
            </div>
          </div>

          {/* 전환 텍스트 (차트 위 중앙) */}
          {frame >= a2vStart && frame < vLS[0] && (
            <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WordReveal text={n.abilitiesToVirtues} startFrame={a2vStart} durationFrames={dur(n.abilitiesToVirtuesDuration, f(2))} color="#c8a46e" fontSize={30} />
            </AbsoluteFill>
          )}
          {frame >= v2dStart && frame < dLS[0] && (
            <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WordReveal text={n.virtuesToDispositions} startFrame={v2dStart} durationFrames={dur(n.virtuesToDispositionsDuration, f(2))} color="#c8a46e" fontSize={30} />
            </AbsoluteFill>
          )}

          {/* 우측 열 — 점수 + reason */}
          {curItem && (
            <div style={{
              position: 'absolute', left: X_R, top: Y_TOP, bottom: Y_BOT, width: COL_R,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20,
            }}>
              {/* 점수 카운터 */}
              <AnimatedScore label={curItem.label} score={curItem.score} maxScore={curItem.max} startFrame={curItem.start} />

              {/* 구분선 슬라이드 */}
              <div style={{
                width: interpolate(frame, [curItem.start, curItem.start + f(0.5)], [0, 280], CL),
                height: 1, backgroundColor: 'rgba(200,164,110,0.25)',
              }} />

              {/* Reason — 슬라이드 인 */}
              <div style={{
                opacity: interpolate(frame, [curItem.start + f(0.2), curItem.start + f(0.6)], [0, 1], CL),
                transform: `translateX(${interpolate(frame, [curItem.start + f(0.2), curItem.start + f(0.6)], [20, 0], CL)}px)`,
                fontSize: 24, color: '#d0d0d0', fontFamily: FONT.serif, lineHeight: 1.8,
                borderLeft: '3px solid rgba(200,164,110,0.4)', paddingLeft: 20,
              }}>
                {curItem.reason}
              </div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* ═══ Rationale (시네마틱 풀스크린) ═══ */}
      {inRat && (
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            maxWidth: 1100, textAlign: 'center', padding: '0 100px',
            opacity: fadeInOut(frame, ratStart, dur(persona.rationaleDuration, RATIONALE_FALLBACK), f(0.8), f(0.8)),
          }}>
            <div style={{ fontSize: 14, color: '#c8a46e', fontFamily: FONT.cinzel, letterSpacing: 4, marginBottom: 20 }}>ANALYSIS</div>
            <div style={{
              width: interpolate(frame, [ratStart + f(0.3), ratStart + f(1.2)], [0, 200], CL),
              height: 1, backgroundColor: '#c8a46e', opacity: 0.4, margin: '0 auto 30px',
            }} />
            <div style={{ fontSize: 28, color: '#e8e0d0', fontFamily: FONT.serif, lineHeight: 2 }}>
              {persona.rationale}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ═══ Persona→Influence 전환 ═══ */}
      {frame >= p2iStart && frame < infStart && (
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WordReveal text={n.personaToInfluence} startFrame={p2iStart} durationFrames={dur(n.personaToInfluenceDuration, f(2))} />
        </AbsoluteFill>
      )}

      {/* ═══ Influence 2열 ═══ */}
      {inInf && (
        <AbsoluteFill>
          {/* 우상단: 아바타 */}
          <div style={{
            position: 'absolute', right: X_L - 20, top: Y_TOP - 40,
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: interpolate(frame, [infStart, infStart + f(0.5)], [0, 1], CL),
          }}>
            <Img src={safeImg(host.avatar_url)} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(200,164,110,0.2)' }} />
            <div>
              <div style={{ fontSize: 18, color: '#e8e0d0', fontFamily: FONT.serif, fontWeight: 600 }}>{host.nickname}</div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: FONT.sans }}>INFLUENCE</div>
            </div>
          </div>

          {/* 좌측: 헥사곤 + 게이지 */}
          <div style={{
            position: 'absolute', left: X_L, top: Y_TOP, bottom: Y_BOT, width: COL_L,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          }}>
            <SectionTitle title="INFLUENCE" subtitle="역사적 영향력" startFrame={infStart} durationFrames={infEnd - infStart} />
            <HexChart axes={infAxes} startFrame={iRS[0]} size={350} />
            {frame >= tLS && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 14, width: 380,
                opacity: interpolate(frame, [tLS, tLS + f(0.5)], [0, 1], CL),
              }}>
                <ScoreGauge label="통시성" score={influence.transhistoricity.score} maxScore={40} startFrame={tRS} width={380} />
                {frame >= tsStart && <ScoreGauge label="종합" score={influence.totalScore} maxScore={100} startFrame={tsStart} width={380} />}
              </div>
            )}
          </div>

          {/* 우측: 현재 축 */}
          {curItem && (
            <div style={{
              position: 'absolute', left: X_R, top: Y_TOP, bottom: Y_BOT, width: COL_R,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20,
            }}>
              <AnimatedScore label={curItem.label} score={curItem.score} maxScore={curItem.max} startFrame={curItem.start} />
              <div style={{ width: interpolate(frame, [curItem.start, curItem.start + f(0.5)], [0, 280], CL), height: 1, backgroundColor: 'rgba(200,164,110,0.25)' }} />
              <div style={{
                opacity: interpolate(frame, [curItem.start + f(0.2), curItem.start + f(0.6)], [0, 1], CL),
                transform: `translateX(${interpolate(frame, [curItem.start + f(0.2), curItem.start + f(0.6)], [20, 0], CL)}px)`,
                fontSize: 24, color: '#d0d0d0', fontFamily: FONT.serif, lineHeight: 1.8,
                borderLeft: '3px solid rgba(200,164,110,0.4)', paddingLeft: 20,
              }}>
                {curItem.reason}
              </div>
            </div>
          )}

          {/* 통시성/종합 텍스트 (영향력 축이 아닌 구간) */}
          {frame >= tRS && !curItem && (
            <div style={{
              position: 'absolute', left: X_R, top: Y_TOP, bottom: Y_BOT, width: COL_R,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20,
            }}>
              <div style={{
                opacity: interpolate(frame, [frame >= tsStart ? tsStart : tRS, (frame >= tsStart ? tsStart : tRS) + f(0.5)], [0, 1], CL),
                fontSize: 24, color: '#d0d0d0', fontFamily: FONT.serif, lineHeight: 1.8,
                borderLeft: '3px solid rgba(200,164,110,0.4)', paddingLeft: 20,
              }}>
                {frame >= tsStart ? n.totalScoreLine : influence.transhistoricity.exp}
              </div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* ═══ Bridge ═══ */}
      {frame >= brStart && frame < lgStart && (
        <AbsoluteFill style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          opacity: fadeInOut(frame, brStart, dur(n.bridgeDuration, BRIDGE_FALLBACK), f(0.5), f(0.5)),
        }}>
          <div style={{ fontSize: 14, color: '#c8a46e', fontFamily: FONT.cinzel, letterSpacing: 4 }}>NEXT</div>
          <div style={{
            width: interpolate(frame, [brStart + f(0.2), brStart + f(0.8)], [0, 150], CL),
            height: 1, backgroundColor: '#c8a46e', opacity: 0.4,
          }} />
          <div style={{ fontSize: 28, color: '#e8e0d0', fontFamily: FONT.serif, textAlign: 'center', lineHeight: 1.8 }}>
            {n.bridge}
          </div>
          <div style={{ fontSize: 16, color: '#c8a46e', fontFamily: FONT.cinzel, letterSpacing: 6, marginTop: 10 }}>서재 탐방</div>
        </AbsoluteFill>
      )}

      {/* ═══ Logo ═══ */}
      <Sequence from={lgStart} durationInFrames={LOGO_FRAMES}>
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: fadeInOut(frame, lgStart, LOGO_FRAMES, f(0.5), f(0.5)) }}>
          <BrandLogo variant="full" />
        </AbsoluteFill>
      </Sequence>

      {/* ═══ Overlay ═══ */}
      <ProfileOverlay sections={sections} totalFrames={totalF} />

      {/* ═══ DEV 자막 ═══ */}
      <ProfileStudioSubtitles
        script={script}
        timeline={{
          seriesIntroStart: siStart, introStart, bioToPersonaStart: b2pStart,
          abilityStarts: aRS, abToVirtStart: a2vStart, virtueStarts: vRS,
          virtToDispStart: v2dStart, dispStarts: dRS, rationaleStart: ratStart,
          pToInfStart: p2iStart, infStarts: iRS, transStart: tRS, totalStart: tsStart, bridgeStart: brStart,
        }}
      />

      {/* ═══ Audio ═══ */}
      <Sequence from={siStart}><Audio src={v('narrator-series-intro.wav')} /></Sequence>
      <Sequence from={introStart}><Audio src={v('narrator-intro.wav')} /></Sequence>
      <Sequence from={b2pStart}><Audio src={v('narrator-bio-to-persona.wav')} /></Sequence>
      {aE.map(([k], i) => (
        <React.Fragment key={`a-${k}`}>
          <Sequence from={aLS[i]}><Audio src={lf(`label-ability-${k}.wav`)} /></Sequence>
          <Sequence from={aRS[i]}><Audio src={v(`persona-ability-${k}.wav`)} /></Sequence>
        </React.Fragment>
      ))}
      <Sequence from={a2vStart}><Audio src={v('narrator-abilities-to-virtues.wav')} /></Sequence>
      {ivE.map(([k], i) => (
        <React.Fragment key={`iv-${k}`}>
          <Sequence from={vLS[i]}><Audio src={lf(`label-inner-${k}.wav`)} /></Sequence>
          <Sequence from={vRS[i]}><Audio src={v(`persona-inner-${k}.wav`)} /></Sequence>
        </React.Fragment>
      ))}
      {ovE.map(([k], i) => {
        const idx = ivE.length + i
        return (
          <React.Fragment key={`ov-${k}`}>
            <Sequence from={vLS[idx]}><Audio src={lf(`label-outer-${k}.wav`)} /></Sequence>
            <Sequence from={vRS[idx]}><Audio src={v(`persona-outer-${k}.wav`)} /></Sequence>
          </React.Fragment>
        )
      })}
      <Sequence from={v2dStart}><Audio src={v('narrator-virtues-to-dispositions.wav')} /></Sequence>
      {dE.map(([k], i) => (
        <React.Fragment key={`d-${k}`}>
          <Sequence from={dLS[i]}><Audio src={lf(`label-disp-${k}.wav`)} /></Sequence>
          <Sequence from={dRS[i]}><Audio src={v(`persona-disp-${k}.wav`)} /></Sequence>
        </React.Fragment>
      ))}
      <Sequence from={ratStart}><Audio src={v('persona-rationale.wav')} /></Sequence>
      <Sequence from={p2iStart}><Audio src={v('narrator-persona-to-influence.wav')} /></Sequence>
      {iE.map(([k], i) => (
        <React.Fragment key={`inf-${k}`}>
          <Sequence from={iLS[i]}><Audio src={lf(`label-influence-${k}.wav`)} /></Sequence>
          <Sequence from={iRS[i]}><Audio src={v(`influence-${k}.wav`)} /></Sequence>
        </React.Fragment>
      ))}
      <Sequence from={tLS}><Audio src={lf('label-influence-transhistoricity.wav')} /></Sequence>
      <Sequence from={tRS}><Audio src={v('influence-transhistoricity.wav')} /></Sequence>
      <Sequence from={tsStart}><Audio src={v('narrator-total-score.wav')} /></Sequence>
      <Sequence from={brStart}><Audio src={v('narrator-bridge.wav')} /></Sequence>
    </AbsoluteFill>
  )
}
