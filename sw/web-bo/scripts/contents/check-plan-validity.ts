/** Validate a ReviewedMediaIntroduction[] plan file; list entries the contract rejects. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prepareMediaIntroduction } from './media-introduction-contract'

const file = resolve(process.argv[2])
const plans = JSON.parse(readFileSync(file, 'utf8'))
const bad: any[] = []
for (const p of plans) {
  try { prepareMediaIntroduction(p) }
  catch (e) { bad.push({ id: p.content?.id, locale: p.target?.locale, title: p.target?.title, err: String(e instanceof Error ? e.message : e), desc: String(p.description ?? '').slice(0, 160), url: p.sourceUrl }) }
}
console.log(JSON.stringify({ total: plans.length, ok: plans.length - bad.length, bad }, null, 1))
