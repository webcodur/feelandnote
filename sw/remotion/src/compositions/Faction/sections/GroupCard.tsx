import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import type { FactionGroup, FactionCluster, FactionImageCrop, HoldMotion, EnterMotion, Orientation, ZoomFocus, GlitchLevel } from '../types'
import { f } from '../timing'
import { BG, FONT, FONT_SERIF, DEFAULT_ACCENT, accentClarityPaint } from '../constants'
import { imgSrc, nameHead, nameTail, holdAndShakeParts, enterMotionScale, enterMotionSec, isPushinZoom } from '../utils'
import { FilledImage } from './FilledImage'
import { HoldGlitch } from '../transitions'
import { CaptionBackdrop } from './CaptionBackdrop'

/**
 * 세력 전환(로고)·그룹샷 카드 공통 하단 캡션.
 * 통합 명칭 한 필드(caption)를 받아 앞부분(첫 줄, 흰색)과 뒷부분(나머지, 세력색)으로 쪼개 쌓는다.
 * 앞부분을 항상 같은 위치(하단 360 위)에 고정하고, 뒷부분은 그 위에 둔다.
 * 뒷부분의 유무·길이와 무관하게 앞부분 위치가 동일하게 유지된다.
 */
/*
 * [보류] 좌측 하단 대화박스 버전 — 왼쪽에서 슬라이드 인 + 좌측 세력색 바.
 * 되살리려면: remotion에서 `Easing`, constants에서 `CONTENT_PAD·L_TEXT_PAD·PANEL_SLIDE_X·PANEL_SLIDE_SEC` import 복원,
 * CardCaption signature에 `local: number` 추가, 두 호출부에 `local={frame - cueStart}` 전달.
 *
 *   const pad = isLand ? `0 ${L_TEXT_PAD}px 120px` : `0 ${CONTENT_PAD}px ${CONTENT_PAD}px`
 *   const slideX = isLand ? 0 : interpolate(local, [0, f(PANEL_SLIDE_SEC)], [-PANEL_SLIDE_X, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
 *   return (
 *     <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: pad }}>
 *       <div style={{
 *         display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16,
 *         width: 'fit-content', maxWidth: isLand ? 1280 : 920,
 *         background: 'rgba(0,0,0,0.42)', padding: isLand ? '34px 52px' : '34px 48px', borderRadius: 4,
 *         borderLeft: `6px solid ${accent}`, transform: `translateX(${slideX}px)`,
 *       }}>
 *         <div style={{ ..., textAlign: 'left' }}>{head}</div>
 *         {tail && <div style={{ ..., textAlign: 'left' }}>{tail}</div>}
 *         {sub && <div style={{ ..., textAlign: 'left' }}>{sub}</div>}
 *       </div>
 *     </AbsoluteFill>
 *   )
 */
const CardCaption: React.FC<{ accent: string; caption: string; orientation: Orientation; sub?: string }> = ({ accent, caption, orientation, sub }) => {
  const isLand = orientation === 'landscape'
  // [개편] 중앙 배치(대사 중앙 자막 슬롯과 동일: 정중앙 + 56px 아래) + 중앙자막 크기로 축소.
  // [기존-하단배치 롤백용] pad = isLand ? '0 80px 120px' : '0 60px 56px' / size = isLand ? 55 : 62 / subSize = isLand ? 34 : 40 / justifyContent: 'flex-end'
  const pad = isLand ? '0 80px' : '0 60px'
  const size = isLand ? 56 : 62
  // 흡수된 소제목(sub)은 명칭보다 한 단계 작게.
  const subSize = isLand ? 38 : 42
  const head = nameHead(caption)
  const tail = nameTail(caption)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: pad, transform: 'translateY(56px)' }}>
      {/* 앞부분(위, 흰색) / 뒷부분(아래, 세력색) — 개행 기준으로 갈린다 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
        {/* 시작문구와 동일한 글로우를 텍스트 단위로 — 각 글줄 뒤만 어둡게 */}
        <div style={{ color: '#ffffff', fontFamily: FONT_SERIF, fontSize: size, fontWeight: 800, letterSpacing: 1, lineHeight: 1.15, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)', WebkitTextStroke: '1px rgba(0,0,0,0.85)', paintOrder: 'stroke fill' }}>
          <CaptionBackdrop>{head}</CaptionBackdrop>
        </div>
        {tail && (
          <div style={{ color: accent, fontFamily: FONT_SERIF, fontSize: size, fontWeight: 700, letterSpacing: 2, lineHeight: 1.15, textAlign: 'center', whiteSpace: 'pre-line', textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)', WebkitTextStroke: '1px rgba(0,0,0,0.85)', paintOrder: 'stroke fill', ...accentClarityPaint(accent) }}>
            <CaptionBackdrop>{tail}</CaptionBackdrop>
          </div>
        )}
        {/* 화보 카드를 생략한 1인 진영의 소제목 — 명칭 아래 작게 흡수 */}
        {sub && (
          <div style={{ color: `${accent}e6`, fontFamily: FONT, fontSize: subSize, fontWeight: 600, letterSpacing: 1, lineHeight: 1.25, textAlign: 'center', whiteSpace: 'pre-line', marginTop: 6, textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)', WebkitTextStroke: '0.8px rgba(0,0,0,0.85)', paintOrder: 'stroke fill', ...accentClarityPaint(accent) }}>
            <CaptionBackdrop>{sub}</CaptionBackdrop>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}

/**
 * 화보·로고 맞춤(crop) + 지속 효과를 FilledImage(비율 유지 contain) 입력으로 변환.
 * 지속 효과(hold)는 인물 컷과 같은 공유 계산(holdMotionParts)으로 줌(scale)·이동(tx·ty)을 만든다.
 * crop 이 있으면 보일 위치(objPos·transformOrigin)와 추가 확대(× crop.scale)를 얹는다.
 */
function cropProps(crop: FactionImageCrop | undefined, fallbackPos: string, hold: HoldMotion, z: number, focus?: ZoomFocus, speedMul?: number, enter: EnterMotion = 'none', shake = false): { objPos: string; scale: number; tx: number; ty: number; transformOrigin?: string } {
  // 푸시인 목표점 — 줌 전용 목표점 → 사진맞춤 위치 → 가운데 순으로 폴백.
  const fx = focus?.x ?? crop?.x ?? 50
  const fy = focus?.y ?? crop?.y ?? 50
  // 시작 효과(도입) × 지속 효과(도입 후, 흔들림 합성) 결합 — 지속은 도입이 끝난 시점부터 누적해 1.0에서 매끄럽게 이어진다.
  const enterS = enterMotionScale(enter, z)
  const m = holdAndShakeParts(hold, shake, Math.max(0, z - f(enterMotionSec(enter))), { focusX: fx, focusY: fy, speedMul })
  // 푸시인 줌은 카메라가 목표점으로 이동하는 모드라 확대 기준점을 화면 중앙에 둔다(이동량 계산과 일치).
  const pushin = isPushinZoom(hold)
  if (!crop) return { objPos: fallbackPos, scale: enterS * m.scale, tx: m.tx, ty: m.ty, transformOrigin: pushin ? '50% 50%' : undefined }
  const pos = `${crop.x ?? 50}% ${crop.y ?? 50}%`
  return { objPos: pos, scale: enterS * m.scale * (crop.scale ?? 1), tx: m.tx, ty: m.ty, transformOrigin: pushin ? '50% 50%' : pos }
}

export const GroupCard: React.FC<{ episodeName: string; group: FactionGroup; frame: number; cueStart: number; orientation: Orientation; noZoom?: boolean; hold?: HoldMotion; shake?: boolean; zoomSpeed?: number }> = ({ episodeName, group, frame, cueStart, orientation, noZoom = false, hold = 'none', shake = false, zoomSpeed = 1 }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  // 로고 로드 실패 횟수 — 0=1차(logoVid 우선), 1=이미지 로고 재시도, 2+=색 배경 폴백
  const [artErrCount, setArtErrCount] = React.useState(0)
  // 화보 카드가 생략되는 1인 진영(노출 1명 + cluster.image 없음)의 소제목을 로고 카드가 흡수한다.
  // buildCues 의 화보 카드 생략 조건과 동일하게 판정한다.
  const soloSub = React.useMemo(() => {
    const cs = group.clusters
    if (!cs?.length) return undefined
    const vis = cs.filter(c => (c.people ?? []).some(p => !p.disabled))
    if (vis.length !== 1) return undefined
    const c = vis[0]
    const n = (c.people ?? []).filter(p => !p.disabled).length
    return n === 1 && !c.image && c.label?.trim() ? c.label : undefined
  }, [group])
  // 가로는 이미지를 중앙 정렬(세로는 상단 정렬)
  const fallbackPos = orientation === 'landscape' ? 'center center' : 'center top'
  // 인물 컷과 동일한 지속 효과 (noZoom이면 정지). 세력·전역에서 계승한 hold 를 카드 등장 기준(frame-cueStart)으로 적용.
  const art = cropProps(group.logoCrop, fallbackPos, noZoom ? 'none' : hold, frame - cueStart, undefined, zoomSpeed, 'none', noZoom ? false : shake)
  // 타이틀 카드 비주얼 — 영상 로고(logoVid) 우선, 없으면 이미지 로고(logoImg).
  // 1차 소스 로드 에러 시 이미지 로고가 따로 있으면 그걸로 한 번 더 시도, 그마저 실패하면 색 배경 폴백.
  const primarySrc = group.logoVid ?? group.logoImg
  const retrySrc = group.logoImg !== primarySrc ? group.logoImg : undefined
  const artSrc = artErrCount === 0 ? primarySrc : artErrCount === 1 ? retrySrc : undefined
  // 인트로가 천천히 닫히는 것과 균형 — 세력 로고도 급격히 뜨지 않게 자체 페이드인
  const enterOp = interpolate(frame - cueStart, [0, f(0.8)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity: enterOp }}>
      {artSrc ? (
        // 로고 — 비율 유지(contain), 좌우 여백은 같은 이미지 블러로 채움
        <FilledImage src={imgSrc(episodeName, artSrc)} objPos={art.objPos} scale={art.scale} tx={art.tx} ty={art.ty} transformOrigin={art.transformOrigin} startFrame={cueStart} onError={() => setArtErrCount(c => c + 1)} />
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)` }}>
          <span style={{ color: `${accent}cc`, fontFamily: FONT, fontSize: 64, fontWeight: 700, letterSpacing: 6 }}>LOGO ART</span>
        </AbsoluteFill>
      )}
      {/* 그룹샷·인물 컷과 동일한 상·하단 그라데이션 — 텍스트가 로고 위에 확실히 보이게 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 22%)` }} />
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${BG}e6 0%, ${BG}b3 22%, ${BG}66 40%, transparent 58%)` }} />
      {/* 텍스트 — 그룹샷과 동일한 공통 캡션(하단 중앙). 세력 명칭 한 필드 + (생략된 화보의) 소제목 흡수 */}
      <CardCaption accent={accent} caption={group.name} orientation={orientation} sub={soloSub} />
    </AbsoluteFill>
  )
}

export const ClusterCard: React.FC<{ episodeName: string; group: FactionGroup; cluster: FactionCluster; frame: number; cueStart: number; cueDuration?: number; orientation: Orientation; noZoom?: boolean; hold?: HoldMotion; enter?: EnterMotion; glitch?: false | GlitchLevel; shake?: boolean; zoomSpeed?: number }> = ({ episodeName, group, cluster, frame, cueStart, cueDuration, orientation, noZoom = false, hold = 'none', enter = 'none', glitch = false, shake = false, zoomSpeed = 1 }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [imgErr, setImgErr] = React.useState(false)
  // 그룹샷 시작 0.5초 뒤부터 절반 시간에 걸쳐 자막을 페이드아웃
  const captionOp = cueDuration
    ? interpolate(frame - cueStart, [f(0.5), f(0.5) + cueDuration * 0.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  // 가로는 이미지를 중앙 정렬(세로는 상단 정렬)
  const fallbackPos = orientation === 'landscape' ? 'center center' : 'center top'
  // 인물 컷과 동일한 지속 효과 (noZoom이면 정지). 세력·전역에서 계승한 hold 를 카드 등장 기준으로 적용. 줌인은 목표점으로 푸시인. 시작 효과는 도입에 결합.
  const cov = cropProps(cluster.imageCrop, fallbackPos, noZoom ? 'none' : hold, frame - cueStart, cluster.zoomFocus, zoomSpeed, noZoom ? 'none' : enter, noZoom ? false : shake)
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {cluster.image && !imgErr ? (
        // 지지직 글리치. 줌과 별개 축으로 토글(미지정 시 그룹샷 기본 켜짐). 막판(tail)은 컷 끝 1초에만, 라이트·헤비는 내내.
        glitch ? (
          <HoldGlitch frame={frame} startFrame={cueStart} level={glitch || 'heavy'} gateFromLocal={glitch === 'tail' && cueDuration ? Math.max(0, cueDuration - f(1.0)) : 0}>
            <FilledImage src={imgSrc(episodeName, cluster.image)} objPos={cov.objPos} scale={cov.scale} tx={cov.tx} ty={cov.ty} transformOrigin={cov.transformOrigin} startFrame={cueStart} fit="cover" onError={() => setImgErr(true)} />
          </HoldGlitch>
        ) : (
          <FilledImage src={imgSrc(episodeName, cluster.image)} objPos={cov.objPos} scale={cov.scale} tx={cov.tx} ty={cov.ty} transformOrigin={cov.transformOrigin} startFrame={cueStart} fit="cover" onError={() => setImgErr(true)} />
        )
      ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)` }}>
          <span style={{ color: `${accent}cc`, fontFamily: FONT, fontSize: 72, fontWeight: 700, letterSpacing: 6 }}>TEAM SHOT</span>
        </AbsoluteFill>
      )}
      {/* 상단 그라데이션 — 상단 헤더 가독 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 20%)` }} />
      {/* 묶음 캡션 — 단체 명칭 한 필드(앞부분\n뒷부분). 명칭이 있을 때만 (로고 세력도 표시) */}
      {cluster.label?.trim() && (
        <div style={{ opacity: captionOp }}>
          <CardCaption accent={accent} caption={cluster.label} orientation={orientation} />
        </div>
      )}
    </AbsoluteFill>
  )
}
