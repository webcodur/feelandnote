import React, { useMemo } from 'react'
import {
  AbsoluteFill, Img, Sequence, Audio,
  interpolate, useCurrentFrame, staticFile, Easing,
} from 'remotion'
import type { FactionScript, FactionGroup, FactionPerson, FactionCluster, FactionTransition } from './types'
import { buildCues, CROSSFADE_SEC, CLUSTER_SEC, GROUP_SEC, INTRO_SEC, OUTRO_SEC, ENTER_NAME_SEC, ENTER_FADE_SEC, personCreditOutSec, personQuoteEnterSec, f, type TimedCue } from './timing'
import { FactionBgm } from './FactionBgm'
import { vnPersonQuote, voiceRelPath, dbToLinear, clampRate } from './voice-names'

const FONT = "'Pretendard Variable', 'Pretendard', sans-serif"
const BG = '#0a0a0f'
const FG = '#f5f2ea'
const DEFAULT_ACCENT = '#d4a828'
/** 인물 컷 대사 색 — 노란색 고정 */
const QUOTE_COLOR = '#ffd24a'
/**
 * 대사 구절 색 팔레트 — 콤마·마침표로 끊은 구절마다 번갈아 입힌다.
 * 둘 다 어두운 배경에서 잘 보이는 노란 계열. 골드옐로 ↔ 앰버로 미묘하게만 차이.
 */
const QUOTE_PALETTE = ['#ffd24a', '#ffc01e', '#ffb300', '#ffa000']
/** 상단 고정 빈 영역(블랙 프레임) 높이 — 북리커맨드 쇼츠 HEADER_H와 통일. 본문 컷은 이 아래에만 그린다 */
const HEADER_H = 320

/* ── 시작(인트로)·끝(아웃트로) 제목 공통 규격 — 시작과 끝이 같은 자리·같은 크기로 떠 수미상관처럼 이어지게 ── */
const CAP_PAD = '0 70px'
const CAP_TITLE: React.CSSProperties = { color: FG, fontFamily: FONT, fontSize: 90, fontWeight: 800, letterSpacing: 2, textAlign: 'center', lineHeight: 1.18, textShadow: '0 3px 18px rgba(0,0,0,0.85)' }
const CAP_SUB: React.CSSProperties = { color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 46, fontWeight: 600, letterSpacing: 6, textAlign: 'center', lineHeight: 1.3, textShadow: '0 2px 12px rgba(0,0,0,0.85)' }

/** 영상 방향 — 'portrait'(세로 9:16 쇼츠, 기존)·'landscape'(가로 16:9 롱폼) */
export type Orientation = 'portrait' | 'landscape'

/* ── 가로 롱폼 인물 컷 레이아웃 상수(나중에 조정 가능) ── */
/** 인물 컷 좌측 사진 영역 너비 비율 */
const L_PHOTO_W = '42%'
/** 인물 컷 우측 텍스트 영역 좌우 여백 */
const L_TEXT_PAD = 96
/** 인물 컷 도입 줌아웃 — 시작 시 살짝 크게 잡았다가 이 시간 동안 확 빠르게 제자리(1.0)로 줄어든 뒤 정지 */
const PERSON_ZOOM_OUT_SEC = 0.15
/** 줌아웃 시작 배율(1.0보다 큼) */
const PERSON_ZOOM_START = 1.1
/** 빠른 줌아웃이 끝난 뒤(1.0) 컷 끝까지 천천히 다시 줌인해 도달할 배율 — 정지 대신 미세하게 다가간다 */
const PERSON_SLOW_ZOOM_END = 1.06
/** 세로 쇼츠 대사 박스 — 화면 왼쪽 밖에서 슬라이드 인하는 시작 거리(px). 음수=왼쪽 */
const PANEL_SLIDE_X = 520
/** 세로 쇼츠 대사 박스 슬라이드 인 길이(초) */
const PANEL_SLIDE_SEC = 0.4

/** auto 전환에서 인물마다 번갈아 적용할 효과 순환 목록 */
const TRANSITION_CYCLE: Exclude<FactionTransition, 'auto'>[] = ['zoomin', 'kenburns', 'slide', 'zoomout']
/** 전환 설정 해석 — auto면 인물 순번으로 순환, 미지정이면 zoomout */
const resolveTransition = (t: FactionTransition | undefined, idx: number): Exclude<FactionTransition, 'auto'> =>
  t === 'auto' ? TRANSITION_CYCLE[idx % TRANSITION_CYCLE.length] : (t ?? 'zoomout')

/**
 * 인물·로고·화보 이미지 경로.
 * - 외부 URL(http) → 그대로
 * - 폴더 경로(슬래시 포함, 예: '1/앨런 튜링.webp') → 에피소드 폴더 하위에서 직접
 * - basename(예: 'logo.png') → 에피소드 폴더 하위 images/ 에서 찾는다 (BO 업로드 호환)
 */
const imgSrc = (episodeName: string, image: string) =>
  /^https?:\/\//.test(image)
    ? image
    : image.includes('/')
      ? staticFile(`factions/${episodeName}/${image}`)
      : staticFile(`factions/${episodeName}/images/${image}`)

/** 이름 → 이니셜(이미지 없는 인물 플레이스홀더) */
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
}

/** 세력의 화보 묶음. clusters가 없으면 세력 전체를 단일 묶음으로 정규화한다(설명은 세력 슬로건). */
const clustersOf = (g: FactionGroup): FactionCluster[] =>
  g.clusters?.length ? g.clusters : [{ image: g.image, people: g.people, note: g.tagline }]

/* ═══════════════ 컷 화면들 ═══════════════ */

/** slug로 전체 세력에서 인물 찾기 — 비활성화 세력은 건너뛴다(인트로에서도 빠지게) */
const findPerson = (script: FactionScript, slug: string): FactionPerson | null => {
  for (const g of script.groups) {
    if (g.disabled) continue
    const list = g.clusters?.length ? g.clusters.flatMap(c => c.people) : g.people
    const p = list.find(x => x.slug === slug && !x.disabled)
    if (p) return p
  }
  return null
}

/** 인트로 핵심 인물 한 칸 — 이미지 로드 실패 시 이니셜로 대체 */
const HeroCell: React.FC<{ episodeName: string; person: FactionPerson }> = ({ episodeName, person }) => {
  const [err, setErr] = React.useState(false)
  return (
    <div style={{ overflow: 'hidden' }}>
      {person.image && !err ? (
        <Img src={imgSrc(episodeName, person.image)} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#1a1a22' }}>
          <span style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 120, fontWeight: 800 }}>{initials(person.name)}</span>
        </AbsoluteFill>
      )}
    </div>
  )
}

const IntroCard: React.FC<{ script: FactionScript; episodeName: string; orientation: Orientation }> = ({ script, episodeName, orientation }) => {
  const isLand = orientation === 'landscape'
  const heroes = (script.heroes ?? []).map(s => findPerson(script, s)).filter(Boolean) as FactionPerson[]
  // 핵심 인물이 지정되면 그리드, 아니면 기존 텍스트 인트로
  if (!heroes.length) {
    return (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28 }}>
        {script.subtitle && (
          <div style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: 8 }}>{script.subtitle}</div>
        )}
        <div style={{ color: FG, fontFamily: FONT, fontSize: 96, fontWeight: 800, letterSpacing: 2, textAlign: 'center', padding: '0 80px', lineHeight: 1.2 }}>{script.title}</div>
      </AbsoluteFill>
    )
  }
  // 가로는 핵심 인물을 한 줄(가로 배치)로, 세로는 2열 그리드로
  const cols = isLand ? `repeat(${heroes.length}, 1fr)` : '1fr 1fr'
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* 핵심 인물 그리드 — 세로 2열 / 가로 1행 */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, width: '100%', height: '100%' }}>
        {heroes.map((p, i) => (
          <HeroCell key={i} episodeName={episodeName} person={p} />
        ))}
      </div>
      {/* 그라데이션 + 제목(중앙) */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}cc 0%, transparent 22%, transparent 78%, ${BG}f5 100%)` }} />
      {/* 중앙 텍스트 가독성용 옅은 어둠 */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 95% 34% at 50% 50%, ${BG}b3 0%, transparent 72%)` }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 22, padding: CAP_PAD }}>
        <div style={CAP_TITLE}>{script.title}</div>
        {script.subtitle && <div style={CAP_SUB}>{script.subtitle}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/**
 * 쇼츠 상단 고정 빈 영역(블랙 프레임) + 제목.
 * 본문 컷(세력·화보·인물)은 이 영역 아래에만 그려지고, 여기는 항상 검정 여백으로 비어 제목만 박힌다.
 * 제목은 본문 경계 살짝 위(헤더 하단)에 두고, 인물명과 같은 글씨체로 통일한다.
 * 인트로·아웃트로 구간에서는 숨고, 본문 진입 시 크로스페이드와 동기로 페이드인한다.
 */
const TopHeader: React.FC<{ script: FactionScript; opacity: number }> = ({ script, opacity }) => (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
    background: BG, zIndex: 50, opacity,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 64,
  }}>
    {/* 고정 제목 — 인물명과 동일한 글씨체 */}
    <div style={{ color: `${FG}ee`, fontFamily: FONT, fontSize: 94, fontWeight: 800, letterSpacing: 1, textAlign: 'center', padding: '0 60px', lineHeight: 1.1 }}>
      {script.title}
    </div>
  </div>
)

/**
 * 세력 전환(로고)·그룹샷 카드 공통 하단 캡션.
 * 세력명을 항상 같은 위치(하단 360 위)에 고정하고, 보조 라벨(슬로건·소제목)은 그 위에 쌓는다.
 * 보조 라벨의 유무·길이와 무관하게 세력명 위치가 동일하게 유지된다.
 */
const CardCaption: React.FC<{ accent: string; topLabel?: string; name: string; orientation: Orientation }> = ({ accent, topLabel, name, orientation }) => {
  const isLand = orientation === 'landscape'
  // 가로는 하단 여백·글자를 낮춰 16:9 비율에 맞춘다
  const pad = isLand ? '0 80px 120px' : '0 60px 360px'
  const nameSize = isLand ? 76 : 90
  const labelSize = isLand ? 52 : 62
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: pad }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* 인물 컷과 동일하게 이름(세력명)을 위, 보조 라벨(한 줄)을 아래로 */}
        <div style={{ color: '#ffffff', fontFamily: FONT, fontSize: nameSize, fontWeight: 800, letterSpacing: 1, lineHeight: 1.05, textAlign: 'center' }}>
          {name}
        </div>
        {topLabel && (
          <div style={{ color: accent, fontFamily: FONT, fontSize: labelSize, fontWeight: 700, letterSpacing: 4, lineHeight: 1.3, textAlign: 'center', padding: '0 40px' }}>
            {topLabel}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}

/**
 * 비율 유지(contain) 이미지 + 레터박스 여백 채움.
 * 같은 이미지를 화면 가득(cover) 깔고 강하게 흐려 가장자리 색으로 번지게 한 뒤, 그 위에 본 이미지를 비율 유지로 얹는다.
 * 로고·그룹샷처럼 가로세로비가 화면과 다른 이미지의 좌우·상하 검정 여백을 없앤다.
 */
const FilledImage: React.FC<{ src: string; objPos: string; scale: number; onError: () => void }> = ({ src, objPos, scale, onError }) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    {/* 배경 레이어 — 같은 이미지를 꽉 채워 흐리게(여백을 가장자리 색으로 채움) */}
    <AbsoluteFill>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(60px) brightness(0.7)', transform: 'scale(1.15)' }} />
    </AbsoluteFill>
    {/* 본 이미지 레이어 — 비율 유지, 블러 없음 */}
    <AbsoluteFill>
      <Img src={src} onError={onError} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: objPos, transform: `scale(${scale})` }} />
    </AbsoluteFill>
  </AbsoluteFill>
)

const GroupCard: React.FC<{ episodeName: string; group: FactionGroup; frame: number; cueStart: number; orientation: Orientation }> = ({ episodeName, group, frame, cueStart, orientation }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [artErr, setArtErr] = React.useState(false)
  // 가로는 이미지를 중앙 정렬(세로는 상단 정렬)
  const objPos = orientation === 'landscape' ? 'center center' : 'center top'
  // 그룹샷·인물 컷과 동일한 켄번스 줌
  const scale = interpolate(frame - cueStart, [0, f(GROUP_SEC)], [1.0, 1.05], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {group.titleArt && !artErr ? (
        // 로고 컨셉아트 — 비율 유지(contain), 좌우 여백은 같은 이미지 블러로 채움
        <FilledImage src={imgSrc(episodeName, group.titleArt)} objPos={objPos} scale={scale} onError={() => setArtErr(true)} />
      ) : group.logo ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `radial-gradient(ellipse 70% 45% at 50% 40%, ${accent}33 0%, transparent 70%)` }}>
          <Img src={imgSrc(episodeName, group.logo)} style={{ width: 320, height: 320, objectFit: 'contain' }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)` }}>
          <span style={{ color: `${accent}cc`, fontFamily: FONT, fontSize: 64, fontWeight: 700, letterSpacing: 6 }}>LOGO ART</span>
        </AbsoluteFill>
      )}
      {/* 그룹샷·인물 컷과 동일한 상·하단 그라데이션 — 텍스트가 로고 위에 확실히 보이게 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 22%)` }} />
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${BG}e6 0%, ${BG}b3 22%, ${BG}66 40%, transparent 58%)` }} />
      {/* 텍스트 — 그룹샷과 동일한 공통 캡션 (세력명 위치 고정) */}
      <CardCaption accent={accent} topLabel={group.tagline} name={group.name} orientation={orientation} />
    </AbsoluteFill>
  )
}

const ClusterCard: React.FC<{ episodeName: string; group: FactionGroup; cluster: FactionCluster; frame: number; cueStart: number; orientation: Orientation }> = ({ episodeName, group, cluster, frame, cueStart, orientation }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [imgErr, setImgErr] = React.useState(false)
  // 가로는 이미지를 중앙 정렬(세로는 상단 정렬)
  const objPos = orientation === 'landscape' ? 'center center' : 'center top'
  // 인물 컷과 동일한 켄번스 줌
  const scale = interpolate(frame - cueStart, [0, f(CLUSTER_SEC)], [1.0, 1.06], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {cluster.image && !imgErr ? (
        <FilledImage src={imgSrc(episodeName, cluster.image)} objPos={objPos} scale={scale} onError={() => setImgErr(true)} />
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)` }}>
          <span style={{ color: `${accent}cc`, fontFamily: FONT, fontSize: 72, fontWeight: 700, letterSpacing: 6 }}>TEAM SHOT</span>
        </AbsoluteFill>
      )}
      {/* 상단 그라데이션 — 상단 헤더 가독 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 20%)` }} />
      {/* 로고(타이틀) 카드가 있는 세력은 단체샷에 텍스트를 다시 띄우지 않는다(중복 방지). 텍스트 없으면 하단 어둠도 생략 */}
      {!group.titleArt && (
        <>
          <AbsoluteFill style={{ background: `linear-gradient(to top, ${BG}e6 0%, ${BG}b3 22%, ${BG}66 40%, transparent 58%)` }} />
          <CardCaption accent={accent} topLabel={cluster.note ?? cluster.label} name={group.name} orientation={orientation} />
        </>
      )}
    </AbsoluteFill>
  )
}

/**
 * 대사 구절 색 변주 — 대사를 구절로 끊어 팔레트 색을 순환시킨다.
 * 색 전환 경계: 입력 덩어리(quoteChunks) 경계 + 그 안의 콤마·마침표(. , 。 ，) 경계.
 * 구절들은 공백으로 이어 한 흐름으로 붙는다(강제 줄바꿈 없음 — 폭이 넘칠 때만 자연 줄바꿈).
 * 색은 span(구절) 단위로만 바뀌어 글자별 깜빡임이 없다. 전체 페이드인은 부모 div에서 처리한다.
 */
const QuotePhrases: React.FC<{ chunks: string[] }> = ({ chunks }) => {
  // 덩어리를 구두점 기준으로 다듬어 한 흐름으로 잇는다(구두점은 앞 구절에 붙임).
  // 색은 구간별로 끊지 않고 텍스트 전체에 연속 그라데이션(노랑→갈색)을 입힌다(정지).
  const text = chunks
    .flatMap(c => c.split(/(?<=[.,。，])/))
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join(' ')
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(95deg, ${QUOTE_PALETTE.join(', ')})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      {text}
    </span>
  )
}

// 인물 직함·이력 — 한 항목 = 한 줄. 여러 줄이면 세력 색 점 마커를 붙여 세로 리스트로 보인다(단일 줄은 마커 없이).
const CreditLines: React.FC<{ items: string[]; accent: string; fontSize: number }> = ({ items, accent, fontSize }) => {
  const isList = items.length > 1
  const dot = Math.round(fontSize * 0.24)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isList ? 14 : 0 }}>
      {items.map((t, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: dot }}>
          {isList ? <span style={{ flexShrink: 0, width: dot, height: dot, borderRadius: '50%', background: accent }} /> : null}
          <span style={{ color: '#d6d6de', fontFamily: FONT, fontSize, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.25, textAlign: 'left' }}>{t}</span>
        </div>
      ))}
    </div>
  )
}

const PersonCard: React.FC<{ episodeName: string; group: FactionGroup; person: FactionPerson; frame: number; cueStart: number; cueDuration: number; orientation: Orientation; groupIndex: number; personIndex: number; clusterIndex?: number; transition?: FactionTransition }> = ({ episodeName, group, person, frame, cueStart, cueDuration, orientation, groupIndex, personIndex, clusterIndex, transition }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [imgErr, setImgErr] = React.useState(false)
  const lines = person.lines ?? []
  // 직함·이력 — 한 항목 = 한 줄(여러 줄이면 리스트로 쌓는다). epithet은 legacy 단일 줄.
  const creditItems = lines.length ? lines : (person.epithet ? [person.epithet] : [])
  const hasCredit = creditItems.length > 0
  const local = frame - cueStart
  // 롱폼은 사진을 기다리지 않고 텍스트가 컷과 거의 동시에 바로 등장 — 등장 타이밍을 ENTER_NAME_SEC만큼 앞당긴다(세로 쇼츠는 기존 그대로)
  const lt = orientation === 'landscape' ? local + f(ENTER_NAME_SEC) : local
  // 대사 소스 — 덩어리(quoteChunks)가 있으면 그 배열을, 없으면 통째 quote를 단일 덩어리로.
  // 덩어리 경계는 줄바꿈이 아니라 색 전환점으로만 쓴다(화면에선 한 흐름으로 이어짐).
  const quoteChunks = person.quoteChunks?.length ? person.quoteChunks : (person.quote ? [person.quote] : [])
  const hasQuote = quoteChunks.length > 0

  // ── 인물 사진 전환효과(세로 쇼츠 전용) — 전역 설정 또는 auto 순환. 가로 롱폼은 줌 없이 고정 ──
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
  // 전환효과: 세력(group) 설정이 있으면 그 세력 인물 전부 통일, 없으면 에피소드 전역(transition)
  const tk = resolveTransition(group.transition ?? transition, personIndex)
  const fxTransform = (() => {
    if (orientation === 'landscape') return 'scale(1)'
    if (tk === 'slide') {
      const x = interpolate(local, [0, f(0.45)], [105, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
      return `translateX(${x}%)`
    }
    // 줌인·켄번스도 도입부(0.55초)에 빠르게 움직이고 정지 — 대사 전 종료(줌아웃·슬라이드와 통일)
    if (tk === 'zoomin') {
      return `scale(${interpolate(local, [0, f(0.55)], [1.0, 1.09], { ...clamp, easing: Easing.out(Easing.cubic) })})`
    }
    if (tk === 'kenburns') {
      const s = interpolate(local, [0, f(0.55)], [1.03, 1.1], { ...clamp, easing: Easing.out(Easing.cubic) })
      const y = interpolate(local, [0, f(0.55)], [1.6, -1.6], { ...clamp, easing: Easing.out(Easing.cubic) })
      return `scale(${s}) translateY(${y}%)`
    }
    // zoomout (기본): 빠르게 뒤로 빠진 뒤(0~0.15초, 1.1→1.0) 멈추지 않고, 컷 끝까지 천천히 다시 줌인(1.0→1.06)한다.
    // 두 구간 경계(0.15초)에서 둘 다 1.0이라 매끄럽게 이어진다.
    const s = local < f(PERSON_ZOOM_OUT_SEC)
      ? interpolate(local, [0, f(PERSON_ZOOM_OUT_SEC)], [PERSON_ZOOM_START, 1.0], clamp)
      : interpolate(local, [f(PERSON_ZOOM_OUT_SEC), cueDuration], [1.0, PERSON_SLOW_ZOOM_END], clamp)
    return `scale(${s})`
  })()
  // 1) 박스 + 이름 + 직함 함께 페이드인. 세로는 박스째 왼쪽에서 슬라이드 인(가로는 슬라이드 없이 페이드만)
  const nameOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 세로 박스 슬라이드 — 왼쪽 밖(-PANEL_SLIDE_X)에서 제자리(0)로. 슬라이드와 페이드를 같은 구간에 묶는다
  const panelSlideX = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + PANEL_SLIDE_SEC)], [-PANEL_SLIDE_X, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const panelOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 2) 직함 — 이름과 같은 시점에 함께 페이드인 후, 글자 수 비례 시간(timing.ts 공유 공식) 보이다 페이드아웃.
  // 대사가 있으면 직함이 먼저 완전히 사라지고, 그 뒤 대사가 등장(순차). 직함 길이에 따라 대사 등장 시점이 동적으로 움직인다.
  const creditOutSec = personCreditOutSec(person)
  const quoteEnterSec = personQuoteEnterSec(person)
  const creditIn = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const creditOut = hasQuote
    ? interpolate(lt, [f(creditOutSec), f(creditOutSec + ENTER_FADE_SEC)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  const creditOp = creditIn * creditOut
  // 3) 직함이 사라진 뒤 같은 자리에 대사 페이드인(겹치지 않음)
  const quoteOp = interpolate(lt, [f(quoteEnterSec), f(quoteEnterSec + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // 음원 사용 중단 — 대사 음성 재생을 끈다(예전 방식 복귀). 데이터·wav 파일은 보존하고 재생만 차단한다.
  // 다시 켜려면 VOICE_ENABLED = true 로 바꾼다(컷 길이는 timing.ts에서 읽기 시간 기준으로 계산됨).
  const VOICE_ENABLED = false
  const audioPlaySec = person.quoteDuration ? person.quoteDuration / clampRate(person.quotePlaybackRate) : 0
  const audioEl = VOICE_ENABLED && person.quoteDuration && person.quoteDuration > 0 ? (
    <Sequence from={cueStart + f(quoteEnterSec)} durationInFrames={f(audioPlaySec)}>
      <Audio
        src={staticFile(voiceRelPath(episodeName, vnPersonQuote(groupIndex, personIndex, clusterIndex)))}
        volume={dbToLinear(person.quoteGainDb)}
        playbackRate={clampRate(person.quotePlaybackRate)}
      />
    </Sequence>
  ) : null

  // 이미지 또는 이니셜 플레이스홀더(세로·가로 공용)
  const photo = person.image && !imgErr ? (
    <Img src={imgSrc(episodeName, person.image)} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)` }}>
      <span style={{ color: accent, fontFamily: FONT, fontSize: orientation === 'landscape' ? 220 : 320, fontWeight: 800 }}>{initials(person.name)}</span>
    </AbsoluteFill>
  )

  // ── 가로 롱폼: 좌측 세로 사진 + 우측 텍스트(잡지 스프레드) ──
  if (orientation === 'landscape') {
    return (
      <AbsoluteFill style={{ backgroundColor: BG, flexDirection: 'row' }}>
        {audioEl}
        {/* 좌: 인물 사진 — 켄번스 줌(컷 동안 천천히 확대) */}
        <div style={{ width: L_PHOTO_W, height: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <AbsoluteFill style={{ transform: fxTransform }}>{photo}</AbsoluteFill>
          {/* 사진→텍스트 경계 부드럽게 */}
          <AbsoluteFill style={{ background: `linear-gradient(to right, transparent 70%, ${BG} 100%)` }} />
        </div>
        {/* 우: 텍스트 — 이름 위치를 고정(상단 기준)하고 아래 슬롯만 확장. 인물마다 위아래로 흔들리지 않게 */}
        {/* 이름(고정) → 같은 슬롯에서 직함(2행) → 대사로 교차 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 28, padding: `300px ${L_TEXT_PAD}px 0` }}>
          {/* 이름 — 박스+이름 함께 페이드인 후 계속 유지 */}
          <div style={{ color: '#ffffff', fontFamily: FONT, fontSize: 88, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1, textAlign: 'left', opacity: nameOp }}>{person.name}</div>
          {/* 직함·대사 공유 슬롯 — 같은 격자 칸에 겹쳐 opacity로 교차. 칸 높이는 둘 중 큰 쪽으로 자동(직함 2행도 수용) */}
          <div style={{ display: 'grid', alignItems: 'start' }}>
            {hasQuote ? (
              <div style={{ gridArea: '1 / 1', color: QUOTE_COLOR, fontFamily: FONT, fontSize: 64, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.3, textAlign: 'left', opacity: quoteOp, whiteSpace: 'normal' }}><QuotePhrases chunks={quoteChunks} /></div>
            ) : null}
            {hasCredit ? (
              <div style={{ gridArea: '1 / 1', opacity: creditOp }}>
                <CreditLines items={creditItems} accent={accent} fontSize={creditItems.length > 1 ? 58 : 64} />
              </div>
            ) : null}
          </div>
          {/* 영문 원문 보조 — 가로 롱폼에서만 표기(세로 쇼츠는 숨김), 대사와 함께 페이드인 */}
          {person.quoteEn ? (
            <div style={{ color: `${FG}66`, fontFamily: FONT, fontSize: 36, fontWeight: 500, letterSpacing: 0.3, lineHeight: 1.35, textAlign: 'left', opacity: quoteOp, whiteSpace: 'pre-line' }}>{person.quoteEn}</div>
          ) : null}
        </div>
      </AbsoluteFill>
    )
  }

  // ── 세로 쇼츠(기존): 풀스크린 사진 + 좌측 하단 텍스트 ──
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {audioEl}
      {/* 인물 사진 — 켄번스 줌(컷 동안 천천히 확대) */}
      <AbsoluteFill style={{ overflow: 'hidden', transform: fxTransform }}>{photo}</AbsoluteFill>
      {/* 상단 살짝 어둡게 — 상단 헤더 영역 가독 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 20%)` }} />
      {/* 텍스트 — 좌측. 박스(이름+직함 한 줄 + 대사)를 한 덩어리로 왼쪽에서 슬라이드 인 */}
      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: '830px 0 0 0' }}>
        {/* 박스+이름을 한 덩어리로 왼쪽에서 슬라이드 인. 박스 높이는 이름 + 직함/대사 슬롯으로 처음부터 확보되어, */}
        {/* 슬라이드로 한 번 들어온 뒤엔 박스가 가만히 있고 그 안에서 직함(2행)→대사 교차만 일어난다(들썩임 없음). */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16,
          width: 'fit-content', maxWidth: 970,
          background: 'rgba(8,8,15,0.62)', padding: '30px 44px 30px 36px', borderRadius: '0 20px 20px 0',
          transform: `translateX(${panelSlideX}px)`, opacity: panelOp,
        }}>
          {/* 이름 — 박스에 실려 함께 들어온 뒤 계속 유지 */}
          <div style={{ color: '#ffffff', fontFamily: FONT, fontSize: 72, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1, textAlign: 'left' }}>{person.name}</div>
          {/* 직함·대사 공유 슬롯 — 같은 격자 칸에 겹쳐 opacity로 교차. 칸 높이는 둘 중 큰 쪽으로 자동(직함 2행도 수용) */}
          <div style={{ display: 'grid', alignItems: 'start', alignSelf: 'stretch' }}>
            {hasQuote ? (
              <div style={{ gridArea: '1 / 1', color: QUOTE_COLOR, fontFamily: FONT, fontSize: 66, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.25, textAlign: 'left', opacity: quoteOp, whiteSpace: 'normal' }}><QuotePhrases chunks={quoteChunks} /></div>
            ) : null}
            {hasCredit ? (
              <div style={{ gridArea: '1 / 1', opacity: creditOp }}>
                <CreditLines items={creditItems} accent={accent} fontSize={creditItems.length > 1 ? 54 : 58} />
              </div>
            ) : null}
          </div>
          {/* 원문 보조 표기는 세로 쇼츠에서 띄우지 않는다(가로 롱폼 전용) */}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/** 마무리(아웃트로) — 한 편의 매듭. 이번 편 제목·회차 안내만 중앙에 정적으로 표시. */
const OutroCard: React.FC<{ script: FactionScript; episodeName: string; orientation: Orientation }> = ({ script, episodeName, orientation }) => {
  const title = script.outroTitle ?? script.title
  const [imgErr, setImgErr] = React.useState(false)
  const hasImage = !!script.outroImage && !imgErr
  // 엔딩 이미지가 없으면 시작 화면처럼 핵심 인물 그리드를 깔되, 매듭이므로 더 어둡게 눌러 제목을 부각한다(수미상관).
  const heroes = (script.heroes ?? []).map(s => findPerson(script, s)).filter(Boolean) as FactionPerson[]
  const cols = orientation === 'landscape' ? `repeat(${heroes.length}, 1fr)` : '1fr 1fr'
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* 엔딩 이미지(있으면) 풀스크린 배경 + 제목 가독용 그라데이션 */}
      {hasImage ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img src={imgSrc(episodeName, script.outroImage!)} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}80 0%, transparent 28%, transparent 62%, ${BG}cc 100%)` }} />
        </AbsoluteFill>
      ) : heroes.length ? (
        <>
          {/* 시작과 같은 인물 그리드 — 세로 2열 / 가로 1행 */}
          <div style={{ display: 'grid', gridTemplateColumns: cols, width: '100%', height: '100%' }}>
            {heroes.map((p, i) => (
              <HeroCell key={i} episodeName={episodeName} person={p} />
            ))}
          </div>
          {/* 제목 가독용 옅은 톤만 — 끝 페이드아웃이 화면을 닫으므로 어둡게 누르지 않고 시작 화면과 같은 밝기로 둔다 */}
          <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}cc 0%, transparent 22%, transparent 78%, ${BG}f5 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 95% 34% at 50% 50%, ${BG}b3 0%, transparent 72%)` }} />
        </>
      ) : null}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 22, padding: CAP_PAD }}>
        <div style={CAP_TITLE}>{title}</div>
        {script.outroNote && <div style={CAP_SUB}>{script.outroNote}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ═══════════════ 컷 레이어 (크로스페이드) ═══════════════ */

const CueLayer: React.FC<{ tc: TimedCue; script: FactionScript; episodeName: string; frame: number; orientation: Orientation }> = ({ tc, script, episodeName, frame, orientation }) => {
  const { start, duration, cue } = tc
  const end = start + duration
  const cf = f(CROSSFADE_SEC)
  // 활성 범위 밖이면 렌더 생략
  if (frame < start - cf || frame > end + cf) return null
  const opacity = interpolate(
    frame,
    [start - cf, start, end, end + cf],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  let content: React.ReactNode = null
  if (cue.kind === 'intro') content = <IntroCard script={script} episodeName={episodeName} orientation={orientation} />
  else if (cue.kind === 'group') content = <GroupCard episodeName={episodeName} group={script.groups[cue.groupIndex]} frame={frame} cueStart={start} orientation={orientation} />
  else if (cue.kind === 'cluster') {
    const g = script.groups[cue.groupIndex]
    content = <ClusterCard episodeName={episodeName} group={g} cluster={clustersOf(g)[cue.clusterIndex]} frame={frame} cueStart={start} orientation={orientation} />
  } else if (cue.kind === 'person') {
    const g = script.groups[cue.groupIndex]
    const person = cue.clusterIndex != null
      ? clustersOf(g)[cue.clusterIndex].people[cue.personIndex]
      : g.people[cue.personIndex]
    content = <PersonCard episodeName={episodeName} group={g} person={person} frame={frame} cueStart={start} cueDuration={end - start} orientation={orientation} groupIndex={cue.groupIndex} personIndex={cue.personIndex} clusterIndex={cue.clusterIndex} transition={script.transition} />
  } else if (cue.kind === 'outro') content = <OutroCard script={script} episodeName={episodeName} orientation={orientation} />

  // 세로: 본문 컷(세력·화보·인물)은 상단 빈 영역 아래에만 그린다(인트로·아웃트로는 풀스크린).
  // 가로: 상단 띠가 없으므로 모든 컷이 풀스크린.
  const isBody = cue.kind === 'group' || cue.kind === 'cluster' || cue.kind === 'person'
  const useHeader = orientation === 'portrait' && isBody
  const wrapStyle: React.CSSProperties = useHeader
    ? { position: 'absolute', top: HEADER_H, left: 0, right: 0, bottom: 0, overflow: 'hidden', opacity }
    : { position: 'absolute', inset: 0, opacity }
  return <div style={wrapStyle}>{content}</div>
}

/* ═══════════════ MAIN ═══════════════ */

// shorts: true면 쇼츠(롱폼 전용 세력 제외, 짧게). 미지정이면 세로=쇼츠로 간주(기존 동작).
// orientation은 화면 레이아웃(세로/가로), shorts는 컷 구성 — 둘을 분리해 'LV(세로인데 전체)' 같은 조합을 만든다.
export const Faction: React.FC<{ script: FactionScript; episodeName: string; orientation?: Orientation; shorts?: boolean }> = ({ script, episodeName, orientation = 'portrait', shorts }) => {
  const frame = useCurrentFrame()
  const isShorts = shorts ?? (orientation === 'portrait')
  const cues = useMemo(() => buildCues(script, isShorts), [script, isShorts])
  const last = cues[cues.length - 1]
  const total = last ? last.start + last.duration : 0
  // 인트로 끝 ~ 아웃트로 시작 사이에 상단 빈 영역 노출. 전환 크로스페이드와 동기로 페이드 인/아웃.
  const cf = f(CROSSFADE_SEC)
  const headerOp = total > 0
    ? interpolate(
        frame,
        [f(INTRO_SEC) - cf, f(INTRO_SEC), total - f(OUTRO_SEC), total - f(OUTRO_SEC) + cf],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0
  // 상단 검정 띠 헤더는 세로 전용. 가로에선 생략한다.
  const showHeader = orientation === 'portrait' && headerOp > 0
  // 영상 전체 시작 페이드인 · 끝 페이드아웃 — 검정에서 떠오르고 검정으로 잠긴다(롱폼·쇼츠 공통).
  const FADE_SEC = 0.7
  const fadeOp = total > 0
    ? interpolate(
        frame,
        [0, f(FADE_SEC), total - f(FADE_SEC), total],
        [1, 0, 0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <FactionBgm script={script} total={total} portrait={isShorts} />
      {cues.map((tc, i) => (
        <CueLayer key={i} tc={tc} script={script} episodeName={episodeName} frame={frame} orientation={orientation} />
      ))}
      {showHeader && <TopHeader script={script} opacity={headerOp} />}
      {/* 시작·끝 검정 페이드 — 모든 컷·헤더 위에 덮는다 */}
      {fadeOp > 0 && (
        <AbsoluteFill style={{ background: BG, opacity: fadeOp, zIndex: 999, pointerEvents: 'none' }} />
      )}
    </AbsoluteFill>
  )
}
