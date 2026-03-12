import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry, CelebHost } from './types'
import { KoreanTypewriter } from './KoreanTypewriter'

type Props = {
  book: BookEntry
  host: CelebHost
  index: number
  totalFrames: number
  descFrames: number
}

export const BookCard: React.FC<Props> = ({ book, host, index, totalFrames, descFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame < 0 || frame > totalFrames) return null

  const inDescPhase = frame < descFrames
  const narrLocal = frame - descFrames
  const narrFrames = totalFrames - descFrames

  // --- 공통: 페이드아웃 ---
  const fadeOut = interpolate(frame, [totalFrames - 15, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- DESC PHASE 애니메이션 ---
  const coverEnter = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 160 } })
  const coverY = interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' })
  const infoOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' })
  const interviewerOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' })

  // --- NARR PHASE 애니메이션 ---
  const narrEnter = !inDescPhase
    ? interpolate(narrLocal, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
    : 0

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>
      {/* ===== DESC PHASE: 인터뷰어가 책을 소개하고 셀럽에게 토스 ===== */}
      {inDescPhase && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 120px',
            gap: 80,
          }}
        >
          {/* 좌측: 표지 */}
          <div
            style={{
              flexShrink: 0,
              opacity: coverEnter,
              transform: `translateY(${coverY}px) scale(${coverEnter})`,
            }}
          >
            {/* 번호 뱃지 */}
            <div
              style={{
                position: 'absolute',
                top: -16,
                left: -16,
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#c8a46e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0a0a0a',
                fontSize: 28,
                fontWeight: 800,
                fontFamily: 'system-ui',
                zIndex: 1,
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                width: 300,
                height: 450,
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.08)',
              }}
            >
              <Img src={book.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {/* 우측: 책 정보 + 인터뷰어 멘트 */}
          <div style={{ flex: 1, maxWidth: 800 }}>
            {/* 저자 */}
            <div
              style={{
                opacity: infoOpacity,
                color: '#c8a46e',
                fontSize: 20,
                fontFamily: 'system-ui',
                marginBottom: 8,
              }}
            >
              {book.creator}
            </div>
            {/* 제목 */}
            <div
              style={{
                opacity: infoOpacity,
                color: '#e8e0d0',
                fontSize: 44,
                fontWeight: 700,
                fontFamily: 'system-ui',
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              「{book.title}」
            </div>
            {/* 출처 */}
            {book.source && (
              <div
                style={{
                  opacity: infoOpacity,
                  color: '#666',
                  fontSize: 16,
                  fontFamily: 'system-ui',
                  marginBottom: 32,
                }}
              >
                — {book.source}
              </div>
            )}

            {/* 구분선 */}
            <div
              style={{
                width: interpolate(frame, [25, 45], [0, 400], { extrapolateRight: 'clamp' }),
                height: 1,
                backgroundColor: '#c8a46e',
                opacity: 0.3,
                marginBottom: 28,
              }}
            />

            {/* 인터뷰어 라벨 */}
            <div
              style={{
                opacity: interviewerOpacity,
                color: '#6ea4c8',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'system-ui',
                letterSpacing: 3,
                marginBottom: 14,
              }}
            >
              INTERVIEWER
            </div>

            {/* 인터뷰어 멘트 — 타이핑 */}
            <div style={{ opacity: interviewerOpacity }}>
              <KoreanTypewriter
                text={book.interviewerLine}
                startFrame={40}
                spreadFrames={descFrames - 60}
                color="#ccc"
                fontSize={26}
                style={{ lineHeight: 1.7 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== NARR PHASE: 셀럽이 책에 대한 감상 응답 ===== */}
      {!inDescPhase && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 120px',
            gap: 80,
            opacity: narrEnter,
            transform: `translateY(${(1 - narrEnter) * 20}px)`,
          }}
        >
          {/* 좌측: 표지 (작게) + 번호 */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            <div
              style={{
                width: 200,
                height: 300,
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
              }}
            >
              <Img src={book.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div
              style={{
                position: 'absolute',
                top: -10,
                left: -10,
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#c8a46e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0a0a0a',
                fontSize: 20,
                fontWeight: 800,
                fontFamily: 'system-ui',
              }}
            >
              {index + 1}
            </div>
          </div>

          {/* 우측: 셀럽 응답 */}
          <div style={{ flex: 1, maxWidth: 900 }}>
            {/* 셀럽 아바타 + 이름 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #c8a46e',
                  boxShadow: '0 0 25px rgba(200,164,110,0.2)',
                }}
              >
                <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ color: '#e8e0d0', fontSize: 26, fontWeight: 700, fontFamily: 'system-ui' }}>
                  {host.nickname}
                </div>
                <div style={{ color: '#777', fontSize: 15, fontFamily: 'system-ui' }}>
                  {host.nickname_en}
                </div>
              </div>
            </div>

            {/* 제목 참조 */}
            <div
              style={{
                color: '#c8a46e',
                fontSize: 17,
                fontFamily: 'system-ui',
                marginBottom: 18,
                opacity: 0.8,
              }}
            >
              「{book.title}」에 대하여
            </div>

            {/* 인용 스타일 나레이션 */}
            <div style={{ borderLeft: '3px solid rgba(200,164,110,0.5)', paddingLeft: 24 }}>
              <KoreanTypewriter
                text={book.narration}
                startFrame={15}
                spreadFrames={narrFrames - 40}
                color="#e8e0d0"
                fontSize={30}
                style={{ fontStyle: 'italic', lineHeight: 1.8 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
