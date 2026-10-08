/** 원작 키·실판본 출처·정확한 제목·저자가 모두 일치하는 중복 작품만 통합한다. 원장은 남기지 않는다. */
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {loadSeriesAuditCatalog} from './series-split-audit.mjs'
import {dbClient} from './lib/figure-work.mjs'
import {applyOne,captureDatabaseSnapshot} from './merge-works.mjs'
import {bookEditionTitleKey} from '../../../../packages/content-search/src/book-series.ts'
import {toIsbn13} from '../../../../packages/content-search/src/book-isbn.ts'
import {numberedTitle} from './lib/series-audit.mjs'

const key = value => bookEditionTitleKey(String(value??'').normalize('NFKD').replace(/\p{M}/gu,''))
const separateText = /\b(?:readers?|level\s*\d|graded|abridged|retellings?|adaptations?|selections?|selected|anthology|collected|collection|complete works|study|guides?|commentary|summary|summaries|analysis|outlines?|highlights?|excerpts?|omnibus|stories|poems|poetry|bible|koran|quran|dictionary)\b/iu
function boundEdition(row) {
  if(row.locale!=='en'||!toIsbn13(row.isbn??'')||row.sources?.primary!=='openlibrary'||!/^\/works\/OL\d+W$/u.test(row.sources.workKey??''))return false
  if(!/[a-z]/iu.test(row.creator??'')||/[가-힣]/u.test(row.creator??'')||!row.title?.trim())return false
  return [row.sources.title,row.sources.isbn].some(url=>{
    try { const parsed=new URL(url);return parsed.hostname==='openlibrary.org'&&/^\/books\/OL\d+M(?:\/|$)/u.test(parsed.pathname) }catch{return false}
  })
}
const fingerprint = row => `${row.sources.workKey}|${key(row.title)}|${key(row.creator)}`
const plainEdition = row => !separateText.test(`${row.title} ${row.text_scope??''}`)&&!numberedTitle(row.title)
  &&(!row.edition_kind||row.edition_kind==='full')&&(!row.text_scope||row.text_scope==='complete')

export function confirmedEditionDuplicatePairs(catalog) {
  const roots=new Map(catalog.contents.map(row=>[row.id,row])),editions=new Map(),groups=new Map()
  for(const row of catalog.editions){const rows=editions.get(row.content_id)??[];rows.push(row);editions.set(row.content_id,rows)
    if(boundEdition(row)&&plainEdition(row)){const f=fingerprint(row),ids=groups.get(f)??new Set();ids.add(row.content_id);groups.set(f,ids)}
  }
  const pairs=[],used=new Set()
  for(const [f,ids] of groups){if(ids.size<2)continue
    const ranked=[...ids].sort((a,b)=>{
      const score=id=>{const root=roots.get(id);return (root?.figureBook?.source!=='thin-en'?100000:0)+Object.values(root?.referenceCounts??{}).reduce((a,b)=>a+Number(b),0)}
      return score(b)-score(a)||a.localeCompare(b)
    }),keep=ranked[0],keepRoot=roots.get(keep),workKey=f.split('|')[0]
    const keepKeys=new Set((editions.get(keep)??[]).filter(boundEdition).map(row=>row.sources.workKey))
    if(keepKeys.size!==1||!keepKeys.has(workKey))continue
    const declaredKey=keepRoot?.figureBook?.openLibraryWork??keepRoot?.metadata?.workKey
    if(declaredKey&&declaredKey!==workKey)continue
    for(const drop of ranked.slice(1)){const root=roots.get(drop),rows=editions.get(drop)??[]
      if(used.has(drop)||used.has(keep)||root?.figureBook?.source!=='thin-en'||!rows.length
        ||rows.some(row=>!boundEdition(row)||!plainEdition(row)||fingerprint(row)!==f||row.sources?.edition_work_evidence?.length||row.sources?.work_attribution))continue
      used.add(drop);pairs.push({keep,drop,workKey:f.split('|')[0],title:rows[0].title})
    }
  }
  return pairs
}

export async function main(args=process.argv.slice(2)) {
  if(args.some(arg=>arg!=='--apply'))throw Error('Usage: edition-work-dedup.mjs [--apply]')
  const pairs=confirmedEditionDuplicatePairs(loadSeriesAuditCatalog())
  console.log(JSON.stringify({confirmedDuplicatePairs:pairs.length,sample:pairs.slice(0,8)}))
  if(!args.includes('--apply'))return
  const db=dbClient(),counts={planned:pairs.length,merged:0,skipped:0},reasons={}
  for(const pair of pairs){const result=await applyOne(db,pair,{capture:captureDatabaseSnapshot})
    if(result.completed)counts.merged++
    else{counts.skipped++;reasons[result.skip]=(reasons[result.skip]??0)+1}
    if((counts.merged+counts.skipped)%10===0)console.log(JSON.stringify({dedupProgress:counts}))
  }
  console.log(JSON.stringify({dedupComplete:counts,skipReasons:reasons}))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1})
