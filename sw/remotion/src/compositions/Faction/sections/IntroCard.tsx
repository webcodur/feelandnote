import React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import type { FactionScript, FactionPerson, Orientation } from '../types'
import { INTRO_SEC, f } from '../timing'
import { FONT, FONT_SERIF, BG, FG, DEFAULT_ACCENT } from '../constants'
import { imgSrc, initials, findPerson, nameHead, nameTail, resolveIntroImage } from '../utils'
import { FilledImage } from './FilledImage'
import { FactionMedia } from './FactionMedia'

/** 인트로 핵심 인물 한 칸 — 이미지 로드 실패 시 이니셜로 대체 */
const HeroCell: React.FC<{ episodeName: string; person: FactionPerson }> = ({ episodeName, person }) => {
  const [err, setErr] = React.useState(false)
  return (
    <div style={{ overflow: 'hidden' }}>
      {person.image && !err ? (
        <FactionMedia src={imgSrc(episodeName, person.image)} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#1a1a22' }}>
          <span style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 120, fontWeight: 800 }}>{initials(person.name)}</span>
        </AbsoluteFill>
      )}
    </div>
  )
}

/** 시작 화면 로고 셀 — 세력 타이틀 카드와 동일하게 셀을 꽉 채운다(여백은 같은 이미지 블러로 메움). */
const LogoCell: React.FC<{ episodeName: string; image: string }> = ({ episodeName, image }) => {
  const [err, setErr] = React.useState(false)
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: BG }}>
      {!err && <FilledImage src={imgSrc(episodeName, image)} objPos="center center" scale={1} onError={() => setErr(true)} />}
    </div>
  )
}

/** 시작 화면 항목 — 인물 또는 세력 로고. heroes 슬러그가 'logo:<이미지>' 면 로고. */
type IntroItem = { kind: 'person'; person: FactionPerson } | { kind: 'logo'; image: string }

const OpeningLogline: React.FC<{
  text: string
  frame: number
  opacity: number
  enterStart: number
  enterEnd: number
  fadeOutStart: number
  isPortrait: boolean
}> = ({ text, frame, opacity, enterStart, enterEnd, fadeOutStart, isPortrait }) => {
  const enter = interpolate(frame, [enterStart, enterEnd], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const lift = interpolate(enter, [0, 1], [30, 0])
  const scale = interpolate(enter, [0, 1], [0.985, 1])
  const shake = interpolate(frame, [enterStart, enterStart + 8, enterStart + 30], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  // 기본 셰이크 (배경 포함 전체 래퍼용)
  const shakeX = (Math.sin(frame * 2.7) + Math.sin(frame * 7.1)) * 0.9 * shake
  const shakeY = lift + Math.sin(frame * 5.3) * 0.45 * shake

  // 페이드아웃 시작 시 글리치 중단
  const isFadingOut = frame >= fadeOutStart

  // 지지직(Glitch)은 로그라인이 온전히 떠 있는 동안 딱 두 번, 각 5프레임(약 0.17초)짜리 짧은 펄스로만 발동한다.
  // 예전엔 파동이 임계를 넘는 구간 내내 계속 떨려 눈이 아팠다 — 짧은 펄스 + 소수 글자 + 약한 세기로 절제한다.
  const glitchPulse = (center: number) => frame >= center && frame < center + 5
  const g1 = enterEnd + 12
  const g2 = Math.round((enterEnd + fadeOutStart) / 2) + 20
  const isGlitchWindow = !isFadingOut && (glitchPulse(g1) || glitchPulse(g2))
  
  const padX = isPortrait ? 80 : 130
  const baseTextShadow = '0 2px 30px rgba(0,0,0,0.92), 0 0 34px rgba(0,0,0,0.86), 0 0 10px rgba(0,0,0,0.96)'

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      padding: `0 ${padX}px`,
      opacity, // 전체 투명도
      transform: `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px) scale(${scale})`, // 셰이크
      textAlign: 'center',
      color: '#E8B84B',
      fontFamily: FONT_SERIF,
      fontSize: 66,
      fontWeight: 800,
      letterSpacing: 1,
      lineHeight: 1.3,
      whiteSpace: 'pre-line',
      textShadow: baseTextShadow, // 기본 그림자는 상위에서 상속
      paintOrder: 'stroke fill',
    }}>
      <span style={{
        position: 'relative',
        display: 'inline-block',
        padding: '20px 58px 26px',
        margin: '-20px -58px -26px',
      }}>
        {/* 어두운 배경(그림자) 영역은 제자리에 고정 */}
        <span style={{
          position: 'absolute',
          left: -32,
          right: -32,
          top: -18,
          bottom: -24,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.68) 42%, rgba(0,0,0,0.34) 68%, rgba(0,0,0,0) 86%)',
          filter: 'blur(10px)',
        }} />
        
        {/* 앞의 텍스트에만 훨씬 가끔씩, 소수의 글자에만 독립적인 지지직 효과 적용 */}
        <span style={{ position: 'relative' }}>
          {text.split('\n').map((line, lineIdx, linesArray) => (
            <React.Fragment key={lineIdx}>
              {line.split(/(\s+)/).map((token, tokenIdx) => {
                if (!token.trim()) return <span key={tokenIdx}>{token}</span>
                
                return (
                  <span key={tokenIdx} style={{ display: 'inline-block' }}>
                    {token.split('').map((char, charIdx) => {
                      const i = lineIdx * 1000 + tokenIdx * 100 + charIdx
                      // 펄스 순간에도 한두 글자만 임계를 넘게(0.9) — 전체가 아니라 소수 글자만 살짝 일그러진다.
                      const isCharGlitch = isGlitchWindow && Math.sin(frame * 4.3 + i * 2.1) > 0.9

                      const cGlX = isCharGlitch ? Math.sin(frame * 13.3 + i) * 1.6 : 0
                      const cGlY = isCharGlitch ? Math.sin(frame * 21.7 - i) * 1.0 : 0
                      const cChroma = isCharGlitch ? 1.5 : 0
                      
                      return (
                        <span key={charIdx} style={{
                          position: 'relative',
                          display: 'inline-block',
                          transform: `translate(${cGlX.toFixed(2)}px, ${cGlY.toFixed(2)}px)`,
                          opacity: isCharGlitch ? 0.82 : 1,
                          textShadow: isCharGlitch 
                            ? `${cChroma}px 0px 0px rgba(255,0,0,0.9), -${cChroma}px 0px 0px rgba(0,255,255,0.9), ${baseTextShadow}`
                            : 'inherit',
                        }}>
                          {char}
                        </span>
                      )
                    })}
                  </span>
                )
              })}
              {lineIdx < linesArray.length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      </span>
    </div>
  )
}

export const IntroCard: React.FC<{ script: FactionScript; episodeName: string; orientation: Orientation; part?: number; lvPart?: number; isShorts?: boolean }> = ({ script, episodeName, orientation, part, lvPart, isShorts = false }) => {
  const isPortrait = orientation === 'portrait'
  const frame = useCurrentFrame()
  const heroSlugs = (part != null && script.heroesByPart?.[part]) || (lvPart != null && script.heroesByLvPart?.[lvPart]) || script.heroes || []
  const items = heroSlugs.map((s): IntroItem | null => {
    if (s.startsWith('logo:')) return { kind: 'logo', image: s.slice(5) }
    const p = findPerson(script, s)
    return p ? { kind: 'person', person: p } : null
  }).filter(Boolean) as IntroItem[]
  // 영상 명칭 — 통합 한 필드(앞부분\n뒷부분). 앞부분은 크게 흰색, 뒷부분은 세력색.
  const titleCap = (part != null && script.titleByPart?.[part]) || (lvPart != null && script.titleByLvPart?.[lvPart]) || script.title
  const titleHead = nameHead(titleCap)
  const titleTail = nameTail(titleCap)
  // 시작문구 — 영상 명칭보다 살짝 늦게 떠오른다(황금색).
  const logline = (part != null && script.loglineByPart?.[part]) || (lvPart != null && script.loglineByLvPart?.[lvPart]) || script.logline
  // FIFO 흐름 — 배경(A)이 먼저 빠지고, 문구·효과음(B)이 나중에 빠진다. 둘 다 빠진 뒤 짧은 검정을 거쳐 첫 세력 로고로 넘어간다.
  const introSec = script.introSec ?? INTRO_SEC
  // A(배경) 아웃 — 먼저.
  const introOutOp = interpolate(frame, [f(introSec - 2.2), f(introSec - 1.4)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // B(문구) — 떠오른 뒤(페이드인) 배경이 빠진 다음에 사라진다(페이드아웃).
  // introSec이 짧으면(기본 2.5초) 페이드인 끝이 페이드아웃 시작을 추월해 inputRange가 비단조가 된다.
  // 네 지점을 누적 max(+1프레임)로 강제 단조화해 항상 strictly increasing을 보장한다.
  const llIn0 = f(1.0)
  const llIn1 = Math.max(llIn0 + 1, f(1.8))
  const llOut0 = Math.max(llIn1 + 1, f(introSec - 1.2))
  const llOut1 = Math.max(llOut0 + 1, f(introSec - 0.4))
  const loglineOp = interpolate(frame, [llIn0, llIn1, llOut0, llOut1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 지지직 글리치(미세 떨림 + 색수차) — 비활성화. 시작 문구는 페이드인/아웃으로만 떴다가 사라진다.
  // const glAmp = interpolate(frame, [f(1.0), f(introSec / 2), f(introSec - 0.4)], [0.08, 1, 0.08], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // const glX = (Math.sin(frame * 13.3) + Math.sin(frame * 29.1)) * 1.2 * glAmp
  // const glY = Math.sin(frame * 21.7) * 0.9 * glAmp
  // const chroma = (1.5 + Math.sin(frame * 4.7) * 1.5) * glAmp
  const Logline = logline ? <OpeningLogline text={logline} frame={frame} opacity={loglineOp} enterStart={llIn0} enterEnd={llIn1} fadeOutStart={llOut0} isPortrait={isPortrait} /> : null
  // 시작 화면 이미지 한 장으로 덮기 — 있으면 통합화면(인물 그리드)·텍스트 대신 이 이미지를 화면 가득.
  // 롱폼이면 롱폼 전용(introImageLong) 우선, 없으면 공용(introImage).
  const introMedia = resolveIntroImage(script, isShorts, part)
  if (introMedia) {
    return (
      <AbsoluteFill style={{ backgroundColor: BG }}>
        <AbsoluteFill style={{ opacity: introOutOp }}>
          <FilledImage src={imgSrc(episodeName, introMedia)} objPos="center center" scale={1} fit="contain" onError={() => {}} />
        </AbsoluteFill>
        {Logline && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 150, pointerEvents: 'none' }}>
            {Logline}
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    )
  }
  // 항목이 있으면 그리드, 아니면 기존 텍스트 인트로
  if (!items.length) {
    return (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28, opacity: introOutOp }}>
        {titleTail && (
          <div style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: 8 }}>{titleTail}</div>
        )}
        <div style={{ color: FG, fontFamily: FONT, fontSize: 96, fontWeight: 800, letterSpacing: 2, textAlign: 'center', padding: '0 80px', lineHeight: 1.2 }}>{titleHead}</div>
        {Logline}
      </AbsoluteFill>
    )
  }
  // 가로(row): 한 줄에 나란히 — 각 칸이 세로로 길다(인물 세로 사진에 맞음).
  // 세로(column): 위에서 아래로 한 칸씩 — 각 칸이 가로로 길다(가로 로고·가로 사진에 맞음).
  const layout = script.heroLayout ?? 'row'
  const gridStyle: React.CSSProperties =
    layout === 'column' ? { gridTemplateRows: `repeat(${items.length}, 1fr)` }
    : layout === 'grid' ? { gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr' }
    : { gridTemplateColumns: `repeat(${items.length}, 1fr)` }
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* 배경(A) — 얼굴 그리드. FIFO에서 먼저 빠진다(introOutOp). 검정 배경은 그대로 남아 문구만 떠 있게 한다. */}
      <div style={{ display: 'grid', width: '100%', height: '100%', opacity: introOutOp, ...gridStyle }}>
        {items.map((it, i) => it.kind === 'logo'
          ? <LogoCell key={i} episodeName={episodeName} image={it.image} />
          : <HeroCell key={i} episodeName={episodeName} person={it.person} />)}
      </div>
      {/* 제목은 상단 헤더가 담당(중복 제거). 그리드 위아래 경계만 부드럽게 — 배경과 함께 빠진다. */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}cc 0%, transparent 22%, transparent 70%, ${BG}f5 100%)`, opacity: introOutOp }} />
      {/* 로그라인 — 그리드 하단(어두운 띠) 위에 얹어 제목 헤더와 겹치지 않게 한다. */}
      {Logline && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 150, pointerEvents: 'none' }}>
          {Logline}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}
