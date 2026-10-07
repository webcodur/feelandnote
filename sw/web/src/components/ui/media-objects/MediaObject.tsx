import type { CSSProperties } from 'react'
import ContentCover from '@/components/ui/ContentCover'
import type { ContentImageProps } from '@/components/ui/ContentImage'
import FilmStrip from './FilmStrip'
import { DEFAULT_COVER_RATIOS } from './mediaGeometry'
import type { ContentType } from '@/types/database'

export type MediaKind = 'book' | 'music' | 'game' | 'video'
export const MEDIA_KINDS: Record<ContentType, MediaKind> = { BOOK: 'book', MUSIC: 'music', GAME: 'game', VIDEO: 'video' }
export type BookAngle = 'isometric' | 'front' | 'side'

export const MEDIA = [
  { kind: 'book', label: '도서', object: '책', title: '밤의 도서관', creator: '도서 표지 테스트', color: '#294b50', caption: '책등 · 표지 · 종이 단면' },
  { kind: 'music', label: '음악', object: '레코드', title: 'BLUE HOURS', creator: '음반 표지 테스트', color: '#be642f', caption: '재킷 · 레코드 홈 · 중앙 라벨' },
  { kind: 'game', label: '게임', object: '게임팩', title: 'MOON QUEST', creator: '게임 표지 테스트', color: '#6a6983', caption: '플라스틱 케이스 · 라벨 · 접점' },
  { kind: 'video', label: '영상', object: '필름', title: '어느 여름의 장면', creator: '영상 포스터 테스트', color: '#828c55', caption: '필름 구멍 · 프레임 · 포스터' },
] as const

type Props = {
  kind: MediaKind
  image?: string
  showCover: boolean
  angle: BookAngle
  spinning: boolean
  compact?: boolean
  title?: string
  creator?: string
  style?: CSSProperties
  onImageLoad?: ContentImageProps['onLoad']
  cropped?: boolean
}

function Cover({ kind, image, showCover, title, creator, onImageLoad }: Pick<Props, 'kind' | 'image' | 'showCover' | 'title' | 'creator' | 'onImageLoad'>) {
  const item = MEDIA.find(item => item.kind === kind)!
  return (
    <div className={`mo-cover mo-cover-${kind}`}>
      {showCover ? <ContentCover src={image} alt={title ?? item.title} dissolve={false} onLoad={onImageLoad} sizes="(max-width: 768px) 50vw, 25vw" fallback={
        <div className="mo-sample-art">
          <span className="mo-art-edition">FEEL & NOTE / SAMPLE</span>
          <div className="mo-art-shape" aria-hidden="true" />
          <strong>{title ?? item.title}</strong>
          <span className="mo-art-credit">{creator ?? item.creator}</span>
        </div>
      } /> : <span className="mo-empty-cover">{item.label}<small>표지 없음</small></span>}
    </div>
  )
}

// Book spine/page depth follows BookCard at 86a4fa121 and the existing Book3D experiment.
// Film perforations follow VideoCard at 86a4fa121. Vinyl/cartridge are reconstructed from the brief.
export function MediaObject({ kind, image, showCover, angle, spinning, compact = false, title, creator, style, onImageLoad, cropped }: Props) {
  const item = MEDIA.find(item => item.kind === kind)!
  const objectStyle = { '--object-color': item.color, '--mo-cover-ratio': DEFAULT_COVER_RATIOS[kind], ...style } as CSSProperties
  const cover = <Cover kind={kind} image={image} showCover={showCover} title={title} creator={creator} onImageLoad={onImageLoad} />
  if (compact) return <div className={`mo-object mo-object-${kind} mo-object-compact`}
    style={objectStyle} data-cropped={cropped} aria-hidden="true">
    {kind === 'music' && <span className="mo-compact-record" />}
    <div className="mo-compact-frame">{cover}</div>
  </div>
  return (
    <div className={`mo-object mo-object-${kind}`} style={objectStyle} data-cropped={cropped} aria-hidden="true">
      {kind === 'book' ? (
        <div className={`mo-book mo-book-${angle}`}>
          <div className="mo-book-front">{cover}</div>
          <div className="mo-book-spine"><span>{title ?? item.title}</span><small>FEEL & NOTE</small></div>
          <div className="mo-book-pages" />
          <div className="mo-book-top" />
          <div className="mo-book-bottom" />
          <div className="mo-book-back" />
        </div>
      ) : kind === 'music' ? (
        <div className="mo-vinyl-set">
          <div className={`mo-disc${spinning ? ' mo-disc-spinning' : ''}`}>
            <span className="mo-disc-label"><small>SIDE A</small><strong>{title ?? item.title}</strong><span className="mo-disc-hole" /></span>
          </div>
          <div className="mo-sleeve">
            <div className="mo-sleeve-front">{cover}</div>
            <div className="mo-sleeve-back" />
            <div className="mo-sleeve-spine" />
            <div className="mo-sleeve-top" />
            <div className="mo-sleeve-bottom" />
          </div>
        </div>
      ) : kind === 'game' ? (
        <div className="mo-game-station">
          <div className="mo-game-case">
            <div className="mo-cartridge">
              <div className="mo-cartridge-molding"><span>GAME PAK</span></div>
              <div className="mo-cartridge-ridges" />
              <div className="mo-cartridge-label">{cover}</div>
              <div className="mo-cartridge-grips"><i /><i /></div>
              <div className="mo-cartridge-arrow" />
              <div className="mo-cartridge-screws"><i /><i /></div>
              <div className="mo-cartridge-slot"><span /></div>
            </div>
            <div className="mo-game-back" />
            <div className="mo-game-side" />
            <div className="mo-game-left" />
            <div className="mo-game-notch" />
            <div className="mo-game-top" />
            <div className="mo-game-shoulder" />
            <div className="mo-game-bottom" />
          </div>
        </div>
      ) : (
        <FilmStrip cover={cover} />
      )}
    </div>
  )
}
