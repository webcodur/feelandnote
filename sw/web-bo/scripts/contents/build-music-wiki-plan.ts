/** music-wiki 수집 결과 → ReviewedMediaIntroduction 계획.
 *  우선순위: ko 위키(ko provider) > en 위키(en provider) > Last.fm(en provider).
 *  ko 행은 ko 위키 직접 명중만 provider로, 나머지는 번역 큐(music-wiki/translate-queue.json)로 뺀다. */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DIR = resolve('../../data/celeb/book-introductions/music-wiki')
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'")
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&ndash;|&mdash;/g, '–').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
const cutSentence = (s: string) => {
  if (s.length <= 1500) return s
  const m = s.slice(0, 1500).match(/.*[.!?…](?=\s|$)/s)
  return (m ? m[0] : s.slice(0, 1500)).trim()
}

async function main() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL, secret = process.env.DB_SECRET_KEY
  if (!url || !secret || new URL(url).hostname !== 'db.feelandnote.com') throw new Error('env')
  const db = createClient(url, secret, { auth: { persistSession: false } })
  const targets = JSON.parse(readFileSync(resolve(DIR, 'targets.json'), 'utf8'))
  const results = JSON.parse(readFileSync(resolve(DIR, 'results.json'), 'utf8'))

  const plan: any[] = []
  const translateQueue: any[] = []
  const held: any[] = []
  for (const t of targets) {
    const r = results[t.content.id]
    if (!r) continue
    const { data: rows, error } = await db.from('content_locales').select('*').eq('content_id', t.content.id)
    if (error) throw error
    const en = rows.find(x => x.locale === 'en'), ko = rows.find(x => x.locale === 'ko')
    const enEmpty = !(en?.description?.trim()), koEmpty = !(ko?.description?.trim())
    if (!enEmpty && !koEmpty) continue

    const isDisambig = (w: any) => !w || /동음이의/.test(w.title || '') || /다음과 같은 뜻이 있다/.test(w.extract || '') || /may refer to/i.test(w.extract || '')
    const enSource = isDisambig(r.wiki?.en) ? (r.lastfm ? { url: r.lastfm.url, extract: r.lastfm.full ?? r.lastfm.summary, title: r.lastfm.matchedName } : null)
      : (r.wiki?.en ?? (r.lastfm ? { url: r.lastfm.url, extract: r.lastfm.full ?? r.lastfm.summary, title: r.lastfm.matchedName } : null))
    const koSource = isDisambig(r.wiki?.ko) ? null : r.wiki?.ko
    if (!enSource && !koSource) { if (r.hold) held.push({ id: t.content.id, hold: r.hold }); continue }

    const artist = t.itunes?.artistName || t.creator || ''
    const name = t.itunes?.trackName || t.itunes?.collectionName || t.title || ''
    const via = r.wiki?.en ? 'Wikipedia' : 'Last.fm'
    const evidence = [{ url: enSource?.url || koSource!.url, note: `iTunes ${r.kind} "${name}" by "${artist}" matched ${via} page "${enSource?.title || koSource!.title}"; artist+title verified in extract` }]

    if (enEmpty && enSource) {
      const desc = cutSentence(stripHtml(enSource.extract))
      const brackets = (desc.match(/\[[^\]]*\]/g) || []).join('').length
      if (desc.length >= 80 && brackets / desc.length < 0.3) plan.push({ content: t.content, target: en, description: desc, sourceUrl: enSource.url, sourceLocale: 'en', method: 'provider', identityEvidence: evidence })
    }
    if (koEmpty) {
      if (koSource) {
        const desc = cutSentence(stripHtml(koSource.extract))
        if (desc.length >= 80) plan.push({ content: t.content, target: ko, description: desc, sourceUrl: koSource.url, sourceLocale: 'ko', method: 'provider', identityEvidence: [{ url: koSource.url, note: `iTunes ${r.kind} "${name}" matched ko.wikipedia "${koSource.title}"` }] })
      } else if (enSource) {
        translateQueue.push({ content: t.content, target: ko, sourceText: cutSentence(stripHtml(enSource.extract)), sourceUrl: enSource.url, sourceLocale: 'en', identityEvidence: evidence })
      }
    }
  }
  writeFileSync(resolve(DIR, 'plan.json'), JSON.stringify(plan, null, 2))
  writeFileSync(resolve(DIR, 'translate-queue.json'), JSON.stringify(translateQueue, null, 2))
  writeFileSync(resolve(DIR, 'held.json'), JSON.stringify(held, null, 2))
  const byLocale: Record<string, number> = {}
  for (const p of plan) byLocale[`${p.target.locale}:${p.method}`] = (byLocale[`${p.target.locale}:${p.method}`] || 0) + 1
  console.log(JSON.stringify({ plan: plan.length, byLocale, translateQueue: translateQueue.length, held: held.length }))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
