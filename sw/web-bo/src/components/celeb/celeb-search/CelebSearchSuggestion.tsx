'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ImageIcon, Star } from 'lucide-react'
import PersistedCelebAvatarEditor from '../avatar/PersistedCelebAvatarEditor'
import PersistedCelebPortraitEditor from '../portrait/PersistedCelebPortraitEditor'
import type { CelebSearchItem } from './types'
import { buildCelebDetailHref, getCelebSecondaryText } from './utils'

interface Props<T extends CelebSearchItem> {
  item: T
  selected: boolean
  detailPathTemplate: string
  extra?: React.ReactNode
  actionMode: boolean
  onAction: () => void
  onLinkClick: () => void
}

const NAMELESS_CELEB_LABEL = '이름 없음'

export default function CelebSearchSuggestion<T extends CelebSearchItem>({
  item,
  selected,
  detailPathTemplate,
  extra,
  actionMode,
  onAction,
  onLinkClick,
}: Props<T>) {
  const name = item.nickname || NAMELESS_CELEB_LABEL
  const secondaryText = getCelebSecondaryText(item)
  const href = item.slug ? buildCelebDetailHref(item.slug, detailPathTemplate) : null
  const rowClass = `group/row flex min-h-[112px] w-full items-center gap-4 border-s-2 px-4 py-3 hover:border-accent hover:bg-bg-secondary ${
    selected ? 'border-accent bg-bg-secondary' : 'border-transparent'
  }`
  const avatarClass = 'h-[72px] w-[72px] shrink-0 rounded-full border-2 border-border group-hover/row:border-accent'
  const portraitClass = 'group/portrait relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-border bg-bg-secondary hover:border-amber-400 hover:bg-amber-400/5 data-[dragging=true]:border-amber-400 data-[dragging=true]:bg-amber-400/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-amber-400/30'
  const label = (
    <>
      <div className="min-w-0 flex-1 text-start">
        <p className="truncate text-base font-semibold text-text-primary group-hover/row:text-accent">{name}</p>
        {secondaryText && <p className="mt-1 truncate text-xs text-text-tertiary">{secondaryText}</p>}
        <p className="mt-2 text-[11px] text-text-tertiary">이름을 누르면 상세 화면이 열립니다.</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-text-tertiary opacity-0 transition-opacity duration-150 group-hover/row:opacity-100" />
    </>
  )
  const target = actionMode ? (
    <button type="button" onClick={onAction} className="flex min-w-0 flex-1 items-center self-stretch">
      {label}
    </button>
  ) : href ? (
    <Link href={href} onClick={onLinkClick} className="flex min-w-0 flex-1 items-center self-stretch" title={`${name} 상세 열기`}>
      {label}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-1 items-center self-stretch opacity-60">{label}</div>
  )

  if (!item.id) {
    return (
      <li role="option" aria-selected={selected} className={rowClass}>
        <SearchMedia label="아바타">
          <MediaPreview value={item.avatar_url} className={`overflow-hidden bg-yellow-500/20 ${avatarClass}`} round />
        </SearchMedia>
        <SearchMedia label="대표사진">
          <MediaPreview value={item.portrait_url} className={portraitClass} />
        </SearchMedia>
        {target}
        {extra && <div className="shrink-0">{extra}</div>}
      </li>
    )
  }

  return (
    <li role="option" aria-selected={selected} className={rowClass}>
      <SearchMedia label="아바타">
        <PersistedCelebAvatarEditor
          celebId={item.id}
          avatarUrl={item.avatar_url}
          name={item.nickname}
          className="shrink-0 rounded-full"
          previewClassName={avatarClass}
          empty={<Star className="h-5 w-5 text-yellow-400" />}
        />
      </SearchMedia>
      <SearchMedia label="대표사진" tone="portrait">
        <PersistedCelebPortraitEditor
          celebId={item.id}
          portraitUrl={item.portrait_url}
          name={item.nickname}
          className={portraitClass}
          compact
          empty={<ImageIcon className="h-5 w-5 text-amber-300" />}
        />
      </SearchMedia>
      {target}
      {extra && <div className="shrink-0">{extra}</div>}
    </li>
  )
}

function SearchMedia({
  label,
  tone = 'avatar',
  children,
}: {
  label: string
  tone?: 'avatar' | 'portrait'
  children: React.ReactNode
}) {
  return (
    <div className="w-[72px] shrink-0">
      <p className={`mb-1 text-center text-[10px] font-medium ${tone === 'portrait' ? 'text-amber-300/80' : 'text-text-tertiary'}`}>
        {label}
      </p>
      {children}
    </div>
  )
}

function MediaPreview({
  value,
  className,
  round = false,
}: {
  value?: string | null
  className: string
  round?: boolean
}) {
  return (
    <div className={`relative ${className}`}>
      {value ? (
        <Image src={value} alt="" fill unoptimized className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {round ? <Star className="h-5 w-5 text-yellow-400" /> : <ImageIcon className="h-5 w-5 text-amber-300" />}
        </div>
      )}
    </div>
  )
}
