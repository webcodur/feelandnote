import test from 'node:test'
import assert from 'node:assert/strict'
import {confirmedEditionDuplicatePairs} from './edition-work-dedup.mjs'

const row = (id, title='Origin') => ({content_id:id,locale:'en',title,creator:'Dan Brown',isbn:'9780385514231',sources:{primary:'openlibrary',workKey:'/works/OL1W',title:'https://openlibrary.org/books/OL1M'},edition_kind:null,text_scope:null})
const catalog = () => ({contents:[{id:'a',figureBook:{},referenceCounts:{member_contents:1}},{id:'b',figureBook:{source:'thin-en'}}],editions:[row('a'),row('b')]})
test('원작 키·실판본 출처·정확한 제목·저자의 일치를 모두 요구한다',()=>{
 assert.deepEqual(confirmedEditionDuplicatePairs(catalog()).map(({keep,drop})=>({keep,drop})),[{keep:'a',drop:'b'}])
 for(const patch of [{creator:'Other Writer'},{title:'Other Novel'},{sources:{primary:'none'}},{edition_kind:'abridged'},{text_scope:'selected chapters'}]){
  const c=catalog();Object.assign(c.editions[1],patch);assert.equal(confirmedEditionDuplicatePairs(c).length,0)
 }
})
test('학습판·독립 해설·연속권·이미 검수한 별개 원작은 같은 공급자 키여도 통합하지 않는다',()=>{
 for(const title of ['Origin: Penguin Readers Level 3','Origin Study Guide','Origin Volume 2','Origin Selected Stories']){
  const c=catalog();c.editions=c.editions.map(row=>({...row,title}));assert.equal(confirmedEditionDuplicatePairs(c).length,0)
 }
 const c=catalog();c.editions[1].sources.work_attribution={method:'independent_work_review'};assert.equal(confirmedEditionDuplicatePairs(c).length,0)
})
