/** 원문·역자별 판본 정리 후보를 찾는다(읽기 전용). 최종 판단은 LLM이 출처와 본문 범위를 확인해 내린다. */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { loadSeriesAuditCatalog } from './series-split-audit.mjs'
import { planEditionTranslations, sameOfficialKakaoEdition } from './lib/edition-translation-policy.mjs'
import { getKakaoBookByIsbn } from '../../../../packages/content-search/src/kakao-books.ts'
import { toIsbn13 } from '../../../../packages/content-search/src/book-isbn.ts'
import { requestOpenLibraryBookBatch, getOpenLibraryTranslatorNames } from '../../../../packages/content-search/src/openlibrary.ts'
import { bookEditionTitleKey } from '../../../../packages/content-search/src/book-series.ts'
import { excludedBookEditionReason } from '../../../../packages/content-search/src/book-edition-policy.ts'
import { dbClient } from './lib/figure-work.mjs'
import { applyCatalogRowCorrections } from './lib/catalog-row-corrections.mjs'
import { executeTemporaryMergeSql } from './merge-works.mjs'
import { sqlLiteral } from './lib/merge-work-sql.mjs'
import { researchOriginalLanguages, wikidataOriginalLanguage } from './lib/edition-original-language-research.mjs'
export { wikidataOriginalLanguage } from './lib/edition-original-language-research.mjs'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const json = value => sqlLiteral(JSON.stringify(value)) + '::jsonb'
const excluded = row => excludedBookEditionReason({...row,editionKind:row.edition_kind,textScope:row.text_scope})
export async function researchTranslations(catalog, progress=console.log, refine=false, collisionsOnly=false) {
  const groups=[...Map.groupBy(catalog.editions,row=>row.content_id+'|'+row.locale).values()].filter(rows=>rows.length>1)
  const initialPlan=planEditionTranslations(catalog)
  const unresolvedIds=new Set(initialPlan.unresolved.map(row=>row.id)),collisionIds=new Set(initialPlan.duplicates.flatMap(g=>[g.keep,...g.drops].map(r=>r.id)))
  const selected=groups.flat().filter(row=>!excluded(row) && (collisionsOnly ? collisionIds.has(row.id) : !refine || unresolvedIds.has(row.id))), ko=selected.filter(row=>row.locale==='ko' && (refine || collisionsOnly || !row.sources?.provider_edition_url) && (collisionsOnly || !row.sources?.translators?.length) && toIsbn13(row.isbn ?? ''))
  const koByIsbn=Map.groupBy(ko,row=>toIsbn13(row.isbn)), koIds=[...koByIsbn.keys()]; let cursor=0,checked=0,last=0
  const changes=[],errors=[]
  await Promise.all(Array.from({length:4},async()=>{
    while(cursor<koIds.length) {
      const isbn=koIds[cursor++]; let official
      for(let attempt=0;attempt<3;attempt++) {
        try { await sleep(150); official=await getKakaoBookByIsbn(isbn);break }
        catch(error) { if(attempt===2)errors.push({isbn,error:error.message});else await sleep(3000*(attempt+1)) }
      }
      for(const row of koByIsbn.get(isbn)) {
        if(!sameOfficialKakaoEdition(row,official))continue
        const sources={...row.sources,translators:official.metadata.translators ?? [],provider_edition_url:official.metadata.link,provider_edition_title:official.title,provider_edition_isbn:isbn}
        changes.push({table:'figure_book_editions',before:row,patch:{sources}})
        row.sources=sources
      }
      checked++;if(Date.now()-last>20000 || checked===koIds.length){progress(JSON.stringify({kakaoTranslations:{checked,total:koIds.length}}));last=Date.now()}
    }
  }))
  const en=selected.filter(row=>row.locale==='en'&&(refine || collisionsOnly || !row.sources?.provider_edition_url)&&toIsbn13(row.isbn ?? '')), enByIsbn=Map.groupBy(en,row=>toIsbn13(row.isbn)), enIds=[...enByIsbn.keys()]
  for(let start=0;start<enIds.length;start+=100){
    const batch=enIds.slice(start,start+100);let details
    for(let attempt=0;attempt<3;attempt++){
      try{const response=await requestOpenLibraryBookBatch(batch,'details');if(!response.ok)throw Error('OpenLibrary HTTP '+response.status);details=await response.json();break}
      catch(error){if(attempt===2)throw error;await sleep(5000*(attempt+1))}
    }
    for(const isbn of batch){const detail=details['ISBN:'+isbn]?.details
      if(!detail || ![...(detail.isbn_13??[]),...(detail.isbn_10??[])].map(toIsbn13).includes(isbn))continue
      const names=getOpenLibraryTranslatorNames(detail),url='https://openlibrary.org'+detail.key
      for(const row of enByIsbn.get(isbn)) {
        const sameRecord=[row.sources?.title,row.sources?.isbn,row.sources?.primary,row.sources?.provider_edition_url].some(value => {
          try{return new URL(value).hostname==='openlibrary.org' && new URL(value).pathname.replace(/\.json$/u,'').startsWith(detail.key)}catch{return false}
        })
        const rowBase=bookEditionTitleKey(row.title.split(/[（(]/u)[0]),officialBase=bookEditionTitleKey(detail.title.split(/[（(]/u)[0])
        if(!sameRecord && bookEditionTitleKey(row.title)!==bookEditionTitleKey(detail.title) && (!rowBase || rowBase!==officialBase))continue
        const sources={...row.sources,provider_edition_url:url,provider_edition_title:detail.title,provider_edition_isbn:isbn,...(names.length?{translators:names}:{}),
          ...(detail.translated_from?.length?{translated_from:detail.translated_from}:{}),
          ...(detail.physical_format?{physical_format:detail.physical_format}:{}),
          ...(detail.by_statement?{by_statement:detail.by_statement}:{})}
        changes.push({table:'figure_book_editions',before:row,patch:{sources}});row.sources=sources
      }
    }
    progress(JSON.stringify({openLibraryTranslations:{checked:Math.min(start+100,enIds.length),total:enIds.length}}));await sleep(1100)
  }
  // 원문 언어는 기존 Wikidata 작품 정체성과 P407이 일치할 때만 보완한다.
  const selectedWorks=[...new Set(selected.map(row=>row.content_id))].map(id=>catalog.contents.find(work=>work.id===id))
  const qids=selectedWorks.flatMap(work=>{
    const id=String(work.figureBook?.workIdentity ?? '').match(/^wikidata:(Q\d+)$/iu)?.[1]
      ?? String(work.figureBook?.wikidataQid ?? work.figureBook?.wikidataWork ?? work.metadata?.wikidata_id ?? '').match(/(?:^|\/)(Q\d+)$/u)?.[1]
    return id?[{work,id:id.toUpperCase()}]:[]
  })
  for(let start=0;start<qids.length;start+=50){
    const batch=qids.slice(start,start+50),url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:batch.map(item=>item.id).join('|'),props:'claims',format:'json'})
    const response=await fetch(url,{headers:{'User-Agent':'FeelAndNoteBookAudit/1.0 (https://feelandnote.com)'},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Wikidata HTTP '+response.status)
    const data=await response.json();if(data.error)throw Error('Wikidata '+data.error.info)
    for(const {work,id} of batch){
      const lang=wikidataOriginalLanguage(data.entities?.[id]?.claims);if(!lang)continue
      const figure={...work.figureBook,originalLanguage:lang,identityEvidence:'https://www.wikidata.org/wiki/'+id}
      work.figureBook=figure;work.metadata={...work.metadata,figureBook:figure}
    }
    progress(JSON.stringify({wikidataLanguages:{checked:Math.min(start+50,qids.length),total:qids.length}}))
  }
  return {changes,errors,selectedWorks}
}
export function translationRepairSql(plan,catalog) {
  if(plan.excluded.some(({reason})=>reason==='wrong_locale'))throw Error('Wrong-language editions require a verified language correction; they must not be deleted as excluded books')
  const statements=[]
  for(const {keep,drops} of plan.duplicates) {
    for(const row of [keep,...drops]) statements.push(`PERFORM 1 FROM figure_book_editions WHERE id=${row.id} FOR UPDATE;
IF (SELECT to_jsonb(e) FROM figure_book_editions e WHERE id=${row.id}) IS DISTINCT FROM ${json(row)} THEN RAISE EXCEPTION 'edition changed'; END IF;`)
    for(const drop of drops){
      statements.push(`UPDATE figure_book_products p SET is_active=false WHERE edition_id=${drop.id} AND is_active AND EXISTS(SELECT 1 FROM figure_book_products k WHERE k.edition_id=${keep.id} AND k.platform=p.platform AND k.is_active);
UPDATE figure_book_products SET edition_id=${keep.id} WHERE edition_id=${drop.id}; DELETE FROM figure_book_editions WHERE id=${drop.id};`)
    }
  }
  for(const {row} of plan.excluded){
    statements.push(`PERFORM 1 FROM figure_book_editions WHERE id=${row.id} FOR UPDATE;
IF (SELECT to_jsonb(e) FROM figure_book_editions e WHERE id=${row.id}) IS DISTINCT FROM ${json(row)} THEN RAISE EXCEPTION 'excluded edition changed'; END IF;
IF EXISTS(SELECT 1 FROM figure_book_products WHERE edition_id=${row.id}) THEN RAISE EXCEPTION 'excluded edition product needs review'; END IF;
DELETE FROM figure_book_editions WHERE id=${row.id};`)
  }
  return `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='120s';
LOCK TABLE figure_book_editions,figure_book_products IN SHARE ROW EXCLUSIVE MODE;
DO $translation$ BEGIN
IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE c.contype='f' AND c.confrelid='figure_book_editions'::regclass AND (n.nspname<>'public' OR r.relname<>'figure_book_products')) THEN RAISE EXCEPTION 'unhandled edition reference'; END IF;
${statements.join('\n')} END $translation$;COMMIT;SELECT 'MERGE_COMMITTED';`
}
export async function main(args=process.argv.slice(2)) {
  if(args.includes('--apply'))throw Error('기계 판정만으로 판본을 통합·삭제할 수 없습니다. 후보와 출처를 LLM이 검수한 뒤 확정한 변경만 반영하세요.')
  const catalog=loadSeriesAuditCatalog(), initial=planEditionTranslations(catalog)
  console.log(JSON.stringify({before:{works:catalog.contents.length,editions:catalog.editions.length,excluded:initial.excluded.length,duplicateGroups:initial.duplicates.length,unresolved:initial.unresolved.length}}))
  if(args.includes('--research')||args.includes('--apply')) {
    // before objects must remain immutable for optimistic locking.
    const before = new Map(catalog.editions.map(row=>[row.id,structuredClone(row)]))
    const researched=args.includes('--current-facts')||args.includes('--languages')?{changes:[],errors:[],selectedWorks:[]}:await researchTranslations(catalog,console.log,args.includes('--refine'),args.includes('--known-collisions'))
    if(args.includes('--languages')) {
      const ids=new Set(initial.unresolved.map(row=>row.content_id))
      researched.selectedWorks=await researchOriginalLanguages(catalog.contents.filter(work=>ids.has(work.id)),catalog)
    }
    for(const change of researched.changes)change.before=before.get(change.before.id)
    const plan=planEditionTranslations(catalog)
    console.log(JSON.stringify({researched:{facts:researched.changes.length,lookupErrors:researched.errors.length,excluded:plan.excluded.length,duplicateGroups:plan.duplicates.length,duplicateRows:plan.duplicates.reduce((n,g)=>n+g.drops.length,0),unresolved:plan.unresolved.length},unresolvedSamples:plan.unresolved.slice(0,12).map(row=>({id:row.id,title:row.title,locale:row.locale,publisher:row.publisher,translators:row.sources?.translators}))}))
    if(args.includes('--apply')) {
      const db=dbClient();let applied=0
      // 새 역자 사실로 중복임을 확인한 행을 먼저 정리해야 DB 가드와 충돌하지 않는다.
      // 판정에는 새 사실을, 삭제 전 동시 변경 검사에는 DB에서 읽은 원행을 쓴다.
      const preliminary={excluded:plan.excluded.map(({row,reason})=>({row:before.get(row.id),reason})),
        duplicates:plan.duplicates.map(({keep,drops})=>({keep:before.get(keep.id),drops:drops.map(row=>before.get(row.id))}))}
      const removedIds=new Set([...preliminary.excluded.map(x=>x.row.id),...preliminary.duplicates.flatMap(x=>x.drops.map(row=>row.id))])
      if(removedIds.size)executeTemporaryMergeSql(translationRepairSql(preliminary,catalog),randomUUID())
      const survivingChanges=researched.changes.filter(change=>!removedIds.has(change.before.id))
      for(let start=0;start<survivingChanges.length;start+=100){const batch=survivingChanges.slice(start,start+100);await applyCatalogRowCorrections(db,batch);applied+=batch.length;console.log(JSON.stringify({metadataApplied:applied,total:survivingChanges.length}))}
      // Re-fetch actual timestamps after source patches before destructive changes.
      const current=loadSeriesAuditCatalog()
      const isLanguageEvidence=work=>work.figureBook?.originalLanguage && /^https:\/\/(?:www.wikidata.org|en.wikipedia.org)\//u.test(work.figureBook?.identityEvidence ?? '')
      const languageWorks=researched.selectedWorks.filter(isLanguageEvidence)
      const workRows=new Map(),languageChanges=[]
      for(let start=0;start<languageWorks.length;start+=100){
        const r=await db.from('contents').select('*').in('id',languageWorks.slice(start,start+100).map(work=>work.id));if(r.error)throw Error(r.error.message)
        for(const row of r.data)workRows.set(row.id,row)
      }
      for(const work of researched.selectedWorks){const original=current.contents.find(row=>row.id===work.id)
        if(isLanguageEvidence(work)) {
          const before=workRows.get(work.id);if(!before)throw Error('Original work missing')
          if(before.metadata?.figureBook?.workIdentity !== work.figureBook.workIdentity)throw Error('Original work identity changed')
          if(before.metadata?.figureBook?.originalLanguage!==work.figureBook.originalLanguage || before.metadata?.figureBook?.identityEvidence!==work.figureBook.identityEvidence)
            languageChanges.push({table:'contents',before,patch:{metadata:{...before.metadata,figureBook:{...before.metadata?.figureBook,originalLanguage:work.figureBook.originalLanguage,identityEvidence:work.figureBook.identityEvidence}}}})
          original.figureBook={...original.figureBook,originalLanguage:work.figureBook.originalLanguage,identityEvidence:work.figureBook.identityEvidence}
        }
      }
      for(let start=0;start<languageChanges.length;start+=100)await applyCatalogRowCorrections(db,languageChanges.slice(start,start+100))
      const actual=planEditionTranslations(current)
      console.log(JSON.stringify({repairPlan:{excluded:actual.excluded.length,duplicates:actual.duplicates.reduce((n,g)=>n+g.drops.length,0),excludedProducts:actual.excluded.flatMap(({row})=>current.products.filter(p=>p.edition_id===row.id)).length}}))
      if(actual.excluded.length||actual.duplicates.length)executeTemporaryMergeSql(translationRepairSql(actual,current),randomUUID())
      // A card for a removed sales format must not revive that format through fallback.
      const surviving=loadSeriesAuditCatalog(), cardCandidates=[]
      const removedRows=[...preliminary.excluded,...actual.excluded].map(x=>x.row)
        .concat([...preliminary.duplicates,...actual.duplicates].flatMap(x=>x.drops))
      for(const card of current.locales){
        const removed=removedRows.find(row=>row.content_id===card.content_id&&row.locale===card.locale&&row.isbn===card.isbn)
        if(!removed && !excluded(card))continue
        cardCandidates.push(card)
      }
      const actualCards=new Map(),cardIds=[...new Set(cardCandidates.map(card=>card.content_id))]
      for(let start=0;start<cardIds.length;start+=100){
        const r=await db.from('content_locales').select('*').in('content_id',cardIds.slice(start,start+100));if(r.error)throw Error(r.error.message)
        for(const row of r.data)actualCards.set(row.content_id+'|'+row.locale,row)
      }
      const cardChanges=[]
      for(const card of cardCandidates){
        const replacement=surviving.editions.find(row=>row.content_id===card.content_id&&row.locale===card.locale)
        const before=actualCards.get(card.content_id+'|'+card.locale);if(!before)throw Error('Card readback missing')
        const patch=replacement?{title:replacement.title,creator:replacement.creator,isbn:replacement.isbn,publisher:replacement.publisher,thumbnail_url:replacement.thumbnail_url,sources:replacement.sources}
          :{isbn:null,publisher:null,thumbnail_url:null,sources:{...before.sources,primary:'none',title:card.locale==='en'?'original':'translated'}}
        if(Object.entries(patch).every(([key,value])=>isDeepStrictEqual(before[key],value)))continue
        cardChanges.push({table:'content_locales',before,patch})
      }
      for(let start=0;start<cardChanges.length;start+=100){
        await applyCatalogRowCorrections(db,cardChanges.slice(start,start+100))
        console.log(JSON.stringify({cardsCorrected:Math.min(start+100,cardChanges.length),total:cardChanges.length}))
      }
      const final=loadSeriesAuditCatalog(), verified=planEditionTranslations(final)
      if(verified.excluded.length||verified.duplicates.length)throw Error('Translation repair verification failed')
      console.log(JSON.stringify({verified:{works:final.contents.length,editions:final.editions.length,excluded:verified.excluded.length,duplicates:verified.duplicates.length,unresolved:verified.unresolved.length,relations:final.relations.length,readings:final.readings.length,products:final.products.length}}))
    }
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1})
