import React from 'react'
import { AbsoluteFill, Sequence, Audio, interpolate, useCurrentFrame, staticFile } from 'remotion'
import type { FactionScript, Orientation } from '../types'
import { NARRATOR_ENTER_SEC, ENTER_FADE_SEC, narratorSpeakSec, narratorVoicePlaySec, f } from '../timing'
import { BG, FG, FONT, FONT_SERIF, DEFAULT_ACCENT, CONTENT_PAD } from '../constants'
import { imgSrc, initials } from '../utils'
import { vnNarratorIntro, voiceRelPath, vnTimingKey, dbToLinear, clampRate } from '../voice-names'
import { FactionMedia } from './FactionMedia'
import { QuotePages } from './PersonCard'

/**
 * 나레이터 소개 컷 — 인트로 직후 1장(옵션, 기본 롱폼 전용). 에피소드의 해설자(예: 헤르메스)가
 * 화면 가득 등장해 본인 음성(voice/narrator-intro.wav)으로 소개 대사를 읽는다.
 * 인물 컷(PersonCard)의 대사 자막 부품(QuotePages)을 재사용하되, 세력·직함·리드 스텝 없이
 * 「신원(이름·한 줄 소개) + 소개 대사」만 얹는 경량 카드다. 음원은 BO에서 생성·저장한다.
 */
export const NarratorCard: React.FC<{
  script: FactionScript
  episodeName: string
  cueStart: number
  orientation: Orientation
}> = ({ script, episodeName, cueStart, orientation }) => {
  const n = script.narrator!
  const v = n.intro
  const frame = useCurrentFrame()
  const lt = frame - cueStart
  const isPortrait = orientation === 'portrait'
  const [imgErr, setImgErr] = React.useState(false)
  const clampLR = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

  // 사진 맞춤 — 인물 컷과 같은 규칙(cover + objectPosition 초점 + scale 확대)
  const crop = n.imageCrop
  const objPos = `${crop?.x ?? 50}% ${crop?.y ?? 50}%`
  const cropScale = crop?.scale ?? 1

  // 대사 소스 — 덩어리(quoteChunks)가 있으면 페이지 단위로, 없으면 통째
  const chunks = v?.quoteChunks?.length ? v.quoteChunks : (v?.quote ? [v.quote] : [])
  const speakSec = narratorSpeakSec(v)
  const quoteStartF = cueStart + f(NARRATOR_ENTER_SEC)
  // 발화 시각(파이프라인 정렬)이 있으면 실제 시각으로 점등, 없으면 글자수 비례 폴백(QuotePages 내장)
  const timings = script.voiceTimings?.[vnTimingKey(vnNarratorIntro())]

  // 신원(이름·소개) 먼저, 반 박자 뒤 대사 — 인물 컷의 순차 등장 리듬을 축약
  const idOp = interpolate(lt, [f(0.1), f(0.1 + ENTER_FADE_SEC)], [0, 1], clampLR)
  const quoteOp = interpolate(lt, [f(NARRATOR_ENTER_SEC), f(NARRATOR_ENTER_SEC + ENTER_FADE_SEC)], [0, 1], clampLR)

  // 소개 음성 — 저장된 wav가 있을 때만(quoteDuration 기록 기준). 재생 창은 발화 길이 + 꼬리 여유
  const audioEl = narratorVoicePlaySec(v) > 0 ? (
    <Sequence from={quoteStartF} durationInFrames={f(narratorVoicePlaySec(v) + 0.4)}>
      <Audio
        src={staticFile(voiceRelPath(episodeName, vnNarratorIntro()))}
        volume={dbToLinear(v?.quoteGainDb)}
        playbackRate={clampRate(v?.quotePlaybackRate)}
      />
    </Sequence>
  ) : null

  const pad = isPortrait ? CONTENT_PAD : 120

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {audioEl}
      {/* 나레이터 사진 — 화면 가득(cover). 없거나 로드 실패면 이니셜 */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {n.image && !imgErr ? (
          <FactionMedia
            src={imgSrc(episodeName, n.image)}
            startFrame={cueStart}
            onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: objPos, transform: `scale(${cropScale})`, transformOrigin: objPos }}
          />
        ) : (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#14141c' }}>
            <span style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 140, fontWeight: 800 }}>{initials(n.name ?? '')}</span>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      {/* 상단 살짝·하단 짙게 — 인물 컷과 같은 가독 그라데이션 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 20%, transparent 52%, ${BG}e8 100%)` }} />
      {/* 신원 + 소개 대사 — 하단 좌측 정렬 한 덩어리 */}
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'stretch', padding: `0 ${pad}px ${isPortrait ? 72 : 84}px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 30 }}>
          {chunks.length > 0 && (
            <div style={{ display: 'grid', width: '100%' }}>
              <QuotePages
                chunks={chunks}
                timings={timings}
                startFrame={quoteStartF}
                spreadFrames={Math.max(1, f(speakSec))}
                fontSize={isPortrait ? 58 : 54}
                color="#d8dce2"
                highlightColor="#ffffff"
                maxChars={isPortrait ? 64 : 84}
                opacity={quoteOp}
                lineHeight={1.42}
              />
            </div>
          )}
          <div style={{ opacity: idOp, display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `6px solid ${DEFAULT_ACCENT}`, paddingLeft: 24 }}>
            <div style={{ color: FG, fontFamily: FONT_SERIF, fontSize: isPortrait ? 64 : 56, fontWeight: 800, letterSpacing: 1, textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}>{n.name}</div>
            {n.label && (
              <div style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: isPortrait ? 34 : 30, fontWeight: 600, letterSpacing: 0.5, textShadow: '0 2px 18px rgba(0,0,0,0.9)' }}>{n.label}</div>
            )}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
