import { createClient } from '@feelandnote/db'
import { readFileSync, unlinkSync } from 'node:fs'
import {
  externalFamilyRelationFacts, prepareRelationSupplement, validateRelationSupplement,
  type RelationFact, type RelationPerson,
} from './relations-supplement'

export async function runRelationSupplement(db: ReturnType<typeof createClient>, file: string, apply: boolean) {
  const input = validateRelationSupplement(JSON.parse(readFileSync(file, 'utf8')))
  const slugs = [...new Set(input.pairs.flatMap(p => [p.a, p.b]))]
  const people: RelationPerson[] = []
  for (let i = 0; i < slugs.length; i += 100) {
    const { data, error } = await db.from('celebs').select('id,slug,nickname,wikidata_qid').in('slug', slugs.slice(i, i + 100))
    if (error) throw error
    people.push(...data as RelationPerson[])
  }
  const ids = people.map(p => p.id)
  const existing: RelationFact[] = []
  for (const column of ['from_id', 'to_id']) {
    for (let i = 0; i < ids.length; i += 100) {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.from('celeb_relations').select('id,from_id,to_id,rel_type,rel_group')
          .in(column, ids.slice(i, i + 100)).order('id').range(offset, offset + 999)
        if (error) throw error
        existing.push(...data as RelationFact[])
        if (!data || data.length < 1000) break
      }
    }
  }
  for (let i = 0; i < ids.length; i += 100) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from('celeb_relations_external').select('id,from_id,qid,rel_type,rel_group')
        .in('from_id', ids.slice(i, i + 100)).order('id').range(offset, offset + 999)
      if (error) throw error
      existing.push(...externalFamilyRelationFacts(data ?? [], people))
      if (!data || data.length < 1000) break
    }
  }
  const plan = prepareRelationSupplement(input, people, existing)
  console.log(`출처 보강 ${apply ? '반영' : 'dry-run'} · 후보 ${input.pairs.length} · 신규 ${plan.rows.length} · 제외 ${plan.skipped.length}`)
  for (const row of plan.rows) {
    console.log(`${people.find(p => p.id === row.from_id)!.nickname} → ${people.find(p => p.id === row.to_id)!.nickname} (${row.rel_type})`)
    console.log(`  ${row.note}\n  ${row.note_en}`)
  }
  for (const skipped of plan.skipped) console.log(`제외 ${skipped.a} / ${skipped.b}: ${skipped.reason}`)
  if (!apply) { console.log('DB 미반영. 검증된 파일을 --apply로 반영합니다.'); return }
  for (let i = 0; i < plan.rows.length; i += 100) {
    const chunk = plan.rows.slice(i, i + 100)
    const { error } = await db.from('celeb_relations').upsert(chunk, {
      onConflict: 'from_id,to_id,rel_type', ignoreDuplicates: true,
    })
    if (error) throw error
    for (const row of chunk) {
      const { data, error: verifyError } = await db.from('celeb_relations').select('from_id,to_id,rel_type,source,note,note_en')
        .eq('from_id', row.from_id).eq('to_id', row.to_id).eq('rel_type', row.rel_type).single()
      if (verifyError) throw verifyError
      if (data.source !== 'manual' || data.note !== row.note || data.note_en !== row.note_en) {
        throw new Error(`반영 후 값 불일치: ${row.from_id} / ${row.to_id}`)
      }
    }
  }
  unlinkSync(file)
  console.log(`DB 재조회·임시 입력 폐기 완료 · 신규 ${plan.rows.length}건`)
}
