import test from 'node:test'
import assert from 'node:assert/strict'
import {compareKakaoEdition,auditKakaoEditions} from './lib/kakao-edition-audit.mjs'
const isbn='9788937425899',url='https://search.daum.net/search?w=bookpage&bookId=539411'
const row={locale:'ko',isbn,title:'자연의 지혜',creator:'애니 딜라드',publisher:'민음사',sources:{primary:'kakao_book',title:url}}
const official={title:row.title,creator:row.creator,metadata:{isbn,publisher:row.publisher,link:url}}
test('실제 ISBN·도서 ID·제목과 독립 검수 보호를 대조한다',()=>{
  assert.equal(compareKakaoEdition(row,official).bound,true)
  assert.equal(compareKakaoEdition(row,{...official,metadata:{...official.metadata,isbn:'9788934971016'}}).error,'kakao_isbn_mismatch')
  assert.equal(compareKakaoEdition({...row,sources:{primary:'kakao_book',title:'kakao_title_search'}},official).bound,false)
  assert.equal(compareKakaoEdition({...row,sources:{...row.sources,edition_work_evidence:[{}]}},official).bound,false)
  assert.equal(compareKakaoEdition(row,{...official,title:'다른 책'}).bound,false)
})
test('공급자 조회 실패를 ISBN 미등록으로 처리하지 않는다',async()=>{
  let calls=0
  const result=await auditKakaoEditions({editions:[row,row],locales:[]},{lookup:async()=>{calls++;return null}})
  assert.equal(calls,1);assert.equal(result.errors.length,2);assert.equal(result.errors[0].error,'kakao_isbn_not_found')
  // ISBN 필터에서 탈락하는 값은 외부 요청을 만들지 않는다.
  assert.equal((await auditKakaoEditions({editions:[{...row,isbn:'bad'}],locales:[]},{lookup:async()=>{throw Error('must not call')}})).officialByIsbn.size,0)
})
