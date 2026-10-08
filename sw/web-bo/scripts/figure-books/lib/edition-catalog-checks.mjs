import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'

/** 전 행을 한 번 순회한다. 확인되지 않은 메타와 확정된 참조 오류를 구별한다. */
export function inspectEditionCatalog(catalog) {
  const works=new Set(catalog.contents.map(row=>row.id)),owners=new Map(),issues=[]
  const enMetadata={koreanTitle:0,koreanCreator:0,missingCreator:0,missingIsbn:0};let unresolvedTitleSearchEditions=0
  for(const row of [...catalog.editions.map(row=>({...row,table:'figure_book_editions'})),...catalog.locales.map(row=>({...row,table:'content_locales'}))]){
    const isbn=toIsbn13(row.isbn??''),base={table:row.table,id:row.id,contentId:row.content_id,locale:row.locale,isbn:row.isbn}
    if(!works.has(row.content_id))issues.push({...base,error:'missing_book_work'})
    if(row.isbn&&!isbn)issues.push({...base,error:'invalid_isbn'})
    if(!row.title?.trim())issues.push({...base,error:'missing_title'})
    if(row.table==='figure_book_editions'&&row.sources?.primary==='none'&&['translated','romanized','original'].includes(row.sources?.title))issues.push({...base,error:'display_title_registered_as_physical_edition'})
    if(row.table==='figure_book_editions'&&!isbn&&row.sources?.title==='kakao_title_search'
      &&!/^https:\/\/(m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(row.sources?.series_source_url??'')){
      if(!row.publisher&&!row.thumbnail_url&&!row.sources?.edition_work_evidence?.length&&!row.sources?.work_attribution)issues.push({...base,error:'empty_title_search_registered_as_physical_edition'})
      else unresolvedTitleSearchEditions++
    }
    if(row.table==='content_locales'&&row.isbn&&row.sources?.primary==='none'&&['translated','romanized','original'].includes(row.sources?.title))issues.push({...base,error:'display_title_has_unverified_isbn'})
    if(isbn){const group=owners.get(isbn)??new Set();group.add(row.content_id);owners.set(isbn,group)}
    if(row.table==='figure_book_editions'&&row.locale==='en'){
      if(/[가-힣]/u.test(row.title??''))enMetadata.koreanTitle++
      if(/[가-힣]/u.test(row.creator??''))enMetadata.koreanCreator++
      if(!row.creator?.trim())enMetadata.missingCreator++
      if(!isbn)enMetadata.missingIsbn++
    }
  }
  const sharedIsbns=[...owners].filter(([,ids])=>ids.size>1).map(([isbn,ids])=>({isbn,contentIds:[...ids]}))
  return {checkedWorks:catalog.contents.length,checkedLocales:catalog.locales.length,checkedEditions:catalog.editions.length,
    issues,enMetadata,sharedIsbns,unresolvedTitleSearchEditions}
}
