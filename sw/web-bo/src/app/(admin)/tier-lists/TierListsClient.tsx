'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Layers, Clock, Eye, EyeOff, Trash2 } from 'lucide-react'
import {
  PageHeader,
  Badge,
  Avatar,
  FilterChips,
  Pagination,
  Drawer,
  ConfirmDialog,
  ActionDropdown,
  EmptyState,
  Button,
} from '@/components/ui'

const TIER_COLORS: Record<string, string> = {
  S: 'bg-red-500',
  A: 'bg-orange-500',
  B: 'bg-yellow-500',
  C: 'bg-green-500',
  D: 'bg-blue-500',
}

interface TierList {
  id: string
  user_id: string
  name: string
  type: string
  filter_value: string | null
  tiers: Record<string, string[]>
  unranked: string[]
  is_public: boolean
  created_at: string
  updated_at: string
  user: { id: string; nickname: string | null; avatar_url: string | null } | null
}

interface Props {
  tierLists: TierList[]
  total: number
  page: number
  totalPages: number
  typeFilter: string
  visibilityFilter: string
  typeFilterOptions: { value: string; label: string; count?: number }[]
  visibilityFilterOptions: { value: string; label: string; count?: number }[]
  typeConfig: Record<string, { label: string; color: string }>
}

export default function TierListsClient({
  tierLists,
  total,
  page,
  totalPages,
  typeFilter,
  visibilityFilter,
  typeFilterOptions,
  visibilityFilterOptions,
  typeConfig,
}: Props) {
  const router = useRouter()
  const [selectedItem, setSelectedItem] = useState<TierList | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TierList | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await new Promise((r) => setTimeout(r, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const buildHref = (params: { page?: number; type?: string; visibility?: string }) => {
    const sp = new URLSearchParams()
    if (params.page && params.page > 1) sp.set('page', String(params.page))
    if (params.type ?? typeFilter) sp.set('type', params.type ?? typeFilter)
    if (params.visibility ?? visibilityFilter)
      sp.set('visibility', params.visibility ?? visibilityFilter)
    const q = sp.toString()
    return `/tier-lists${q ? `?${q}` : ''}`
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="티어 리스트 관리"
        description={`총 ${total.toLocaleString()}개의 티어 리스트`}
      />

      <div className="space-y-3">
        <FilterChips options={typeFilterOptions} value={typeFilter} href={(v) => buildHref({ type: v })} />
        <FilterChips options={visibilityFilterOptions} value={visibilityFilter} href={(v) => buildHref({ visibility: v })} />
      </div>

      {tierLists.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl">
          <EmptyState icon={Layers} title="티어 리스트가 없습니다" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {tierLists.map((item) => {
            const tiers = item.tiers || {}
            const totalItems = Object.values(tiers).reduce((s, a) => s + a.length, 0)
            const cfg = typeConfig[item.type] || typeConfig.all

            return (
              <div
                key={item.id}
                className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent/50 transition-colors cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-text-primary truncate">{item.name}</h3>
                  <ActionDropdown
                    items={[
                      { key: 'view', label: '상세보기', icon: Eye, onClick: () => setSelectedItem(item) },
                      { key: 'delete', label: '삭제', icon: Trash2, variant: 'danger', onClick: () => setDeleteTarget(item) },
                    ]}
                  />
                </div>

                <div className="flex gap-2 mb-4">
                  <Badge variant={cfg.color as 'default' | 'info' | 'purple' | 'success' | 'orange'}>{cfg.label}</Badge>
                  <Badge variant={item.is_public ? 'success' : 'warning'} icon={item.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}>
                    {item.is_public ? '공개' : '비공개'}
                  </Badge>
                </div>

                {/* 티어 미리보기 */}
                <div className="space-y-1 mb-4">
                  {['S', 'A', 'B', 'C', 'D'].map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${TIER_COLORS[t]}`}>{t}</div>
                      <div className="flex-1 h-5 bg-bg-secondary rounded flex items-center px-2">
                        <span className="text-xs text-text-secondary">{(tiers[t] || []).length}개</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-text-secondary mb-3">
                  총 {totalItems}개 | 미배치 {(item.unranked || []).length}개
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <Link href={`/members/${item.user?.id}`} className="flex items-center gap-2 hover:text-accent" onClick={(e) => e.stopPropagation()}>
                    <Avatar src={item.user?.avatar_url} name={item.user?.nickname} size="xs" />
                    <span className="text-xs text-text-secondary">{item.user?.nickname || '알 수 없음'}</span>
                  </Link>
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.updated_at)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} href={(p) => buildHref({ page: p })} />

      <Drawer isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="티어 리스트 상세" size="lg"
        footer={<><Button variant="secondary" onClick={() => setSelectedItem(null)}>닫기</Button><Button variant="danger" onClick={() => { setDeleteTarget(selectedItem); setSelectedItem(null) }}><Trash2 className="w-4 h-4" />삭제</Button></>}>
        {selectedItem && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-text-primary">{selectedItem.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={(typeConfig[selectedItem.type]?.color || 'default') as 'default' | 'info'}>{typeConfig[selectedItem.type]?.label || selectedItem.type}</Badge>
              <Badge variant={selectedItem.is_public ? 'success' : 'warning'}>{selectedItem.is_public ? '공개' : '비공개'}</Badge>
              {selectedItem.filter_value && <Badge variant="default">{selectedItem.filter_value}</Badge>}
            </div>
            <div className="space-y-2">
              {['S', 'A', 'B', 'C', 'D'].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white ${TIER_COLORS[t]}`}>{t}</div>
                  <div className="flex-1 p-3 bg-bg-secondary rounded-lg">
                    <span className="text-sm text-text-primary">{(selectedItem.tiers[t] || []).length}개 항목</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <Avatar src={selectedItem.user?.avatar_url} name={selectedItem.user?.nickname} size="lg" />
              <div>
                <p className="font-medium text-text-primary">{selectedItem.user?.nickname || '알 수 없음'}</p>
                <Link href={`/members/${selectedItem.user?.id}`} className="text-sm text-accent hover:underline">프로필 보기</Link>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="티어 리스트 삭제" description="이 티어 리스트를 삭제하시겠습니까?" confirmLabel="삭제" variant="danger" loading={isDeleting} />
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
