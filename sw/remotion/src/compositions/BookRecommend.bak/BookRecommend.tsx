import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from './types'
import { BrandIntro } from './BrandIntro'
import { HostIntro } from './HostIntro'
import { TitleCard } from './TitleCard'
import { BookCard } from './BookCard'

type Props = {
  script: BookRecommendScript
}

const FPS = 30
const toFrames = (sec: number) => Math.ceil(sec * FPS) + 15

/** 브랜드 인트로 */
const BRAND_FRAMES = 75
/** "N권의 책" 타이틀 카드 */
const TITLE_FRAMES = 90
/** 아웃트로 */
const OUTRO_FRAMES = 90

const bookTotalFrames = (b: { descVoiceDuration: number; narrVoiceDuration: number }) =>
  toFrames(b.descVoiceDuration) + toFrames(b.narrVoiceDuration)

export const calcTotalFrames = (script: BookRecommendScript) => {
  const intro = toFrames(script.host.voiceDuration)
  const books = script.books.reduce((sum, b) => sum + bookTotalFrames(b), 0)
  return BRAND_FRAMES + intro + TITLE_FRAMES + books + OUTRO_FRAMES
}

export const BookRecommend: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()

  // --- 타이밍 ---
  const introStart = BRAND_FRAMES
  const introFrames = toFrames(script.host.voiceDuration)
  const titleStart = introStart + introFrames
  const booksStart = titleStart + TITLE_FRAMES

  const bookTimings = script.books.map((b) => ({
    descFrames: toFrames(b.descVoiceDuration),
    narrFrames: toFrames(b.narrVoiceDuration),
    total: bookTotalFrames(b),
  }))

  const bookStarts: number[] = []
  let cursor = booksStart
  for (const bt of bookTimings) {
    bookStarts.push(cursor)
    cursor += bt.total
  }
  const outroStart = cursor

  // --- 배경 ---
  const vignetteOpacity = interpolate(frame, [0, 30], [1, 0.6], { extrapolateRight: 'clamp' })

  // --- Outro ---
  const outroOpacity = interpolate(
    frame,
    [outroStart, outroStart + 20, outroStart + 70, outroStart + 90],
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

      {/* 0. 브랜드 인트로 + 차임 SFX */}
      <Sequence from={0} durationInFrames={BRAND_FRAMES}>
        <Audio src={staticFile('sfx/chime.wav')} volume={0.6} />
      </Sequence>
      <BrandIntro durationFrames={BRAND_FRAMES} />

      {/* 1. 감상철학 + 음성 + 전환 SFX */}
      <Sequence from={introStart} durationInFrames={introFrames}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.4} />
        <Audio src={staticFile('voice/philosophy.mp3')} />
        <HostIntro host={script.host} durationFrames={introFrames} />
      </Sequence>

      {/* 2. 타이틀 카드 + 전환 SFX */}
      <Sequence from={titleStart} durationInFrames={TITLE_FRAMES}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.4} />
      </Sequence>
      <TitleCard
        nickname={script.host.nickname}
        bookCount={script.books.length}
        startFrame={titleStart}
        durationFrames={TITLE_FRAMES}
      />

      {/* 3. 책 소개 */}
      {script.books.map((book, i) => {
        const bt = bookTimings[i]
        return (
          <Sequence key={i} from={bookStarts[i]} durationInFrames={bt.total}>
            {/* 페이지 넘김 SFX */}
            <Audio src={staticFile('sfx/page-turn.wav')} volume={0.5} />
            {/* 여성 내레이터 */}
            <Sequence from={0} durationInFrames={bt.descFrames}>
              <Audio src={staticFile(`voice/book-${i}-desc.mp3`)} />
            </Sequence>
            {/* 전환 SFX + 셀럽 음성 */}
            <Sequence from={bt.descFrames} durationInFrames={bt.narrFrames}>
              <Audio src={staticFile('sfx/whoosh.wav')} volume={0.3} />
              <Audio src={staticFile(`voice/book-${i}-narr.mp3`)} />
            </Sequence>
            <BookCard
              book={book}
              host={script.host}
              index={i}
              totalFrames={bt.total}
              descFrames={bt.descFrames}
            />
          </Sequence>
        )
      })}

      {/* 4. 아웃트로 + 차임 */}
      {frame >= outroStart && (
        <>
          <Sequence from={outroStart} durationInFrames={OUTRO_FRAMES}>
            <Audio src={staticFile('sfx/chime.wav')} volume={0.5} />
          </Sequence>
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: outroOpacity,
            }}
          >
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
                margin: '16px 0',
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
