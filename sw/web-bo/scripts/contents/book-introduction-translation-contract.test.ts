import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planIntroductionTranslation, type ReviewedIntroductionTranslation } from './book-introduction-translation-contract'
import { buildIntroductionApplySql } from './book-description-sources-contract'

const input: ReviewedIntroductionTranslation = {
  target: {content_id:'a',locale:'ko',title:'시험 작품',creator:'작가',publisher:null,isbn:null,description:null,sources:{primary:'none',title:'translated'}},
  source: {content_id:'a',locale:'en',title:'A Test',creator:'Author',publisher:null,isbn:'9780140439076',description:'The story follows a traveler and his family.',sources:{primary:'openlibrary'}},
  sourceUrl:'https://openlibrary.org/works/OL123W', sourceText:'The story follows a traveler and his family.',
  translation:'한 여행자와 그 가족의 이야기를 다룬다.', identityEvidence:[{url:'https://openlibrary.org/books/OL456M',note:'Same work and author'}],
}
test('fills an ISBN-less display row while preserving its bibliographic metadata',()=>{
 const result=planIntroductionTranslation(input)!
 assert.equal(result.before.isbn,null)
 assert.equal(result.sources.primary,'none')
 assert.equal(result.sources.description,input.sourceUrl)
 assert.equal(result.sources.description_method,'translation')
 assert.equal(result.sources.description_source_locale,'en')
 assert.equal(result.description,input.translation)
})
test('preserves existing introductions and rejects cross-work or missing-source translations',()=>{
 assert.equal(planIntroductionTranslation({...input,target:{...input.target,description:'기존 소개'}}),null)
 assert.throws(()=>planIntroductionTranslation({...input,source:{...input.source,content_id:'b'}}),/mismatch/)
 assert.throws(()=>planIntroductionTranslation({...input,sourceUrl:'https://example.com/works/OL123W'}),/Unverified/)
 assert.throws(()=>planIntroductionTranslation({...input,identityEvidence:[]}),/identity/)
 assert.throws(()=>planIntroductionTranslation({...input,sourceText:'목차와 서지 정보'}),/Unverified/)
})
test('translation apply locks both the destination and its original source row',()=>{
 const change=planIntroductionTranslation(input)!
 const sql=buildIntroductionApplySql('a',[change],null,[input.source])
 assert.match(sql,/Translation source changed concurrently/)
 assert.match(sql,/Book introduction changed concurrently/)
 assert.match(sql,/FOR SHARE/)
 assert.throws(()=>buildIntroductionApplySql('a',[change],null,[{...input.source,content_id:'b'}]),/One book/)
})
