import React, { useMemo, useState } from 'react'
import {
  AbsoluteFill, Sequence, Audio,
  interpolate, interpolateColors, useCurrentFrame, staticFile, Easing,
  getRemotionEnvironment,
} from 'remotion'
import type { FactionScript, Orientation } from './types'
import { episodes } from './script'
import { buildCues, CROSSFADE_SEC, OUTRO_CROSSFADE_SEC, INTRO_SEC, INTRO_FADE_OUT_SEC, endFadeSecOf, f, type TimedCue } from './timing'
import { FactionBgm } from './FactionBgm'
import { buildFactionSubs } from './subs'
import { BG, FONT, DEFAULT_ACCENT, HEADER_H, SAFE_BOTTOM } from './constants'
import { personCutKind, resolveOutroImage } from './utils'
import { transitionEnterSec, isSlideKind, slideDir } from './transitions'
import { TopHeader } from './sections/TopHeader'
import { FactionProgress } from './sections/FactionProgress'
import { CueLayer } from './sections/CueLayer'
import { SrtPreview } from './studio/SrtPreview'

/* ═══════════════ MAIN ═══════════════ */

// shorts: true면 쇼츠(롱폼 전용 세력 제외, 짧게). 미지정이면 세로=쇼츠로 간주(기존 동작).
// orientation은 화면 레이아웃(세로/가로), shorts는 컷 구성 — 둘을 분리해 'LV(세로인데 전체)' 같은 조합을 만든다.
// script 는 무거운 스크립트 객체(수십만 자) — Studio 컴포지션 전환마다 이 객체를 직렬화하면 UI가 멈춘다.
// 그래서 defaultProps 에는 가벼운 episodeKey 만 싣고, 실제 스크립트는 번들에 이미 로드된 episodes 에서 조회한다.
// script 를 직접 넘기는 호출(하위호환·외부 렌더 override)이 있으면 그쪽을 우선한다.
export const Faction: React.FC<{ script?: FactionScript; episodeKey?: string; episodeName: string; orientation?: Orientation; shorts?: boolean; part?: number; lvPart?: number }> = ({ script: scriptProp, episodeKey, episodeName, orientation = 'portrait', shorts, part, lvPart }) => {
  const resolvedScript = scriptProp ?? (episodeKey ? episodes[episodeKey] : undefined)
  if (!resolvedScript) throw new Error(`Faction: 스크립트를 찾을 수 없다 (episodeKey=${episodeKey ?? '없음'})`)
  const script = resolvedScript
  const frame = useCurrentFrame()
  const isShorts = shorts ?? (orientation === 'portrait')
  // 쇼츠일 때만 편(part) 분할 적용. 롱폼은 편 경계(cut) 기반 lvPart 분할(경계 없으면 전체 통짜).
  const activePart = isShorts ? part : undefined
  const activeLvPart = isShorts ? undefined : lvPart
  const cues = useMemo(() => buildCues(script, isShorts, activePart, activeLvPart), [script, isShorts, activePart, activeLvPart])
  // 별도 자막(.srt) 미리보기 — Studio 토글 전용. 렌더 결과물에는 들어가지 않는다.
  const isStudio = getRemotionEnvironment().isStudio
  const [showSrt, setShowSrt] = useState(false)
  const srtSubs = useMemo(() => (showSrt ? buildFactionSubs(script, isShorts, activePart, activeLvPart) : []), [showSrt, script, isShorts, activePart, activeLvPart])
  const last = cues[cues.length - 1]
  const total = last ? last.start + last.duration : 0
  // 마지막 인물 컷 인덱스 — 최종화면(outro)은 보통 그 뒤에 붙으므로 cues 끝과 다르다.
  const lastPersonIdx = (() => {
    for (let i = cues.length - 1; i >= 0; i--) if (cues[i].cue.kind === 'person') return i
    return -1
  })()
  // 종료 페이드아웃 길이(프레임) — BO 지정(endFadeSec), 미지정 시 기본값. 헤더·검정 페이드가 공유한다.
  const endFadeF = f(endFadeSecOf(script))
  // 헤더(제목)는 첫 프레임부터 떠 있다 — 시작 화면·제목은 처음부터 보이고, 로그라인만 뒤늦게 차오른다.
  // 단, 마지막 인물 컷이 빠지고 아웃트로(브랜드)로 넘어가는 전환에서 제목도 함께 사라진다 — 아웃트로엔 제목 없이 필앤노트만 남는다.
  const outroCue = cues.find(tc => tc.cue.kind === 'outro')
  // 최종화면에 단일 이미지를 쓰면 상단 제목도 그 화면과 함께 떠 있다가, 잠시 뒤 제목만 사라진다.
  // 브랜드 로고 엔딩은 기존대로 최종화면 직전에 제목을 거둔다(로고만 남게).
  const outroWithImage = !!outroCue && !!resolveOutroImage(script, isShorts, activePart)
  const headerFadeEnd = outroWithImage
    ? Math.min(outroCue!.start + outroCue!.duration, outroCue!.start + f(OUTRO_CROSSFADE_SEC + 1.0))
    : outroCue ? outroCue.start : total
  // 단일 이미지 최종화면이면 제목만 짧게 거두고(최종화면은 남음), 그 외엔 전환 크로스페이드에 맞춰 완만하게.
  const headerFadeSec = outroWithImage ? CROSSFADE_SEC : outroCue ? OUTRO_CROSSFADE_SEC : CROSSFADE_SEC
  const headerOp = total > 0
    ? interpolate(frame, [headerFadeEnd - f(headerFadeSec), headerFadeEnd], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0
  // 상단 검정 띠 헤더는 세로 전용. 가로에선 생략한다.
  const showHeader = orientation === 'portrait' && headerOp > 0
  // 헤더 강조색(부제·언더라인) — 현재 컷의 세력색을 따라가되, 세력이 바뀌는 경계에서 직전 색→현재 색으로 부드럽게 섞는다(휙 바뀌지 않게).
  const headerAccent = (() => {
    const colorOf = (tc: TimedCue) => {
      const c = tc.cue
      if (c.kind === 'group' || c.kind === 'cluster' || c.kind === 'person') {
        return script.groups[c.groupIndex]?.color ?? DEFAULT_ACCENT
      }
      return DEFAULT_ACCENT
    }
    let idx = -1
    for (let i = 0; i < cues.length; i++) {
      if (frame >= cues[i].start && frame < cues[i].start + cues[i].duration) { idx = i; break }
    }
    if (idx < 0) return DEFAULT_ACCENT
    const cur = colorOf(cues[idx])
    const prev = idx > 0 ? colorOf(cues[idx - 1]) : cur
    const cfA = f(CROSSFADE_SEC)
    // 컷이 바뀌고 색이 다를 때만, 전환 크로스페이드와 같은 길이로 색을 보간한다.
    if (prev !== cur && frame < cues[idx].start + cfA) {
      const t = interpolate(frame, [cues[idx].start, cues[idx].start + cfA], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      return interpolateColors(t, [0, 1], [prev, cur])
    }
    return cur
  })()
  // 슬라이드 전환 진행 중 두 컷이 만나는 경계 — 그 위에 완충(a x b) 블러 띠를 얹는다.
  // op: 전환 시작·끝에서 띠를 페이드인·아웃해 경계가 화면 끝에 닿을 때 잔재 없이 사라지게 한다.
  const slideBand = (() => {
    if (orientation !== 'portrait') return null
    for (const tc of cues) {
      const k = personCutKind(script, tc.cue, orientation)
      if (!isSlideKind(k)) continue
      const enterStart = tc.start - f(transitionEnterSec(k!))
      if (frame >= enterStart && frame < tc.start) {
        const p = interpolate(frame, [enterStart, tc.start], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
        const x = slideDir(k) === 1 ? 100 * p : 100 * (1 - p)
        const op = interpolate(p, [0, 0.22, 0.8, 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return { x, op }
      }
    }
    return null
  })()
  // 끝 페이드아웃 — 마지막에 검정으로 잠긴다.
  // 시작은 검정에서 떠오르지 않는다: 첫 프레임부터 시작 화면이 그대로 켜져 있다(도입 0.7초 페이드인 제거).
  // 시작문구는 여전히 자기 페이드로 떠오른다(IntroCard).
  const fadeOp = total > 0 && endFadeF > 0
    ? interpolate(
        frame,
        [total - endFadeF, total],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <FactionBgm script={script} total={total} portrait={isShorts} part={activePart} lvPart={activeLvPart} />
      {/* 시작 효과음 — 시작 화면·문구와 같이 켜지고, 같은 페이드아웃 구간에서 같이 꺼진다. BO에서 음원 선택. */}
      {script.startSfx && ((activePart != null && script.loglineByPart?.[activePart]) || (activeLvPart != null && script.loglineByLvPart?.[activeLvPart]) || script.logline) && (() => {
        const introSec = script.introSec ?? INTRO_SEC
        const sfxOut0 = f(Math.max(0, introSec - INTRO_FADE_OUT_SEC))
        const sfxOut1 = Math.max(sfxOut0 + 1, f(introSec))
        return (
          <Sequence from={0} durationInFrames={f(introSec)}>
            <Audio
              src={staticFile(`common/sfx/${script.startSfx}`)}
              volume={fr => interpolate(fr, [sfxOut0, sfxOut1], [0.7, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
            />
          </Sequence>
        )
      })()}
      {/* 로고(세력 타이틀 카드) 등장 효과음 — group 컷이 뜰 때마다 한 번. BO에서 음원 선택. */}
      {script.groupSfx && cues.map((tc, i) => tc.cue.kind === 'group' ? (
        <Sequence key={`gsfx-${i}`} from={tc.start} durationInFrames={f(2)}>
          <Audio src={staticFile(`common/sfx/${script.groupSfx}`)} volume={0.5} />
        </Sequence>
      ) : null)}
      {cues.map((tc, i) => (
        <CueLayer key={i} tc={tc} script={script} episodeName={episodeName} frame={frame} orientation={orientation} part={activePart} lvPart={activeLvPart} nextCutKind={cues[i + 1] ? personCutKind(script, cues[i + 1].cue, orientation) : null} nextKind={cues[i + 1]?.cue.kind ?? null} isLast={i === cues.length - 1} isLastPerson={i === lastPersonIdx} isShorts={isShorts} />
      ))}
      {/* 슬라이드 완충(a x b) — 경계 위에 얹는 블러 띠. 마스크로 가장자리(a·b)는 블러가 0에서 천천히
          살아나고 가운데(x)에서 최대 → A·B 본체에는 영향이 없고 경계만 흐려 잇는다 */}
      {slideBand != null && (
        <div style={{
          position: 'absolute', top: HEADER_H, bottom: SAFE_BOTTOM,
          left: `${slideBand.x}%`, width: '18%', transform: 'translateX(-50%)',
          opacity: slideBand.op,
          backdropFilter: 'blur(26px)', WebkitBackdropFilter: 'blur(26px)',
          background: 'linear-gradient(to right, transparent, rgba(10,10,15,0.18) 50%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 42%, #000 58%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, #000 42%, #000 58%, transparent 100%)',
          zIndex: 60, pointerEvents: 'none',
        }} />
      )}
      {/* 가로 롱폼 전용 진행 표시 — 하단 세력색 타임라인 + 우상단 현재 세력/카운트 */}
      {orientation === 'landscape' && <FactionProgress script={script} cues={cues} frame={frame} total={total} />}
      {showHeader && <TopHeader caption={(activePart != null && script.titleByPart?.[activePart]) || (activeLvPart != null && script.titleByLvPart?.[activeLvPart]) || script.title} opacity={headerOp} accent={headerAccent} />}
      {/* 하단 고정 빈 영역(블랙 프레임) — 상단 헤더와 같은 규격으로 통일(북리커맨드 쇼츠와 동일). 자막은 이 위 MID 영역 하단에 얹힌다. */}
      {showHeader && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE_BOTTOM, background: BG, zIndex: 50, opacity: headerOp }} />}
      {/* 시작·끝 검정 페이드 — 모든 컷·헤더 위에 덮는다 */}
      {fadeOp > 0 && (
        <AbsoluteFill style={{ background: BG, opacity: fadeOp, zIndex: 999, pointerEvents: 'none' }} />
      )}
      {/* 별도 자막(.srt) 미리보기 — Studio 에서만. 토글 버튼 + 자막 오버레이. 렌더 결과물에는 안 나온다. */}
      {isStudio && showSrt && <SrtPreview subs={srtSubs} frame={frame} />}
      {isStudio && (
        <button
          onClick={() => setShowSrt(v => !v)}
          style={{
            position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)', zIndex: 1001,
            padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
            background: showSrt ? '#d4a828' : 'rgba(0,0,0,0.7)', color: showSrt ? '#1a1407' : '#fff',
            border: '2px solid rgba(255,255,255,0.6)', fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: 1,
            writingMode: 'vertical-rl', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          자막 {showSrt ? 'ON' : 'OFF'}
        </button>
      )}
    </AbsoluteFill>
  )
}
