import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan,resolveBook,checkReadback} from './reading-way-books-apply.mjs';

const relation={content_id:'book-id',original_index:0,book_index:0};
const original={books:[{review_ko:'추천 목록의 마지막 책이다.',review_en:'The last book.',source_url:'https://example.com/source'}]};
test('reviews come from the referenced response; a local factual edit must match exactly once',()=>{
  const r=resolveBook({...relation,factual_edits:[{field:'review',from:'마지막 책',to:'책'}]},[original]);
  assert.equal(r.review,'추천 목록의 책이다.');assert.equal(r.review_en,original.books[0].review_en);
  assert.throws(()=>resolveBook({...relation,factual_edits:[{field:'review',from:'없는 부분',to:'추가'}]},[original]),/not found in review \(book 0\)/);
  const twice={books:[{...original.books[0],review_ko:'책이다. 책이다.'}]};
  assert.throws(()=>resolveBook({...relation,factual_edits:[{field:'review',from:'책이다',to:'글이다'}]},[twice]),/not unique in review/);
  assert.throws(()=>resolveBook({...relation,book_index:1},[original]));
});
test('rejects duplicate shelf relationships and invented edition values on a display row',()=>{
  const p={slug:'test-person',originals:[{path:'C:/temp/raw.json',sha256:'a'.repeat(64)}],relations:[relation]};
  validatePlan(p);assert.throws(()=>validatePlan({...p,relations:[relation,relation]}));
  const display={locale:'ko',title:'표시 제목',creator:'저자',isbn:null,publisher:'꾸민 출판사',thumbnail_url:null,description:null,sources:{primary:'none',title:'translated'}};
  assert.throws(()=>validatePlan({...p,newLocales:[{...display,content_id:'book-id'}]}));
});
test('a work without any KO/EN edition is accepted only as out-of-print display rows',()=>{
  const p={slug:'test-person',originals:[{path:'C:/temp/raw.json',sha256:'a'.repeat(64)}],relations:[relation]};
  const row=(locale,title)=>({locale,title,creator:'저자',isbn:null,publisher:null,thumbnail_url:null,description:null,sources:{primary:'none',title,availability:'out_of_print'}});
  const work={id:'book-id',external_id:null,external_source:null,locales:[row('ko','translated'),row('en','original')]};
  validatePlan({...p,newWorks:[work]});
  assert.throws(()=>validatePlan({...p,newWorks:[{...work,locales:[row('ko','translated'),{...row('en','original'),sources:{primary:'none',title:'original'}}]}]}));
  assert.throws(()=>validatePlan({...p,newWorks:[{...work,external_source:'kakao_book'}]}));
});
test('a new release missing from Kakao/OpenLibrary may use one checked English publisher edition',()=>{
  const p={slug:'test-person',originals:[{path:'C:/temp/raw.json',sha256:'a'.repeat(64)}],relations:[relation]};
  const ko={locale:'ko',title:'표시 제목',creator:'저자',isbn:null,publisher:null,thumbnail_url:null,description:null,sources:{primary:'none',title:'translated'}};
  const page='https://publisher.example/book/9780063456952';
  const en={locale:'en',title:'Book',creator:'Author',isbn:'9780063456952',publisher:'Publisher',thumbnail_url:'https://publisher.example/cover.jpg',description:null,sources:{primary:'publisher',isbn:page,thumbnail:page}};
  const work={id:'book-id',external_id:null,external_source:null,locales:[ko,en]};
  validatePlan({...p,newWorks:[work]});
  assert.throws(()=>validatePlan({...p,newWorks:[{...work,locales:[ko,{...en,sources:{primary:'publisher'}}]}]}),/Invalid edition/);
  assert.throws(()=>validatePlan({...p,newWorks:[{...work,locales:[{...ko,locale:'ko',isbn:'9780063456952',publisher:'P',sources:{primary:'publisher',isbn:page}},{...en,locale:'en'}]}]}),/Invalid edition/);
  assert.throws(()=>validatePlan({...p,newWorks:[{...work,locales:[ko,{...en,sources:{...en.sources,availability:'out_of_print'}}]}]}));
  assert.throws(()=>validatePlan({...p,newWorks:[{...work,locales:[ko,{...en,isbn:null,publisher:null,thumbnail_url:null,sources:{primary:'none',title:'original'}}]}]}),/out-of-print/);
});
test('readback accepts automatic book counters while rejecting old review/private-state changes',()=>{
  const old={id:'old',content_id:'old-book',review:'기존 감상',visibility:'private'};
  const before={person:{reading_way:'원문',reading_way_en:'Original'},book_count:1,relations:[old],works:[{id:'book-id',type:'BOOK',celeb_count:2,record_count:3,locales:[{locale:'ko',title:'기존 제목'}]}]};
  const r=resolveBook(relation,[original]);
  const after={person:{...before.person},book_count:2,relations:[{...old},{...r,status:'FINISHED',visibility:'public'}],works:[{...before.works[0],celeb_count:3,record_count:4}]};
  checkReadback(before,after,{},[r]);
  assert.throws(()=>checkReadback(before,{...after,relations:[{...old,visibility:'public'},after.relations[1]]},{},[r]));
  assert.throws(()=>checkReadback(before,{...after,person:{...before.person,reading_way:'수정됨'}},{},[r]));
  assert.throws(()=>checkReadback(before,{...after,works:[{...after.works[0],locales:[{locale:'ko',title:'다른 제목'}]}]},{},[r]));
});
