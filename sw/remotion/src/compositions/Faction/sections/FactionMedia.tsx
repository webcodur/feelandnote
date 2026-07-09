import React from 'react'
import { Img, OffthreadVideo, Sequence } from 'remotion'
import { isVideoSrc } from '../utils'

/**
 * 이미지/영상 공용 렌더. src 확장자가 영상이면 OffthreadVideo(무음), 아니면 Img.
 * style·onError 를 그대로 전달해 기존 <Img> 자리와 1:1 호환된다.
 *
 * 미리보기·렌더 모두 OffthreadVideo 로 통일한다. OffthreadVideo 는 프레임을 정지 이미지로 그리므로,
 * 켄번스 줌(매 프레임 바뀌는 상위 transform) 위에서도 이미지처럼 매끄럽게 확대된다.
 *   (네이티브 <video> 요소(코어 Video)는 줌 transform 위에서 사방으로 떨린다 — Chrome 합성 레이어 충돌.)
 * 미리보기 디코딩 부담은 클립을 all-intra(모든 프레임 키프레임)로 인코딩해 해소한다 — 어느 프레임이든 즉시 디코딩.
 *
 * 영상은 컷 시작(startFrame)을 0초 기준으로 삼아 그 컷이 뜰 때 처음부터 재생되도록 Sequence(layout="none")로 감싼다.
 * 이 래퍼가 없으면 영상은 컴포지션 전체 프레임을 재생 위치로 읽어, 컷이 영상 길이보다 뒤에서 시작하면 끝 프레임에 멈춘다.
 *
 * 채움: 영상은 가로형이라도 세로 화면을 빈틈없이 채우도록 비율을 유지한 채 채운다(objectFit: cover).
 *   부모가 준 contain(위아래 여백) 대신 cover 로 덮어쓴다 — 가로 영상이 화면 한가운데 작은 띠로 들어가던
 *   문제를 없앤다. 비율을 유지하므로 화면비를 넘는 가로 폭은 좌우로 잘린다(늘어나 왜곡되진 않는다).
 *   이미지는 제작 비율이 화면에 맞춰져 있으므로 cover 강제 대상이 아니다(부모 style 그대로).
 */
export const FactionMedia: React.FC<{
  src: string
  style?: React.CSSProperties
  onError?: () => void
  /** 이 미디어가 속한 컷의 시작 프레임 — 영상이 컷 시작부터 재생되게 한다. 미지정이면 0(컴포지션 시작=인트로). */
  startFrame?: number
  /** 영상 채움 방식 — 'cover'(기본, 비율 유지 꽉 채움·화면비 넘는 부분 잘림) | 'contain'(비율 유지·잘림 없이 여백). 이미지는 style로 제어 */
  fit?: 'cover' | 'contain'
}> = ({ src, style, onError, startFrame = 0, fit = 'cover' }) => {
  if (!isVideoSrc(src)) return <Img src={src} style={style} onError={onError} />
  const videoStyle: React.CSSProperties = { ...style, objectFit: fit }
  return (
    <Sequence from={startFrame} layout="none">
      <OffthreadVideo src={src} muted style={videoStyle} onError={onError ? () => onError() : undefined} />
    </Sequence>
  )
}
