'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Star,
  Check,
  X,
  Loader2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Copy,
  BadgeCheck,
} from 'lucide-react'
import { updateCelebHeadline, type CelebHeadlineItem } from '@/actions/admin/celebs'
import { CELEB_PROFESSIONS, getCelebProfessionLabel } from '@/constants/celebCategories'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  initialCelebs: CelebHeadlineItem[]
}

type MissingFilter = 'all' | 'filled' | 'missing'
type StatusFilter = 'all' | 'active' | 'inactive'
type TierFilter = 'all' | 'full' | 'light'

export default function CelebHeadlineEditor({ initialCelebs }: Props) {
  const { showToast } = useToast()
  const [celebs, setCelebs] = useState<CelebHeadlineItem[]>(initialCelebs)
  const [search, setSearch] = useState('')
  const [missingFilter, setMissingFilter] = useState<MissingFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [professionFilter, setProfessionFilter] = useState<string>('all')
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // 인라인 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editKo, setEditKo] = useState('')
  const [editEn, setEditEn] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // 통계 계산
  const stats = useMemo(() => {
    const total = celebs.length
    const filledCount = celebs.filter((c) => Boolean(c.headline?.trim())).length
    const filledEnCount = celebs.filter((c) => Boolean(c.headline_en?.trim())).length
    const missingCount = total - filledCount
    const percentage = total > 0 ? Math.round((filledCount / total) * 100) : 0
    return { total, filledCount, filledEnCount, missingCount, percentage }
  }, [celebs])

  // 필터링 & 검색 적용
  const filteredCelebs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return celebs.filter((c) => {
      // 검색어 필터
      if (q) {
        const matchNick = c.nickname?.toLowerCase().includes(q)
        const matchNickEn = c.nickname_en?.toLowerCase().includes(q)
        const matchSlug = c.slug?.toLowerCase().includes(q)
        const matchTitle = c.title?.toLowerCase().includes(q)
        const matchHeadline = c.headline?.toLowerCase().includes(q)
        const matchHeadlineEn = c.headline_en?.toLowerCase().includes(q)
        if (!matchNick && !matchNickEn && !matchSlug && !matchTitle && !matchHeadline && !matchHeadlineEn) {
          return false
        }
      }

      // 작성 상태 필터
      const hasKo = Boolean(c.headline?.trim())
      if (missingFilter === 'filled' && !hasKo) return false
      if (missingFilter === 'missing' && hasKo) return false

      // 공개 상태 필터
      if (statusFilter !== 'all' && c.status !== statusFilter) return false

      // 티어 필터
      if (tierFilter !== 'all' && c.celeb_tier !== tierFilter) return false

      // 직군 필터
      if (professionFilter !== 'all' && c.profession !== professionFilter) return false

      return true
    })
  }, [celebs, search, missingFilter, statusFilter, tierFilter, professionFilter])

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filteredCelebs.length / pageSize))
  const paginatedCelebs = useMemo(() => {
    if (pageSize === -1) return filteredCelebs
    const start = (currentPage - 1) * pageSize
    return filteredCelebs.slice(start, start + pageSize)
  }, [filteredCelebs, currentPage, pageSize])

  // 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [search, missingFilter, statusFilter, tierFilter, professionFilter, pageSize])

  function startEdit(celeb: CelebHeadlineItem) {
    setEditingId(celeb.id)
    setEditKo(celeb.headline || '')
    setEditEn(celeb.headline_en || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditKo('')
    setEditEn('')
  }

  async function handleSave(celebId: string) {
    const target = celebs.find((c) => c.id === celebId)
    if (!target) return

    const newKo = editKo.trim() || null
    const newEn = editEn.trim() || null

    if (newKo === (target.headline || null) && newEn === (target.headline_en || null)) {
      cancelEdit()
      return
    }

    setSaving(true)
    try {
      await updateCelebHeadline(celebId, newKo, newEn)
      setCelebs((prev) =>
        prev.map((c) => (c.id === celebId ? { ...c, headline: newKo, headline_en: newEn } : c))
      )
      showToast('success', `${target.nickname || '인물'}의 헤드라인이 저장되었습니다.`)
      cancelEdit()
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, celebId: string) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault()
      handleSave(celebId)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary">전체 인물</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-text-primary">{stats.total}</span>
            <span className="text-xs text-text-tertiary">명</span>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">국문 작성 완료</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
              {stats.percentage}%
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400">{stats.filledCount}</span>
            <span className="text-xs text-text-tertiary">/ {stats.total}명</span>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary">영문 작성 완료</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-400">{stats.filledEnCount}</span>
            <span className="text-xs text-text-tertiary">명</span>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary">미작성 (누락)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${stats.missingCount > 0 ? 'text-amber-400' : 'text-text-primary'}`}>
              {stats.missingCount}
            </span>
            <span className="text-xs text-text-tertiary">명</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-bg-card border border-border rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 수식어, 헤드라인 키워드 검색..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary hover:text-text-primary p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Missing Filter */}
            <div className="inline-flex overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setMissingFilter('all')}
                className={`px-2.5 py-1.5 text-xs font-medium ${
                  missingFilter === 'all'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setMissingFilter('filled')}
                className={`px-2.5 py-1.5 text-xs font-medium ${
                  missingFilter === 'filled'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                작성됨
              </button>
              <button
                type="button"
                onClick={() => setMissingFilter('missing')}
                className={`px-2.5 py-1.5 text-xs font-medium ${
                  missingFilter === 'missing'
                    ? 'bg-amber-500/20 text-amber-400 font-semibold'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                누락만 ({stats.missingCount})
              </button>
            </div>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-2.5 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">상태 전체</option>
              <option value="active">활성</option>
              <option value="inactive">비공개</option>
            </select>

            {/* Tier Select */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as TierFilter)}
              className="px-2.5 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="all">티어 전체</option>
              <option value="full">full</option>
              <option value="light">light</option>
            </select>

            {/* Profession Select */}
            <select
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none max-w-[130px]"
            >
              <option value="all">직군 전체</option>
              {CELEB_PROFESSIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter results info */}
        <div className="flex items-center justify-between text-xs text-text-secondary pt-1 border-t border-border/60">
          <span>
            검색 결과: <strong className="text-text-primary font-semibold">{filteredCelebs.length}</strong>명
          </span>
          <div className="flex items-center gap-2">
            <span>페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-0.5 text-xs bg-bg-secondary border border-border rounded text-text-primary focus:outline-none"
            >
              <option value="50">50개씩</option>
              <option value="100">100개씩</option>
              <option value="200">200개씩</option>
              <option value="-1">전체 보기</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
            <thead className="bg-bg-secondary border-b border-border text-xs text-text-secondary uppercase">
              <tr>
                <th className="px-4 py-3 w-[260px]">인물</th>
                <th className="px-3 py-3 w-[150px]">직군 / 수식어</th>
                <th className="px-3 py-3 w-[100px] text-center">상태 / 등급</th>
                <th className="px-4 py-3">한 줄 정의 (국문 / 영문)</th>
                <th className="px-3 py-3 w-[70px] text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {paginatedCelebs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-text-secondary text-sm">
                    조건에 맞는 인물이 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedCelebs.map((celeb) => {
                  const isEditing = editingId === celeb.id
                  const hasKo = Boolean(celeb.headline?.trim())
                  const hasEn = Boolean(celeb.headline_en?.trim())

                  return (
                    <tr
                      key={celeb.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isEditing ? 'bg-accent/5' : !hasKo ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      {/* Celeb Info */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-3">
                          <div className="relative w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0 mt-0.5 border border-border/80">
                            {celeb.avatar_url ? (
                              <Image src={celeb.avatar_url} alt="" fill unoptimized className="object-cover" />
                            ) : (
                              <Star className="w-4 h-4 text-yellow-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {celeb.slug ? (
                                <Link
                                  href={`/celebs/${celeb.slug}`}
                                  className="font-semibold text-text-primary hover:text-accent hover:underline truncate"
                                >
                                  {celeb.nickname || '이름 없음'}
                                </Link>
                              ) : (
                                <span className="font-semibold text-text-primary truncate">
                                  {celeb.nickname || '이름 없음'}
                                </span>
                              )}
                              {celeb.status === 'active' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="활성" />
                              )}
                            </div>
                            {celeb.nickname_en && (
                              <p className="text-xs text-text-tertiary truncate">{celeb.nickname_en}</p>
                            )}
                            {celeb.slug && (
                              <p className="text-[10px] font-mono text-text-tertiary truncate">/{celeb.slug}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Profession & Title */}
                      <td className="px-3 py-3 align-top text-xs space-y-1">
                        {celeb.profession ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border/60">
                            {getCelebProfessionLabel(celeb.profession)}
                          </span>
                        ) : (
                          <span className="text-text-tertiary">-</span>
                        )}
                        {celeb.title && (
                          <p className="text-text-secondary font-medium truncate" title={celeb.title}>
                            {celeb.title}
                          </p>
                        )}
                      </td>

                      {/* Status & Tier */}
                      <td className="px-3 py-3 align-top text-center text-xs space-y-1">
                        <div>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                              celeb.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-zinc-500/10 text-zinc-400'
                            }`}
                          >
                            {celeb.status === 'active' ? '공개' : '비공개'}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              celeb.celeb_reality && celeb.celeb_reality !== 'REAL'
                                ? 'bg-purple-500/15 text-purple-400'
                                : celeb.celeb_tier === 'light'
                                ? 'bg-orange-500/15 text-orange-400'
                                : 'text-text-tertiary'
                            }`}
                          >
                            {celeb.celeb_tier || 'full'}
                          </span>
                        </div>
                      </td>

                      {/* Headline Content / Editor */}
                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <div className="space-y-2" onKeyDown={(e) => handleKeyDown(e, celeb.id)}>
                            <div>
                              <label className="text-[11px] font-medium text-accent block mb-1">
                                국문 한 줄 정의 (KO)
                              </label>
                              <input
                                ref={inputRef}
                                type="text"
                                value={editKo}
                                onChange={(e) => setEditKo(e.target.value)}
                                placeholder="예: 워런 버핏의 60년 지혜이자 평생 파트너"
                                disabled={saving}
                                className="w-full px-3 py-1.5 text-sm bg-bg-secondary border border-accent rounded-lg text-text-primary placeholder-text-secondary focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-blue-400 block mb-1">
                                영문 한 줄 정의 (EN)
                              </label>
                              <input
                                type="text"
                                value={editEn}
                                onChange={(e) => setEditEn(e.target.value)}
                                placeholder="EN: e.g. Warren Buffett's Lifelong Partner and Mentor"
                                disabled={saving}
                                className="w-full px-3 py-1.5 text-xs bg-bg-secondary border border-border/80 rounded-lg text-text-primary placeholder-blue-400/50 focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <span className="text-[10px] text-text-tertiary mr-auto">
                                Enter로 저장, Esc로 취소
                              </span>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={saving}
                                className="px-2.5 py-1 text-xs rounded-lg border border-border text-text-secondary hover:bg-bg-secondary"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSave(celeb.id)}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => startEdit(celeb)}
                            className="group cursor-pointer rounded-lg p-2 hover:bg-white/5 transition-colors border border-transparent hover:border-border/60"
                            title="클릭하여 헤드라인 수정"
                          >
                            {hasKo ? (
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                                  {celeb.headline}
                                </p>
                                {hasEn ? (
                                  <p className="text-xs text-text-secondary">{celeb.headline_en}</p>
                                ) : (
                                  <p className="text-[11px] text-text-tertiary italic">영문 헤드라인 미작성</p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-400/80 text-xs py-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>헤드라인 미작성 (클릭하여 입력...)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => (isEditing ? cancelEdit() : startEdit(celeb))}
                            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg active:scale-95 transition-transform"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {celeb.slug && (
                            <Link
                              href={`/celebs/${celeb.slug}`}
                              className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-secondary rounded-lg active:scale-95 transition-transform"
                              title="상세 페이지 열기"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-secondary/40 text-xs">
            <span className="text-text-secondary">
              {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredCelebs.length)} / 총{' '}
              {filteredCelebs.length}명
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-border bg-bg-card disabled:opacity-30 hover:bg-bg-secondary"
              >
                이전
              </button>
              <span className="px-2 text-text-primary font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-border bg-bg-card disabled:opacity-30 hover:bg-bg-secondary"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
