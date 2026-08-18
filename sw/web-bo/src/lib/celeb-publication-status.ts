const NEXT_STATUS = {
  active: 'inactive',
  inactive: 'active',
} as const

export function nextCelebPublicationStatus(current: string | null | undefined): 'active' | 'inactive' {
  const next = current ? NEXT_STATUS[current as keyof typeof NEXT_STATUS] : undefined
  if (!next) {
    throw new Error(`이 상태(${current ?? '없음'})는 전환할 수 없습니다.`)
  }
  return next
}

export function resolveCelebListStatus(row: {
  status?: string | null
  publication_status?: string | null
}): string {
  return row.status || row.publication_status || ''
}
