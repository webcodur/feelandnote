/** ISBN별 실제 메타를 검사한다. 결과와 공급자 응답은 메모리에만 둔다. */
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {bookEditionTitleKey} from '../../../../../packages/content-search/src/book-series.ts'
import {OPENLIBRARY_BOOK_BATCH_SIZE,requestOpenLibraryBookBatch} from '../../../../../packages/content-search/src/openlibrary.ts'
import {nonReadingFormatReviewSignals} from './edition-catalog-checks.mjs'

export const PROVIDER_AUDIT_BATCH_SIZE = OPENLIBRARY_BOOK_BATCH_SIZE
const english = value => typeof value === 'string' && /[a-z]/iu.test(value) && !/[가-힣]/u.test(value)
const text = value => typeof value === 'string' ? value.trim() : ''

export function providerReadingFormatReview(isbn,detail,data) {
  if(!/^\/books\/OL\d+M$/u.test(detail?.key??'')||![...(detail?.isbn_13??[]),...(detail?.isbn_10??[])].map(toIsbn13).includes(isbn))return null
  const row={title:[text(detail.title),text(detail.subtitle)].filter(Boolean).join(': '),creator:(data?.authors??[]).map(a=>text(a.name)).filter(Boolean).join(', '),physicalFormat:text(detail.physical_format)}
  const reviewSignals=nonReadingFormatReviewSignals(row)
  return reviewSignals.length?{...row,reviewSignals,sourceUrl:'https://openlibrary.org'+detail.key}:null
}

export function readOfficialEdition(isbn, detail, data) {
  const key = detail?.key
  const ids = [...(detail?.isbn_13 ?? []), ...(detail?.isbn_10 ?? [])].map(toIsbn13)
  if (!isbn || !/^\/books\/OL\d+M$/u.test(key ?? '') || !ids.includes(isbn)) return {error:'isbn_or_edition_key_mismatch'}
  if (!(detail.languages ?? []).some(language => language.key === '/languages/eng')) return {error:'english_language_not_confirmed'}
  if (!english(detail.title)) return {error:'english_title_not_confirmed'}
  const authors = (data?.authors ?? []).map(author => text(author.name)).filter(Boolean)
  if (!authors.length || !authors.every(english)) return {error:'english_creator_not_confirmed'}
  const subtitle = text(detail.subtitle)
  const title = subtitle && !bookEditionTitleKey(detail.title).includes(bookEditionTitleKey(subtitle))
    ? `${text(detail.title)}: ${subtitle}` : text(detail.title)
  return {isbn,key,title,mainTitle:text(detail.title),creator:authors.join(', '),
    publisher:(detail.publishers ?? []).map(text).find(Boolean) ?? null,
    workKeys:[...new Set((detail.works ?? []).map(work=>work.key).filter(key=>/^\/works\/OL\d+W$/u.test(key)))],
    authorKeys:[...new Set((data.authors ?? []).map(author=>{
      try { return new URL(author.url).pathname.match(/^\/authors\/OL\d+A/u)?.[0] } catch { return null }
    }).filter(Boolean))], sourceUrl:`https://openlibrary.org${key}`,
    physicalFormat:text(detail.physical_format) || null, pages:detail.number_of_pages ?? null}
}

export function providerMetadataDifference(row, official) {
  if (!official || official.error) return {error:official?.error ?? 'provider_not_found'}
  if (row.locale !== 'en' || toIsbn13(row.isbn ?? '') !== official.isbn) return {error:'stored_isbn_or_locale_mismatch'}
  // 공급자 판본 URL까지 일치하는 기존 OL 행에만 메타 교정을 자동 계획한다.
  const source = row.sources ?? {}
  const keys = [source.title,source.isbn].flatMap(url=>{
    try { const parsed=new URL(url);return parsed.hostname==='openlibrary.org' ? [parsed.pathname.match(/^\/books\/OL\d+M/u)?.[0]] : [] } catch { return [] }
  }).filter(Boolean)
  const reviewed = Boolean(source.edition_work_evidence?.length || source.work_attribution)
  const bound = !reviewed && source.primary === 'openlibrary' && keys.includes(official.key)
  const fields = {}
  if (text(row.creator) !== official.creator) fields.creator = official.creator
  if (text(row.title) !== official.title && (bookEditionTitleKey(row.title) === bookEditionTitleKey(official.mainTitle) || /[가-힣]/u.test(row.title ?? ''))) fields.title = official.title
  if (!row.publisher && official.publisher) fields.publisher = official.publisher
  return {bound,fields,official,expected:{title:row.title,creator:row.creator,publisher:row.publisher}}
}

/** 한 원작 키만으로는 학습서·독립 해설의 오연결을 확정할 수 없으므로 후보만 반환한다. */
export function providerWorkCandidates(catalog, officialByIsbn) {
  const groups = new Map(), byWork = new Map()
  for (const row of catalog.editions) {
    const official=officialByIsbn.get(toIsbn13(row.isbn ?? ''))
    if(row.locale!=='en'||!official||official.error||official.workKeys.length!==1)continue
    const items=byWork.get(row.content_id)??[];items.push({row,official});byWork.set(row.content_id,items)
  }
  for (const [id,items] of byWork) {
    const keys=new Set(items.map(item=>item.official.workKeys[0]));if(keys.size!==1)continue
    const key=[...keys][0],members=groups.get(key)??[];members.push({id,editions:items.map(({row,official})=>({id:row.id,isbn:official.isbn,title:official.title,creator:official.creator,authorKeys:official.authorKeys,sourceUrl:official.sourceUrl,editionKind:row.edition_kind,textScope:row.text_scope}))});groups.set(key,members)
  }
  return [...groups].filter(([,members])=>members.length>1).map(([workKey,members])=>({workKey,members}))
}

export async function auditEnglishProviders(catalog,{fetchImpl=null,progress=()=>{},batchSize=PROVIDER_AUDIT_BATCH_SIZE}={}) {
  const isbns=[...new Set([...catalog.editions,...catalog.locales].filter(row=>row.locale==='en').map(row=>toIsbn13(row.isbn??'')).filter(Boolean))]
  const officialByIsbn=new Map(),formatReviews=new Map();let lastRequest=0
  const request=async(url)=>{
    for(let attempt=0;attempt<3;attempt++){
      const wait=1100-(Date.now()-lastRequest);if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait))
      lastRequest=Date.now();let response
      try {
        const parsed=new URL(url), selected=parsed.searchParams.get('bibkeys').split(',').map(key=>key.slice(5))
        response=fetchImpl ? await fetchImpl(url,{signal:AbortSignal.timeout(60000)}) : await requestOpenLibraryBookBatch(selected,parsed.searchParams.get('jscmd'))
      } catch(error) {
        progress({retryError:error.message,attempt:attempt+1})
        if(attempt===2)throw error
        await new Promise(resolve=>setTimeout(resolve,5000));continue
      }
      if(response.ok)return response.json()
      if(response.status===429||response.status>=500){progress({retryStatus:response.status,attempt:attempt+1});await new Promise(resolve=>setTimeout(resolve,Math.min(30000,1000*(Number(response.headers.get('retry-after'))||5)*(attempt+1))));continue}
      throw Error(`OpenLibrary batch HTTP ${response.status}`)
    }
    throw Error('OpenLibrary batch failed; unqueried ISBNs must not be counted as missing')
  }
  for(let start=0;start<isbns.length;start+=batchSize){
    const selected=isbns.slice(start,start+batchSize),bibkeys=selected.map(isbn=>'ISBN:'+isbn).join(',')
    const details=await request('https://openlibrary.org/api/books?'+new URLSearchParams({bibkeys,jscmd:'details',format:'json'}))
    const data=await request('https://openlibrary.org/api/books?'+new URLSearchParams({bibkeys,jscmd:'data',format:'json'}))
    for(const isbn of selected){const key='ISBN:'+isbn;officialByIsbn.set(isbn,details[key]?.details?readOfficialEdition(isbn,details[key].details,data[key]):{error:'provider_not_found'})
      const review=providerReadingFormatReview(isbn,details[key]?.details,data[key]);if(review)formatReviews.set(isbn,review)
    }
    progress({checked:Math.min(start+batchSize,isbns.length),total:isbns.length})
  }
  const differences=[],errors=[],reviewCandidates=[]
  for(const row of [...catalog.editions.map(row=>({...row,table:'figure_book_editions'})),...catalog.locales.map(row=>({...row,table:'content_locales'}))].filter(row=>row.locale==='en')){
    const isbn=toIsbn13(row.isbn??'');if(!isbn)continue
    const review=formatReviews.get(isbn);if(review)reviewCandidates.push({table:row.table,id:row.id,contentId:row.content_id,isbn,...review})
    const diff=providerMetadataDifference(row,officialByIsbn.get(isbn));
    if(diff.error)errors.push({table:row.table,id:row.id,contentId:row.content_id,isbn,error:diff.error})
    else if(Object.keys(diff.fields).length)differences.push({table:row.table,id:row.id,contentId:row.content_id,isbn,...diff})
  }
  return {officialByIsbn,differences,errors,reviewCandidates,workCandidates:providerWorkCandidates(catalog,officialByIsbn)}
}
