import React from 'react'
import { AbsoluteFill } from 'remotion'
import type { DiscourseScript } from '../types'
import { BG, FONT, CONTENT_PAD } from '../constants'
import { imgSrc, resolveNotice } from '../utils'
import { FilledImage } from '../../Faction/sections/FilledImage'
import { BrandLogo } from '../../BookRecommend/brand'

/**
 * 마지막 화면 — 브랜드 로고 + **고지 재노출**.
 *
 * 고지 3중 방어의 마지막 겹이다(§3 고지 원칙). 인트로에서 한 번, 영상 내내 하단에서, 여기서 다시.
 * 종료 화면 이미지(outroImage)가 지정되면 로고 대신 그 이미지를 깔되 **고지는 그 위에 그대로 남긴다.**
 *
 * 이 카드는 다른 컷과 같은 본문 영역(상·하단 검정 띠 사이)에 그려진다 —
 * 하단 띠는 상시 고지 소자막의 자리라 여기서 침범하지 않는다.
 */
export const OutroCard: React.FC<{
  script: DiscourseScript
  episodeName: string
  isEn: boolean
  startFrame?: number
}> = ({ script, episodeName, isEn, startFrame }) => {
  const [err, setErr] = React.useState(false)
  const notice = resolveNotice(script, isEn)
  const hasImage = !!script.outroImage && !err

  const noticeCard = (
    <div style={{
      maxWidth: 820, borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(0,0,0,0.6)', padding: '22px 30px',
      color: 'rgba(255,255,255,0.82)', fontFamily: FONT, fontSize: 28, fontWeight: 600,
      lineHeight: 1.5, textAlign: 'center', wordBreak: 'keep-all',
    }}>{notice}</div>
  )

  if (hasImage) {
    return (
      <AbsoluteFill style={{ background: BG }}>
        <FilledImage
          src={imgSrc(episodeName, script.outroImage as string)}
          objPos="center center" scale={1} fit="contain"
          startFrame={startFrame}
          onError={() => setErr(true)}
        />
        <AbsoluteFill style={{
          alignItems: 'center', justifyContent: 'flex-end',
          padding: `0 ${CONTENT_PAD + 24}px 56px`, pointerEvents: 'none',
        }}>{noticeCard}</AbsoluteFill>
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill style={{
      background: BG, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: `0 ${CONTENT_PAD + 24}px`, gap: 72,
    }}>
      <BrandLogo variant="full" fontSize={96} />
      {noticeCard}
    </AbsoluteFill>
  )
}
