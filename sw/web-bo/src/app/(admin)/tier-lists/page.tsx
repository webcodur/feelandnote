import type { Metadata } from 'next'
import { createClient } from '@/lib/db/server'

export const metadata: Metadata = {
  title: '티어 리스트',
}
import TierListsClient from './TierListsClient'

const TIER_LIST_TYPE_CONFIG = {
  all: { label: '전체', color: 'default' },
  category: { label: '카테고리', color: 'info' },
  genre: { label: '장르', color: 'purple' },
  year: { label: '연도', color: 'success' },
  custom: { label: '커스텀', color: 'orange' },
}

export default async function TierListsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; visibility?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const typeFilter = params.type || ''
  const visibilityFilter = params.visibility || ''
  const perPage = 24

  const db = await createClient()

  let query = db
    .from('tier_lists')
    .select(
      '*, account:user_accounts!tier_lists_accounts_fkey(id, member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url))',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })

  if (typeFilter) query = query.eq('type', typeFilter)
  if (visibilityFilter === 'public') query = query.eq('is_public', true)
  else if (visibilityFilter === 'private') query = query.eq('is_public', false)

  const { data: tierListRows, count, error: tierListsError } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1
  )

  if (tierListsError) throw new Error(`Failed to load tier lists: ${tierListsError.message}`)

  const tierLists = (tierListRows ?? []).map((row) => {
    const account = Array.isArray(row.account) ? row.account[0] : row.account
    const member = Array.isArray(account?.member) ? account.member[0] : account?.member
    return { ...row, user: member ?? null }
  })

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  const { data: typeStats, error: typeStatsError } = await db.from('tier_lists').select('type')
  if (typeStatsError) throw new Error(`Failed to load tier list statistics: ${typeStatsError.message}`)
  const typeCountMap = (typeStats || []).reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const { count: publicCount, error: publicCountError } = await db
    .from('tier_lists')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)

  if (publicCountError) {
    throw new Error(`Failed to load public tier list count: ${publicCountError.message}`)
  }

  const typeFilterOptions = [
    { value: '', label: '전체', count: total },
    ...Object.entries(TIER_LIST_TYPE_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
      count: typeCountMap[key] || 0,
    })),
  ]

  const visibilityFilterOptions = [
    { value: '', label: '전체' },
    { value: 'public', label: '공개', count: publicCount || 0 },
    { value: 'private', label: '비공개', count: (total || 0) - (publicCount || 0) },
  ]

  return (
    <TierListsClient
      tierLists={tierLists}
      total={total}
      page={page}
      totalPages={totalPages}
      typeFilter={typeFilter}
      visibilityFilter={visibilityFilter}
      typeFilterOptions={typeFilterOptions}
      visibilityFilterOptions={visibilityFilterOptions}
      typeConfig={TIER_LIST_TYPE_CONFIG}
    />
  )
}
