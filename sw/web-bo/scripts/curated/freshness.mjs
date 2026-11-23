// 기관 목록 최신 확인 작업표를 만든다(읽기만). 확인 방법은 lib/freshness.mjs, 절차는 service-03-curated-lists.md 「6. 최신 확인」.
// node --env-file=.env scripts/curated/freshness.mjs [--out=<절대경로 JSON>]
// 상태: stale(기대 연도 항목 없음 → 출처에서 새 회차 확인·추가) / due(발표 달 — 출처 확인) / ok / source(edition·living — 출처와 대조) / alive(fixed·ended — 출처 생존만)
import fs from 'node:fs';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {FRESHNESS, FRESHNESS_KINDS, expectedLatest} from './lib/freshness.mjs';

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY);
const q = async p => { const {data, error} = await p; if (error) throw Error(JSON.stringify(error)); return data; };
const lists = await q(db.from('curated_lists').select('id,slug,title,content_type,is_annual,source_url,curators(slug)'));
const keys = new Set(lists.map(l => `${l.curators.slug}/${l.slug}`));
const missing = [...keys].filter(k => !FRESHNESS[k]), extra = Object.keys(FRESHNESS).filter(k => !keys.has(k));
const badKind = Object.entries(FRESHNESS).filter(([, v]) => !FRESHNESS_KINDS.includes(v.kind)).map(([k]) => k);
if (missing.length || extra.length || badKind.length) throw Error(`lib/freshness.mjs가 DB 목록과 다르다. 빠짐: ${missing.join(', ') || '없음'} / 남음: ${extra.join(', ') || '없음'} / 종류 오류: ${badKind.join(', ') || '없음'}`);

const rows = [];
for (const l of lists) {
  const key = `${l.curators.slug}/${l.slug}`, f = FRESHNESS[key];
  if ((f.kind === 'annual') !== !!l.is_annual && f.kind !== 'ended') throw Error(`is_annual과 확인 방법이 어긋난다: ${key}`);
  const items = await q(db.from('curated_list_items').select('year').eq('list_id', l.id).eq('hidden', false));
  const last = Math.max(0, ...items.map(i => i.year ?? 0)) || null;
  let status = f.kind === 'fixed' || f.kind === 'ended' ? 'alive' : f.kind === 'annual' ? 'ok' : 'source', expected = null;
  if (f.kind === 'annual') { const e = expectedLatest(f); expected = e.year; if (!last || last < e.year) status = 'stale'; else if (e.due && last < e.dueYear) status = 'due'; }
  rows.push({key, title: l.title, type: l.content_type, kind: f.kind, status, last, expected, items: items.length, source: l.source_url, note: f.note ?? null});
}
const order = {stale: 0, due: 1, source: 2, ok: 3, alive: 4};
rows.sort((a, b) => order[a.status] - order[b.status] || a.key.localeCompare(b.key));
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6);
if (out) fs.writeFileSync(out, JSON.stringify({generatedAt: new Date().toISOString(), rows}, null, 2));
const count = {}; for (const r of rows) count[r.status] = (count[r.status] ?? 0) + 1;
console.log(JSON.stringify(count));
for (const r of rows.filter(r => r.status !== 'ok' && r.status !== 'alive')) console.log([r.status.padEnd(6), r.key, r.last ?? '', r.expected ?? '', r.source].join(' | '));
