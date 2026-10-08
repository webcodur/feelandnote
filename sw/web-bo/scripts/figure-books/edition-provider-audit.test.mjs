import assert from 'node:assert/strict'
import test from 'node:test'
import {readOfficialEdition,providerMetadataDifference,providerWorkCandidates} from './lib/edition-provider-audit.mjs'
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
