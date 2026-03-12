import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from './types'
import { BrandIntro } from './BrandIntro'
import { HostIntro } from './HostIntro'
import { BookCard } from './BookCard'

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

const bookTotalFrames = (b: { narratorDuration: number; narrationDuration: number }) =>
  toFrames(b.narratorDuration) + toFrames(b.narrationDuration)

export const calcTotalFrames = (script: BookRecommendScript) => {
  const { narrator, host, books } = script
  const celebIntro = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophy = toFrames(host.voiceDuration)
  const bridge = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 75
  const booksTotal = books.reduce((sum, b) => sum + bookTotalFrames(b), 0)
  const outro = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : 120
  return BRAND_FRAMES + celebIntro + philosophy + bridge + booksTotal + outro
}

export const BookRecommend: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()
  const { narrator, host, books } = script

  // --- 타이밍 계산 ---
  const celebIntroFrames = CELEB_VISUAL_DELAY + (narrator.celebIntroDuration > 0 ? toFrames(narrator.celebIntroDuration) : 150)
  const philosophyFrames = toFrames(host.voiceDuration)
  const hostIntroFrames = celebIntroFrames + philosophyFrames
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : 75

  let cursor = 0
  const brandStart = cursor
  cursor += BRAND_FRAMES
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  const bridgeStart = cursor
  cursor += bridgeFrames

  const bookTimings = books.map((b) => ({
    narratorFrames: toFrames(b.narratorDuration),
    narrationFrames: toFrames(b.narrationDuration),
    total: bookTotalFrames(b),
  }))

  const bookStarts: number[] = []
  for (const bt of bookTimings) {
    bookStarts.push(cursor)
    cursor += bt.total
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
              <Audio src={sf('voice/narrator-celeb-intro.mp3')} />
            </Sequence>
          )}
        </Sequence>
        {/* Section 2 오디오: 셀럽 감상철학 */}
        <Sequence from={celebIntroFrames} durationInFrames={philosophyFrames}>
          <Audio src={sf('voice/philosophy.mp3')} />
        </Sequence>
        <HostIntro
          host={host}
          narratorText={narrator.celebIntro}
          celebIntroFrames={celebIntroFrames}
          totalFrames={hostIntroFrames}
        />
      </Sequence>

      {/* 브릿지: 나레이터 서재 이동 안내 */}
      <Sequence from={bridgeStart} durationInFrames={bridgeFrames}>
        <Audio src={sf('sfx/page-turn.wav')} volume={0.5} />
        {narrator.bridgeDuration > 0 && (
          <Audio src={sf('voice/narrator-bridge.mp3')} />
        )}
      </Sequence>
      {bridgeOpacity > 0 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: bridgeOpacity,
            gap: 16,
          }}
        >
          <div
            style={{
              width: interpolate(bridgeLocal, [5, 25], [0, 400], {
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
              color: '#e8e0d0',
              fontSize: 24,
              fontFamily: 'system-ui',
              letterSpacing: 2,
              opacity: interpolate(bridgeLocal, [10, 25], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {narrator.bridge}
          </div>
        </AbsoluteFill>
      )}

      {/* Sections 3-5: 도서 소개 */}
      {books.map((book, i) => {
        const bt = bookTimings[i]
        return (
          <Sequence key={i} from={bookStarts[i]} durationInFrames={bt.total}>
            <Audio src={sf('sfx/page-turn.wav')} volume={0.5} />
            {/* 나레이터 도서 소개 */}
            <Sequence from={0} durationInFrames={bt.narratorFrames}>
              <Audio src={sf(`voice/book-${i}-desc.mp3`)} />
            </Sequence>
            {/* 셀럽 감상 응답 */}
            <Sequence from={bt.narratorFrames} durationInFrames={bt.narrationFrames}>
              <Audio src={sf('sfx/whoosh.wav')} volume={0.3} />
              <Audio src={sf(`voice/book-${i}-narr.mp3`)} />
            </Sequence>
            <BookCard
              book={book}
              host={host}
              index={i}
              totalFrames={bt.total}
              narratorFrames={bt.narratorFrames}
            />
          </Sequence>
        )
      })}

      {/* Sections 6/7: 아웃트로 */}
      {frame >= outroStart && (
        <>
          <Sequence from={outroStart} durationInFrames={outroFrames}>
            <Audio src={sf('sfx/chime.wav')} volume={0.5} />
            {narrator.outroDuration > 0 && (
              <Audio src={sf('voice/narrator-outro.mp3')} />
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
                fontFamily: 'system-ui',
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
                fontFamily: 'system-ui',
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
            <div style={{ color: '#666', fontSize: 20, fontFamily: 'system-ui', letterSpacing: 4 }}>
              feelandnote.com
            </div>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  )
}
