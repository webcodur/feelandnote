import assert from 'node:assert/strict'
import test from 'node:test'
import {inspectEditionCatalog} from './lib/edition-catalog-checks.mjs'

test('모든 작품·언어 카드·판본을 세고 표시용 행을 실판본과 구별한다',()=>{
 const c={contents:[{id:'a'}],locales:[{content_id:'a',locale:'ko',title:'번역 제목',sources:{primary:'none',title:'translated'}}],editions:[
  {id:1,content_id:'a',locale:'en',title:'Elon Musk',creator:'애슐리 반스',isbn:'9780062301253'},
  {id:2,content_id:'a',locale:'en',title:'번역 제목',sources:{primary:'none',title:'translated'}},
  {id:3,content_id:'missing',locale:'en',title:'Another Book',isbn:'1234567890123'},
 ]}
 const r=inspectEditionCatalog(c)
 assert.equal(r.checkedWorks,1);assert.equal(r.checkedLocales,1);assert.equal(r.checkedEditions,3)
 assert.deepEqual(r.issues.map(row=>row.error),['display_title_registered_as_physical_edition','missing_book_work','invalid_isbn'])
 assert.equal(r.enMetadata.koreanCreator,1);assert.equal(r.enMetadata.missingCreator,2)
})

test('ISBN-10과 ISBN-13을 같은 키로 비교하고 동일 작품의 카드·판본은 중복 작품으로 세지 않는다',()=>{
 const c={contents:[{id:'a'},{id:'b'}],locales:[{content_id:'a',title:'Book',isbn:'006230125X'}],editions:[{content_id:'a',title:'Book',isbn:'9780062301253'}]}
 assert.equal(inspectEditionCatalog(c).sharedIsbns.length,0)
 c.editions.push({content_id:'b',title:'Book',isbn:'9780062301253'})
 assert.equal(inspectEditionCatalog(c).sharedIsbns.length,1)
})

test('제목 검색만 있는 행은 실판본이 아니며 실제 첫 권 출처를 가진 시리즈는 보존한다',()=>{
 const base={content_id:'a',locale:'ko',title:'시리즈',isbn:null,sources:{primary:'kakao_book',title:'kakao_title_search'}}
 const c={contents:[{id:'a'}],locales:[],editions:[{...base,id:1},{...base,id:2,sources:{...base.sources,series_source_url:'https://search.daum.net/search?w=bookpage&bookId=123'}}]}
 assert.deepEqual(inspectEditionCatalog(c).issues.map(row=>row.id),[1])
 c.editions.push({...base,id:3,publisher:'실제 출판사',thumbnail_url:'https://example.com/cover.jpg'})
 assert.equal(inspectEditionCatalog(c).unresolvedTitleSearchEditions,1)
 assert.deepEqual(inspectEditionCatalog(c).issues.map(row=>row.id),[1])
})
