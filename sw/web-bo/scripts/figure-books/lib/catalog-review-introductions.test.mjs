import test from 'node:test'
import assert from 'node:assert/strict'
import {extractCatalogIntroductionCandidates,createCatalogIntroductionResearch} from './catalog-review-introductions.mjs'
import {readOfficialEdition} from './edition-provider-audit.mjs'

const isbn='9780141439518',other='9780141439587',koIsbn='9788937460012'
const prose='The story of a family and its life is told in this book.'
const edition=(id,changes={})=>({id,content_id:'work',locale:'en',isbn,title:'Pride and Prejudice',creator:'Jane Austen',description:null,edition_kind:'full',text_scope:'complete',...changes})
const catalog=(editions,locales=[])=>({contents:[{id:'work',figureBook:{originalTitle:'Pride and Prejudice'}}],editions,locales})
const official=(value,changes={})=>({isbn:value,key:'/books/OL123M',sourceUrl:'https://openlibrary.org/books/OL123M',editionIsbns:[value],languageKeys:['/languages/eng'],editionAuthorKeys:['/authors/OL123A'],title:'Pride and Prejudice',mainTitle:'Pride and Prejudice',creator:'Jane Austen',workKeys:['/works/OL123W'],...changes})
const work={key:'/works/OL123W',title:'Pride and Prejudice',authors:[{author:{key:'/authors/OL123A'}}],description:{value:prose}}

test('candidate extraction separates legitimate markers and reuses only same work/locale/ISBN prose',()=>{
 const editions=[edition(1),edition(2,{description:'OPEN'}),edition(3,{description:'KAKAO'}),edition(4,{description:'한국어 설명'}),edition(5,{isbn:other}),edition(6,{content_id:'other'}),edition(7,{isbn:null})]
 const cards=[{content_id:'work',locale:'en',isbn,description:prose,sources:{description:'https://openlibrary.org/books/OL123M'}}]
 const result=extractCatalogIntroductionCandidates(catalog(editions,cards))
 assert.deepEqual(result.map(row=>row.editionId),[1,3,4,5,6,7])
 assert.equal(result[0].sourceIntro,prose)
 assert.equal(result[0].sourceMethod,'exact_locale_reuse')
 assert.equal(result[3].sourceIntro,null)
 assert.equal(result[4].sourceIntro,null)
 assert.deepEqual(result[5].scopeWarnings,['invalid_or_missing_isbn'])
 assert.equal(result[2].reason,'introduction_language_review')
 assert.equal(editions[0].description,null)
})

test('same ISBN is collected once and exact locale reuse skips collection',async()=>{
 const cards=[{content_id:'work',locale:'en',isbn:other,description:prose}]
 const candidates=extractCatalogIntroductionCandidates(catalog([edition(1),edition(2),edition(3,{isbn:other})],cards))
 const calls=[]
 const research=createCatalogIntroductionResearch({collect:async(provider,isbns)=>{calls.push({provider,isbns});return {results:isbns.map(value=>({isbn:value,data:official(value,{description:prose})}))}}})
 const [a,b]=await Promise.all([research.prefetch(candidates),research.prefetch(candidates)])
 assert.equal(calls.length,1)
 assert.deepEqual(calls[0],{provider:'openlibrary',isbns:[isbn]})
 assert.equal(a[0].sourceIntro,prose)
 assert.equal(a[2].sourceMethod,'exact_locale_reuse')
 assert.deepEqual(a,b)
})

test('Kakao introduction requires exact official ISBN and accepts existing Korean text only',async()=>{
 const candidates=extractCatalogIntroductionCandidates(catalog([edition(1,{locale:'ko',isbn:koIsbn,title:'한국어 책',creator:'저자'}),edition(2,{locale:'ko',isbn})]))
 const research=createCatalogIntroductionResearch({collect:async(provider,isbns)=>{assert.equal(provider,'kakao');return isbns.map(value=>({isbn:value,data:{title:'한국어 책',creator:'저자',metadata:{isbn:koIsbn,description:'한국어로 쓰인 책의 소개입니다.',link:'https://search.daum.net/search?bookId=1'}}}))}})
 const result=await research.prefetch(candidates)
 assert.equal(result[0].sourceIntro,'한국어로 쓰인 책의 소개입니다.')
 assert.equal(result[1].sourceIntro,null)
 assert.ok(result[1].scopeWarnings.includes('official_isbn_mismatch'))
})

test('one work lookup serves multiple ISBNs only after exact title/author/scope binding',async()=>{
 const candidates=extractCatalogIntroductionCandidates(catalog([edition(1),edition(2,{isbn:other})]))
 let reads=0
 const research=createCatalogIntroductionResearch({collect:async(provider,isbns)=>isbns.map(value=>({isbn:value,data:official(value)})),readOpenLibraryWork:async url=>{reads++;assert.equal(url,'https://openlibrary.org/works/OL123W');return {data:work,sourceUrl:url}}})
 const result=await research.prefetch(candidates)
 assert.equal(reads,1)
 assert.ok(result.every(row=>row.sourceIntro===prose&&row.sourceMethod==='openlibrary_bound_work'))
 assert.ok(result.every(row=>!row.neededWorkDescription))
})

test('wrong original title/author and changed scope never borrow original prose',async()=>{
 for(const [changes,rawWork] of [
  [{}, {...work,title:'Different Book'}],
  [{}, {...work,authors:[{author:{key:'/authors/OL999A'}}]}],
  [{edition_kind:'selection'},work],
  [{title:'A Commentary'},work],
 ]){
  const research=createCatalogIntroductionResearch({collect:async()=>[{isbn,data:official(isbn)}],readOpenLibraryWork:async()=>rawWork})
  const [result]=await research.prefetch(extractCatalogIntroductionCandidates(catalog([edition(1,changes)])))
  assert.equal(result.sourceIntro,null)
  assert.ok(result.scopeWarnings.length)
 }
})

test('missing work reader returns needed source without inventing text; malformed official binding stops',async()=>{
 const candidates=extractCatalogIntroductionCandidates(catalog([edition(1)]))
 const research=createCatalogIntroductionResearch({collect:async()=>[{isbn,data:official(isbn)}]})
 const [result]=await research.prefetch(candidates)
 assert.equal(result.sourceIntro,null)
 assert.equal(result.neededWorkDescription,'https://openlibrary.org/works/OL123W')
 const malformed=createCatalogIntroductionResearch({collect:async()=>[{isbn,data:official(isbn,{editionIsbns:[]})}]})
 const [bad]=await malformed.prefetch(candidates)
 assert.ok(bad.scopeWarnings.includes('official_isbn_binding_missing'))
})

test('provider batch retains raw introduction and authoritative fields without approving prose',()=>{
 const raw={key:'/books/OL123M',isbn_13:[isbn],title:'Pride and Prejudice',languages:[{key:'/languages/eng'}],authors:[{key:'/authors/OL123A'}],description:{value:'Foreign or unapproved source text'},subjects:['Fiction'],table_of_contents:[{title:'Chapter One'}],notes:'Unreviewed note'}
 const result=readOfficialEdition(isbn,raw,{authors:[{name:'Jane Austen'}]})
 assert.deepEqual(result.description,raw.description)
 assert.deepEqual(result.editionIsbns,[isbn])
 assert.deepEqual(result.editionAuthorKeys,['/authors/OL123A'])
 assert.deepEqual(result.subjects,['Fiction'])
 assert.deepEqual(result.tableOfContents,raw.table_of_contents)
 assert.equal(result.notes,'Unreviewed note')
 assert.equal(Object.hasOwn(readOfficialEdition(isbn,{...raw,description:undefined},{authors:[{name:'Jane Austen'}]}),'description'),false)
})

test('a mechanical original-work mismatch keeps unapproved source and binding for LLM judgment',async()=>{
 const rawWork={...work,title:'Different Book'}
 const research=createCatalogIntroductionResearch({collect:async()=>[{isbn,data:official(isbn)}],readOpenLibraryWork:async()=>({data:rawWork,sourceUrl:'https://openlibrary.org/works/OL123W'})})
 const [result]=await research.prefetch(extractCatalogIntroductionCandidates(catalog([edition(1)])))
 assert.equal(result.sourceIntro,null)
 assert.ok(result.scopeWarnings.includes('original_work_title_author_or_scope_mismatch'))
 assert.equal(result.sourceCandidates[0].text,prose)
 assert.equal(result.sourceCandidates[0].title,'Different Book')
 assert.equal(result.sourceCandidates[0].sourceMethod,'openlibrary_candidate_work')
 assert.deepEqual(result.officialBinding.editionIsbns,[isbn])
 assert.equal(result.originalWorkBinding.key,rawWork.key)
 assert.equal(result.originalWorkBinding.title,'Different Book')
})

test('failed source requests are retryable and do not poison all ISBN promises',async()=>{
 let calls=0
 const research=createCatalogIntroductionResearch({collect:async(provider,isbns)=>{if(++calls===1)throw Error('Temporary collection failure');return isbns.map(value=>({isbn:value,data:official(value,{description:prose})}))}})
 const candidates=extractCatalogIntroductionCandidates(catalog([edition(1),edition(2,{isbn:other})]))
 await assert.rejects(research.prefetch(candidates),/Temporary collection failure/)
 const result=await research.prefetch(candidates)
 assert.equal(calls,2)
 assert.ok(result.every(row=>row.sourceIntro===prose))
})
