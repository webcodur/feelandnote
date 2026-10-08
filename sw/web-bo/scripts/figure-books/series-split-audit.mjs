/**
 * 전체 BOOK에서 작품·시리즈 분리 후보를 읽기 전용으로 추적한다.
 * node --env-file=.env --import tsx scripts/figure-books/series-split-audit.mjs
 * 후보는 ISBN·원제·목차·출처를 확인한 뒤 별도로 수정한다.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { detectSplitSeries, detectEditionAttributionRisks } from './lib/series-audit.mjs'
import { seriesVolumeInfo } from '../../../../packages/content-search/src/book-series.ts'

export function detectSeriesVolumeClutter(catalog) {
  const works = new Map(catalog.contents.map(work => [work.id, work]))
  const groups = new Map()
  for (const edition of catalog.editions) {
    const series = works.get(edition.content_id)?.figureBook?.series
    const info = seriesVolumeInfo(series, { ...edition, editionKind: edition.edition_kind, textScope: edition.text_scope,
      translator: Array.isArray(edition.sources?.translators) ? edition.sources.translators.join(', ') : null })
    if (!info) continue
    const key = edition.content_id + '|' + info.family
    const group = groups.get(key) ?? { contentId: edition.content_id,
      title: series?.title ?? works.get(edition.content_id)?.figureBook?.workTitle ?? edition.title, editions: [] }
    group.editions.push({ editionId: edition.id, isbn: edition.isbn, title: edition.title, number: info.number })
    groups.set(key, group)
  }
  return [...groups.values()].filter(group => group.editions.length > 1 || !group.editions.some(edition => edition.number === 1))
    .map(group => ({ ...group, missingStart: !group.editions.some(edition => edition.number === 1) }))
}

const SSH_HOST = 'ubuntu@152.67.198.197'
const SSH_KEY = 'C:/Users/webco/.ssh/feelandnote_oracle'

// 같은 시점의 작품·실제 판본·관계를 메모리에 읽는다. 원본 DB의 로컬 사본은 만들지 않는다.
export const SERIES_AUDIT_SQL = `
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
WITH books AS MATERIALIZED (SELECT * FROM contents WHERE type='BOOK'),
refs AS (
  SELECT content_id, 'member_contents' AS kind, count(*) AS n FROM member_contents GROUP BY content_id
  UNION ALL SELECT content_id, 'celeb_contents', count(*) FROM celeb_contents GROUP BY content_id
  UNION ALL SELECT content_id, 'curated_list_items', count(*) FROM curated_list_items GROUP BY content_id
  UNION ALL SELECT content_id, 'records', count(*) FROM records GROUP BY content_id
  UNION ALL SELECT content_id, 'notes', count(*) FROM notes GROUP BY content_id
  UNION ALL SELECT e.content_id, 'products', count(*) FROM figure_book_products p JOIN figure_book_editions e ON e.id=p.edition_id GROUP BY e.content_id
), ref_counts AS (SELECT content_id, jsonb_object_agg(kind,n) AS counts FROM refs GROUP BY content_id)
SELECT jsonb_build_object(
  'observedAt', transaction_timestamp(),
  'contents', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'external_id',b.external_id,
    'figureBook', b.metadata->'figureBook', 'metadata', b.metadata,
    'catalog',f.content_id IS NOT NULL,'referenceCounts',coalesce(r.counts,'{}'::jsonb)) ORDER BY b.id),'[]'::jsonb)
    FROM books b LEFT JOIN figure_book_contents f ON f.content_id=b.id LEFT JOIN ref_counts r ON r.content_id=b.id),
  'locales', (SELECT coalesce(jsonb_agg(jsonb_build_object('content_id',l.content_id,'locale',l.locale,'title',l.title,'creator',l.creator,
    'publisher',l.publisher,'isbn',l.isbn,'sources',jsonb_build_object('primary',l.sources->'primary','title',l.sources->'title','isbn',l.sources->'isbn','creator',l.sources->'creator','workKey',l.sources->'workKey','series_source_url',l.sources->'series_source_url')) ORDER BY l.content_id,l.locale),'[]'::jsonb)
    FROM content_locales l JOIN books b ON b.id=l.content_id),
  'editions', (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]'::jsonb) FROM figure_book_editions e JOIN books b ON b.id=e.content_id),
  'products', (SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) FROM figure_book_products p JOIN figure_book_editions e ON e.id=p.edition_id JOIN books b ON b.id=e.content_id),
  'relations', (SELECT coalesce(jsonb_agg(jsonb_build_object('content_id',r.content_id,'celeb_id',r.celeb_id,'relation_type',r.relation_type)),'[]'::jsonb)
    FROM figure_book_characters r JOIN books b ON b.id=r.content_id),
  'readings', (SELECT coalesce(jsonb_agg(jsonb_build_object('content_id',r.content_id,'celeb_id',r.celeb_id)),'[]'::jsonb)
    FROM celeb_contents r JOIN books b ON b.id=r.content_id),
  'people', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'nickname',nickname,'publication_status',publication_status)),'[]'::jsonb) FROM celebs)
);
COMMIT;`

export function loadSeriesAuditCatalog() {
  // 고정 ASCII SQL을 SSH로 전달해 PowerShell의 한글 인코딩 영향을 피한다.
  const command = "docker exec feelandnote-db psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d postgres -c '" + SERIES_AUDIT_SQL.replaceAll("'", "'\\''") + "'"
  const result = spawnSync('ssh', ['-i',SSH_KEY,'-o','BatchMode=yes','-o','ConnectTimeout=15',SSH_HOST,command],
    { encoding:'utf8', windowsHide:true, timeout:80000, maxBuffer:128*1024*1024 })
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr?.trim() ?? 'DB read failed')
  const data = JSON.parse(result.stdout)
  for (const key of ['contents','locales','editions','relations','readings','people']) if (!Array.isArray(data[key])) throw new Error('Missing DB result: '+key)
  return data
}

export function parseSeriesAuditArgs(args) {
  let out = null, all = false
  const usage = 'Usage: series-split-audit.mjs [--all] [--out <new-file.json>]'
  for (let index=0; index<args.length; index++) {
    if (args[index] === '--all' && !all) all = true
    else if (args[index] === '--out' && !out && args[index+1] && !args[index+1].startsWith('--')) out = resolve(args[++index])
    else throw new Error(usage)
  }
  return {out, all}
}

export function auditCurrentBooks() {
  const started = performance.now(), catalog = loadSeriesAuditCatalog(), loaded = performance.now()
  const detected = detectSplitSeries(catalog)
  return { observedAt:catalog.observedAt, counts:Object.fromEntries(['contents','locales','editions','relations','readings'].map(key=>[key,catalog[key].length])),
    elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(2)), detectionSeconds:Number(((performance.now()-loaded)/1000).toFixed(2)), ...detected,
    editionAttributionRisks:detectEditionAttributionRisks(catalog), seriesVolumeClutter:detectSeriesVolumeClutter(catalog) }
}

export function main() {
  const { out, all } = parseSeriesAuditArgs(process.argv.slice(2))
  if (out && existsSync(out)) throw new Error('Candidate file already exists: '+out)
  const report = auditCurrentBooks()
  if (out) { writeFileSync(out,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx'}); console.log('WROTE '+out) }
  console.log(JSON.stringify({observedAt:report.observedAt,counts:report.counts,elapsedSeconds:report.elapsedSeconds,candidates:report.candidates.length,editionAttributionRisks:report.editionAttributionRisks.length,seriesVolumeClutter:report.seriesVolumeClutter.length,missingSeriesStarts:report.seriesVolumeClutter.filter(group => group.missingStart).length,bySignal:report.bySignal,diagnostics:report.diagnostics}))
  for (const candidate of (all ? report.candidates : report.candidates.slice(0,10))) console.log(JSON.stringify({contentIds:candidate.contentIds,signals:candidate.signals,workCount:candidate.contentIds.length,
    titles:candidate.evidence[0].titles.slice(0,5),people:candidate.sharedPeople.slice(0,5).map(person=>person.nickname),warnings:candidate.warnings,...(all?{works:candidate.works}: {})}))
  if (all) for (const risk of report.editionAttributionRisks) console.log(JSON.stringify({editionAttributionRisk:risk}))
  if (all) for (const group of report.seriesVolumeClutter) console.log(JSON.stringify({seriesVolumeClutter:group}))
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main()
