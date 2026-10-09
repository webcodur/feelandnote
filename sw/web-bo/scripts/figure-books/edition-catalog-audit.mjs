/** 전 BOOK을 조회하고 영어 ISBN 메타를 검사한다. 로컬 원장·공급자 캐시를 만들지 않는다. */
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {loadSeriesAuditCatalog} from './series-split-audit.mjs'
import {detectSplitSeries,detectEditionAttributionRisks} from './lib/series-audit.mjs'
import {auditEnglishProviders} from './lib/edition-provider-audit.mjs'
import {auditKakaoEditions} from './lib/kakao-edition-audit.mjs'
import {foreignKoEditionCandidates,confirmedEnglishImports} from './lib/foreign-edition-audit.mjs'
import {applyCatalogRowCorrections} from './lib/catalog-row-corrections.mjs'
import {dbClient} from './lib/figure-work.mjs'
import {executeTemporaryMergeSql} from './merge-works.mjs'
import {sqlLiteral} from './lib/merge-work-sql.mjs'
import {inspectEditionCatalog} from './lib/edition-catalog-checks.mjs'
import {isDeepStrictEqual} from 'node:util'
import {bookEditionTitleKey} from '../../../../packages/content-search/src/book-series.ts'
import {toIsbn13} from '../../../../packages/content-search/src/book-isbn.ts'

export async function applyProviderMetadata(differences,db=dbClient(),locale='en') {
  if(!['en','ko'].includes(locale))throw Error('Unsupported metadata locale')
  const eligible=differences.filter(diff=>diff.bound),counts={planned:eligible.length,editions:0,locales:0}
  for(let start=0;start<eligible.length;start+=100){
    const batch=eligible.slice(start,start+100),saved=[]
    for(const table of ['figure_book_editions','content_locales']){
      const diffs=batch.filter(diff=>diff.table===table);if(!diffs.length)continue
      let query=db.from(table).select('*')
      query=table==='figure_book_editions'?query.in('id',diffs.map(diff=>diff.id)):query.in('content_id',diffs.map(diff=>diff.contentId)).eq('locale',locale)
      const {data,error}=await query;if(error)throw Error(error.message)
      for(const diff of diffs){
        const before=data.find(row=>table==='figure_book_editions'?row.id===diff.id:row.content_id===diff.contentId&&row.locale===locale)
        if(!before||before.isbn!==diff.isbn||before.content_id!==diff.contentId||before.locale!==locale)throw Error('Provider patch owner/ISBN changed')
        if(Object.entries(diff.expected).some(([field,value])=>before[field]!==value))throw Error('Provider metadata was edited during research; refresh audit before writing')
        if(before.sources?.edition_work_evidence?.length||before.sources?.work_attribution){counts.protected=(counts.protected??0)+1;continue}
        const sources={...(before.sources??{}),...(diff.official.workKeys?{workKey:diff.official.workKeys.length===1?diff.official.workKeys[0]:null}:{})}
        for(const field of Object.keys(diff.fields))sources[field]=diff.official.sourceUrl
        saved.push({table,before,patch:{...diff.fields,sources}})
      }
    }
    const body=[]
    for(const table of ['figure_book_editions','content_locales']){
      const rows=saved.filter(row=>row.table===table);if(!rows.length)continue
      const payload=sqlLiteral(JSON.stringify(rows.map(({before,patch})=>({before,patch}))))
      body.push(`UPDATE public.${table} t SET title=coalesce(x.patch->>'title',t.title),creator=coalesce(x.patch->>'creator',t.creator),publisher=coalesce(x.patch->>'publisher',t.publisher),sources=x.patch->'sources'
FROM jsonb_to_recordset(${payload}::jsonb) AS x(before jsonb,patch jsonb) WHERE to_jsonb(t)=x.before;
GET DIAGNOSTICS changed=ROW_COUNT;IF changed<>${rows.length} THEN RAISE EXCEPTION 'provider metadata changed concurrently';END IF;`)
    }
    if(body.length)executeTemporaryMergeSql(`BEGIN;SET LOCAL statement_timeout='60s';DO $patch$ DECLARE changed integer;BEGIN ${body.join('\n')} END $patch$;COMMIT;SELECT 'MERGE_COMMITTED';`,randomUUID())
    for(const table of ['figure_book_editions','content_locales']) {
      const rows=saved.filter(row=>row.table===table);if(!rows.length)continue
      let query=db.from(table).select('*')
      query=table==='figure_book_editions'?query.in('id',rows.map(row=>row.before.id)):query.in('content_id',rows.map(row=>row.before.content_id)).eq('locale',locale)
      const {data,error}=await query;if(error)throw Error(error.message)
      for(const {before,patch} of rows){const actual=data.find(row=>table==='figure_book_editions'?row.id===before.id:row.content_id===before.content_id&&row.locale===before.locale)
        if(!actual||actual.isbn!==before.isbn||Object.entries(patch).some(([field,value])=>!isDeepStrictEqual(actual[field],value)))throw Error('Provider metadata readback mismatch')
      }
    }
    for(const row of saved){const key=row.table==='figure_book_editions'?'editions':'locales';counts[key]++}
    console.log(JSON.stringify({metadataApplied:counts.editions+counts.locales,total:eligible.length}))
  }
  return counts
}

export async function main(args=process.argv.slice(2)) {
  if(args.some(arg=>arg.startsWith('--apply-')||arg==='--bind-work-keys'))throw Error('공식 메타 대조는 초벌입니다. LLM이 작품·언어·판본 귀속을 검수한 뒤 확정한 변경만 반영하세요.')
  for(const arg of args)if(!['--providers','--apply-provider-metadata','--bind-work-keys','--kakao','--apply-kakao-metadata','--english-imports','--apply-english-imports'].includes(arg))throw Error('Usage: edition-catalog-audit.mjs [--providers] [--apply-provider-metadata] [--bind-work-keys] [--kakao] [--apply-kakao-metadata] [--english-imports] [--apply-english-imports]')
  if(args.some(arg=>arg.includes('english-imports'))&&args.some(arg=>!arg.includes('english-imports')))throw Error('Run the language audit separately')
  if(args.some(arg=>arg.includes('kakao'))&&args.some(arg=>['--providers','--apply-provider-metadata','--bind-work-keys'].includes(arg)))throw Error('Run each official provider audit separately')
  const catalog=loadSeriesAuditCatalog(),split=detectSplitSeries(catalog),risks=detectEditionAttributionRisks(catalog)
  const inspection=inspectEditionCatalog(catalog)
  console.log(JSON.stringify({catalogInspection:{...inspection,
    issues:Object.fromEntries([...new Set(inspection.issues.map(row=>row.error))].map(error=>[error,inspection.issues.filter(row=>row.error===error).length])),
    reviewCandidates:inspection.reviewCandidates.length,reviewSamples:inspection.reviewCandidates.slice(0,10),
    sharedIsbns:inspection.sharedIsbns.length,samples:inspection.issues.slice(0,10)}}))
  console.log(JSON.stringify({catalogCounts:Object.fromEntries(['contents','locales','editions','relations','readings'].map(key=>[key,catalog[key].length])),splitCandidates:split.candidates.length,attributionRisks:risks.length,bySignal:split.bySignal}))
  if(!args.length)return
  let last=0
  if(args.some(arg=>arg.includes('english-imports'))){
    const selected=foreignKoEditionCandidates(catalog),result=await auditEnglishProviders({...catalog,locales:[],editions:selected.map(row=>({...row,locale:'en'}))},{progress:info=>{if(Date.now()-last>20000||info.checked===info.total){console.log(JSON.stringify({importProgress:info}));last=Date.now()}}})
    const confirmed=confirmedEnglishImports(catalog,result.officialByIsbn)
    console.log(JSON.stringify({foreignKoChecked:selected.length,confirmedEnglishImports:confirmed.length,samples:confirmed.slice(0,8).map(({row,official})=>({id:row.id,isbn:row.isbn,title:official.title,source:official.sourceUrl}))}))
    if(args.includes('--apply-english-imports')){
      const db=dbClient();let applied=0
      for(const {row,official,duplicate} of confirmed){
        const {data:before,error}=await db.from('figure_book_editions').select('*').eq('id',row.id).single();if(error)throw Error(error.message)
        if(before.locale!=='ko'||before.content_id!==row.content_id||before.isbn!==row.isbn||before.sources?.edition_work_evidence?.length||before.sources?.work_attribution)throw Error('Import edition changed during research')
        if(duplicate){const {data:actual,error}=await db.from('figure_book_editions').select('id,content_id,locale,isbn').eq('id',duplicate.id).single();if(error||actual.content_id!==before.content_id||actual.locale!=='en'||actual.isbn!==before.isbn)throw Error('Equivalent English edition changed')}
        await applyCatalogRowCorrections(db,[duplicate?{table:'figure_book_editions',before,remove:true}:{table:'figure_book_editions',before,patch:{locale:'en',title:official.title,creator:official.creator,publisher:official.publisher??before.publisher,sources:{...before.sources,primary:'openlibrary',title:official.sourceUrl,creator:official.sourceUrl,isbn:official.sourceUrl,publisher:official.sourceUrl,language:official.sourceUrl,workKey:official.workKeys[0]}}}]);applied++
      }
      console.log(JSON.stringify({englishImportsApplied:applied}))
    }
    return
  }
  if(args.includes('--kakao')||args.includes('--apply-kakao-metadata')){
    const result=await auditKakaoEditions(catalog,{progress:info=>{if(Date.now()-last>20000||info.checked===info.total||info.retry){console.log(JSON.stringify({kakaoProgress:info}));last=Date.now()}}})
    if(args.includes('--apply-kakao-metadata'))console.log(JSON.stringify({kakaoApplied:await applyProviderMetadata(result.differences.map(diff=>({...diff,official:{...diff.official,sourceUrl:diff.official.metadata.link}})),dbClient(),'ko')}))
    console.log(JSON.stringify({kakaoChecked:result.officialByIsbn.size,metadataDifferences:result.differences.length,sourceBoundDifferences:result.differences.filter(row=>row.bound).length,errors:Object.fromEntries([...new Set(result.errors.map(row=>row.error))].map(error=>[error,result.errors.filter(row=>row.error===error).length])),samples:result.differences.filter(row=>!row.bound).slice(0,12)}))
    return
  }
  const roots=new Map(catalog.contents.map(row=>[row.id,row]))
  const selected=args.includes('--bind-work-keys')?{...catalog,locales:[],editions:catalog.editions.filter(row=>row.locale==='en'&&row.isbn&&row.sources?.primary==='openlibrary'&&!row.sources.workKey&&roots.get(row.content_id)?.figureBook?.source!=='thin-en')}:catalog
  const result=await auditEnglishProviders(selected,{progress:state=>{
    if(Date.now()-last>20000||state.checked===state.total||state.retryStatus){console.log(JSON.stringify({providerProgress:state}));last=Date.now()}
  }})
  if(args.includes('--bind-work-keys')) {
    const norm=value=>bookEditionTitleKey(String(value??'').normalize('NFKD').replace(/\p{M}/gu,''))
    const bindings=selected.editions.flatMap(row=>{const official=result.officialByIsbn.get(toIsbn13(row.isbn??'')),declared=roots.get(row.content_id)?.figureBook?.openLibraryWork??roots.get(row.content_id)?.metadata?.workKey
      if(!official||official.error||official.workKeys.length!==1||(declared&&declared!==official.workKeys[0])
        ||![norm(official.mainTitle),norm(official.title)].includes(norm(row.title))||norm(row.creator)!==norm(official.creator))return []
      return [{table:'figure_book_editions',id:row.id,contentId:row.content_id,isbn:row.isbn,bound:true,fields:{},official,expected:{title:row.title,creator:row.creator,publisher:row.publisher}}]
    })
    console.log(JSON.stringify({workKeyBindings:await applyProviderMetadata(bindings)}))
    return
  }
  if(args.includes('--apply-provider-metadata'))console.log(JSON.stringify({applied:await applyProviderMetadata(result.differences)}))
  const unresolved=Object.fromEntries([...new Set(result.errors.map(row=>row.error))].map(error=>[error,result.errors.filter(row=>row.error===error).length]))
  console.log(JSON.stringify({providerChecked:result.officialByIsbn.size,metadataDifferences:result.differences.length,sourceBoundDifferences:result.differences.filter(row=>row.bound).length,providerErrors:unresolved,providerDuplicateWorkCandidates:result.workCandidates.length,
    nonReadingReviewCandidates:result.reviewCandidates.length,nonReadingReviewSamples:result.reviewCandidates.slice(0,12),
    elon:result.workCandidates.filter(group=>group.members.some(member=>member.editions.some(edition=>/elon musk|penguin readers level 3/iu.test(edition.title)))),sample:result.workCandidates.slice(0,10)}))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1})
