/**
 * 숨김 스포츠 팩션 두 편의 영상용 소개 문구를 조건부로 완성한다.
 *
 * 대사(quote 계열)는 apply-faction-dialogue-batch.ts가 별도로 맡는다.
 * 기본은 dry-run이며 --apply에서만 DB SSoT를 갱신한다.
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assembleFactionEpisode, type FactionRowSource } from '@feelandnote/shared/lib/faction-assemble'
import { diffPointers, stripGenerated } from '@feelandnote/shared/lib/faction-schema'
import { factionEpisodePaths, inspectFactionDataFile } from '@feelandnote/shared/bo/faction-export'
import { replaceFactionEpisode } from '../src/lib/faction-save'
import { SPORTS_FACTION_COPY } from './sports-faction-copy'

const WEB_BO_DIR = path.resolve(process.cwd())
const FACTIONS_DIR = path.resolve(WEB_BO_DIR, '..', 'remotion', 'public', 'factions')
const APPLY = process.argv.includes('--apply')

type Row = Record<string, unknown>

function createDb(): SupabaseClient {
  config({ path: path.join(WEB_BO_DIR, '.env'), quiet: true })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function sourceFor(db: SupabaseClient): FactionRowSource {
  return async (table, col, values) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    return (data ?? []) as Row[]
  }
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function setIfEmptyOrSame(row: Row, key: string, value: unknown, label: string): boolean {
  const current = row[key]
  if (same(current, value)) return false
  if (current !== undefined && current !== null) {
    throw new Error(`${label}.${key} 충돌: ${JSON.stringify(current)}`)
  }
  row[key] = value
  return true
}

function arrayField(row: Row, key: string, label: string): Row[] {
  const value = row[key]
  if (!Array.isArray(value)) throw new Error(`${label}.${key}가 배열이 아닙니다.`)
  return value as Row[]
}

async function main(): Promise<void> {
  const db = createDb()
  const source = sourceFor(db)
  let totalChanges = 0

  for (const seed of SPORTS_FACTION_COPY) {
    const { dataPath } = factionEpisodePaths(FACTIONS_DIR, seed.folder)
    const fileState = inspectFactionDataFile(dataPath)
    if (fileState.kind !== 'generated') {
      throw new Error(`${seed.folder}: faction-data.json 상태가 generated가 아닙니다 (${fileState.kind})`)
    }

    const assembled = await assembleFactionEpisode(source, seed.folder, fileState.doc)
    const before = assembled.script as Row
    const fileDiffs = diffPointers(stripGenerated(fileState.doc), before)
    if (fileDiffs.length) {
      throw new Error(`${seed.folder}: DB와 생성 파일 drift ${fileDiffs.slice(0, 10).join(', ')}`)
    }
    const next = structuredClone(before)
    let changes = 0

    changes += Number(setIfEmptyOrSame(next, 'loglineEn', seed.loglineEn, seed.folder))
    changes += Number(setIfEmptyOrSame(next, 'outroTitle', seed.outroTitle, seed.folder))
    changes += Number(setIfEmptyOrSame(next, 'outroNote', seed.outroNote, seed.folder))
    changes += Number(setIfEmptyOrSame(next, 'shortsPartCount', seed.groups.length, seed.folder))

    const groups = arrayField(next, 'groups', seed.folder)
    for (const groupSeed of seed.groups) {
      const matches = groups.filter(group => group.name === groupSeed.name)
      if (matches.length !== 1) throw new Error(`${seed.folder}/${groupSeed.name}: 세력 매칭 ${matches.length}건`)
      const group = matches[0]
      changes += Number(setIfEmptyOrSame(group, 'color', groupSeed.color, `${seed.folder}/${groupSeed.name}`))
      changes += Number(setIfEmptyOrSame(group, 'tagline', groupSeed.tagline, `${seed.folder}/${groupSeed.name}`))
      changes += Number(setIfEmptyOrSame(group, 'taglineEn', groupSeed.taglineEn, `${seed.folder}/${groupSeed.name}`))
      changes += Number(setIfEmptyOrSame(group, 'part', groupSeed.part, `${seed.folder}/${groupSeed.name}`))

      const people = arrayField(group, 'clusters', `${seed.folder}/${groupSeed.name}`)
        .flatMap(cluster => arrayField(cluster, 'people', `${seed.folder}/${groupSeed.name}/cluster`))
      for (const personSeed of groupSeed.people) {
        const personMatches = people.filter(person => person.slug === personSeed.slug)
        if (personMatches.length !== 1) {
          throw new Error(`${seed.folder}/${personSeed.slug}: 인물 매칭 ${personMatches.length}건`)
        }
        const person = personMatches[0]
        changes += Number(setIfEmptyOrSame(person, 'epithet', personSeed.epithet, `${seed.folder}/${personSeed.slug}`))
        changes += Number(setIfEmptyOrSame(person, 'epithetEn', personSeed.epithetEn, `${seed.folder}/${personSeed.slug}`))
        changes += Number(setIfEmptyOrSame(person, 'lines', personSeed.lines, `${seed.folder}/${personSeed.slug}`))
        changes += Number(setIfEmptyOrSame(person, 'linesEn', personSeed.linesEn, `${seed.folder}/${personSeed.slug}`))
      }
    }

    console.log(`${seed.folder}: ${changes ? `${changes}필드 변경 예정` : 'SKIP — 이미 완료'}`)
    totalChanges += changes
    if (!APPLY || !changes) continue

    const updatedAt = assembled.row.updated_at
    if (typeof updatedAt !== 'string' || !updatedAt) throw new Error(`${seed.folder}: updated_at 없음`)
    await replaceFactionEpisode(db, seed.folder, next, updatedAt)

    const reloaded = await assembleFactionEpisode(source, seed.folder)
    const diffs = diffPointers(next, reloaded.script as Row)
    if (diffs.length) throw new Error(`${seed.folder}: 저장 후 불일치 ${diffs.slice(0, 10).join(', ')}`)
    console.log(`${seed.folder}: APPLIED`)
  }

  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} 완료 · 대상 필드 ${totalChanges}개`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
