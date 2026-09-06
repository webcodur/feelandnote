/**
 * 중복 작품 통합 — 같은 저작으로 갈린 작품을 하나로 합친다. 관계·판본·상품을 keep으로 옮기고 drop을 지운다.
 * 되돌리기 어려우므로 기본은 dry-run이며 통합 표를 먼저 보여준다.
 * 이용 기록(record_count·member_count)이 있는 작품은 drop으로 삼지 않는다.
 *
 * node --env-file=.env scripts/figure-books/merge-works.mjs --in ../../data/celeb/figure-books/merge-candidates.json
 * node --env-file=.env scripts/figure-books/merge-works.mjs --in <같은 파일> --apply
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { argumentValue, bareIsbn, dbClient, hasFlag } from './lib/figure-work.mjs'

const apply = hasFlag('apply')

async function planOne(db, pair) {
  const [keepC, dropC] = await Promise.all([
    db.from('contents').select('id,record_count,member_count,celeb_count').eq('id', pair.keep).maybeSingle(),
    db.from('contents').select('id,record_count,member_count,celeb_count').eq('id', pair.drop).maybeSingle(),
  ])
  if (!keepC.data || !dropC.data) return { ...pair, skip: 'missing-content' }
  if ((dropC.data.record_count ?? 0) > 0 || (dropC.data.member_count ?? 0) > 0) return { ...pair, skip: 'drop-has-user-activity' }

  const [keepRel, dropRel, keepEd, dropEd, keepLoc, dropLoc] = await Promise.all([
    db.from('figure_book_characters').select('celeb_id,relation_type,sort_order,description,description_en').eq('content_id', pair.keep),
    db.from('figure_book_characters').select('celeb_id,relation_type,sort_order,description,description_en').eq('content_id', pair.drop),
    db.from('figure_book_editions').select('id,locale,isbn').eq('content_id', pair.keep),
    db.from('figure_book_editions').select('id,locale,isbn').eq('content_id', pair.drop),
    db.from('content_locales').select('locale,title').eq('content_id', pair.keep),
    db.from('content_locales').select('locale,title').eq('content_id', pair.drop),
  ])
  const titleOf = (rows) => (rows.find((row) => row.locale === 'ko') ?? rows[0])?.title ?? '(제목 없음)'
  const keepCelebs = new Set((keepRel.data ?? []).map((row) => row.celeb_id))
  const keepEdKeys = new Map((keepEd.data ?? []).map((row) => [`${row.locale}:${bareIsbn(row.isbn)}`, row.id]))
  const keepLocales = new Set((keepLoc.data ?? []).map((row) => row.locale))

  return {
    ...pair,
    keepTitle: titleOf(keepLoc.data ?? []), dropTitle: titleOf(dropLoc.data ?? []),
    relations: { move: (dropRel.data ?? []).filter((row) => !keepCelebs.has(row.celeb_id)).length, dropDuplicate: (dropRel.data ?? []).filter((row) => keepCelebs.has(row.celeb_id)).length },
    editions: (dropEd.data ?? []).map((row) => ({ id: row.id, locale: row.locale, isbn: bareIsbn(row.isbn), collidesWith: keepEdKeys.get(`${row.locale}:${bareIsbn(row.isbn)}`) ?? null })),
    locales: { move: (dropLoc.data ?? []).filter((row) => !keepLocales.has(row.locale)).map((row) => row.locale), drop: (dropLoc.data ?? []).filter((row) => keepLocales.has(row.locale)).map((row) => row.locale) },
  }
}

async function applyOne(db, plan) {
  const must = async (label, promise) => { const { error } = await promise; if (error) throw new Error(`${label}: ${error.message}`) }
  // 1) 관계 — keep에 같은 인물이 없으면 옮기고, 있으면 drop 쪽을 지운다.
  const { data: dropRel } = await db.from('figure_book_characters').select('celeb_id').eq('content_id', plan.drop)
  const { data: keepRel } = await db.from('figure_book_characters').select('celeb_id').eq('content_id', plan.keep)
  const keepCelebs = new Set((keepRel ?? []).map((row) => row.celeb_id))
  for (const row of dropRel ?? []) {
    if (keepCelebs.has(row.celeb_id)) await must('관계 삭제', db.from('figure_book_characters').delete().eq('content_id', plan.drop).eq('celeb_id', row.celeb_id))
    else await must('관계 이동', db.from('figure_book_characters').update({ content_id: plan.keep }).eq('content_id', plan.drop).eq('celeb_id', row.celeb_id))
  }
  // 2) 판본 — 충돌하면 상품만 keep 판본으로 넘기고 drop 판본을 지운다.
  for (const edition of plan.editions) {
    if (edition.collidesWith) {
      await must('상품 이동', db.from('figure_book_products').update({ edition_id: edition.collidesWith }).eq('edition_id', edition.id))
      await must('판본 삭제', db.from('figure_book_editions').delete().eq('id', edition.id))
    } else {
      await must('판본 이동', db.from('figure_book_editions').update({ content_id: plan.keep }).eq('id', edition.id))
    }
  }
  // 3) locale — keep에 없는 언어만 옮긴다.
  for (const locale of plan.locales.move) await must('locale 이동', db.from('content_locales').update({ content_id: plan.keep }).eq('content_id', plan.drop).eq('locale', locale))
  await must('locale 삭제', db.from('content_locales').delete().eq('content_id', plan.drop))
  // 4) 감상 관계가 있으면 옮긴다. 같은 인물이 이미 keep에 있으면 drop 쪽을 지운다.
  const { data: dropCc } = await db.from('celeb_contents').select('celeb_id').eq('content_id', plan.drop)
  if ((dropCc ?? []).length > 0) {
    const { data: keepCc } = await db.from('celeb_contents').select('celeb_id').eq('content_id', plan.keep)
    const keepSet = new Set((keepCc ?? []).map((row) => row.celeb_id))
    for (const row of dropCc) {
      if (keepSet.has(row.celeb_id)) await must('감상 삭제', db.from('celeb_contents').delete().eq('content_id', plan.drop).eq('celeb_id', row.celeb_id))
      else await must('감상 이동', db.from('celeb_contents').update({ content_id: plan.keep }).eq('content_id', plan.drop).eq('celeb_id', row.celeb_id))
    }
  }
  await must('작품 표시 삭제', db.from('figure_book_contents').delete().eq('content_id', plan.drop))
  await must('작품 삭제', db.from('contents').delete().eq('id', plan.drop))
}

async function main() {
  const inPath = resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/merge-candidates.json'))
  const db = dbClient()
  const parsed = JSON.parse(readFileSync(inPath, 'utf8'))
  const merges = Array.isArray(parsed) ? parsed : parsed.merges
  console.log(`통합 후보 ${merges.length}쌍 (${apply ? 'apply' : 'dry-run'})`)

  const plans = []
  for (const pair of merges) plans.push(await planOne(db, pair))
  for (const plan of plans) {
    if (plan.skip) { console.log(`  건너뜀 ${plan.drop.slice(0, 8)} → ${plan.keep.slice(0, 8)} : ${plan.skip}`); continue }
    console.log(`  ${plan.drop.slice(0, 8)} → ${plan.keep.slice(0, 8)} | 관계 이동 ${plan.relations.move}·중복 ${plan.relations.dropDuplicate} | 판본 ${plan.editions.length}(충돌 ${plan.editions.filter((e) => e.collidesWith).length}) | locale 이동 ${plan.locales.move.join(',') || '-'} | ${plan.identity}`)
    console.log(`      버림 「${plan.dropTitle}」 → 남김 「${plan.keepTitle}」`)
  }
  if (!apply) { console.log('\ndry-run이다. 반영하려면 --apply를 붙인다.'); return }

  let done = 0
  for (const plan of plans) {
    if (plan.skip) continue
    try { await applyOne(db, plan); done += 1 } catch (error) { console.log(`  실패 ${plan.drop.slice(0, 8)}: ${error.message}`) }
  }
  console.log(`\n통합 완료 ${done} / ${plans.filter((plan) => !plan.skip).length}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
