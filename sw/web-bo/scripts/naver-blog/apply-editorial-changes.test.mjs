import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {prepareEditorialChanges,assertEditorialChangeResult,bindEditorialCover} from './apply-editorial-changes.mjs';
const original=()=>({post:{logNo:'123',kind:'curated'},snapshot:{title:'제목',text:['책 소개'],links:[{href:'https://example.com'}],flow:[{kind:'se-text',paragraphs:['책 소개']},{kind:'se-table',paragraphs:['책','작가','잘못된 저자']}],dividers:1,images:[{id:'photo',src:'https://example.com/a.jpg',width:'100',height:'100',naturalWidth:500,naturalHeight:500,representative:true}]},table:[['책','작가'],['책 하나','잘못된 저자']]});
const plan=()=>({logNo:'123',edits:[{before:'잘못된 저자',after:'확인된 저자'}]});

test('공통 서식만 바꿀 때 본문·사진·링크·표를 그대로 대조하고 빈 작업은 거부한다',()=>{
 const o=original(),p={logNo:'123',edits:[],formats:[{text:'책 소개',size:19,align:'left'}]},expected=prepareEditorialChanges(o,p);
 assert.deepEqual(expected.snapshot,o.snapshot);assert.deepEqual(expected.table,o.table);assertEditorialChangeResult(o,expected,expected.snapshot,expected.table);
 assert.throws(()=>prepareEditorialChanges(o,{...p,formats:[]}));
 assert.throws(()=>prepareEditorialChanges(o,{...p,formats:[{text:'없는 문단',size:19}]}));
 const changed=structuredClone(expected.snapshot);changed.links=[];assert.throws(()=>assertEditorialChangeResult(o,expected,changed,expected.table));
});

test('소개 문단 간격은 검수한 인물 프로필 바로 뒤의 도입에만 허용한다',()=>{
 const o=original();o.post.kind='celeb';
 const prefix=['서비스 링크','인물 · 작가','인물의 서재','검수한 프로필','검수한 도입'];
 o.snapshot.text.unshift(...prefix);o.snapshot.flow.unshift({kind:'se-text',paragraphs:prefix});
 const introGap={profile:prefix[3],intro:prefix[4]},p={...plan(),introGap};
 const expected=prepareEditorialChanges(o,p);assert.deepEqual(expected.snapshot.text,o.snapshot.text);
 assert.throws(()=>prepareEditorialChanges(o,{...p,introGap:{profile:'다른 프로필',intro:prefix[4]}}),/spacing/);
 assert.throws(()=>prepareEditorialChanges(o,{...p,introGap:{profile:prefix[3],intro:'책 소개'}}),/spacing/);
 assert.throws(()=>prepareEditorialChanges({...o,post:{...o.post,kind:'curated'}},p),/spacing/);
});
test('한 셀을 고치고 다른 본문·링크·표 순서를 보존한다',()=>{const o=original(),p=prepareEditorialChanges(o,plan());assert.deepEqual(p.table,[['책','작가'],['책 하나','확인된 저자']]);assert.deepEqual(p.snapshot.text,o.snapshot.text);assertEditorialChangeResult(o,p,p.snapshot,p.table);});
test('중복·누락 문단과 연결된 링크의 텍스트 교체를 차단한다',()=>{for(const before of ['없음','https://example.com'])assert.throws(()=>prepareEditorialChanges(original(),{logNo:'123',edits:[{before,after:'새 글'}]}));const o=original();o.snapshot.flow.push({kind:'se-text',paragraphs:['잘못된 저자']});assert.throws(()=>prepareEditorialChanges(o,plan()));});
test('표 수정 중 감상·사진·대표 설정 손실을 차단한다',()=>{const o=original(),p=prepareEditorialChanges(o,plan());for(const mutate of [s=>s.text.pop(),s=>s.images[0].src='https://example.com/other.jpg',s=>s.images[0].representative=false]){const actual=structuredClone(p.snapshot);mutate(actual);assert.throws(()=>assertEditorialChangeResult(o,p,actual,p.table));}});
test('유효한 본문을 그대로 두고 라벨만 덧붙일 수 있다',()=>{const o=original();const p=prepareEditorialChanges(o,{logNo:'123',edits:[{before:'책 소개',after:'안내\n책 소개'}],formats:[{text:'안내',size:13},{text:'책 소개',size:19,align:'left'}]});assert.deepEqual(p.snapshot.text,['안내','책 소개']);assert.throws(()=>prepareEditorialChanges(o,{...plan(),formats:[{text:'없는 문단',size:19}]}));});
test('기관 아바타는 확대하지 않고 인물 주인공만 비율을 보존해 확대한다',()=>{const o=original();assert.throws(()=>prepareEditorialChanges(o,{...plan(),portraitWidth:360}));o.post.kind='celeb';o.snapshot.images[0].src='https://example.com/portrait-person.jpg';const p=prepareEditorialChanges(o,{...plan(),portraitWidth:360});const after=structuredClone(p.snapshot);Object.assign(after.images[0],{width:'360',height:'360',displayWidth:360,displayHeight:360});assertEditorialChangeResult(o,p,after,p.table);after.images[0].displayHeight=400;assert.throws(()=>assertEditorialChangeResult(o,p,after,p.table));});

test('명시적으로 검수한 본문 문단만 비우고 사진·링크·표·다른 문단은 보존한다',()=>{
 const o=original();o.snapshot.text.push('보존할 안내');o.snapshot.flow[0].paragraphs.push('보존할 안내');
 const edit={before:'책 소개',after:'',remove:true};const expected=prepareEditorialChanges(o,{logNo:'123',edits:[edit]});
 assert.deepEqual(expected.snapshot.text,['보존할 안내']);assert.deepEqual(expected.snapshot.flow[0].paragraphs,['보존할 안내']);
 assert.deepEqual(expected.snapshot.images,o.snapshot.images);assert.deepEqual(expected.snapshot.links,o.snapshot.links);assert.deepEqual(expected.table,o.table);
 assertEditorialChangeResult(o,expected,expected.snapshot,expected.table);
 for(const bad of [{before:'책 소개',after:''},{...edit,after:'대체 문구'},{before:'잘못된 저자',after:'',remove:true}])assert.throws(()=>prepareEditorialChanges(o,{logNo:'123',edits:[bad]}));
 const broken=structuredClone(expected.snapshot);broken.flow[0].paragraphs=[];assert.throws(()=>assertEditorialChangeResult(o,expected,broken,expected.table));
});

test('검수한 표지 한 장만 교체하고 다른 이미지·대표·위치 변경을 거부한다',()=>{
 const o=original();o.snapshot.images.push({id:'cover',componentKind:'image',src:'https://example.com/old-cover.jpg',width:'240',height:null,naturalWidth:200,naturalHeight:300,caption:[],representative:false,align:'se-section-align-center'});o.snapshot.flow.push({kind:'image',src:o.snapshot.images[1].src});
 const r={index:1,beforeSrc:o.snapshot.images[1].src,file:'C:/temp/cover-reviewed.jpg',sha256:'a'.repeat(64),marker:'cover-reviewed',width:240};const p=prepareEditorialChanges(o,{...plan(),imageReplacements:[r]});assert.throws(()=>assertEditorialChangeResult(o,p,p.snapshot,p.table));
 Object.assign(r,{naturalWidth:200,naturalHeight:300});const after={...o.snapshot.images[1],src:'https://example.com/new-framed-cover.jpg',naturalWidth:240,naturalHeight:340,displayWidth:240,displayHeight:340};
 for(const change of [{representative:true},{naturalWidth:280},{align:'se-section-align-left'},{caption:['잘못된 사진']}])assert.throws(()=>bindEditorialCover(p,r,{...after,...change}));
 bindEditorialCover(p,r,after);assertEditorialChangeResult(o,p,p.snapshot,p.table);assert.equal(o.snapshot.images[1].src,'https://example.com/old-cover.jpg');const bad=structuredClone(p.snapshot);bad.images[0].src='https://example.com/other.jpg';assert.throws(()=>assertEditorialChangeResult(o,p,bad,p.table));
 assert.throws(()=>prepareEditorialChanges(o,{...plan(),imageReplacements:[{...r,index:0,beforeSrc:o.snapshot.images[0].src}]}));
});

test('긴 감상을 요약할 때 지정한 인용 문단만 제거하고 같은 구획의 남은 문단을 보존한다',()=>{
 const o=original();o.snapshot.flow.push({kind:'se-quotation',paragraphs:['원문 첫 문단','원문 둘째 문단','원문 셋째 문단']});
 const expected=prepareEditorialChanges(o,{logNo:'123',edits:[{before:'원문 첫 문단',after:'독서 경위\n검수한 간접 서술'},{before:'원문 둘째 문단',after:'',remove:true},{before:'원문 셋째 문단',after:'',remove:true}]});
 assert.deepEqual(expected.snapshot.flow.at(-1).paragraphs,['독서 경위','검수한 간접 서술']);assert.deepEqual(expected.snapshot.text,o.snapshot.text);assert.deepEqual(expected.table,o.table);assertEditorialChangeResult(o,expected,expected.snapshot,expected.table);
 const broken=structuredClone(expected.snapshot);broken.flow.at(-1).paragraphs.push('원문 셋째 문단');assert.throws(()=>assertEditorialChangeResult(o,expected,broken,expected.table));
});

test('전체 표 해시와 정확한 위치를 대조해 누락 행 하나만 넣고 기존 모든 셀을 보존한다',()=>{
 const o=original();o.snapshot.flow[1].paragraphs=o.table.flat();const tableRowInsert={index:1,beforeRowsSha256:crypto.createHash('sha256').update(JSON.stringify(o.table)).digest('hex'),row:['누락된 책','확인한 저자']};
 const expected=prepareEditorialChanges(o,{...plan(),tableRowInsert});assert.deepEqual(expected.table,[o.table[0],tableRowInsert.row,['책 하나','확인된 저자']]);assert.deepEqual(expected.snapshot.flow[1].paragraphs,expected.table.flat());assertEditorialChangeResult(o,expected,expected.snapshot,expected.table);
 for(const bad of [{...tableRowInsert,index:0},{...tableRowInsert,beforeRowsSha256:'0'.repeat(64)},{...tableRowInsert,row:o.table[1]},{...tableRowInsert,row:['책','저자','추가열']}])assert.throws(()=>prepareEditorialChanges(o,{...plan(),tableRowInsert:bad}));
 const broken=structuredClone(expected.table);broken.at(-1)[0]='다른 책';assert.throws(()=>assertEditorialChangeResult(o,expected,expected.snapshot,broken));
});

test('지정한 기존 표지만 확대하고 다른 사진과 원본 비율은 보존한다',()=>{
 const o=original();o.snapshot.images.push({id:'cover',componentKind:'image',src:'https://example.com/book.jpg',width:'120',height:'180',naturalWidth:400,naturalHeight:600,caption:[],representative:false,align:'center'});
 const resize={index:1,beforeSrc:o.snapshot.images[1].src,width:240};const expected=prepareEditorialChanges(o,{...plan(),imageWidths:[resize]});const after=structuredClone(expected.snapshot);Object.assign(after.images[1],{width:'240',height:'360',displayWidth:240,displayHeight:360});assertEditorialChangeResult(o,expected,after,expected.table);
 for(const bad of [{...resize,index:0},{...resize,beforeSrc:'https://example.com/other.jpg'},{...resize,width:360}])assert.throws(()=>prepareEditorialChanges(o,{...plan(),imageWidths:[bad]}));
 const broken=structuredClone(after);broken.images[1].displayHeight=200;assert.throws(()=>assertEditorialChangeResult(o,expected,broken,expected.table));
});

test('중복 본문은 지정한 순번만 수정하고 인용·표와 중복되는 순번은 거부한다',()=>{
 const o=original();o.snapshot.text.push('책 소개');o.snapshot.flow.push({kind:'se-text',paragraphs:['책 소개']});
 const edit={before:'책 소개',after:'두 번째 소개',occurrence:1};const expected=prepareEditorialChanges(o,{logNo:'123',edits:[edit]});assert.deepEqual(expected.snapshot.text,['책 소개','두 번째 소개']);assert.deepEqual(expected.snapshot.flow.at(-1).paragraphs,['두 번째 소개']);
 assert.throws(()=>prepareEditorialChanges(o,{logNo:'123',edits:[{before:'책 소개',after:'새 소개'}]}));
 assert.throws(()=>prepareEditorialChanges(o,{logNo:'123',edits:[edit,{...edit}]}));
 o.snapshot.flow.push({kind:'se-quotation',paragraphs:['책 소개']});assert.throws(()=>prepareEditorialChanges(o,{logNo:'123',edits:[edit]}));
});

test('검수한 제목과 중앙 정렬을 적용하고 시각을 식별할 수 없는 예약은 거부한다',()=>{
 const o=original();const p={...plan(),title:'교정한 제목',formats:[{text:'확인된 저자',size:16,align:'center'}]};const expected=prepareEditorialChanges(o,p);assert.equal(expected.snapshot.title,p.title);assertEditorialChangeResult(o,expected,expected.snapshot,expected.table);
 assert.throws(()=>prepareEditorialChanges({...o,original:{reservation:{row:'기존 제목',count:2}}},p));
});


test('예약 제목만 바꿀 때 기존 날짜·시각·예약 수와 원본을 보존한다',()=>{
 const o=original();o.original={reservation:{row:'제목\n2027.01.29 09:00',count:78}};const before=structuredClone(o),p={...plan(),title:'교정한 제목'};const expected=prepareEditorialChanges(o,p);
 assert.deepEqual(expected.reservation,{row:'교정한 제목\n2027.01.29 09:00',count:78});assert.deepEqual(o,before);
 for(const reservation of [{row:'제목\n2027.01.29 09:00\n추가',count:78},{row:'다른 제목\n2027.01.29 09:00',count:78},{row:'제목\n2027.01.29 09:00',count:0}])assert.throws(()=>prepareEditorialChanges({...o,original:{reservation}},p));
 assert.throws(()=>prepareEditorialChanges(o,{...p,title:'교정한 제목\n2028.01.01 10:00'}));
});
