/**
 * FactionLVThumbCandidate — 세력도감 세로 롱폼(KO-LV) 썸네일 (채택안, 컴포지션 ID: -KO-LV-TH).
 *
 * 우측: 대표 인물(GEM에서 고른 lvThumbnailImage, 없으면 첫 인물).
 * 좌측: 세력색 포인트 + 타이틀 + 시작문구.
 * 공통 브랜딩(세력도감 배지 + FEEL&NOTE)은 ThumbBrand 공유.
 * 기존 -KO-LV-GEM(FactionLVThumbnail)은 예비로 병존한다.
 */
import React from 'react'
import { AbsoluteFill, Img } from 'remotion'
import type { FactionScript } from '../Faction/types'
import { imgSrc } from '../Faction/utils'
import { FONT } from '../BookRecommend/fonts'
import { ThumbBrand } from './ThumbBrand'

const DARK = '#090807'
const GOLD = '#c8a46e'
/** 제목 줄별 색 — 두 줄 이상이면 위는 순백, 아래는 살짝 따뜻하게 낮춰 층을 준다(번갈아 반복). */
const TITLE_TONES = ['#ffffff', '#d9cdba']

type Props = { script: FactionScript; episodeName: string }

/** 대표 이미지 폴백 — 첫 인물 사진 → 첫 그룹샷 */
const firstImage = (s: FactionScript, ep: string) => {
  const p = s.groups.flatMap(g => g.clusters.flatMap(c => c.people))
    .find(pp => pp.isPerson !== false && pp.image)
  const c = s.groups.flatMap(g => g.clusters).find(cc => cc.image)
  const raw = p?.image ?? c?.image
  return raw ? imgSrc(ep, raw) : undefined
}

export const FactionLVThumbCandidate: React.FC<Props> = ({ script, episodeName }) => {
  const ep = episodeName
  const heroImg = script.lvThumbnailImage ? imgSrc(ep, script.lvThumbnailImage) : firstImage(script, ep)
  // 제목: 개행이 있으면 그대로, 없으면 공백에서 줄바꿈(데이터 불변, 썸네일에서만 2줄)
  const rawTitle = (script.title ?? '').trim()
  const title = rawTitle.includes('\n')
    ? rawTitle.split('\n').map(l => l.trim()).filter(Boolean)
    : rawTitle.split(/\s+/).filter(Boolean)
  const log = (script.logline ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const pc = GOLD

  return (
    <AbsoluteFill style={{ backgroundColor: DARK, overflow: 'hidden' }}>
      {/* 배경 — 인물을 흐리게 깔아 좌측 순검정 방지(어두운 질감) */}
      {heroImg && (
        <Img src={heroImg} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.32) blur(14px) saturate(0.72)' }} />
      )}

      {/* 우측 대표 인물 (58%) */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '58%', overflow: 'hidden', zIndex: 2 }}>
        {heroImg && (
          <Img src={heroImg} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', filter: 'contrast(1.12) brightness(0.94) saturate(0.96)' }} />
        )}
      </div>

      {/* 좌측 어둠 오버레이 — 텍스트 가독(흐린 배경은 살짝 비침) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'linear-gradient(to right, rgba(9,8,7,0.94) 0%, rgba(9,8,7,0.82) 38%, rgba(9,8,7,0.4) 58%, transparent 72%)' }} />

      {/* 좌측 타이틀 패널 (넓게) — 제목·설명 세로 중앙 */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '52%', zIndex: 10,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 64, paddingRight: 16,
      }}>
        {title.map((l, i) => (
          <div key={i} style={{ fontFamily: FONT.sans, fontWeight: 900, fontSize: 128, color: TITLE_TONES[i % TITLE_TONES.length], lineHeight: 1.06, letterSpacing: '-3px', textAlign: 'left', whiteSpace: 'nowrap', textShadow: '0 4px 26px rgba(0,0,0,0.9)' }}>{l}</div>
        ))}
        {log.length ? (
          <div style={{ marginTop: 40, fontFamily: FONT.sans, fontWeight: 700, fontSize: 58, color: pc, lineHeight: 1.4, whiteSpace: 'nowrap', textShadow: '0 3px 20px rgba(0,0,0,0.9)' }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        ) : null}
      </div>

      <ThumbBrand />
    </AbsoluteFill>
  )
}
