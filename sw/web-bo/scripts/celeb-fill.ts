/**
 * 셀럽 전 트랙 결손 조건부 반영 도구. **빈칸만 채운다.**
 *
 * 덤프(읽기 전용):
 *   pnpm exec tsx scripts/celeb-fill.ts dump --slugs a,b,c
 *
 * 반영(기본 dry-run. --apply 로만 저장):
 *   pnpm exec tsx scripts/celeb-fill.ts apply --file .tmp-celeb-fill/patch-NN.json
 *   pnpm exec tsx scripts/celeb-fill.ts apply --file .tmp-celeb-fill/patch-NN.json --apply
 *
 * 패치 형식:
 * [
 *   {
 *     "slug": "yuan-shao",
 *     "celeb": { "title": "...", "bio": "...", "title_en": "...", "bio_en": "...",
 *                   "profession": "commander", "nationality": "CN", "birth_date": "-154",
 *                   "death_date": "202", "speech_tone": "bold",
 *                   "consumption_philosophy": "...", "consumption_philosophy_en": "..." },
 *     "influence": { "political": 7, "political_exp": "...", "political_exp_en": "...", ... ,
 *                    "transhistoricity": 5, "transhistoricity_exp": "...", "transhistoricity_exp_en": "..." },
 *     "spectrum": { "abilities": { "command": { "score": 70, "reason_ko": "...", "reason_en": "..." }, ... },
 *                  "inner_virtues": {...}, "outer_virtues": {...}, "dispositions": {...} },
 *     "dialogues": { "lines": { "quote": "...", "greeting": ["a","b","c"], ... },
 *                    "lines_en": { "quote": "...", "greeting": ["a","b","c"], ... } }
 *   }
 * ]
 *
 * 안전 규칙
 *  - 기존값이 있는 필드·슬롯은 절대 덮어쓰지 않는다(도구가 걸러낸다).
 *  - `celebs`의 기존 인물만 대상이며 신규 인물 생성 경로는 없다.
 *  - `celeb_influence`·`celeb_persona`·`celeb_dialogues` 행이 없으면 생성한다.
 *  - `celeb_persona`는 물리 `persona` jsonb만 쓴다(평면 점수 컬럼은 DB 트리거가 동기화).
 *  - 반영 후 DB를 다시 읽어 왕복 검증한다. 불일치는 FAILED.
 */

import { mkdir, readFile, readdir, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { femaleMartialAdjust } from '@feelandnote/shared/constants/celeb-spectrum-scale'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const PROFILE_FIELDS = [
  'nickname', 'nickname_en', 'title', 'title_en', 'bio', 'bio_en', 'profession',
  'nationality', 'birth_date', 'death_date', 'gender', 'speech_tone',
  'consumption_philosophy', 'consumption_philosophy_en',
  'cultural_journey', 'cultural_journey_en',
] as const

/** celebs의 boolean 전용 필드 (json → boolean 변환 필요) */
const BOOL_PROFILE_FIELDS = ['gender'] as const

const AXES = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural', 'transhistoricity'] as const
const SPECTRUM_GROUPS = {
  abilities: ['command', 'martial', 'intellect', 'charm'],
  inner_virtues: ['temperance', 'diligence', 'reflection', 'courage'],
  outer_virtues: ['loyalty', 'benevolence', 'fairness', 'humility'],
  dispositions: ['pessimism_optimism', 'conservative_progressive', 'individual_social', 'cautious_bold'],
} as const
const DIALOGUE_KEYS = [
  'greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack',
] as const
const SPEECH_TONES = ['free', 'bold', 'composed', 'loyal', 'humble', 'gentle']
const PROFESSIONS = [
  'leader', 'politician', 'commander', 'entrepreneur', 'investor', 'humanities_scholar',
  'social_scientist', 'scientist', 'director', 'musician', 'visual_artist', 'author',
  'actor', 'influencer', 'athlete', 'other',
]

const blank = (v: unknown) => v === null || v === undefined || String(v).trim().length === 0
const nil = (v: unknown) => v === null || v === undefined

/** jsonb 는 키 순서를 보존하지 않는다. 순서 무시 심층 비교로 왕복 검증한다. */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)]),
    )
  }
  return v
}
const sameJson = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

function argOf(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

type Ctx = {
  profile: Record<string, any>
  influence: Record<string, any> | null
  spectrum: Record<string, any> | null
  dialogue: Record<string, any> | null
}

async function loadCtx(slug: string): Promise<Ctx> {
  const { data: profile, error } = await db
    .from('celebs').select('*').eq('slug', slug).maybeSingle()
  if (error) throw new Error(`${slug} celebs 조회 실패: ${error.message}`)
  if (!profile) throw new Error(`${slug} — CELEB 프로필 없음`)
  const [inf, per, dia] = await Promise.all([
    db.from('celeb_influence').select('*').eq('celeb_id', profile.id).maybeSingle(),
    db.from('celeb_persona').select('id,celeb_id,spectrum:persona').eq('celeb_id', profile.id).maybeSingle(),
    db.from('celeb_dialogues').select('*').eq('celeb_id', profile.id).maybeSingle(),
  ])
  return { profile, influence: inf.data ?? null, spectrum: per.data ?? null, dialogue: dia.data ?? null }
}

async function dump() {
  const slugs = (argOf('slugs') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (slugs.length === 0) throw new Error('--slugs 필요')
  const out: unknown[] = []
  for (const slug of slugs) {
    const c = await loadCtx(slug)
    const p = c.profile
    const lines = (c.dialogue?.lines ?? {}) as Record<string, any>
    const linesEn = (c.dialogue?.lines_en ?? {}) as Record<string, any>
    out.push({
      slug,
      nickname: p.nickname, nickname_en: p.nickname_en, tier: p.celeb_tier, publicationStatus: p.publication_status,
      celeb: Object.fromEntries(PROFILE_FIELDS.map((f) => [f, p[f] ?? null])),
      profileBlanks: PROFILE_FIELDS.filter((f) => blank(p[f])),
      influence: c.influence
        ? Object.fromEntries(AXES.flatMap((a) => [
            [a, c.influence![a] ?? null], [`${a}_exp`, c.influence![`${a}_exp`] ?? null],
            [`${a}_exp_en`, c.influence![`${a}_exp_en`] ?? null],
          ]))
        : null,
      spectrumExists: Boolean(c.spectrum),
      spectrumGroups: c.spectrum?.spectrum ? Object.keys(c.spectrum.spectrum) : [],
      dialogueExists: Boolean(c.dialogue),
      dialogueBlanks: {
        quote: blank(lines.quote), quote_en: blank(linesEn.quote),
        ko: DIALOGUE_KEYS.flatMap((k) => [0, 1, 2].filter((i) => blank((lines[k] ?? [])[i])).map((i) => `${k}[${i}]`)),
        en: DIALOGUE_KEYS.flatMap((k) => [0, 1, 2].filter((i) => blank((linesEn[k] ?? [])[i])).map((i) => `${k}[${i}]`)),
      },
    })
  }
  console.log(JSON.stringify({ count: out.length, rows: out }, null, 2))
}

type Patch = {
  slug: string
  celeb?: Record<string, string | boolean | null>
  influence?: Record<string, string | number>
  spectrum?: Record<string, Record<string, { score: number; reason_ko: string; reason_en: string }> | string>
  /** @deprecated 입력 호환 전용. 내부에서는 즉시 spectrum으로 정규화한다. */
  persona?: Record<string, Record<string, { score: number; reason_ko: string; reason_en: string }> | string>
  dialogues?: { lines?: Record<string, any>; lines_en?: Record<string, any> }
}

async function apply() {
  const file = argOf('file')
  if (!file) throw new Error('--file 필요')
  const doWrite = process.argv.includes('--apply')
  const patches = JSON.parse(await readFile(path.resolve(file), 'utf8')) as Patch[]
  if (!Array.isArray(patches) || patches.length === 0) throw new Error('배치가 비었다')

  const r = await applyPatches(patches, doWrite)
  for (const l of r.log) console.log(l)
  console.log(`\n## 배치 결과 (${doWrite ? 'APPLY' : 'DRY-RUN'})`)
  console.log(`- ${doWrite ? 'UPDATED' : 'WOULD UPDATE'}: ${r.ok}건`)
  console.log(`- SKIPPED: ${r.skipped}건`)
  console.log(`- FAILED: ${r.failed}건`)
  if (r.failed > 0) process.exit(1)
}

async function applyPatches(patches: Patch[], doWrite: boolean) {
  let ok = 0, skipped = 0, failed = 0
  const log: string[] = []

  /**
   * 작성자가 영향력·스펙트럼 필드를 `celeb` 아래에 잘못 넣는 일이 잦다.
   * 필드 이름이 서로 겹치지 않으므로 제 위치로 옮겨준다(작업물 유실 방지).
   */
  const isInfluenceKey = (k: string) =>
    (AXES as readonly string[]).includes(k) ||
    /^(political|strategic|tech|social|economic|cultural|transhistoricity)_exp(_en)?$/.test(k)

  const reroute = (patch: Patch): string[] => {
    const moved: string[] = []
    const prof = patch.celeb as Record<string, any> | undefined
    if (!prof) return moved
    for (const k of Object.keys(prof)) {
      if ((PROFILE_FIELDS as readonly string[]).includes(k)) continue
      if (isInfluenceKey(k)) {
        patch.influence = { ...(patch.influence ?? {}), [k]: prof[k] }
        delete prof[k]
        moved.push(k)
      }
    }
    return moved
  }

  for (const patch of patches) {
    try {
      const moved = reroute(patch)
      const c = await loadCtx(patch.slug)
      const changes: string[] = []
      const preserved: string[] = []
      if (moved.length) preserved.push(`※ influence 로 이동: ${moved.join(',')}`)

      // ── celebs: 빈칸만
      const profPayload: Record<string, string | boolean> = {}
      for (const [k, v] of Object.entries(patch.celeb ?? {})) {
        if (!(PROFILE_FIELDS as readonly string[]).includes(k)) throw new Error(`허용되지 않은 celebs 필드 ${k}`)
        const isBool = (BOOL_PROFILE_FIELDS as readonly string[]).includes(k)
        if (!isBool && blank(v)) { preserved.push(`${k}(신규값 공란)`); continue }
        if (isBool) {
          if (v !== true && v !== false) throw new Error(`celebs.${k} 는 true/false 여야 한다: ${v}`)
          if (!nil(c.profile[k])) { preserved.push(`${k}(기존값 보존)`); continue }
          profPayload[k] = v
          continue
        }
        if (!blank(c.profile[k])) { preserved.push(`${k}(기존값 보존)`); continue }
        if (k === 'speech_tone' && !SPEECH_TONES.includes(String(v))) {
          preserved.push(`speech_tone(코드 아님: ${v} — 제외)`)
          continue
        }
        if (k === 'profession' && !PROFESSIONS.includes(String(v))) {
          preserved.push(`profession(코드 아님: ${v} — 제외)`)
          continue
        }
        profPayload[k] = String(v)
      }

      // ── influence: 행 없으면 생성, 있으면 빈칸만
      const infPayload: Record<string, string | number> = {}
      for (const [k, v] of Object.entries(patch.influence ?? {})) {
        const isScore = (AXES as readonly string[]).includes(k)
        const isExp = /^(political|strategic|tech|social|economic|cultural|transhistoricity)_exp(_en)?$/.test(k)
        if (!isScore && !isExp) throw new Error(`허용되지 않은 influence 필드 ${k}`)
        const before = c.influence ? c.influence[k] : null
        if (isScore) {
          if (nil(v)) { preserved.push(`inf.${k}(신규값 없음)`); continue }
          const n = Number(v)
          const max = k === 'transhistoricity' ? 40 : 10
          if (!Number.isInteger(n) || n < 0 || n > max) throw new Error(`influence ${k} 는 0~${max} 정수: ${v}`)
          if (!nil(before)) { preserved.push(`inf.${k}(기존값 보존)`); continue }
          infPayload[k] = n
        } else {
          if (blank(v)) { preserved.push(`inf.${k}(신규값 공란)`); continue }
          if (!blank(before)) { preserved.push(`inf.${k}(기존값 보존)`); continue }
          infPayload[k] = String(v)
        }
      }
      // ── total_score: 기존값 없을 때만 7축 합으로 계산(랭킹·출고 필수)
      {
        const existingTotal = c.influence?.total_score
        if (nil(existingTotal)) {
          const allScores = (AXES as readonly string[]).every((a) =>
            Number.isInteger(infPayload[a] ?? c.influence?.[a] ?? null))
          if (allScores) {
            const total = (AXES as readonly string[]).reduce(
              (s, a) => s + Number(infPayload[a] ?? c.influence?.[a] ?? 0), 0)
            infPayload.total_score = total
          }
        }
      }

      // ── spectrum: 행/그룹/키 단위로 빈칸만
      const curSpectrum = (c.spectrum?.spectrum ?? {}) as Record<string, any>
      const nextSpectrum: Record<string, any> = JSON.parse(JSON.stringify(curSpectrum))
      let spectrumTouched = false
      const spectrumPatch = patch.spectrum ?? patch.persona ?? {}
      let femaleAdjustCount = 0
      for (const [group, entries] of Object.entries(spectrumPatch)) {
        // 종합 해설은 그룹이 아니라 최상위 문자열 필드다
        if (group === 'rationale_ko' || group === 'rationale_en') {
          const v = entries as unknown
          if (blank(v)) { preserved.push(`per.${group}(신규값 공란)`); continue }
          if (!blank(curSpectrum[group])) { preserved.push(`per.${group}(기존값 보존)`); continue }
          nextSpectrum[group] = String(v)
          spectrumTouched = true
          continue
        }
        const allowed = (SPECTRUM_GROUPS as Record<string, readonly string[]>)[group]
        if (!allowed) throw new Error(`허용되지 않은 spectrum 그룹 ${group}`)
        for (const [k, val] of Object.entries(entries)) {
          if (!allowed.includes(k)) throw new Error(`spectrum ${group} 에 ${k} 는 없다`)
          if (!nil(curSpectrum[group]?.[k]?.score)) { preserved.push(`per.${group}.${k}(기존값 보존)`); continue }
          if (nil(val?.score) || blank(val?.reason_ko) || blank(val?.reason_en)) {
            preserved.push(`per.${group}.${k}(score·reason_ko·reason_en 중 결손)`); continue
          }
          const n = Number(val.score)
          const range = group === 'dispositions' ? [-50, 50] : [0, 100]
          if (!Number.isInteger(n) || n < range[0] || n > range[1]) {
            throw new Error(`spectrum ${group}.${k} score 범위 ${range.join('~')}: ${val.score}`)
          }
          // 여성 무력 보정 — 규칙은 shared의 FEMALE_MARTIAL_ADJUSTMENT_RULE이 정본이다.
          // 채점자는 성별과 무관한 추정 자로 raw 점수를 주고, 저장 직전 여기서 보정한다.
          // reason은 채점자의 근거 원문을 보존하고 점수만 바꾼다.
          const finalScore = c.profile.gender === false && group === 'abilities' && k === 'martial'
            ? femaleMartialAdjust(n)
            : n
          if (finalScore !== n) femaleAdjustCount++
          nextSpectrum[group] ??= {}
          nextSpectrum[group][k] = { score: finalScore, reason_ko: String(val.reason_ko), reason_en: String(val.reason_en) }
          spectrumTouched = true
        }
      }

      // ── dialogues: quote + 7키×3슬롯, 빈 슬롯만
      const curLines = (c.dialogue?.lines ?? {}) as Record<string, any>
      const curLinesEn = (c.dialogue?.lines_en ?? {}) as Record<string, any>
      const nextLines: Record<string, any> = JSON.parse(JSON.stringify(curLines))
      const nextLinesEn: Record<string, any> = JSON.parse(JSON.stringify(curLinesEn))
      let diaTouched = false
      const mergeLines = (target: Record<string, any>, cur: Record<string, any>, src: Record<string, any>, tag: string) => {
        for (const [k, v] of Object.entries(src)) {
          if (k === 'quote') {
            if (blank(v)) { preserved.push(`${tag}.quote(신규값 공란)`); continue }
            if (!blank(cur.quote)) { preserved.push(`${tag}.quote(기존값 보존)`); continue }
            target.quote = String(v); diaTouched = true; continue
          }
          if (!(DIALOGUE_KEYS as readonly string[]).includes(k)) throw new Error(`허용되지 않은 대사 키 ${k}`)
          if (!Array.isArray(v) || v.length !== 3) throw new Error(`${tag}.${k} 는 3개 배열이어야 한다`)
          const curArr = Array.isArray(cur[k]) ? cur[k] : []
          const arr = Array.isArray(target[k]) ? [...target[k]] : [...curArr]
          while (arr.length < 3) arr.push('')
          for (let i = 0; i < 3; i++) {
            if (!blank(curArr[i])) { preserved.push(`${tag}.${k}[${i}](기존값 보존)`); continue }
            if (blank(v[i])) { preserved.push(`${tag}.${k}[${i}](신규값 공란)`); continue }
            arr[i] = String(v[i]); diaTouched = true
          }
          target[k] = arr
        }
      }
      mergeLines(nextLines, curLines, patch.dialogues?.lines ?? {}, 'ko')
      mergeLines(nextLinesEn, curLinesEn, patch.dialogues?.lines_en ?? {}, 'en')

      if (Object.keys(profPayload).length) changes.push(`celebs(${Object.keys(profPayload).join(',')})`)
      if (Object.keys(infPayload).length) changes.push(`influence(${Object.keys(infPayload).join(',')})`)
      if (spectrumTouched) changes.push('spectrum')
      if (diaTouched) changes.push('dialogues')

      if (changes.length === 0) {
        skipped++
        log.push(`SKIPPED ${patch.slug} — 반영할 것 없음 (${preserved.length}개 보존)`)
        continue
      }

      if (!doWrite) {
        ok++
        const adjustNote = femaleAdjustCount > 0
          ? ` | 여성무력보정 ${femaleAdjustCount}건(martial→${nextSpectrum.abilities?.martial?.score})`
          : ''
        log.push(`DRY  ${patch.slug} ← ${changes.join(' ')} | 보존 ${preserved.length}${adjustNote}`)
        continue
      }

      // ── 쓰기
      if (Object.keys(profPayload).length) {
        const { error } = await db.from('celebs').update(profPayload)
          .eq('id', c.profile.id)
        if (error) throw new Error(`celebs UPDATE: ${error.message}`)
      }
      if (Object.keys(infPayload).length) {
        if (c.influence) {
          const { error } = await db.from('celeb_influence').update(infPayload).eq('celeb_id', c.profile.id)
          if (error) throw new Error(`celeb_influence UPDATE: ${error.message}`)
        } else {
          const { error } = await db.from('celeb_influence').insert({ celeb_id: c.profile.id, ...infPayload })
          if (error) throw new Error(`celeb_influence INSERT: ${error.message}`)
        }
      }
      if (spectrumTouched) {
        if (c.spectrum) {
          const { error } = await db.from('celeb_persona').update({ persona: nextSpectrum }).eq('celeb_id', c.profile.id)
          if (error) throw new Error(`celeb_persona UPDATE: ${error.message}`)
        } else {
          const { error } = await db.from('celeb_persona').insert({ celeb_id: c.profile.id, persona: nextSpectrum })
          if (error) throw new Error(`celeb_persona INSERT: ${error.message}`)
        }
      }
      if (diaTouched) {
        const body: Record<string, any> = {}
        if (Object.keys(nextLines).length) body.lines = nextLines
        if (Object.keys(nextLinesEn).length) body.lines_en = nextLinesEn
        if (c.dialogue) {
          const { error } = await db.from('celeb_dialogues').update(body).eq('celeb_id', c.profile.id)
          if (error) throw new Error(`celeb_dialogues UPDATE: ${error.message}`)
        } else {
          const { error } = await db.from('celeb_dialogues').insert({ celeb_id: c.profile.id, ...body })
          if (error) throw new Error(`celeb_dialogues INSERT: ${error.message}`)
        }
      }

      // ── 왕복 검증
      const after = await loadCtx(patch.slug)
      const bad: string[] = []
      for (const [k, v] of Object.entries(profPayload)) {
        const got = after.profile[k]
        if (typeof v === 'boolean') {
          if (got !== v) bad.push(`celebs.${k}`)
        } else if (String(got ?? '') !== String(v)) {
          bad.push(`celebs.${k}`)
        }
      }
      for (const [k, v] of Object.entries(infPayload)) {
        if (String(after.influence?.[k] ?? '') !== String(v)) bad.push(`influence.${k}`)
      }
      if (spectrumTouched) {
        for (const [g, entries] of Object.entries(nextSpectrum)) {
          if (typeof entries === 'string') {
            if (String(after.spectrum?.spectrum?.[g] ?? '') !== entries) bad.push(`spectrum.${g}`)
            continue
          }
          for (const [k, val] of Object.entries(entries as Record<string, any>)) {
            const got = after.spectrum?.spectrum?.[g]?.[k]
            if (!got || Number(got.score) !== Number(val.score) || got.reason_ko !== val.reason_ko) {
              bad.push(`spectrum.${g}.${k}`)
            }
          }
        }
      }
      if (diaTouched) {
        const gotKo = after.dialogue?.lines ?? {}
        const gotEn = after.dialogue?.lines_en ?? {}
        if (!sameJson(gotKo, nextLines)) bad.push('dialogues.lines')
        if (Object.keys(nextLinesEn).length && !sameJson(gotEn, nextLinesEn)) bad.push('dialogues.lines_en')
      }
      if (bad.length) throw new Error(`왕복 불일치 ${bad.join(',')}`)

      ok++
      log.push(`OK   ${patch.slug} ← ${changes.join(' ')} | 보존 ${preserved.length}`)
    } catch (e) {
      failed++
      log.push(`FAILED ${patch.slug} — ${(e as Error).message}`)
    }
  }

  return { ok, skipped, failed, log }
}

/**
 * 조사 결과 폴더를 일괄 반영한다. 에이전트가 만든 `<slug>.json` 들을 모아 한 번에 쏜다.
 *
 *   pnpm exec tsx scripts/celeb-fill.ts apply-dir --dir .tmp-celeb-fill/research
 *   pnpm exec tsx scripts/celeb-fill.ts apply-dir --dir .tmp-celeb-fill/research --apply
 *
 * 각 파일은 패치 1건(객체) 또는 여러 건(배열) 어느 쪽이든 된다.
 * --apply 성공분은 `<dir>/../research-applied/` 로 옮긴다. 실패분은 남겨 원인을 볼 수 있게 한다.
 */
async function applyDir() {
  const dir = argOf('dir', '.tmp-celeb-fill/research') as string
  const doWrite = process.argv.includes('--apply')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  if (files.length === 0) {
    console.log(`${dir} 에 조사 결과가 없다.`)
    return
  }

  const appliedDir = path.join(path.dirname(dir), 'research-applied')
  if (doWrite) await mkdir(appliedDir, { recursive: true })

  let ok = 0, skipped = 0, failed = 0
  for (const f of files) {
    const full = path.join(dir, f)
    let patches: Patch[]
    try {
      const parsed = JSON.parse(await readFile(full, 'utf8'))
      patches = Array.isArray(parsed) ? parsed : [parsed]
    } catch (e) {
      failed++
      console.log(`FAILED ${f} — JSON 파싱 실패: ${(e as Error).message}`)
      continue
    }
    const r = await applyPatches(patches, doWrite)
    ok += r.ok
    skipped += r.skipped
    failed += r.failed
    for (const l of r.log) console.log(`  [${f}] ${l}`)
    if (doWrite && r.failed === 0) {
      await rename(full, path.join(appliedDir, f))
      // 반영이 끝난 인물의 선점을 풀어 큐를 막지 않게 한다
      for (const p of patches) {
        try {
          await unlink(path.join(path.dirname(dir), 'claims', `${p.slug}.json`))
        } catch {
          /* 선점 없으면 무시 */
        }
      }
    }
  }

  console.log(`\n## 일괄 반영 결과 (${doWrite ? 'APPLY' : 'DRY-RUN'}) — 파일 ${files.length}개`)
  console.log(`- ${doWrite ? 'UPDATED' : 'WOULD UPDATE'}: ${ok}건`)
  console.log(`- SKIPPED: ${skipped}건`)
  console.log(`- FAILED: ${failed}건`)
}

const cmd = process.argv[2]
const run = cmd === 'dump' ? dump : cmd === 'apply' ? apply : cmd === 'apply-dir' ? applyDir : null
if (!run) {
  console.error('사용법: dump --slugs a,b | apply --file f.json [--apply] | apply-dir --dir d [--apply]')
  process.exit(1)
}
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
