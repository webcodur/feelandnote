import React from 'react'
import { AbsoluteFill, Img, interpolate } from 'remotion'
import type { FactionGroup, FactionCluster, Orientation } from '../types'
import { GROUP_SEC, CLUSTER_SEC, f } from '../timing'
import { BG, FONT, FONT_SERIF, DEFAULT_ACCENT } from '../constants'
import { imgSrc } from '../utils'
import { FilledImage } from './FilledImage'

/**
 * 세력 전환(로고)·그룹샷 카드 공통 하단 캡션.
 * 세력명을 항상 같은 위치(하단 360 위)에 고정하고, 보조 라벨(슬로건·소제목)은 그 위에 쌓는다.
 * 보조 라벨의 유무·길이와 무관하게 세력명 위치가 동일하게 유지된다.
 */
const CardCaption: React.FC<{ accent: string; topLabel?: string; name: string; orientation: Orientation }> = ({ accent, topLabel, name, orientation }) => {
  const isLand = orientation === 'landscape'
  // 세로는 하단 블랙바(SAFE_BOTTOM)에 닿지 않게 그 바로 위에 둔다. 가로는 16:9 하단 여백.
  const pad = isLand ? '0 80px 120px' : '0 60px 56px'
  // 세력명·보조 라벨(슬로건) 글씨 크기 통일
  const size = isLand ? 64 : 76
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', padding: pad }}>
      {/* 이름(위) / 보조 라벨(아래) 항상 개행 — 조건 없이 세로 2줄 (세력명-슬로건 / 묶음 소제목-묶음설명 공통) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
        <div style={{ color: '#ffffff', fontFamily: FONT_SERIF, fontSize: size, fontWeight: 800, letterSpacing: 1, lineHeight: 1.15, textAlign: 'center' }}>
          {name}
        </div>
        {topLabel && (
          <div style={{ color: accent, fontFamily: FONT_SERIF, fontSize: size, fontWeight: 700, letterSpacing: 2, lineHeight: 1.15, textAlign: 'center' }}>
            {topLabel}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}

export const GroupCard: React.FC<{ episodeName: string; group: FactionGroup; frame: number; cueStart: number; orientation: Orientation }> = ({ episodeName, group, frame, cueStart, orientation }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [artErr, setArtErr] = React.useState(false)
  // 가로는 이미지를 중앙 정렬(세로는 상단 정렬)
  const objPos = orientation === 'landscape' ? 'center center' : 'center top'
  // 그룹샷·인물 컷과 동일한 켄번스 줌
  const scale = interpolate(frame - cueStart, [0, f(GROUP_SEC)], [1.0, 1.05], { extrapolateRight: 'clamp' })
  // 인트로가 천천히 닫히는 것과 균형 — 세력 로고도 급격히 뜨지 않게 자체 페이드인
  const enterOp = interpolate(frame - cueStart, [0, f(0.8)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity: enterOp }}>
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

export const ClusterCard: React.FC<{ episodeName: string; group: FactionGroup; cluster: FactionCluster; frame: number; cueStart: number; orientation: Orientation }> = ({ episodeName, group, cluster, frame, cueStart, orientation }) => {
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
      {/* 묶음 캡션 — 소제목(label) + 묶음설명(note)을 세력명-슬로건과 동일하게 수평 배치. 묶음 정보가 있을 때만 (로고 세력도 표시) */}
      {(cluster.label || cluster.note) && (
        <>
          <AbsoluteFill style={{ background: `linear-gradient(to top, ${BG}e6 0%, ${BG}b3 22%, ${BG}66 40%, transparent 58%)` }} />
          <CardCaption accent={accent} name={cluster.label ?? cluster.note!} topLabel={cluster.label ? cluster.note : undefined} orientation={orientation} />
        </>
      )}
    </AbsoluteFill>
  )
}
