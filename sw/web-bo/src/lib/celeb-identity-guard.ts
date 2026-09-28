import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  celebNameIssues,
  celebTitleIssues,
  findCelebDuplicates,
  type CelebDuplicateMatch,
  type CelebIdentityIssue,
  type CelebIdentityRow,
} from '@feelandnote/shared/lib/celeb-identity'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'

/**
 * 백오피스 인물 저장 경로의 신원 검사. 판정 규칙은 @feelandnote/shared/lib/celeb-identity 하나가 쥐고,
 * 여기서는 DB에서 비교 대상을 읽어 등록·수정 액션이 쓰기 좋은 모양으로 돌려준다.
 * 기준 문서: docs/project/celeb/celeb-00-01-pipeline.md 「중복 확인」
 */
export type CelebIdentityRowWithMeta = CelebIdentityRow & {
  id: string
  slug: string | null
  nickname: string
  title: string | null
}

export async function loadCelebIdentityRows(db: SupabaseClient): Promise<CelebIdentityRowWithMeta[]> {
  return selectAllPages<CelebIdentityRowWithMeta>((from, to) => db
    .from('celebs')
    .select('id, slug, nickname, nickname_en, aliases, wikidata_qid, birth_date, death_date, publication_status, title')
    .neq('publication_status', 'deleted')
    .order('id', { ascending: true })
    .range(from, to))
}

/** 값이 들어온 칸만 검사한다. 상태·등급만 바꾸는 부분 저장은 막지 않는다. */
export function celebIdentityIssuesFor(input: {
  nickname?: string | null
  nickname_en?: string | null
  title?: string | null
  title_en?: string | null
}): CelebIdentityIssue[] {
  const issues: CelebIdentityIssue[] = []
  if (input.nickname !== undefined || input.nickname_en !== undefined) {
    issues.push(...celebNameIssues({ nickname: input.nickname ?? ' ', nickname_en: input.nickname_en }).filter(
      // 영문 이름만 바꾸는 저장에서 한국어 칸 비어 있음 오류를 내지 않는다
      (issue) => input.nickname !== undefined || issue.field !== 'nickname',
    ))
  }
  if (input.title !== undefined || input.title_en !== undefined) {
    issues.push(...celebTitleIssues({ title: input.title, title_en: input.title_en }))
  }
  return issues
}

export function assertCelebIdentityRules(input: Parameters<typeof celebIdentityIssuesFor>[0]): void {
  const error = celebIdentityIssuesFor(input).find((issue) => issue.level === 'error')
  if (error) throw new Error(error.message)
}

export function strongCelebDuplicates(
  candidate: CelebIdentityRow,
  rows: readonly CelebIdentityRowWithMeta[],
): CelebDuplicateMatch<CelebIdentityRowWithMeta>[] {
  return findCelebDuplicates(candidate, rows).filter((match) => match.strong)
}

export function duplicateMessage(matches: readonly CelebDuplicateMatch<CelebIdentityRowWithMeta>[]): string {
  const names = matches.map((match) => `${match.row.nickname}(${match.row.slug ?? match.row.id})`).join(', ')
  return `같은 사람으로 보이는 인물이 이미 있다: ${names} — 새로 만들지 말고 기존 프로필을 보강한다`
}
