import assert from 'node:assert/strict'
import test from 'node:test'
import {readOfficialEdition,providerMetadataDifference,providerWorkCandidates,providerReadingFormatReview,auditEnglishProviders} from './lib/edition-provider-audit.mjs'
const isbn='9780062301253',key='/books/OL29732932M'
const details={key,title:'Elon Musk',subtitle:'Tesla, SpaceX, and the Quest for a Fantastic Future',isbn_13:[isbn],languages:[{key:'/languages/eng'}],works:[{key:'/works/OL17184556W'}],publishers:['HarperCollins']}
const data={authors:[{name:'Ashlee Vance',url:'https://openlibrary.org/authors/OL3513180A/Ashlee_Vance'}]}
test('ISBN·언어를 확인한 판본의 부제와 실제 영어 저자를 복원한다',()=>{
 const official=readOfficialEdition(isbn,details,data);assert.equal(official.creator,'Ashlee Vance');assert.match(official.title,/Tesla, SpaceX/)
 const row={locale:'en',isbn,title:'Elon Musk',creator:'애슐리 반스',sources:{primary:'openlibrary',title:'https://openlibrary.org'+key}}
 const diff=providerMetadataDifference(row,official);assert.equal(diff.bound,true);assert.equal(diff.fields.creator,'Ashlee Vance')
 assert.equal(providerMetadataDifference({...row,sources:{primary:'openlibrary',title:'https://openlibrary.org/books/OL1M'}},official).bound,false)
 assert.equal(providerMetadataDifference({...row,sources:{...row.sources,edition_work_evidence:[{verified:true}]}},official).bound,false)
})
test('공급자가 다른 ISBN·언어·빈 저자를 주면 확정 교정으로 만들지 않는다',()=>{
 assert.equal(readOfficialEdition('9780062301239',details,data).error,'isbn_or_edition_key_mismatch')
 assert.equal(readOfficialEdition(isbn,{...details,languages:[]},data).error,'english_language_not_confirmed')
 assert.equal(readOfficialEdition(isbn,details,{authors:[]}).error,'english_creator_not_confirmed')
})
test('한 원작에 묶인 학습서도 자동 통합하지 않고 후보에 본문 종류를 보존한다',()=>{
 const official=readOfficialEdition(isbn,details,data),catalog={editions:[{id:1,content_id:'a',locale:'en',isbn,edition_kind:null,text_scope:null},{id:2,content_id:'b',locale:'en',isbn,edition_kind:'abridged',text_scope:'graded reader'}]}
 const groups=providerWorkCandidates(catalog,new Map([[isbn,official]]));assert.equal(groups.length,1);assert.equal(groups[0].members[1].editions[0].editionKind,'abridged')
})

test('언어가 없는 노트 서지도 ISBN이 맞을 때만 형식 검수 후보로 제시한다',()=>{
 const notebook={...details,title:'Vincent van Gogh',subtitle:'',languages:[],physical_format:'Notebook / blank book'}
 assert.equal(readOfficialEdition(isbn,notebook,data).error,'english_language_not_confirmed')
 const review=providerReadingFormatReview(isbn,notebook,data)
 assert.deepEqual(review.reviewSignals,['non_reading_format'])
 assert.equal(review.sourceUrl,'https://openlibrary.org'+key)
 assert.equal(providerReadingFormatReview('9780062301239',notebook,data),null)
 assert.equal(providerReadingFormatReview(isbn,{...notebook,key:'/works/OL1W'},data),null)
 assert.equal(providerReadingFormatReview(isbn,details,data),null)
})

test('공식 조회에서 발견한 문구 형식은 검수 후보로 전달하고 메타 교정·통합으로 확정하지 않는다',async()=>{
 const catalog={locales:[],editions:[{id:1,content_id:'a',locale:'en',isbn,title:'Vincent van Gogh'}]}
 const fetchImpl=async url=>({ok:true,json:async()=>new URL(url).searchParams.get('jscmd')==='details'
  ?{['ISBN:'+isbn]:{details:{...details,title:'Vincent van Gogh',subtitle:'',languages:[],physical_format:'Notebook / blank book'}}}
  :{['ISBN:'+isbn]:data}})
 const result=await auditEnglishProviders(catalog,{fetchImpl})
 assert.equal(result.reviewCandidates.length,1)
 assert.equal(result.reviewCandidates[0].contentId,'a')
 assert.deepEqual(result.reviewCandidates[0].reviewSignals,['non_reading_format'])
 assert.deepEqual(result.differences,[])
 assert.deepEqual(result.workCandidates,[])
 assert.equal(result.errors[0].error,'english_language_not_confirmed')
})
