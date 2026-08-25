import React from 'react'
import { AbsoluteFill } from 'remotion'
import { FactionMedia } from './FactionMedia'
import { isVideoSrc } from '../utils'
import type { ImageFilter } from '../image-filters'

/**
 * 비율 유지(contain) 이미지 + 레터박스 여백 채움.
 * 같은 이미지를 화면 가득(cover) 깔고 강하게 흐려 가장자리 색으로 번지게 한 뒤, 그 위에 본 이미지를 비율 유지로 얹는다.
 * 로고·그룹샷처럼 가로세로비가 화면과 다른 이미지의 좌우·상하 검정 여백을 없앤다.
 *
 * 영상은 FactionMedia 가 비율을 유지한 채 화면을 빈틈없이 채우므로(objectFit: cover) 흐린 배경이 가려져 보이지 않는다.
 * 따라서 영상일 때는 배경 블러 레이어를 그리지 않는다 — 같은 영상을 두 번 디코딩하는 낭비를 없앤다.
 */
export const FilledImage: React.FC<{ src: string; objPos: string; scale: number; onError: () => void; startFrame?: number; transformOrigin?: string; tx?: number; ty?: number; fit?: 'cover' | 'contain'; squareWindow?: 'top' | 'center'; filter?: ImageFilter }> = ({ src, objPos, scale, onError, startFrame, transformOrigin, tx = 0, ty = 0, fit, squareWindow, filter }) => {
  const isVid = isVideoSrc(src)
  // 이미지 기본은 contain(비율 유지+여백 블러). cover 지정 시 화면을 꽉 채우므로 여백이 없어 블러 배경도 그리지 않는다.
  const imgFit = fit ?? 'contain'
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* 배경 레이어 — 같은 이미지를 꽉 채워 흐리게(여백을 가장자리 색으로 채움). 영상·cover 는 꽉 차므로 생략. */}
      {/* 흐림(blur)은 요소 가장자리에서 투명과 섞여 밝은 1px 라인을 남긴다. 흐림 요소를 화면보다 키우고(112%) 음수 위치로 밀어 */}
      {/* 그 라인을 바깥 overflow:hidden 클립 영역 밖으로 내보낸다(transform scale 은 라인이 요소 안쪽에 남아 가려지지 않음). */}
      {!isVid && imgFit !== 'cover' && (
        <div style={{ position: 'absolute', top: '-6%', left: '-6%', width: '112%', height: '112%' }}>
          <FactionMedia src={src} startFrame={startFrame} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(60px) brightness(0.7)' }} />
        </div>
      )}
      {/* 본 이미지 레이어 — 이미지는 fit(기본 contain), 영상은 비율 유지+채움(cover, FactionMedia 가 덮어씀) */}
      {/* 사진 맞춤(crop): objPos·transformOrigin 으로 보일 위치를, scale 로 확대(켄번스 줌에 곱)를 잡는다 */}
      {!isVid && squareWindow ? (
        // 정사각 창 모드 — 이미지를 정사각 창(cover)으로만 열고 창 밖은 위 블러 레이어가 가린다.
        // 정사각 이미지는 기존 contain 표시와 동일하고, 세로(9:16 등) 이미지는 objPos가 가리키는 구간(기본 중단)만 보인다.
        <div
          style={
            squareWindow === 'top'
              ? { position: 'absolute', top: 0, left: 0, width: '100%', aspectRatio: '1 / 1', overflow: 'hidden' }
              : { position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', height: '100%', aspectRatio: '1 / 1', overflow: 'hidden' }
          }
        >
          <FactionMedia src={src} startFrame={startFrame} onError={onError} filter={filter} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: objPos, transform: `scale(${scale}) translate(${tx}%, ${ty}%)`, transformOrigin }} />
        </div>
      ) : (
        <AbsoluteFill>
          <FactionMedia src={src} startFrame={startFrame} fit={fit} onError={onError} filter={filter} style={{ width: '100%', height: '100%', objectFit: imgFit, objectPosition: objPos, transform: `scale(${scale}) translate(${tx}%, ${ty}%)`, transformOrigin }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}
