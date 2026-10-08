import test from 'node:test'
import assert from 'node:assert/strict'
import {planSeriesRepair,buildSeriesPrepareSql} from './series-split-repair.mjs'
const candidate={contentIds:['first','second'],evidence:[{stem:'연속 이야기'}],sourceReview:{verdict:'series_split_confirmed',method:'independent_series_review',sources:['https://publisher.example/series']}}
function fixture(){return {contents:[{id:'second',type:'BOOK',metadata:{other:'preserved',figureBook:{workIdentity:'book/second',workCreator:'작가'}}},{id:'first',type:'BOOK',metadata:{other:'preserved',figureBook:{workIdentity:'book/first',workCreator:'작가'}}}],locales:[{content_id:'first',locale:'ko',title:'연속 이야기 1',sources:{title:'https://provider.example/1'}}],editions:[{id:1,content_id:'first',locale:'ko',title:'연속 이야기 1',creator:'작가',isbn:'9780743273565',sources:{translators:['역자']}},{id:2,content_id:'second',locale:'ko',title:'연속 이야기 2',creator:'작가',isbn:'9780593098240',sources:{}}],readings:[],members:[]}}
test('첫 권을 대표로 선택하고 다른 저작·외국어 판본·실독 충돌을 차단한다',()=>{
 assert.equal(planSeriesRepair(candidate,fixture()).keep,'first')
 for(const change of [c=>c.contents[0].metadata.figureBook.workIdentity='author/other',c=>c.members.push({id:'m'}),c=>c.readings.push({id:'r'}),c=>c.editions[0].locale='en',c=>c.editions[0].title='다른 책 1']){const c=fixture();change(c);assert.throws(()=>planSeriesRepair(candidate,c))}
 assert.throws(()=>planSeriesRepair({...candidate,sourceReview:{verdict:'candidate_only'}},fixture()))
})
test('대표 제목과 정확한 권 범위를 바꾸되 원래 판본 제목·ISBN·표지·역자와 다른 메타를 보존한다',()=>{
 const c=fixture(),before=structuredClone(c),p=planSeriesRepair(candidate,c),sql=buildSeriesPrepareSql(p,c)
 assert.deepEqual(c,before)
 assert.match(sql,/concurrent contents/)
 assert.match(sql,/"other":"preserved"/)
 assert.match(sql,/"translators":\["역자"\]/)
 assert.match(sql,/"edition_title":"연속 이야기 2"/)
 assert.match(sql,/text_scope=E'volume\/2'/)
 assert.doesNotMatch(sql,/SET[^;]*(?:thumbnail_url|isbn)=/)
 assert.match(sql,/COMMIT;\nSELECT 'MERGE_COMMITTED'/)
})
test('기존 독립 검수 범위를 덮어쓰지 않고 현재 ISBN 근거가 빠지면 차단한다',()=>{
 const c=fixture();c.editions[0].sources.edition_work_evidence=[{method:'independent_work_review'}];c.editions[0].edition_kind='abridged';c.editions[0].text_scope='chapters/1-4'
 assert.throws(()=>planSeriesRepair(candidate,c),/이미 검수한/)
 assert.throws(()=>planSeriesRepair({...candidate,sourceReview:{...candidate.sourceReview,method:'kakao_isbn_series_review',editions:{}}},fixture()),/독립 출처/)
})
test('권수 없는 기존 대표와 표시용 영문 시리즈명을 보존한다',()=>{
 const c=fixture();c.editions[0].title='연속 이야기';c.editions[1].title='연속 이야기 2';assert.equal(planSeriesRepair(candidate,c).keep,'first')
 c.locales.push({content_id:'first',locale:'en',title:'Ongoing Story Vol. 1: Part One',sources:{primary:'none',title:'translated'}},{content_id:'second',locale:'en',title:'Ongoing Story Vol. 2: Part Two',sources:{primary:'none',title:'translated'}})
 const sql=buildSeriesPrepareSql(planSeriesRepair(candidate,c),c);assert.match(sql,/title=E'Ongoing Story'/);assert.match(sql,/"edition_title":"Ongoing Story Vol. 1: Part One"/)
})
test('세트의 명시적 권 범위만 보존하고 전권 완독이나 완전판으로 확대하지 않는다',()=>{
 const c=fixture();c.editions[1].title='연속 이야기 세트(전3권)'
 const sql=buildSeriesPrepareSql(planSeriesRepair(candidate,c),c)
 assert.match(sql,/text_scope=E'volumes\/1-3'/);assert.match(sql,/edition_kind=E'selection'/);assert.doesNotMatch(sql,/text_scope=E'complete'/)
 c.editions[1].title='연속 이야기 세트';assert.doesNotMatch(buildSeriesPrepareSql(planSeriesRepair(candidate,c),c),/volumes\/1-/)
})

test('번호와 같은 저자·출판사만 확인한 과거 판정은 직접 통합 경로에서도 거부한다',()=>{
 assert.throws(()=>planSeriesRepair({...candidate,sourceReview:{...candidate.sourceReview,method:'kakao_isbn_series_review'}},fixture()),/독립 출처/)
 assert.throws(()=>planSeriesRepair({...candidate,sourceReview:{...candidate.sourceReview,method:undefined}},fixture()),/독립 출처/)
})
