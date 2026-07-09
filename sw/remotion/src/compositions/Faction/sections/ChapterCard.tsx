import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import type { FactionChapter } from '../types'
import { f } from '../timing'
import { FONT, FONT_SERIF, BG, FG, DEFAULT_ACCENT, TEXT_PAINT } from '../constants'
import { imgSrc, nameHead, nameTail } from '../utils'
import { FilledImage } from './FilledImage'

/**
 * 챕터 표지 카드 — 롱폼 챕터 전환에서 배경 미디어(이미지/비디오) 위에 챕터 제목을 얹는다.
 * 시작 화면(IntroCard)과 같은 미디어 양식이되, '챕터 2' 같은 챕터 표식을 분명히 노출해
 * 영상이 리셋된 것처럼 보이지 않게 한다.
 * 검정→표지→(검정)→다음 챕터 전환은 CueLayer의 크로스페이드가 사이에 낀 검정 브릿지 컷을 경유하며 처리한다.
 * 여기선 배경 재생 + 제목 페이드인만 담당한다.
 */
export const ChapterCard: React.FC<{ chapter: FactionChapter; episodeName: string; cueStart: number; cueDuration?: number }> = ({ chapter, episodeName, cueStart, cueDuration }) => {
  const frame = useCurrentFrame()
  const head = nameHead(chapter.title) // 앞부분 — 챕터 표식(예 '챕터 2')
  const tail = nameTail(chapter.title) // 뒷부분 — 챕터 부제(예 '감시에 맞서다')
  // 제목은 배경이 자리잡은 뒤 떠오른다(컷 시작 기준 0.1초 뒤부터 0.45초까지 — 검정에서 텍스트가 빨리 올라오게 단축).
  // 컷 종료 정보(cueDuration)가 있으면 마지막 0.8초 동안 아래로 스르륵 내려가며 사라지는(Slide Out) 모션을 줍니다.
  const fadeInOp = interpolate(frame, [cueStart + f(0.1), cueStart + f(0.45)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOutOp = cueDuration ? interpolate(frame, [cueStart + cueDuration - f(0.8), cueStart + cueDuration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
  const titleOp = Math.min(fadeInOp, fadeOutOp)

  // 컷 끝날 때 살짝 아래로 내려가는(slideY) 효과
  const slideY = cueDuration ? interpolate(frame, [cueStart + cueDuration - f(0.8), cueStart + cueDuration], [0, 80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0
  const objPos = `${chapter.mediaCrop?.x ?? 50}% ${chapter.mediaCrop?.y ?? 50}%`
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {chapter.media && (
        <FilledImage src={imgSrc(episodeName, chapter.media)} objPos={objPos} scale={chapter.mediaCrop?.scale ?? 1} onError={() => {}} startFrame={cueStart} />
      )}
      {/* 중앙에서 밖으로 번지는 은은한 빛 — 쌩 검정 대신 깊이감을 준다. 미디어가 있으면 그 위에 옅게 얹힌다. */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 62% at 50% 44%, rgba(212,168,40,0.10) 0%, rgba(212,168,40,0.02) 38%, transparent 62%)' }} />
      {/* 가장자리 비네팅 — 밖으로 짙어져 시선을 중앙 제목에 모으고, 밝은 미디어 위에서도 제목이 또렷하게 한다. */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 92% 78% at 50% 44%, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
      {/* 위·아래 이음 — 본문(중단) 영역 위아래 끝을 배경색으로 녹여, 상하단 검정 띠와 경계 없이 부드럽게 이어지게 한다. */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG} 0%, transparent 18%, transparent 82%, ${BG} 100%)` }} />
      {/* 챕터 제목 — 앞부분(챕터 표식) 크게 흰색, 뒷부분(부제) 강조색 세리프 */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30, opacity: titleOp, transform: `translateY(${slideY}px)`, padding: '0 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ color: 'rgba(245, 242, 234, 0.95)', fontFamily: FONT_SERIF, fontSize: 100, fontWeight: 700, letterSpacing: 4, lineHeight: 1.1, textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
            {head}
          </div>
          {tail && (
            <div style={{ color: DEFAULT_ACCENT, fontFamily: FONT_SERIF, fontSize: 72, fontWeight: 600, letterSpacing: 2, textAlign: 'center', lineHeight: 1.3, textShadow: `0 0 20px rgba(212,168,40,0.3), 0 4px 24px rgba(0,0,0,0.9)` }}>
              {tail}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
