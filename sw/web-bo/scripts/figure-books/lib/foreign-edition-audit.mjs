/** 영문 표제만으로 언어를 추정하지 않는다. 실제 ISBN의 영어 본문과 기존 원작 키가 모두 필요하다. */
import {bookEditionTitleKey} from '../../../../../packages/content-search/src/book-series.ts'
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
export function foreignKoEditionCandidates(catalog){return catalog.editions.filter(row=>row.locale==='ko'&&toIsbn13(row.isbn??'')&&/[a-z]/iu.test(row.title??'')&&!/[가-힣]/u.test(row.title??'')&&!row.sources?.edition_work_evidence?.length&&!row.sources?.work_attribution)}
export function confirmedEnglishImports(catalog,officialByIsbn){
  const roots=new Map(catalog.contents.map(row=>[row.id,row])),confirmed=[]
  for(const row of foreignKoEditionCandidates(catalog)){
    const official=officialByIsbn.get(toIsbn13(row.isbn)),root=roots.get(row.content_id)
    if(!official||official.error||official.workKeys.length!==1||/[a-z]/iu.test(row.title)===false)continue
    if(/\b(?:abridged|readers?|level|study|guide|selection|anthology|adaptation|retelling)\b/iu.test(official.title))continue
    if(![official.title,official.mainTitle].some(title=>bookEditionTitleKey(title)===bookEditionTitleKey(row.title)))continue
    const known=new Set([root?.figureBook?.openLibraryWork,root?.metadata?.workKey,...catalog.editions.filter(edition=>edition.content_id===row.content_id&&edition.locale==='en'&&edition.sources?.primary==='openlibrary').map(edition=>edition.sources.workKey)].filter(Boolean))
    if(known.size!==1||!known.has(official.workKeys[0]))continue
    const duplicate=catalog.editions.find(edition=>edition.content_id===row.content_id&&edition.locale==='en'&&toIsbn13(edition.isbn??'')===official.isbn)
    confirmed.push({row,official,duplicate})
  }
  return confirmed
}
