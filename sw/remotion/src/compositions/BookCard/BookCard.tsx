/**
 * 북리커맨드(서재 탐방) 카드뉴스 — 정지 프레임(still) 카드 5종.
 * 고급스럽고 시네마틱한 에디토리얼(잡지) 디자인 적용.
 * 애니메이션 없음. 한 프레임에 완성되는 정적 레이아웃만 그린다(useCurrentFrame 미사용).
 */
import React from 'react'
import { AbsoluteFill, useVideoConfig, staticFile, Img } from 'remotion'
import type { BookRecommendScript, BookEntry } from '../BookRecommend/types'

// #region 카드 명세 타입
export type BookCardSpec =
  | { type: 'intro' }                                          // 인물 소개 (얼굴 + 누구)
  | { type: 'shelf' }                                          // 책장 그리드 (목차)
  | { type: 'cover'; bookIndex: number }                       // 책별 — 표지 + 왜 읽었나(첫 문단)
  | { type: 'context'; bookIndex: number; partIndex: number }  // 책별 감상경위 한 문단(분할형 B)
  | { type: 'quote'; bookIndex: number; pairIndex?: number }   // 인용 미니멀
  | { type: 'number'; value: string; unit: string; desc: string; tag: string }
  | { type: 'cta'; headline?: string }                         // 마무리 — 유튜브 안내

type Props = { script: BookRecommendScript; episodeName: string; card: BookCardSpec; assetBase?: string }
// #endregion

// #region 헬퍼 및 에셋
const PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const resolveSrc = (src?: string, assetBase?: string): string => {
  if (!src) return PLACEHOLDER
  if (/^(https?:|data:|blob:)/.test(src)) return src
  const rel = src.replace(/^\//, '')
  return assetBase ? `${assetBase.replace(/\/$/, '')}/${rel}` : staticFile(rel)
}

// 프리미엄 색상 및 폰트
const GOLD = '#D4AF37'
const GOLD_MUTED = '#AA8A3A'
const BAND = '#C4A482'
const PAPER_LIGHT = '#F4EFE6'
const NUM_BLUE = '#7FA6C0'
const SANS = '"Pretendard", "Apple SD Gothic Neo", "Inter", sans-serif'
const SERIF = '"Nanum Myeongjo", "Georgia", "Playfair Display", serif'

const firstSentence = (text?: string): string => {
  if (!text) return ''
  const head = text.split('\n\n')[0].trim()
  const m = head.match(/^[^.!?。]*[.!?。]/)
  return (m ? m[0] : head).trim()
}
const firstParagraph = (text?: string): string => (text ?? '').split('\n\n')[0].trim()
const paragraphAt = (text: string | undefined, i: number): string => (text ?? '').split('\n\n')[i]?.trim() ?? ''
const bookQuote = (book: BookEntry, pairIndex = 0): string => {
  const q = book.quotePairs?.[pairIndex]?.quote
  return (q ?? firstSentence(book.summary)).trim()
}
export const josa = (word: string, withBatchim: string, withoutBatchim: string): string => {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return withoutBatchim
  return (code - 0xac00) % 28 !== 0 ? withBatchim : withoutBatchim
}

// 시네마틱 노이즈 오버레이
const NoiseOverlay = () => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    opacity: 0.12, mixBlendMode: 'overlay'
  }} />
)
// #endregion

export const BookCard: React.FC<Props> = ({ script, episodeName: _episodeName, card, assetBase }) => {
  const { width, height } = useVideoConfig()
  const scale = Math.min(width / 320, height / 440)
  const r = (n: number): number => n * scale
  const tall = height / width >= 1.5
  const base = { fontFamily: SANS, lineHeight: 1.5 } as const
  const who = script.host.nickname
  const img = (src?: string): string => resolveSrc(src, assetBase)

  const ContentWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div style={{ position: 'absolute', inset: 0, margin: '0 auto', width: '100%', height: '100%', maxWidth: r(340) }}>
      {children}
    </div>
  )

  // #region shelf — 책장 그리드
  if (card.type === 'shelf') {
    const books = script.books
    const nrows = Math.ceil(books.length / 2)
    return (
      <AbsoluteFill style={{ ...base, backgroundColor: '#070605', padding: `${r(14)}px ${r(12)}px`, display: 'flex', flexDirection: 'column' }}>
        <NoiseOverlay />
        <ContentWrapper>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: `${r(14)}px ${r(12)}px` }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: `1px solid rgba(212,175,55,0.2)`, paddingBottom: r(8), marginBottom: r(10) }}>
              <div>
                <div style={{ fontSize: r(9), color: GOLD_MUTED, letterSpacing: r(2), marginBottom: r(2), fontWeight: 600 }}>LIBRARY</div>
                <div style={{ fontSize: r(20), fontWeight: 800, color: '#F0EBE1', fontFamily: SERIF }}>{who}의 서재</div>
              </div>
              <div style={{ fontSize: r(9), color: '#888', letterSpacing: r(1) }}>{books.length} VOL.</div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: `repeat(${nrows}, 1fr)`, gap: r(6) }}>
              {books.map((b, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: r(4), overflow: 'hidden', background: '#12100E', display: 'flex', alignItems: 'flex-end', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {b.thumbnail_url && (
                    <Img src={img(b.thumbnail_url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65, mixBlendMode: 'luminosity' }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.95) 100%)' }} />
                  <div style={{ position: 'absolute', top: r(4), left: r(6), zIndex: 2, fontSize: r(9), fontWeight: 600, color: GOLD_MUTED, fontFamily: SERIF }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ position: 'relative', zIndex: 2, fontSize: r(9.5), fontWeight: 500, color: '#EAE5D9', padding: r(6), lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.title}</div>
                </div>
              ))}
            </div>
          </div>
        </ContentWrapper>
      </AbsoluteFill>
    )
  }
  // #endregion

  // #region cover — 표지 풀블리드 + 글래스모피즘 패널
  if (card.type === 'cover') {
    const b = script.books[card.bookIndex]
    const title = b.title.replace(/\s*\(.*?\)/, '')
    const bookNum = String(card.bookIndex + 1).padStart(2, '0')

    return (
      <AbsoluteFill style={{ ...base, backgroundColor: '#070707' }}>
        {/* 희미한 배경색 (썸네일 색상 확산) */}
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img src={img(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.2) saturate(1.5)', transform: 'scale(1.2)' }} />
        </AbsoluteFill>
        <NoiseOverlay />

        <ContentWrapper>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2, padding: r(24) }}>

            {/* 우상단: 책 번호 */}
            <div style={{ position: 'absolute', top: r(12), right: r(16), display: 'flex', alignItems: 'center', gap: r(6) }}>
              <div style={{ fontSize: r(9), color: GOLD, fontWeight: 700, letterSpacing: r(1.5) }}>BOOK {bookNum}</div>
              <div style={{ width: r(12), height: '1px', background: GOLD }} />
            </div>

            {/* Top: 썸네일 & 책 정보 */}
            <div style={{ display: 'flex', gap: r(16), marginBottom: r(24) }}>
              {/* 좌상단: 표지 이미지 */}
              <div style={{ width: r(96), height: r(140), flexShrink: 0, borderRadius: r(4), overflow: 'hidden', boxShadow: `0 ${r(8)}px ${r(24)}px rgba(0,0,0,0.6)` }}>
                <Img src={img(b.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* 우상단: 책 정보 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minWidth: 0, paddingTop: r(4) }}>
                <div style={{ fontSize: r(18), fontWeight: 800, lineHeight: 1.25, letterSpacing: r(-0.5), color: '#FFF', fontFamily: SERIF, marginBottom: r(6), display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</div>
                <div style={{ fontSize: r(10), color: '#888', letterSpacing: r(0.5), marginBottom: r(8) }}>{b.creator}</div>
                <div style={{ fontSize: r(12), color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'keep-all' }}>{b.summary}</div>
              </div>
            </div>

            {/* Middle: 감상배경 (contextMain) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: r(9), color: '#888', letterSpacing: r(1), marginBottom: r(10) }}>WHY READ</div>
              <div style={{ fontSize: r(15), color: '#C8BEAD', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: SERIF, fontStyle: 'italic' }}>
                {b.contextMain.replace(/\n/g, ' ')}
              </div>
            </div>

          </div>
        </ContentWrapper>
      </AbsoluteFill>
    )
  }
  // #endregion

  // #region quote — 에디토리얼 인용 (밝은 종이 질감)
  if (card.type === 'quote') {
    const b = script.books[card.bookIndex]
    return (
      <AbsoluteFill style={{ ...base, backgroundColor: PAPER_LIGHT }}>
        <NoiseOverlay />
        <ContentWrapper>
          <div style={{ position: 'absolute', top: r(16), left: r(14), fontSize: r(70), color: 'rgba(212, 175, 55, 0.15)', fontFamily: SERIF, lineHeight: 0.5 }}>“</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', position: 'relative', zIndex: 2, padding: `${r(20)}px ${r(24)}px` }}>
            <div style={{ fontSize: r(16), fontWeight: 600, lineHeight: 1.5, color: '#1A1510', fontFamily: SERIF, textAlign: 'justify', wordBreak: 'keep-all' }}>
              {bookQuote(b, card.pairIndex ?? 0)}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: r(26), right: r(16), fontSize: r(70), color: 'rgba(212, 175, 55, 0.15)', fontFamily: SERIF, lineHeight: 0.5 }}>”</div>

          <div style={{ position: 'absolute', bottom: r(16), left: r(16), right: r(16), borderTop: `1px solid rgba(0,0,0,0.1)`, paddingTop: r(10), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: r(9.5), color: '#6A5F50', fontWeight: 500 }}>
              {who}{josa(who, '이', '가')} 읽은 <span style={{ color: '#1A1510', fontWeight: 700 }}>『{b.title}』</span>
            </div>
            <div style={{ width: r(4), height: r(4), backgroundColor: GOLD_MUTED, borderRadius: '50%' }} />
          </div>
        </ContentWrapper>
      </AbsoluteFill>
    )
  }
  // #endregion

  // #region intro — 인물 소개 (인포그래픽 형태)
  if (card.type === 'intro') {
    const h = script.host
    const hasFace = !!h.avatar_url
    const bioRaw: string = (h as any).bio || script.narrator?.celebIntro || ''
    // 카드 상단에 이름이 크게 있으므로 소개문 선두의 이름 문장은 중복 — 떼어낸다
    const bioText = bioRaw.startsWith(h.nickname) ? bioRaw.slice(h.nickname.length).replace(/^[.。,\s]+/, '') : bioRaw
    const sub = h.featuredQuote || h.philosophy || ''

    return (
      <AbsoluteFill style={{ ...base, backgroundColor: '#070707' }}>
        <NoiseOverlay />
        {/* 배경 장식 */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '50%', background: 'radial-gradient(circle at top right, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0) 70%)' }} />

        <ContentWrapper>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2, padding: r(24) }}>

            {/* Header: Name */}
            <div style={{ paddingBottom: r(12), marginBottom: r(20) }}>
              <div style={{ fontSize: r(11), color: GOLD_MUTED, letterSpacing: r(2), fontWeight: 700, marginBottom: r(8) }}>WHO IS</div>
              <div style={{ fontSize: r(34), fontWeight: 800, color: '#FFF', lineHeight: 1.15, wordBreak: 'keep-all' }}>{h.nickname}</div>
              <div style={{ fontSize: r(15), color: 'rgba(255,255,255,0.6)', marginTop: r(6), fontWeight: 500 }}>{h.title}</div>
            </div>

            {/* Bio Block */}
            {bioText && (
              <div style={{ marginBottom: r(24) }}>
                <div style={{ fontSize: r(10), color: GOLD_MUTED, letterSpacing: r(1.5), marginBottom: r(8), fontWeight: 600 }}>BIOGRAPHY</div>
                <div style={{ fontSize: r(13.5), color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {bioText.replace(/\n/g, ' ')}
                </div>
              </div>
            )}

            {/* Philosophy Block */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <div style={{ fontSize: r(10), color: GOLD_MUTED, letterSpacing: r(1.5), marginBottom: r(12), fontWeight: 600 }}>CORE PHILOSOPHY</div>
              <div style={{ fontSize: r(15), color: '#FFF', lineHeight: 1.5, fontFamily: SERIF, fontStyle: 'italic', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {sub}
              </div>
            </div>

          </div>
        </ContentWrapper>
      </AbsoluteFill>
    )
  }
  // #endregion

  // #region context — 감상경위 한 문단 (블러 백그라운드 뎁스)
  if (card.type === 'context') {
    const b = script.books[card.bookIndex]
    const para = paragraphAt(b.contextMain, card.partIndex)
    return (
      <AbsoluteFill style={{ ...base, backgroundColor: '#0A0806', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${r(20)}px ${r(16)}px` }}>
        {/* Heavily blurred book cover background for deep atmosphere */}
        {b.thumbnail_url && <Img src={img(b.thumbnail_url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) saturate(120%)', opacity: 0.35 }} />}
        <NoiseOverlay />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10,8,6,0.6) 0%, rgba(10,8,6,0.9) 100%)' }} />

        <ContentWrapper>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', position: 'relative', zIndex: 2, padding: `0 ${r(16)}px` }}>
            <div style={{ fontSize: r(9.5), letterSpacing: r(1.2), fontWeight: 500, color: BAND, marginBottom: r(8), textTransform: 'uppercase' }}>
              {who}{josa(who, '이', '가')} 읽은 『{b.title}』
            </div>
            <div style={{ width: r(20), height: '1px', background: GOLD, marginBottom: r(12), opacity: 0.8 }} />
            <div style={{ fontSize: r(15), fontWeight: 400, lineHeight: 1.6, color: '#F4EFE6', fontFamily: SERIF, wordBreak: 'keep-all' }}>{para}</div>
          </div>
        </ContentWrapper>
      </AbsoluteFill>
    )
  }
  // #endregion

  // #region cta — 마무리 (초대장/카드 디자인)
  if (card.type === 'cta') {
    return (
      <AbsoluteFill style={{ ...base, backgroundColor: '#0A0908' }}>
        <NoiseOverlay />

        <ContentWrapper>
          <div style={{ position: 'absolute', inset: r(12), border: `1px solid rgba(212,175,55,0.15)`, borderRadius: r(8), pointerEvents: 'none' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%', position: 'relative', zIndex: 2, padding: r(24) }}>
            <div style={{ width: r(44), height: r(44), borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: `1px solid ${GOLD_MUTED}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: GOLD, fontSize: r(18), marginBottom: r(16), fontFamily: SERIF }}>感</div>
            <div style={{ fontSize: r(20), fontWeight: 800, letterSpacing: r(-0.5), color: '#FFF', fontFamily: SERIF, marginBottom: r(8) }}>{card.headline ?? `${who}의 서재, 전부`}</div>
            <div style={{ fontSize: r(11.5), color: '#A09687', lineHeight: 1.55, marginBottom: r(16) }}>유튜브에서 영상으로 이어집니다<br />책마다의 이야기를 더 깊게</div>
            <div style={{ fontSize: r(10.5), fontWeight: 600, color: '#0A0908', background: GOLD, padding: `${r(10)}px ${r(20)}px`, borderRadius: r(4), letterSpacing: r(0.5) }}>@feelandnote · 프로필 링크</div>
          </div>
        </ContentWrapper>
      </AbsoluteFill>
    )
  }
  // #endregion

  // #region number — 숫자 훅 (공용, 타이포그래피 강조 + 호스트 얼굴)
  const h = script.host
  const hasFace = !!h.avatar_url

  return (
    <AbsoluteFill style={{ ...base, backgroundColor: '#090B0D' }}>
      {hasFace && <Img src={img(h.avatar_url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: tall ? 'center 15%' : 'center 20%', filter: 'contrast(1.1) brightness(0.7) grayscale(20%)' }} />}
      <NoiseOverlay />

      {/* 텍스트 가독성을 위한 하단 스크림 (얼굴을 가리지 않도록 상하단으로만 강하게) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(9,11,13,0.7) 0%, rgba(9,11,13,0) 25%, rgba(9,11,13,0) 60%, rgba(9,11,13,0.85) 100%)' }} />

      <ContentWrapper>
        {/* 상단: 태그 (얼굴 위쪽) */}
        <div style={{ position: 'absolute', top: r(20), left: r(20), display: 'inline-block', fontSize: r(10), fontWeight: 800, color: '#090B0D', backgroundColor: GOLD, letterSpacing: r(2), borderRadius: r(4), padding: `${r(6)}px ${r(12)}px`, textTransform: 'uppercase', boxShadow: `0 ${r(4)}px ${r(12)}px rgba(0,0,0,0.5)` }}>
          {card.tag}
        </div>

        {/* 하단: 타이틀 및 설명 (얼굴 아래쪽) */}
        <div style={{ position: 'absolute', bottom: r(24), left: r(20), right: r(20), display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: r(10), marginBottom: r(12) }}>
            <div style={{ fontSize: r(80), fontWeight: 900, lineHeight: 0.85, letterSpacing: r(-2), color: '#FFF', fontFamily: SERIF, textShadow: `0 ${r(8)}px ${r(24)}px rgba(0,0,0,0.9)` }}>
              {card.value}
            </div>
            <div style={{ fontSize: r(20), fontWeight: 700, color: GOLD, paddingBottom: r(6), textShadow: `0 ${r(4)}px ${r(12)}px rgba(0,0,0,0.8)` }}>
              {card.unit}
            </div>
          </div>

          <div style={{ width: r(28), height: r(2), background: GOLD, opacity: 0.9, marginBottom: r(12), boxShadow: `0 ${r(2)}px ${r(4)}px rgba(0,0,0,0.5)` }} />

          <div style={{ fontSize: r(13.5), color: 'rgba(255,255,255,0.95)', lineHeight: 1.6, fontWeight: 500, textShadow: `0 ${r(2)}px ${r(6)}px rgba(0,0,0,0.8)`, wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {card.desc.split('\n').map((line, i) => (
              <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
            ))}
          </div>
        </div>
      </ContentWrapper>
    </AbsoluteFill>
  )
  // #endregion
}


