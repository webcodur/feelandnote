import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublisherToc,publisherTocMatchesEdition,createPublisherTocLoader} from './series-split-toc-check.mjs';
const isbn='9788937432118';
const html=(title='책',toc='본문의 사건과 인물, 연구 자료를 검토하는 긴 목차 항목. '.repeat(8)) => `<h2 class="gd_name">${title}</h2><span class="gd_auth">저자 A, 저자 B 저</span><span class="gd_pub">출판사</span><th>ISBN13</th><td>${isbn}</td><div id="infoset_toc"><textarea class="txtContentText">${toc}</textarea></div>`;
const edition={isbn,title:'책(큰글자책)',creator:'저자 B, 저자 A',publisher:'출판사'};
test('ISBN·표제·전체 저자·출판사까지 실제 목차 출처와 맞아야 한다',()=>{
 const source=parsePublisherToc(html(),'https://www.yes24.com/Product/Goods/1');
 assert.ok(publisherTocMatchesEdition(source,edition));
 for(const other of [{...edition,isbn:'9788937444869'},{...edition,title:'책 2'},{...edition,creator:'저자 C'},{...edition,creator:null},{...edition,publisher:null}])assert.equal(publisherTocMatchesEdition(source,other),false);
 assert.equal(parsePublisherToc(html().replace('id="infoset_toc"','id="other"'),'https://publisher.example'),null);
 assert.equal(parsePublisherToc(html('책','짧은 목차'),'https://publisher.example'),null);
});
test('권·연도·장 번호가 다른 목차는 숫자를 지워 동일 본문으로 취급하지 않는다',()=>{
 assert.notEqual(parsePublisherToc(html('책','1901년 사건에 관한 상세한 분석. '.repeat(12)),'https://publisher.example').tocHash,parsePublisherToc(html('책','1902년 사건에 관한 상세한 분석. '.repeat(12)),'https://publisher.example').tocHash);
});
test('같은 ISBN의 네트워크 응답을 재사용해도 요청 판본의 저자를 다시 검사한다',async()=>{
 let calls=0; const loader=createPublisherTocLoader(async url=>{calls++;return {ok:true,text:async()=>url.includes('Search?')?'<a class="gd_name" href="/Product/Goods/1">책</a>':html()}});
 assert.ok(await loader.load(edition));
 assert.equal(await loader.load({...edition,creator:'다른 저자'}),null);
 assert.equal(calls,2);assert.equal(loader.count(),1);
});
test('출처 요청의 HTTP 오류는 본문 증거가 되지 않는다',async()=>{
 const loader=createPublisherTocLoader(async()=>({ok:false,status:503}));
 assert.deepEqual(await loader.load(edition),{error:'HTTP 503'});
});
