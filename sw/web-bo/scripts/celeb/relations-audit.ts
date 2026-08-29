import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

interface CelebRow {
  id: string
  nickname: string
  nickname_en: string | null
  birth_date: string | null
  death_date: string | null
}

interface OldRow {
  note: string | null
  note_en: string | null
  rel_group: string
  source: string
}

interface Candidate {
  fact_key: string
  from_id: string
  from_name: string
  to_id: string
  to_name: string
  rel_type: string
  rel_group: string
  source: string
  needs_merge: boolean
  note: string | null
  note_en: string | null
  old_rows: OldRow[]
}

interface MergedResult {
  fact_key: string
  status: 'ok' | 'review'
  note: string | null
  note_en: string | null
}

interface ReviewDecision {
  action: 'drop' | 'replace'
  from_id?: string
  to_id?: string
  rel_type?: string
  note?: string
  note_en?: string
}

interface Issue {
  fact_key: string
  reason: string
  from_id: string
  to_id: string
  from: string
  to: string
  rel_type: string
  note: string | null
}

const root = resolve(process.cwd(), '../..')
const dir = resolve(root, 'data/celeb/relations-consolidation')
const prepared = JSON.parse(readFileSync(resolve(dir, 'candidates.json'), 'utf8')) as {
  source_sha256: string
  candidates: Candidate[]
}
const merged = JSON.parse(readFileSync(resolve(dir, 'merged-notes.json'), 'utf8')) as {
  source_sha256: string
  results: Record<string, MergedResult>
  failures: Record<string, string>
}
if (prepared.source_sha256 !== merged.source_sha256) throw new Error('Source hash mismatch')
const reviewFile = resolve(dir, 'review-decisions.json')
const reviewed = existsSync(reviewFile)
  ? JSON.parse(readFileSync(reviewFile, 'utf8')) as {
      source_sha256: string
      decisions: Record<string, ReviewDecision>
    }
  : { source_sha256: prepared.source_sha256, decisions: {} }
if (prepared.source_sha256 !== reviewed.source_sha256) throw new Error('Review source hash mismatch')

config({ path: resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is missing')
const db = createClient(url, key, { auth: { persistSession: false } })

async function selectCelebs(): Promise<CelebRow[]> {
  const rows: CelebRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('celebs')
      .select('id,nickname,nickname_en,birth_date,death_date')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as CelebRow[]))
    if (!data || data.length < 1000) return rows
  }
}

function yearOf(value: string | null): number | null {
  const match = value?.match(/-?\d{1,4}/)
  return match ? Number(match[0]) : null
}

const CONTEMPORARY_TYPES = new Set([
  'cofounder', 'colleague', 'father', 'friend', 'mother', 'parent', 'partner',
  'rival', 'sibling', 'spouse', 'teacher',
])
const FORBIDDEN_PROSE = /—|포개|벼리|빚어내|꿰뚫|스며들|길어 올|자리 잡|발돋움|공개히/

function finalText(candidate: Candidate, decision?: ReviewDecision): MergedResult | null {
  if (decision?.action === 'drop') return null
  if (decision?.action === 'replace') {
    return {
      fact_key: candidate.fact_key,
      status: 'ok',
      note: decision.note ?? null,
      note_en: decision.note_en ?? null,
    }
  }
  if (!candidate.needs_merge) {
    return {
      fact_key: candidate.fact_key,
      status: 'ok',
      note: candidate.note,
      note_en: candidate.note_en,
    }
  }
  return merged.results[candidate.fact_key] ?? null
}

function colleagueTeam(candidate: Candidate): string | null {
  if (candidate.rel_type !== 'colleague') return null
  const text = candidate.note ?? candidate.old_rows[0]?.note ?? ''
  return text.match(/^<([^>]+)> 팀 동료$/)?.[1] ?? null
}

async function main() {
  const profiles = new Map((await selectCelebs()).map((celeb) => [celeb.id, celeb]))
  const teamsByProfile = new Map<string, Map<string, number>>()
  for (const candidate of prepared.candidates) {
    const team = colleagueTeam(candidate)
    if (!team) continue
    for (const id of [candidate.from_id, candidate.to_id]) {
      const counts = teamsByProfile.get(id) ?? new Map<string, number>()
      counts.set(team, (counts.get(team) ?? 0) + 1)
      teamsByProfile.set(id, counts)
    }
  }
  const dominantTeam = new Map(
    [...teamsByProfile].map(([id, counts]) => [
      id,
      [...counts].sort((a, b) => b[1] - a[1])[0],
    ]),
  )
  const issues: Issue[] = []
  const add = (candidate: Candidate, reason: string, note: string | null = null) => {
    issues.push({
      fact_key: candidate.fact_key,
      reason,
      from_id: candidate.from_id,
      to_id: candidate.to_id,
      from: candidate.from_name,
      to: candidate.to_name,
      rel_type: candidate.rel_type,
      note,
    })
  }

  for (const candidate of prepared.candidates) {
    const decision = reviewed.decisions[candidate.fact_key]
    if (decision?.action === 'drop') continue
    const result = finalText(candidate, decision)
    if (candidate.from_id === candidate.to_id) add(candidate, 'self_relation')
    if (candidate.old_rows.some((row) => row.rel_group !== candidate.rel_group)) {
      add(candidate, 'mixed_relation_group')
    }
    if (candidate.old_rows.some((row) => row.source !== candidate.source)) {
      add(candidate, 'mixed_source')
    }
    const team = colleagueTeam(candidate)
    if (!decision && team && [candidate.from_id, candidate.to_id].some((id) => {
      const dominant = dominantTeam.get(id)
      return dominant && dominant[0] !== team && dominant[1] >= 2
    })) {
      add(candidate, 'colleague_team_needs_review', candidate.note)
    }

    if (!result) {
      add(candidate, merged.failures[candidate.fact_key] ? 'merge_failed' : 'merge_missing')
      continue
    }
    if (result.status === 'review') {
      add(candidate, 'model_requested_review')
      continue
    }
    if (!result.note || !result.note_en) {
      add(candidate, 'missing_shared_note', result.note)
      continue
    }
    if (FORBIDDEN_PROSE.test(result.note)) add(candidate, 'forbidden_prose', result.note)
    if (/[가-힣]/.test(result.note_en)) add(candidate, 'english_note_contains_hangul', result.note_en)
    if (candidate.needs_merge &&
        (!result.note.includes(candidate.from_name) || !result.note.includes(candidate.to_name))) {
      add(candidate, 'merged_note_missing_profile_name', result.note)
    }

    const effectiveType = decision?.rel_type ?? candidate.rel_type
    if (CONTEMPORARY_TYPES.has(effectiveType)) {
      const from = profiles.get(decision?.from_id ?? candidate.from_id)
      const to = profiles.get(decision?.to_id ?? candidate.to_id)
      const fromBirth = yearOf(from?.birth_date ?? null)
      const fromDeath = yearOf(from?.death_date ?? null)
      const toBirth = yearOf(to?.birth_date ?? null)
      const toDeath = yearOf(to?.death_date ?? null)
      const yearTolerance = ['father', 'mother', 'parent'].includes(effectiveType) ? 1 : 0
      if ((fromDeath !== null && toBirth !== null && fromDeath + yearTolerance < toBirth) ||
          (toDeath !== null && fromBirth !== null && toDeath + yearTolerance < fromBirth)) {
        add(candidate, 'lifespans_do_not_overlap', result.note)
      }
    }
  }

  const report = {
    source_sha256: prepared.source_sha256,
    candidate_count: prepared.candidates.length,
    merged_count: Object.keys(merged.results).length,
    failure_count: Object.keys(merged.failures).length,
    issue_count: issues.length,
    reasons: Object.fromEntries(
      [...new Set(issues.map((issue) => issue.reason))]
        .sort()
        .map((reason) => [reason, issues.filter((issue) => issue.reason === reason).length]),
    ),
    issues,
  }
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ ...report, issues: undefined }, null, 2))
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exit(1)
})
