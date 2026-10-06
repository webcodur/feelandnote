'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import ContentCard from '@/components/ui/cards/ContentCard'
import ContentPurchaseAction from '@/components/features/commerce/ContentPurchaseAction'
import { CategoryTabFilter } from '@/components/ui/CategoryTabFilter'
import Avatar from '@/components/ui/Avatar'
import type { CelebReview } from '@/types/home'
import { MEDIA_KINDS as KINDS } from '@/components/ui/media-objects/MediaObject'
import './MediaObjectsPreview.css'

const CATEGORIES = [
  { value: 'ALL', label: '전체' }, { value: 'BOOK', label: '도서' },
  { value: 'MUSIC', label: '음악' }, { value: 'GAME', label: '게임' }, { value: 'VIDEO', label: '영상' },
]

export default function MediaObjectsPreview({ reviews }: { reviews: CelebReview[] }) {
  const [physical, setPhysical] = useState(true)
  const [view, setView] = useState<'grid' | 'review'>('grid')
  const [category, setCategory] = useState('ALL')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const visible = reviews.filter(review => category === 'ALL' || review.content.type === category)

  return (
    <section className="media-context space-y-6 pt-6">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-text-primary">실제 작품 카드에 넣어 보기</h2>
        <p className="text-sm text-text-secondary">서비스의 작품 카드와 실제 표지·감상배경을 사용합니다. 같은 카드에서 표지 표현만 전환합니다.</p>
      </div>
      <div className="media-context-toolbar">
        <div className="media-context-switch" aria-label="표지 표현">
          <button type="button" aria-pressed={!physical} onClick={() => setPhysical(false)}>기존 표지</button>
          <button type="button" aria-pressed={physical} onClick={() => setPhysical(true)}>실물 형태</button>
        </div>
        <div className="media-context-switch" aria-label="실제 카드 레이아웃">
          <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>작품 목록</button>
          <button type="button" aria-pressed={view === 'review'} onClick={() => setView('review')}>감상 카드</button>
        </div>
      </div>
      <CategoryTabFilter options={CATEGORIES} value={category} onChange={setCategory} />
      <p className="text-xs text-text-secondary">{physical ? '책 · 레코드 · 게임팩 · 필름' : '현재 서비스의 평면 표지'} · {view === 'grid' ? '작품 목록' : '인물 감상 카드'} · {visible.length}개 작품</p>
      {physical && <p className="text-xs text-text-secondary">표지를 누르면 작품 상세로 이동합니다.</p>}
      <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 justify-center max-w-6xl mx-auto' : 'media-context-reviews'} data-media-preview={physical ? 'physical' : 'current'}>
        {visible.map(review => {
          const content = review.content
          const selected = saved.has(content.id)
          return <ContentCard key={`${view}:${review.id}`}
            contentId={content.id} contentType={content.type} title={content.title} creator={content.creator}
            titleBadge={content.title_badge} thumbnail={content.thumbnail_url}
            titleKo={content.title_ko} titleEn={content.title_en} creatorEn={content.creator_en}
            thumbnailEn={content.thumbnail_en} hasEnEdition={content.has_en_edition}
            celebCount={content.celeb_count} userCount={content.user_count}
            showGradient={!physical} heightClass="h-[280px]"
            coverPresentation={physical ? 'physical' : 'flat'}
            href={`/content/${content.id}?category=${KINDS[content.type]}`}
            posterFooterNode={view === 'grid' ? <ContentPurchaseAction contentId={content.id} type={content.type}
              placement="classics-grid" title={content.title} creator={content.creator} thumbnail={content.thumbnail_url} /> : undefined}
            review={view === 'review' ? review.review : undefined}
            ownerNickname={review.celeb.nickname} sourceUrl={review.source_url} isSpoiler={review.is_spoiler}
            headerNode={view === 'review' ? <div className="flex items-center gap-2">
              <Avatar url={review.celeb.avatar_url} name={review.celeb.nickname} size="sm" />
              <span className="text-sm font-semibold text-text-primary">{review.celeb.nickname}</span>
            </div> : undefined}
            topRightNode={<button type="button" aria-label={`${content.title} 보관 미리보기`} aria-pressed={selected}
              className="media-context-save" onClick={event => {
                event.preventDefault(); event.stopPropagation()
                setSaved(previous => { const next = new Set(previous); if (next.has(content.id)) next.delete(content.id); else next.add(content.id); return next })
              }}><Bookmark size={13} fill={selected ? 'currentColor' : 'none'} /></button>}
          />
        })}
      </div>
      {visible.length === 0 && <p className="text-center text-sm text-text-secondary">이 매체의 공개 감상 데이터를 불러오지 못했습니다.</p>}
      <p className="text-xs text-text-secondary">보관 버튼은 이 화면에서의 미리보기입니다.</p>
    </section>
  )
}
