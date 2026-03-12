import React from 'react'
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from './types'
import { BrandIntro } from './BrandIntro'
import { HostIntro } from './HostIntro'
import { BookCard } from './BookCard'
import { FONT } from './fonts'

type Props = {
  script: BookRecommendScript
}

/**
 * sf()이 한글 경로에서 작동하지 않는 Remotion 버그 우회.
 * 별도 정적 서버(npx serve public -p 3005 --cors)에서 서빙.
 * TODO: Remotion 업그레이드 후 sf()로 복원
 */
const STATIC = 'http://localhost:3005'
const sf = (path: string) => `${STATIC}/${path}`

const FPS = 30
const toFrames = (sec: number) => Math.ceil(sec * FPS) + 15
const BRAND_FRAMES = 120
/** "오늘의 인물 + 이름" 타이핑 완료 후 나레이터 음성 시작까지 딜레이 */
const CELEB_VISUAL_DELAY = 75

/** 제목+저자 → 설명 사이 무음 갭 */
const TITLE_DESC_GAP = 20
/** 책 사이 전환 프레임 */
const BOOK_GAP = 60

const narratorPhaseFrames = (b: { titleDuration: number; narratorDuration: number }) =>
  toFrames(b.titleDuration) + TITLE_DESC_GAP + toFrames(b.narratorDuration)

const bookTotalFrames = (b: { titleDuration: number; narratorDuration: number; narrationDuration: number }) =>
  narratorPhaseFrames(b) + toFrames(b.narrationDuration)

export const calcTotalFrames = (script: BookRecommendScript) => {
  const { narrator, host, books } = script
  const celebIntro = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophy = toFrames(host.voiceDuration)
  const bridge = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 105
  const booksTotal = books.reduce((sum, b) => sum + bookTotalFrames(b), 0)
  const bookGaps = Math.max(0, books.length - 1) * BOOK_GAP
  const outro = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : 120
  return BRAND_FRAMES + celebIntro + philosophy + bridge + booksTotal + bookGaps + outro
}

export const BookRecommend: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const { narrator, host, books } = script

  // --- 타이밍 계산 ---
  const celebIntroFrames = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophyFrames = toFrames(host.voiceDuration)
  const hostIntroFrames = celebIntroFrames + philosophyFrames
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 105

  let cursor = 0
  const brandStart = cursor
  cursor += BRAND_FRAMES
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  const bridgeStart = cursor
  cursor += bridgeFrames

  const bookTimings = books.map((b) => ({
    titleFrames: toFrames(b.titleDuration),
    descFrames: toFrames(b.narratorDuration),
    narratorFrames: narratorPhaseFrames(b),
    narrationFrames: toFrames(b.narrationDuration),
    total: bookTotalFrames(b),
  }))

  const bookStarts: number[] = []
  for (let bi = 0; bi < bookTimings.length; bi++) {
    if (bi > 0) cursor += BOOK_GAP
    bookStarts.push(cursor)
    cursor += bookTimings[bi].total
  }

  const outroStart = cursor
  const outroFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : 120

  // --- 배경 ---
  const vignetteOpacity = interpolate(frame, [0, 30], [1, 0.6], { extrapolateRight: 'clamp' })

  // --- 브릿지 전환 ---
  const bridgeLocal = frame - bridgeStart
  const bridgeOpacity =
    bridgeLocal >= 0 && bridgeLocal < bridgeFrames
      ? interpolate(bridgeLocal, [0, 15, bridgeFrames - 15, bridgeFrames], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0

  // --- 아웃트로 ---
  const outroOpacity = interpolate(
    frame,
    [outroStart, outroStart + 20, outroStart + outroFrames - 20, outroStart + outroFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* 배경 */}
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a1510 0%, #0a0a0a 70%)' }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,164,110,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,110,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />

      {/* Section 0: 브랜드 로고 */}
      <Sequence from={brandStart} durationInFrames={BRAND_FRAMES}>
        <Audio src={sf('sfx/chime.wav')} volume={0.6} />
        <BrandIntro durationFrames={BRAND_FRAMES} />
      </Sequence>

      {/* Sections 1+2: 인물 소개 + 감상철학 */}
      <Sequence from={hostIntroStart} durationInFrames={hostIntroFrames}>
        {/* Section 1: 타이핑 SFX (즉시) + 나레이터 음성 (딜레이 후) */}
        <Sequence from={0} durationInFrames={celebIntroFrames}>
          <Audio src={sf('sfx/type-reveal.wav')} volume={0.7} />
          {narrator.celebIntroDuration > 0 && (
            <Sequence from={CELEB_VISUAL_DELAY} durationInFrames={celebIntroFrames - CELEB_VISUAL_DELAY}>
              <Audio src={sf('voice/narrator-celeb-intro.wav')} />
            </Sequence>
          )}
        </Sequence>
        {/* Section 2 오디오: 셀럽 감상철학 */}
        <Sequence from={celebIntroFrames} durationInFrames={philosophyFrames}>
          <Audio src={sf('voice/philosophy.wav')} />
        </Sequence>
        <HostIntro
          host={host}
          narratorText={narrator.celebIntro}
          celebIntroFrames={celebIntroFrames}
          totalFrames={hostIntroFrames}
        />
      </Sequence>

      {/* 브릿지: SFX + 시각 전환 */}
      <Sequence from={bridgeStart} durationInFrames={bridgeFrames}>
        <Audio src={sf('sfx/page-turn.wav')} volume={0.6} />
        <Sequence from={15} durationInFrames={bridgeFrames - 15}>
          <Audio src={sf('sfx/whoosh.wav')} volume={0.4} />
        </Sequence>
      </Sequence>
      {bridgeOpacity > 0 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: bridgeOpacity,
            gap: 20,
          }}
        >
          <div
            style={{
              width: interpolate(bridgeLocal, [5, 40], [0, 600], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: 1,
              backgroundColor: '#c8a46e',
              opacity: 0.5,
            }}
          />
          <div
            style={{
              color: '#c8a46e',
              fontSize: 18,
              fontFamily: FONT.cinzel,
              letterSpacing: 6,
              fontWeight: 600,
              opacity: interpolate(bridgeLocal, [15, 35, bridgeFrames - 25, bridgeFrames - 10], [0, 0.8, 0.8, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            BOOK SHELF
          </div>
          <div
            style={{
              width: interpolate(bridgeLocal, [5, 40], [0, 600], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: 1,
              backgroundColor: '#c8a46e',
              opacity: 0.5,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Sections 3-5: 도서 소개 */}
      {books.map((book, i) => {
        const bt = bookTimings[i]
        const gapStart = i > 0 ? bookStarts[i] - BOOK_GAP : -1
        return (
          <React.Fragment key={i}>
            {/* 책 사이 전환 (2번째부터) */}
            {i > 0 && (
              <Sequence from={gapStart} durationInFrames={BOOK_GAP}>
                <Audio src={sf('sfx/page-turn.wav')} volume={0.4} />
                {(() => {
                  const gapLocal = frame - gapStart
                  const gapOpacity =
                    gapLocal >= 0 && gapLocal < BOOK_GAP
                      ? interpolate(gapLocal, [0, 20, BOOK_GAP - 10, BOOK_GAP], [0, 0.6, 0.6, 0], {
                          extrapolateLeft: 'clamp',
                          extrapolateRight: 'clamp',
                        })
                      : 0
                  return gapOpacity > 0 ? (
                    <AbsoluteFill
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: gapOpacity,
                      }}
                    >
                      <div
                        style={{
                          width: interpolate(gapLocal, [5, 30], [0, 300], {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                          }),
                          height: 1,
                          backgroundColor: '#c8a46e',
                          opacity: 0.4,
                        }}
                      />
                    </AbsoluteFill>
                  ) : null
                })()}
              </Sequence>
            )}
            {/* 도서 본편 */}
            <Sequence from={bookStarts[i]} durationInFrames={bt.total}>
              {i === 0 && <Audio src={sf('sfx/page-turn.wav')} volume={0.5} />}
              {/* 나레이터: 제목+저자 */}
              <Sequence from={0} durationInFrames={bt.titleFrames}>
                <Audio src={sf(`voice/book-${i}-title.wav`)} />
              </Sequence>
              {/* 나레이터: 설명 (갭 후) */}
              <Sequence from={bt.titleFrames + TITLE_DESC_GAP} durationInFrames={bt.descFrames}>
                <Audio src={sf(`voice/book-${i}-desc.wav`)} />
              </Sequence>
              {/* 셀럽 감상 응답 */}
              <Sequence from={bt.narratorFrames} durationInFrames={bt.narrationFrames}>
                <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
                <Audio src={sf(`voice/book-${i}-narr.wav`)} />
              </Sequence>
              <BookCard
                book={book}
                host={host}
                index={i}
                totalFrames={bt.total}
                narratorFrames={bt.narratorFrames}
                totalBooks={books.length}
              />
            </Sequence>
          </React.Fragment>
        )
      })}

      {/* Sections 6/7: 아웃트로 */}
      {frame >= outroStart && (
        <>
          <Sequence from={outroStart} durationInFrames={outroFrames}>
            <Audio src={sf('sfx/chime.wav')} volume={0.5} />
            {narrator.outroDuration > 0 && (
              <Audio src={sf('voice/narrator-outro.wav')} />
            )}
          </Sequence>
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: outroOpacity,
              gap: 24,
            }}
          >
            <div
              style={{
                color: '#ccc',
                fontSize: 26,
                fontFamily: FONT.sans,
                textAlign: 'center',
                maxWidth: 900,
                lineHeight: 1.7,
                marginBottom: 40,
              }}
            >
              {narrator.outro}
            </div>
            <div
              style={{
                color: '#c8a46e',
                fontSize: 42,
                fontWeight: 700,
                fontFamily: FONT.brand,
                letterSpacing: 6,
              }}
            >
              FEEL AND NOTE
            </div>
            <div
              style={{
                width: 120,
                height: 1,
                backgroundColor: '#c8a46e',
                opacity: 0.5,
                margin: '4px 0',
              }}
            />
            <div style={{ color: '#666', fontSize: 20, fontFamily: FONT.cinzel, letterSpacing: 4 }}>
              feelandnote.com
            </div>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  )
}
