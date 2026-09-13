'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Gamepad2,
  Landmark,
  Link2,
  ListFilter,
  Music,
  Plus,
  Search,
  Settings2,
  Unlink,
} from 'lucide-react'
import type {
  CuratedAdminContent,
  CuratedAdminCurator,
  CuratedAdminItem,
  CuratedAdminListDetail,
} from '@/actions/admin/curated'
import { curatorKindLabel } from '@/constants/curated'
import { CONTENT_TYPE_CONFIG, type ContentType } from '@/constants/contentTypes'
import { CuratorFormModal, ListFormModal } from '../CuratedForms'
import CuratedItemModal from '../CuratedItemModal'

type ItemFilter = 'all' | 'linked' | 'unlinked' | 'hidden'

const TYPE_ICONS = {
  BOOK: BookOpen,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
} as const

function TypeBadge({ type }: { type: string }) {
  const config = CONTENT_TYPE_CONFIG[type as ContentType]
  const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] ?? BookOpen
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${config?.bgColor ?? 'bg-white/5'} ${config?.color ?? 'text-text-secondary'}`}>
      <Icon className="h-3.5 w-3.5" />
      {config?.label ?? type}
    </span>
  )
}

function ContentThumb({ content }: { content: CuratedAdminContent }) {
  return (
    <div className="relative flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-bg-secondary">
      {content.thumbnailUrl ? <Image src={content.thumbnailUrl} alt="" fill sizes="36px" unoptimized className="object-cover" /> : <span className="font-mono text-[8px] text-text-secondary">{content.type}</span>}
    </div>
  )
}

function SummaryMetric({ label, value, color = 'text-text-primary' }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-[88px] rounded-lg border border-border bg-bg-secondary/60 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function itemSearchText(item: CuratedAdminItem): string {
  return [item.rawTitle, item.rawCreator, item.content?.title, item.content?.titleEn, item.content?.creator].filter(Boolean).join(' ').toLocaleLowerCase()
}

export default function CuratedListEditor({ detail, curators, publicWebUrl }: { detail: CuratedAdminListDetail; curators: CuratedAdminCurator[]; publicWebUrl: string }) {
  const router = useRouter()
  const [itemQuery, setItemQuery] = useState('')
  const [itemFilter, setItemFilter] = useState<ItemFilter>('all')
  const [editingItem, setEditingItem] = useState<CuratedAdminItem | null | undefined>(undefined)
  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const [isCuratorModalOpen, setIsCuratorModalOpen] = useState(false)

  const visibleItems = useMemo(() => {
    const normalized = itemQuery.trim().toLocaleLowerCase()
    return detail.items.filter((item) => {
      const matchesQuery = !normalized || itemSearchText(item).includes(normalized)
      const matchesFilter = itemFilter === 'all'
        || (itemFilter === 'linked' && !!item.contentId)
        || (itemFilter === 'unlinked' && !item.contentId)
        || (itemFilter === 'hidden' && item.hidden)
      return matchesQuery && matchesFilter
    })
  }, [detail.items, itemFilter, itemQuery])

  const publicHref = publicWebUrl
    ? `${publicWebUrl.replace(/\/$/, '')}/library/curated/${detail.list.curatorSlug}/${detail.list.slug}`
    : null

  function refreshAfterSave() {
    setEditingItem(undefined)
    setIsListModalOpen(false)
    setIsCuratorModalOpen(false)
    router.refresh()
  }

  function handleListDeleted() {
    setIsListModalOpen(false)
    router.push('/curated')
  }

  const hiddenCount = detail.items.filter((item) => item.hidden).length
  const unlinkedCount = detail.items.filter((item) => !item.contentId).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/curated" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent">
            <ArrowLeft className="h-3.5 w-3.5" />
            기관 선정으로 돌아가기
          </Link>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent"><Landmark className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Curated list / {detail.list.slug}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary md:text-3xl">{detail.list.title}</h1>
              <p className="mt-1 text-sm text-text-secondary">{detail.curator.name} · {curatorKindLabel(detail.curator.kind)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:pt-6">
          {publicHref && <a href={publicHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-white/[0.04] px-3.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"><ExternalLink className="h-4 w-4" />공개 화면</a>}
          <button type="button" onClick={() => setIsCuratorModalOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-white/[0.04] px-3.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"><Landmark className="h-4 w-4" />기관 편집</button>
          <button type="button" onClick={() => setIsListModalOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-bold text-[#08111c] hover:bg-accent-hover"><Settings2 className="h-4 w-4" />목록 메타 편집</button>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto] md:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={detail.list.contentType} />
            {detail.list.isRanked && <span className="rounded-md bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-200">순위 목록</span>}
            {detail.list.isAnnual && <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold text-cyan-200">연례 목록</span>}
            <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${detail.list.isFeatured ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/5 text-text-secondary'}`}>{detail.list.isFeatured ? '허브 노출' : '허브 숨김'}</span>
          </div>
          <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-text-secondary">{detail.list.description || '목록 설명이 없습니다.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.list.topics.map((topic) => <span key={topic} className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-text-secondary">#{topic}</span>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
            <a href={detail.list.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 font-mono hover:text-accent"><Link2 className="h-3.5 w-3.5 shrink-0" /><span className="max-w-[32rem] truncate">{detail.list.sourceUrl}</span><ExternalLink className="h-3 w-3 shrink-0" /></a>
            {detail.list.edition && <span>판·회차: {detail.list.edition}</span>}
            {detail.list.publishedYear && <span>발표: {detail.list.publishedYear}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end md:self-start">
          <SummaryMetric label="visible" value={detail.list.visibleItemCount.toLocaleString()} color="text-emerald-300" />
          <SummaryMetric label="linked" value={detail.list.linkedCount.toLocaleString()} color="text-accent" />
          <SummaryMetric label="unlinked" value={unlinkedCount.toLocaleString()} color="text-amber-300" />
          <SummaryMetric label="hidden" value={hiddenCount.toLocaleString()} color="text-text-secondary" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-bg-card">
        <div className="border-b border-border p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-bold text-text-primary">목록 항목</h2>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent">{visibleItems.length}/{detail.items.length}</span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">원문 제목을 기준으로 보존하고, 필요한 경우 기존 콘텐츠를 연결합니다.</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <label className="relative min-w-0 md:w-64">
                <span className="sr-only">항목 검색</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="제목·저자 검색" className="w-full rounded-lg border border-border bg-bg-secondary py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
              </label>
              <div className="flex overflow-hidden rounded-lg border border-border" role="group" aria-label="항목 필터">
                {([['all', '전체'], ['unlinked', '미연결'], ['linked', '연결'], ['hidden', '숨김']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setItemFilter(value)} className={`px-3 py-2.5 text-xs font-semibold ${itemFilter === value ? 'bg-accent text-[#08111c]' : 'bg-bg-secondary text-text-secondary hover:bg-accent/10 hover:text-accent'}`}>{label}</button>
                ))}
              </div>
              <button type="button" onClick={() => setEditingItem(null)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-bold text-[#08111c] hover:bg-accent-hover"><Plus className="h-4 w-4" />새 항목</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px]">
            <thead className="border-b border-border bg-bg-secondary/70">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                <th className="w-20 px-5 py-3">순서</th>
                <th className="min-w-[300px] px-4 py-3">목록 원문</th>
                <th className="min-w-[300px] px-4 py-3">연결 콘텐츠</th>
                <th className="px-4 py-3">순위·연도</th>
                <th className="px-4 py-3">노출</th>
                <th className="px-5 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleItems.map((item) => (
                <tr key={item.id} className="group hover:bg-white/[0.025]">
                  <td className="px-5 py-4 align-top"><span className="font-mono text-sm text-text-secondary">{item.sortOrder}</span></td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-bg-secondary font-mono text-[10px] text-text-secondary">{item.rank ?? '—'}</div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-text-primary">{item.rawTitle}</p>
                        <p className="mt-1 truncate text-xs text-text-secondary">{item.rawCreator || '저자·제작자 미등록'}</p>
                        {item.note && <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-text-secondary/80">{item.note}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {item.content ? (
                      <div className="flex items-center gap-3">
                        <ContentThumb content={item.content} />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-text-primary">{item.content.title}</p>
                          <p className="mt-1 truncate text-xs text-text-secondary">{item.content.creator || '제작자 미등록'}</p>
                          <p className="mt-1 font-mono text-[10px] text-accent">{item.content.id}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/30 bg-amber-300/[0.06] px-2.5 py-1.5 text-xs font-semibold text-amber-200"><Unlink className="h-3.5 w-3.5" />미연결</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-mono text-xs text-text-primary">{item.rank != null ? `#${item.rank}` : '순위 없음'}</div>
                    {item.year != null && <div className="mt-1 text-xs text-text-secondary">{item.year}</div>}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${item.hidden ? 'text-text-secondary' : 'text-emerald-300'}`}>
                      {item.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {item.hidden ? '숨김' : '노출'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right align-top"><button type="button" onClick={() => setEditingItem(item)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"><Settings2 className="h-3.5 w-3.5" />편집</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleItems.length === 0 && <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center"><Search className="mb-3 h-6 w-6 text-text-secondary" /><p className="text-sm font-semibold text-text-primary">조건에 맞는 항목이 없습니다.</p><p className="mt-1 text-xs text-text-secondary">검색어나 필터를 바꾸어 보세요.</p></div>}
        </div>
      </section>

      <p className="text-xs leading-5 text-text-secondary">공개 화면에서 목록 전체성을 유지하려면 미연결 항목을 삭제하지 말고 숨김 또는 연결 상태로 관리하세요. 제목·저자·선정 사유는 원문 기준으로 입력합니다.</p>

      {isListModalOpen && <ListFormModal list={detail.list} curators={curators} onClose={() => setIsListModalOpen(false)} onSaved={refreshAfterSave} onDeleted={handleListDeleted} />}
      {isCuratorModalOpen && <CuratorFormModal curator={detail.curator} onClose={() => setIsCuratorModalOpen(false)} onSaved={refreshAfterSave} />}
      {editingItem !== undefined && <CuratedItemModal list={detail.list} item={editingItem} onClose={() => setEditingItem(undefined)} onSaved={refreshAfterSave} />}
    </div>
  )
}
