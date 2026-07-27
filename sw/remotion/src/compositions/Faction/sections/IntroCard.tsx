import React from 'react'
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import type { FactionScript, FactionPerson, Orientation } from '../types'
import { INTRO_FADE_OUT_SEC, NARRATOR_LOGLINE_DELAY_SEC, introSecOf, narratorOpeningVoice, narratorVoicePlaySec, f } from '../timing'
import { FONT, FONT_SERIF, BG, FG, DEFAULT_ACCENT } from '../constants'
import { imgSrc, initials, findPerson, nameHead, nameTail, resolveIntroImage, isVideoSrc, resolveEdgeEffects, holdAndShakeParts, enterMotionScale, enterMotionSec, isPushinZoom } from '../utils'
import { vnNarratorLogline, voiceRelPath, dbToLinear, clampRate } from '../voice-names'
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

/**
 * 시작문구 빛 스윕 — 문구가 떠 있는 동안 딱 한 번, 그 시간을 통째로 써서 느리게 지나간다.
 * 고정 길이를 두지 않으므로 시작 화면을 길게 잡은 편에서는 그만큼 더 느려진다.
 */
const SWEEP_DELAY_SEC = 0.35
/** 문구가 꺼지기 전에 띠가 다 지나가도록 남기는 여유(초) */
const SWEEP_TAIL_SEC = 0.15
// 배경이 글자 폭보다 넓어(260%) 값이 줄어들수록 띠가 오른쪽으로 간다 — 큰 값에서 작은 값으로 가야 왼→오 흐름이다.
const SWEEP_FROM = 160
const SWEEP_TO = -60

const OpeningLogline: React.FC<{
  text: string
  frame: number
  opacity: number
  /** 스윕 기준 시각(프레임) — 문구가 온전히 떠 있는 구간의 시작 */
  holdStart: number
  fadeOutStart: number
  isPortrait: boolean
}> = ({ text, frame, opacity, holdStart, fadeOutStart, isPortrait }) => {
  // 등장 이동·확대(아래에서 떠오름)·미세 떨림·지지직은 모두 없앴다 — 문구는 첫 프레임부터 제자리에 가만히 떠 있다.
  // 대신 금색 글자 위로 밝은 띠가 한 번 훑고 지나간다(문구가 사라지기 전에 끝난다).
  const sweepStart = holdStart + f(SWEEP_DELAY_SEC)
  const sweepEnd = Math.max(sweepStart + 1, fadeOutStart - f(SWEEP_TAIL_SEC))
  // 등속 — 가속·감속을 넣으면 글자 가운데를 지날 때만 확 빨라져 훑는 결이 고르지 않다.
  const sweepX = interpolate(frame, [sweepStart, sweepEnd], [SWEEP_FROM, SWEEP_TO], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const padX = isPortrait ? 80 : 130
  const baseTextShadow = '0 2px 30px rgba(0,0,0,0.92), 0 0 34px rgba(0,0,0,0.86), 0 0 10px rgba(0,0,0,0.96)'
  // 글자 모양 그대로 겹치는 빛 레이어 — 본체와 같은 글자 배치를 쓰고 색만 그라데이션으로 칠한다.
  const sweepLayer: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0) 40%, rgba(255,246,214,0.92) 50%, rgba(255,255,255,0) 60%)',
    backgroundSize: '260% 100%',
    backgroundPosition: `${sweepX.toFixed(1)}% 0`,
    backgroundRepeat: 'no-repeat',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    textShadow: 'none',
    pointerEvents: 'none',
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      padding: `0 ${padX}px`,
      opacity, // 전체 투명도
      textAlign: 'center',
      color: '#E8B84B',
      fontFamily: FONT_SERIF,
      fontSize: isPortrait ? 62 : 56, // 로고·그룹샷 명칭 캡션과 크기 통일. [기존] 48
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

        {/* 문구 본체 + 같은 글자 위에 겹친 빛 띠 */}
        <span style={{ position: 'relative', display: 'inline-block' }}>
          {text}
          <span aria-hidden style={sweepLayer}>{text}</span>
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
  // 시작문구(황금색) — 시작 화면(배경)과 같은 타이밍으로 켜지고 꺼진다.
  const logline = (part != null && script.loglineByPart?.[part]) || (lvPart != null && script.loglineByLvPart?.[lvPart]) || script.logline
  // 배경·문구 동기 — 같은 페이드아웃. 컷 끝에 맞춰 꺼져 첫 로고 크로스페이드와 겹친다(검정 텀 최소화).
  // 길이는 컷 빌더(buildCues)와 같은 산식(introSecOf) — 시작문구 낭독 음원이 있으면 자동 연장분까지 포함.
  const introSec = introSecOf(script)
  // 시작문구 낭독(나레이터, 옵션) — 저장된 음원이 있을 때만. 문구 등장에 맞춰 반 박자 뒤 시작.
  const openingVoice = narratorOpeningVoice(script)
  const nlPlaySec = narratorVoicePlaySec(openingVoice)
  const loglineAudio = nlPlaySec > 0 ? (
    <Sequence from={f(NARRATOR_LOGLINE_DELAY_SEC)} durationInFrames={f(nlPlaySec + 0.4)}>
      <Audio
        src={staticFile(voiceRelPath(episodeName, vnNarratorLogline()))}
        volume={dbToLinear(openingVoice?.quoteGainDb)}
        playbackRate={clampRate(openingVoice?.quotePlaybackRate)}
      />
    </Sequence>
  ) : null
  // 시작 화면 카메라 — 인물·묶음 컷과 같은 지속 효과 계산을 쓴다(같은 효과를 같은 빠르기로).
  // 설정은 「움직임 효과 관리」의 시작 화면 줄(script.introEffects)에서 오고, 비면 천천히 확대가 기본이다.
  const cam = resolveEdgeEffects(script, 'intro')
  const camEnterS = enterMotionScale(cam.enter, frame)
  const camHold = holdAndShakeParts(cam.hold, cam.shake, Math.max(0, frame - f(enterMotionSec(cam.enter))), {
    focusX: cam.focusX,
    focusY: cam.focusY,
    speedMul: cam.zoomSpeed,
  })
  const camScale = camEnterS * camHold.scale
  // 줌인(다가가는 줌)은 카메라가 목표점으로 이동하는 모드라 확대 기준점을 화면 중앙에 둔다(이동량 계산과 일치).
  const camOrigin = isPushinZoom(cam.hold) ? '50% 50%' : undefined
  const fadeOut0 = f(Math.max(0, introSec - INTRO_FADE_OUT_SEC))
  const fadeOut1 = Math.max(fadeOut0 + 1, f(introSec))
  const introOutOp = interpolate(frame, [fadeOut0, fadeOut1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 시작문구는 등장 모션 없이 첫 프레임부터 제자리에 떠 있다(떠오름·떨림·지지직 제거).
  // 화면이 사라질 때만 배경과 같은 투명도(introOutOp)로 함께 꺼지고, 떠 있는 동안 빛 띠가 한 번 훑는다.
  // opacity는 부모가 introOutOp로 묶으므로 1.
  const Logline = logline ? <OpeningLogline text={logline} frame={frame} opacity={1} holdStart={0} fadeOutStart={fadeOut0} isPortrait={isPortrait} /> : null
  // 시작 화면 이미지 한 장으로 덮기 — 있으면 통합화면(인물 그리드)·텍스트 대신 이 이미지를 화면 가득.
  // 롱폼이면 롱폼 전용(introImageLong) 우선, 없으면 공용(introImage).
  const introMedia = resolveIntroImage(script, isShorts, part)
  // 시작문구 위치 — [개편] 중앙 배치(대사 중앙 자막 슬롯과 동일: 정중앙 + 56px 아래). 로고/그룹명·인물 신원과 같은 자리.
  // [기존-하단배치 롤백용] justifyContent: 'flex-end', padding: isPortrait ? '0 60px 56px' : '0 80px 120px'
  const loglineWrap = Logline ? (
    <AbsoluteFill style={{
      alignItems: 'center',
      justifyContent: 'center',
      padding: isPortrait ? '0 60px' : '0 80px',
      transform: 'translateY(56px)',
      pointerEvents: 'none',
    }}>
      {Logline}
    </AbsoluteFill>
  ) : null

  if (introMedia) {
    return (
      <AbsoluteFill style={{ backgroundColor: BG }}>
        {loglineAudio}
        {/* 배경 영상·문구 한 묶음 — 같은 투명도로 같이 꺼진다. 확대는 배경에만 걸고 문구는 제자리에 둔다.
            영상 배경은 그 자체로 움직이므로 확대하지 않는다(화면을 꽉 채워 잘림만 늘어난다). */}
        <AbsoluteFill style={{ opacity: introOutOp }}>
          {isVideoSrc(introMedia)
            ? <FilledImage src={imgSrc(episodeName, introMedia)} objPos="center center" scale={1} fit="contain" onError={() => {}} />
            : <FilledImage src={imgSrc(episodeName, introMedia)} objPos="center center" scale={camScale} tx={camHold.tx} ty={camHold.ty} transformOrigin={camOrigin} fit="contain" onError={() => {}} />}
          {loglineWrap}
        </AbsoluteFill>
      </AbsoluteFill>
    )
  }
  // 항목이 있으면 그리드, 아니면 기존 텍스트 인트로
  if (!items.length) {
    return (
      <AbsoluteFill style={{ backgroundColor: BG }}>
        {loglineAudio}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28, opacity: introOutOp }}>
          {titleTail && (
            <div style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: 8 }}>{titleTail}</div>
          )}
          <div style={{ color: FG, fontFamily: FONT, fontSize: 96, fontWeight: 800, letterSpacing: 2, textAlign: 'center', padding: '0 80px', lineHeight: 1.2 }}>{titleHead}</div>
        </AbsoluteFill>
        <AbsoluteFill style={{ opacity: introOutOp }}>
          {loglineWrap}
        </AbsoluteFill>
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
      {loglineAudio}
      {/* 얼굴 그리드·문구 한 묶음 — 같은 투명도로 같이 꺼진다 */}
      <AbsoluteFill style={{ opacity: introOutOp }}>
        {/* 얼굴·로고 칸만 함께 움직인다(문구·위아래 경계 그라디언트는 제자리 고정) */}
        <div style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          transform: `scale(${camScale}) translate(${camHold.tx}%, ${camHold.ty}%)`,
          transformOrigin: camOrigin,
          ...gridStyle,
        }}>
          {items.map((it, i) => it.kind === 'logo'
            ? <LogoCell key={i} episodeName={episodeName} image={it.image} />
            : <HeroCell key={i} episodeName={episodeName} person={it.person} />)}
        </div>
        {/* 제목은 상단 헤더가 담당(중복 제거). 그리드 위아래 경계만 부드럽게. */}
        <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}cc 0%, transparent 22%, transparent 70%, ${BG}f5 100%)` }} />
        {/* 로그라인 — 그룹명/인물 신원과 같은 하단 중앙 자리 */}
        {loglineWrap}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
