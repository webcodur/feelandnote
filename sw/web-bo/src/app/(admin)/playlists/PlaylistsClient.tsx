'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ListMusic,
  Clock,
  Eye,
  EyeOff,
  Layers,
  Trash2,
  Book,
  Film,
  Gamepad2,
  Music,
  Award,
} from 'lucide-react'
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

const CONTENT_TYPE_ICONS = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
}

interface Playlist {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_url: string | null
  content_type: string | null
  is_public: boolean
  has_tiers: boolean
  tiers: Record<string, unknown> | null
  created_at: string
  updated_at: string
  user: { id: string; nickname: string | null; avatar_url: string | null } | null
  items: { id: string }[]
}

interface Props {
  playlists: Playlist[]
  total: number
  page: number
  totalPages: number
  typeFilter: string
  visibilityFilter: string
  typeFilterOptions: { value: string; label: string; count?: number }[]
  visibilityFilterOptions: { value: string; label: string; count?: number }[]
  contentTypeConfig: Record<string, { label: string; color: string }>
}

export default function PlaylistsClient({
  playlists,
  total,
  page,
  totalPages,
  typeFilter,
  visibilityFilter,
  typeFilterOptions,
  visibilityFilterOptions,
  contentTypeConfig,
}: Props) {
  const router = useRouter()
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const buildHref = (params: { page?: number; type?: string; visibility?: string }) => {
    const searchParams = new URLSearchParams()
    if (params.page && params.page > 1) searchParams.set('page', String(params.page))
    if (params.type ?? typeFilter) searchParams.set('type', params.type ?? typeFilter)
    if (params.visibility ?? visibilityFilter)
      searchParams.set('visibility', params.visibility ?? visibilityFilter)
    const query = searchParams.toString()
    return `/playlists${query ? `?${query}` : ''}`
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="플레이리스트 관리"
        description={`총 ${total.toLocaleString()}개의 플레이리스트`}
      />

      {/* 필터 */}
      <div className="space-y-3">
        <FilterChips
          options={typeFilterOptions}
          value={typeFilter}
          href={(value) => buildHref({ type: value, visibility: visibilityFilter })}
        />
        <FilterChips
          options={visibilityFilterOptions}
          value={visibilityFilter}
          href={(value) => buildHref({ type: typeFilter, visibility: value })}
        />
      </div>

      {/* 카드 그리드 */}
      {playlists.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl">
          <EmptyState
            icon={ListMusic}
            title="플레이리스트가 없습니다"
            description="아직 생성된 플레이리스트가 없습니다"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {playlists.map((playlist) => {
            const typeConfig = contentTypeConfig[playlist.content_type || '']
            const TypeIcon =
              CONTENT_TYPE_ICONS[playlist.content_type as keyof typeof CONTENT_TYPE_ICONS] ||
              ListMusic

            return (
              <div
                key={playlist.id}
                className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedPlaylist(playlist)}
              >
                {/* 커버 이미지 */}
                <div className="relative w-full aspect-video bg-bg-secondary flex items-center justify-center">
                  {playlist.cover_url ? (
                    <Image
                      src={playlist.cover_url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <ListMusic className="w-12 h-12 text-text-secondary" />
                  )}
                  {playlist.has_tiers && (
                    <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded">
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant={playlist.is_public ? 'success' : 'warning'}
                      icon={
                        playlist.is_public ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )
                      }
                      size="sm"
                    >
                      {playlist.is_public ? '공개' : '비공개'}
                    </Badge>
                  </div>
                </div>

                {/* 내용 */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary truncate">
                      {playlist.name}
                    </h3>
                    <ActionDropdown
                      items={[
                        {
                          key: 'view',
                          label: '상세보기',
                          icon: Eye,
                          onClick: () => setSelectedPlaylist(playlist),
                        },
                        {
                          key: 'delete',
                          label: '삭제',
                          icon: Trash2,
                          variant: 'danger',
                          onClick: () => setDeleteTarget(playlist),
                        },
                      ]}
                    />
                  </div>

                  {playlist.description && (
                    <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                      {playlist.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    {typeConfig && (
                      <Badge
                        variant={typeConfig.color as 'info' | 'danger' | 'success' | 'purple' | 'warning'}
                        icon={<TypeIcon className="w-3 h-3" />}
                        size="sm"
                      >
                        {typeConfig.label}
                      </Badge>
                    )}
                    <span className="text-xs text-text-secondary">
                      {playlist.items.length}개 항목
                    </span>
                  </div>

                  {/* 푸터 */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <Link
                      href={`/members/${playlist.user?.id}`}
                      className="flex items-center gap-2 hover:text-accent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar
                        src={playlist.user?.avatar_url}
                        name={playlist.user?.nickname}
                        size="xs"
                      />
                      <span className="text-xs text-text-secondary">
                        {playlist.user?.nickname || '알 수 없음'}
                      </span>
                    </Link>
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(playlist.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) => buildHref({ page: p })}
      />

      {/* 상세보기 Drawer */}
      <Drawer
        isOpen={!!selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
        title="플레이리스트 상세"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedPlaylist(null)}>
              닫기
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteTarget(selectedPlaylist)
                setSelectedPlaylist(null)
              }}
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
          </>
        }
      >
        {selectedPlaylist && (
          <div className="space-y-6">
            {/* 커버 */}
            <div className="relative w-full aspect-video bg-bg-secondary rounded-xl overflow-hidden">
              {selectedPlaylist.cover_url ? (
                <Image
                  src={selectedPlaylist.cover_url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ListMusic className="w-16 h-16 text-text-secondary" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div>
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {selectedPlaylist.name}
              </h3>
              {selectedPlaylist.description && (
                <p className="text-text-secondary">{selectedPlaylist.description}</p>
              )}
            </div>

            {/* 메타 정보 */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedPlaylist.is_public ? 'success' : 'warning'}
                icon={
                  selectedPlaylist.is_public ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )
                }
              >
                {selectedPlaylist.is_public ? '공개' : '비공개'}
              </Badge>
              {selectedPlaylist.content_type &&
                contentTypeConfig[selectedPlaylist.content_type] && (
                  <Badge
                    variant={
                      contentTypeConfig[selectedPlaylist.content_type].color as
                        | 'info'
                        | 'danger'
                    }
                  >
                    {contentTypeConfig[selectedPlaylist.content_type].label}
                  </Badge>
                )}
              {selectedPlaylist.has_tiers && (
                <Badge variant="purple" icon={<Layers className="w-3 h-3" />}>
                  티어 기능
                </Badge>
              )}
              <Badge variant="default">{selectedPlaylist.items.length}개 항목</Badge>
            </div>

            {/* 작성자 */}
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <Avatar
                src={selectedPlaylist.user?.avatar_url}
                name={selectedPlaylist.user?.nickname}
                size="lg"
              />
              <div>
                <p className="font-medium text-text-primary">
                  {selectedPlaylist.user?.nickname || '알 수 없음'}
                </p>
                <Link
                  href={`/members/${selectedPlaylist.user?.id}`}
                  className="text-sm text-accent hover:underline"
                >
                  프로필 보기
                </Link>
              </div>
            </div>

            {/* 시간 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">생성일</label>
                <p className="text-sm text-text-primary">
                  {formatDateTime(selectedPlaylist.created_at)}
                </p>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">수정일</label>
                <p className="text-sm text-text-primary">
                  {formatDateTime(selectedPlaylist.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 삭제 확인 */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="플레이리스트 삭제"
        description="이 플레이리스트를 삭제하시겠습니까? 포함된 모든 항목도 함께 삭제됩니다."
        confirmLabel="삭제"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
