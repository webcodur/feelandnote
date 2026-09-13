/**
 * 건국신화 인물의 전승 배정을 옮긴다. 기본은 dry-run.
 *
 * 실행:
 *   pnpm exec tsx scripts/founding-myth/fix-tradition.ts --slug naylamp --to myth-americas-... [--apply]
 *   pnpm exec tsx scripts/founding-myth/fix-tradition.ts --list-tags
 */
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const arg = (f: string) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null }
const APPLY = process.argv.includes('--apply')

async function main() {
  const { data: tags, error } = await db.from('celeb_tags').select('id,name,slug,atlas_published').order('slug')
  if (error) throw new Error(error.message)

  if (process.argv.includes('--list-tags')) {
    for (const t of tags!) console.log(`${t.slug}\t${t.name}\t공개:${t.atlas_published}`)
    return
  }

  const slug = arg('--slug')
  const to = arg('--to')
  if (!slug || !to) throw new Error('--slug 과 --to 가 필요하다')

  const { data: celeb } = await db.from('celebs').select('id,nickname').eq('slug', slug).single()
  if (!celeb) throw new Error(`인물 없음: ${slug}`)
  const target = tags!.find((t) => t.slug === to)
  if (!target) throw new Error(`전승 없음: ${to}`)

  const { data: cur } = await db.from('celeb_tag_assignments').select('tag_id,hidden,sort_order').eq('celeb_id', celeb.id)
  const from = cur?.[0]
  const fromTag = tags!.find((t) => t.id === from?.tag_id)
  console.log(`${celeb.nickname}: ${fromTag?.name ?? '(배정없음)'} → ${target.name}`)

  if (!APPLY) { console.log('DRY-RUN. --apply 로 반영한다.'); return }

  if (from) {
    const { error: e1 } = await db.from('celeb_tag_assignments').delete().eq('celeb_id', celeb.id).eq('tag_id', from.tag_id)
    if (e1) throw new Error(`기존 배정 삭제 실패: ${e1.message}`)
  }
  const { error: e2 } = await db.from('celeb_tag_assignments').insert({
    celeb_id: celeb.id, tag_id: target.id, hidden: from?.hidden ?? true, sort_order: from?.sort_order ?? 999,
  })
  if (e2) throw new Error(`새 배정 실패: ${e2.message}`)

  const { data: after } = await db.from('celeb_tag_assignments').select('tag_id,hidden').eq('celeb_id', celeb.id)
  const afterTag = tags!.find((t) => t.id === after?.[0]?.tag_id)
  console.log(`반영 확인: ${afterTag?.name} (hidden=${after?.[0]?.hidden})`)
}
main()
