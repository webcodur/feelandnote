import React from 'react'
import { AbsoluteFill, Img } from 'remotion'

/**
 * 비율 유지(contain) 이미지 + 레터박스 여백 채움.
 * 같은 이미지를 화면 가득(cover) 깔고 강하게 흐려 가장자리 색으로 번지게 한 뒤, 그 위에 본 이미지를 비율 유지로 얹는다.
 * 로고·그룹샷처럼 가로세로비가 화면과 다른 이미지의 좌우·상하 검정 여백을 없앤다.
 */
export const FilledImage: React.FC<{ src: string; objPos: string; scale: number; onError: () => void }> = ({ src, objPos, scale, onError }) => (
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
