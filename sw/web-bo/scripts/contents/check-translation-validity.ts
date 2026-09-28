/** Validate a ReviewedIntroductionTranslation[] plan file per item; list contract rejections.
 * node --env-file=.env --import tsx scripts/contents/check-translation-validity.ts FILE <enko|koen>
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { planIntroductionTranslation, planIntroductionTranslationKoEn } from './book-introduction-translation-contract'

const plans = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'))
const fn = process.argv[3] === 'koen' ? planIntroductionTranslationKoEn : planIntroductionTranslation
const bad: any[] = []
for (const p of plans) {
  try { fn(p) }
  catch (e) { bad.push({ id: p.target?.content_id, title: p.target?.title, err: String(e instanceof Error ? e.message : e), desc: String(p.translation ?? '').slice(0, 140), url: p.sourceUrl }) }
}
console.log(JSON.stringify({ total: plans.length, ok: plans.length - bad.length, bad }, null, 1))
