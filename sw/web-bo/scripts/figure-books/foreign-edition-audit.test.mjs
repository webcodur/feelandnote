import test from 'node:test'
import assert from 'node:assert/strict'
import {confirmedEnglishImports} from './lib/foreign-edition-audit.mjs'
const row={id:1,content_id:'a',locale:'ko',isbn:'9780141396866',title:'Truce',creator:'Mario Benedetti'}
const c={contents:[{id:'a',metadata:{workKey:'/works/OL741877W'}}],editions:[row]}
const official={isbn:row.isbn,workKeys:['/works/OL741877W'],title:'Truce: The Diary of Martín Santomé',mainTitle:'Truce'}
test('한국어판 제목이 로마자로 보이는 것만으로 언어를 변경하지 않는다',()=>{
 assert.equal(confirmedEnglishImports(c,new Map([[row.isbn,{error:'english_language_not_confirmed'}]])).length,0)
 assert.equal(confirmedEnglishImports(c,new Map([[row.isbn,{...official,workKeys:['/works/OL2W']}]])).length,0)
 assert.equal(confirmedEnglishImports(c,new Map([[row.isbn,{...official,title:'Truce Reader',mainTitle:'Truce Reader'}]])).length,0)
 assert.equal(confirmedEnglishImports(c,new Map([[row.isbn,official]])).length,1)
})
test('실제 영어 판본이 이미 있으면 같은 ISBN의 중복만 표시한다',()=>{
 const duplicate={...row,id:2,locale:'en'}
 assert.equal(confirmedEnglishImports({...c,editions:[row,duplicate]},new Map([[row.isbn,official]]))[0].duplicate.id,2)
 assert.equal(confirmedEnglishImports({...c,editions:[{...row,sources:{edition_work_evidence:[{}]}}]},new Map([[row.isbn,official]])).length,0)
})
