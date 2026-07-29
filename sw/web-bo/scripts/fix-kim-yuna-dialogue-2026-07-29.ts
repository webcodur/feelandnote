/**
 * 김연아 웹·게임 대사의 잘못된 점프명 1건을 조건부 교정한다.
 *
 * 근거:
 * - 2010 밴쿠버 올림픽 공식 채점표에서 김연아 쇼트 첫 요소는 3Lz+3T다.
 * - 기존 ELE 발화 지시 `[focused, graceful]`은 사용자 소유값이므로 그대로 보존한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/fix-kim-yuna-dialogue-2026-07-29.ts
 *   pnpm exec tsx scripts/fix-kim-yuna-dialogue-2026-07-29.ts --apply
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebCache } from '../src/lib/revalidate-web'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CELEB_ID = '634fe9be-923f-4790-8ae9-6269e3899f21'
const OLD_LINE = '[focused, graceful] 지금이다, 트리플 럭셀 올라간다!'
const NEW_LINE = '[focused, graceful] 지금이다, 트리플 러츠-트리플 토루프 간다!'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function main() {
  const apply = process.argv.includes('--apply')

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, slug, nickname, birth_date, profession')
    .eq('id', CELEB_ID)
    .single()
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)
  if (profile.slug !== 'kim-yuna'
    || profile.nickname !== '김연아'
    || profile.birth_date !== '1990-09-05'
    || profile.profession !== 'athlete') {
    throw new Error(`동명이인 차단 실패: ${JSON.stringify(profile)}`)
  }

  const { data: dialogue, error: dialogueError } = await db
    .from('celeb_dialogues')
    .select('lines')
    .eq('celeb_id', CELEB_ID)
    .single()
  if (dialogueError) throw new Error(`대사 조회 실패: ${dialogueError.message}`)
  if (!isRecord(dialogue.lines)) throw new Error('김연아 KO 대사 객체 없음')

  const clash = dialogue.lines.clash_attack
  if (!Array.isArray(clash) || clash.length !== 3 || clash.some(line => typeof line !== 'string')) {
    throw new Error('김연아 clash_attack 구조가 예상과 다름')
  }

  if (clash[0] === NEW_LINE) {
    console.log('SKIP 김연아: 점프명 이미 교정됨')
    return
  }
  if (clash[0] !== OLD_LINE) {
    throw new Error(`김연아 기존 대사가 예상과 다름: ${JSON.stringify(clash[0])}`)
  }

  const nextLines = {
    ...dialogue.lines,
    clash_attack: [NEW_LINE, clash[1], clash[2]],
  }
  if (!apply) {
    console.log(`DRY-RUN 김연아: ${OLD_LINE} → ${NEW_LINE}`)
    return
  }

  const { error: updateError } = await db
    .from('celeb_dialogues')
    .update({ lines: nextLines })
    .eq('celeb_id', CELEB_ID)
  if (updateError) throw new Error(`김연아 대사 교정 실패: ${updateError.message}`)

  await revalidateWebCache([CACHE_TAGS.DIALOGUES])
  console.log('APPLIED 김연아: ELE 태그 보존, 트리플 럭셀 → 트리플 러츠-트리플 토루프')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
