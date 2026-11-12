import test from 'node:test';
import {titleAndFunnelPatch} from './unified-title-patch.mjs';
import assert from 'node:assert/strict';
import {readingWayBody,withoutReadingWay} from './reading-way-section.mjs';
import {compileUnifiedArticle,renderUnifiedArticle,UNIFIED_ARTICLE,yes24Link,textPresentation,servicePostUrl,unifiedFlow} from './unified-article.mjs';
const input=()=>({logNo:'123',title:'인물의 독서 기록',kind:'celeb',selection:{eligibleBooks:1},serviceUrl:'https://feelandnote.com/celeb/test',subject:{id:'person',name:'인물',imageUrl:'https://example.com/portrait.jpg',introduction:'인물 안내 첫 문단입니다.\n\n인물 안내 둘째 문단입니다.',introductionSource:'celeb_explanations:person:plain_text'},books:[{content_id:'book',title:'책',creator:'작가',coverUrl:'https://example.com/book.jpg',introduction:'책의 내용입니다.',introductionSource:'reviewed-manuscript',id:'review',review:'읽게 된 경위입니다.\n\n확인된 평가입니다.',source_url:'https://example.com/interview'}],closingLine:{kind:'service_line',text:'서비스에서 작성한 한마디'}});

test('인물 안내·책 소개·독서 방식·감상 배경 본문과 구획명을 모두 굵게 쓴다',()=>{
 const i=input();i.subject.readingWay={text:'책을 읽는 방식이다.',source:'celebs:person:reading_way'};
 const a=compileUnifiedArticle(i),plain=['인물 안내 첫 문단입니다.','인물 안내 둘째 문단입니다.','책의 내용입니다.'];
 for(const text of plain){const op=a.operations.find(o=>o.text===text);assert.equal(textPresentation(op).bold,true);assert.equal(op.formattedText,true);}
 for(const text of ['책을 읽는 방식이다.','읽게 된 경위입니다.','확인된 평가입니다.','책 소개','감상 배경'])assert.equal(textPresentation(a.operations.find(o=>o.text===text)).bold,true);
});

test('기존 독서 방식 교체 범위는 문단 수가 달라도 목차·책·사진을 포함하지 않는다',()=>{
 const text=s=>({kind:'text',text:s}),before=[text('인물 안내'),text('목차'),text('독서 방식'),text('책 목차'),{kind:'divider'},text('독서 방식'),text('옛 문단 하나'),text('옛 문단 둘'),{kind:'divider'},text('01 · 『책』'),{kind:'image',src:'cover'},text('책 소개')];
 const range=readingWayBody(before);assert.deepEqual(range.paragraphs,['옛 문단 하나','옛 문단 둘']);
 const after=structuredClone(before);after.splice(range.start,range.end-range.start,text('새 문단'));
 assert.deepEqual(readingWayBody(after).paragraphs,['새 문단']);assert.deepEqual(after.slice(0,range.start),before.slice(0,range.start));assert.deepEqual(after.slice(range.start+1),before.slice(range.end));
});

test('독서 방식 삭제는 목차 항목·구획·추가 구분선만 없애고 책과 기존 본문을 보존한다',()=>{
 const t=text=>({kind:'text',text}),intro=[t('인물 안내'),t('목차')],toc=[t('책 목차'),{kind:'divider'}],book=[t('01 · 『책』'),{kind:'image',src:'cover'},t('감상'),{kind:'divider'},t('마무리')];
 const flow=[...intro,t('독서 방식'),...toc,t('독서 방식'),t('옛 본문'),{kind:'divider'},...book];
 assert.deepEqual(withoutReadingWay(flow),[...intro,...toc,...book]);assert.equal(flow.filter(op=>op.text==='독서 방식').length,2);
 assert.throws(()=>withoutReadingWay([...intro,...toc,...book]),/TOC/);
});

test('독서 방식 교체는 모호한 제목·중복 본문·사진이 섞인 범위와 책 앞 경계 누락을 거부한다',()=>{
 const t=text=>({kind:'text',text}),valid=[t('독서 방식'),t('독서 방식'),t('본문'),{kind:'divider'},t('01 · 『책』')];
 assert.throws(()=>readingWayBody(valid.slice(1)),/TOC/);
 assert.throws(()=>readingWayBody([...valid,t('본문')]),/unique/);
 assert.throws(()=>readingWayBody([valid[0],valid[1],{kind:'image',src:'photo'},...valid.slice(2)]),/divider/);
 assert.throws(()=>readingWayBody([...valid.slice(0,4),t('다른 본문'),valid[4]]),/divider/);
});

test('독서 방식은 목차 다음에 추가하고 인물 안내와 기존 책 본문을 보존한다',()=>{
 const i=input(),before=compileUnifiedArticle(i);i.subject.readingWay={text:'읽는 습관이다.\n\n문장을 되새긴다.',source:'celebs:person:reading_way'};const a=compileUnifiedArticle(i),ops=a.operations;
 assert.ok(ops.some(o=>o.text==='인물 안내 첫 문단입니다.'));
 const start=ops.findIndex(o=>o.anchor==='reading-way'),book=ops.findIndex(o=>o.anchor==='book-01');assert.ok(start>ops.findIndex(o=>o.tocTarget==='service-info')&&start<book);
 assert.equal(ops.find(o=>o.tocTarget==='reading-way').text,'독서 방식');
 assert.deepEqual(ops.slice(book),before.operations.slice(before.operations.findIndex(o=>o.anchor==='book-01')));
 assert.ok(ops.filter(o=>['읽는 습관이다.','문장을 되새긴다.'].includes(o.text)).every(o=>o.bold===true&&o.color==='#5e3a21'));
 i.subject.readingWay.source='celebs:other:reading_way';assert.throws(()=>compileUnifiedArticle(i),/provenance/);
});

test('현재 목록에 공개 감상이 없다고 검수한 기관만 책 소개와 전체 목록으로 구성한다',()=>{
 const i=input();i.kind='curated';i.serviceUrl='https://feelandnote.com/library/curated/test/list';i.selection={method:'verified-curated-selection-without-reader-notes',publicReviewCount:0,listId:'list',eligibleBooks:5};i.fullList={source:'curated_lists:list',columns:['작품','저자'],rows:[['책','작가']]};i.books=Array.from({length:5},(_,n)=>{const b={...i.books[0],content_id:'book-'+n};delete b.review;delete b.source_url;delete b.id;return b;});delete i.closingLine;
 const a=compileUnifiedArticle(i);assert.equal(a.sources.length,0);assert.equal(a.operations.filter(o=>o.text==='책 소개').length,5);assert.ok(!a.operations.some(o=>o.text==='감상 배경'||o.role==='avatar'));assert.equal(a.operations.filter(o=>o.kind==='table').length,1);
 for(const edit of [x=>x.selection.publicReviewCount=1,x=>x.fullList.source='curated_lists:other',x=>x.selection.method='all-service-books',x=>x.kind='celeb']){const bad=structuredClone(i);edit(bad);assert.throws(()=>compileUnifiedArticle(bad));}
 const bad=structuredClone(i);bad.books[0].reviews=[{id:'existing'}];assert.throws(()=>compileUnifiedArticle(bad),/cannot discard/);
});
test('서비스 감상 원문과 출처를 책별로 보존하며 소개와 구분하고 한마디는 맨 아래 한 번만 둔다',()=>{const i=input(),a=compileUnifiedArticle(i),ops=a.operations;assert.deepEqual(ops.filter(o=>o.kind==='image').map(o=>o.role),['portrait','cover']);assert.equal(ops.filter(o=>o.text==='감상 배경').length,1);assert.ok(ops.findIndex(o=>o.text==='책 소개')<ops.findIndex(o=>o.text==='감상 배경'));assert.deepEqual(ops.filter(o=>['읽게 된 경위입니다.','확인된 평가입니다.'].includes(o.text)).map(o=>o.text),i.books[0].review.split('\n\n'));assert.equal(ops.filter(o=>o.text===i.closingLine.text).length,1);assert.ok(!ops.some(o=>o.text==='서비스 속 한마디'||o.text==='한마디'));const lineIndex=ops.findIndex(o=>o.text===i.closingLine.text);assert.ok(lineIndex>ops.findIndex(o=>o.text==='작품 상세'));assert.deepEqual(ops[lineIndex+1],{kind:'text',text:'- 인물',role:'author',align:'center'});assert.ok(ops.filter(o=>o.kind==='link'&&o.text.startsWith('YES24')).every(o=>o.align==='center'));assert.ok(ops.filter(o=>['heading','author'].includes(o.role)).every(o=>o.align==='center'));assert.ok(ops.filter(o=>['읽게 된 경위입니다.','확인된 평가입니다.','책의 내용입니다.'].includes(o.text)).every(o=>o.align==='left'));assert.ok(ops.filter(o=>o.tocTarget).every(o=>o.align==='left'&&o.quote==='contents'&&!o.bold));});
test('자료를 채우지 못한 글과 출처 없는 실제 명언은 발행 가능한 원고로 만들지 않는다',()=>{for(const key of ['review','source_url','introduction','introductionSource','coverUrl']){const i=input();delete i.books[0][key];assert.throws(()=>compileUnifiedArticle(i));}const i=input();i.closingLine={kind:'verified_quote',text:'명언'};assert.throws(()=>compileUnifiedArticle(i));});

test('서비스 원문의 단일 개행도 네이버가 만드는 문단과 맞추며 내용·출처 원본을 보존한다',()=>{const i=input();i.books[0].review='인터뷰 제목\n편집자 주: 확인된 설명입니다.\n\n감상 본문입니다.';const before=structuredClone(i),a=compileUnifiedArticle(i),review=a.operations.filter(o=>o.color===UNIFIED_ARTICLE.reviewColor);assert.deepEqual(review.map(o=>o.text),['인터뷰 제목','편집자 주: 확인된 설명입니다.','감상 본문입니다.']);assert.deepEqual(i,before);assert.equal(a.sources[0].source_url,i.books[0].source_url);assert.ok(!review.some(o=>o.text.includes('\n')));});
test('옛 원고와 보너스 사진·음악·중복 명언을 넘겨도 새 본문에 섞지 않는다',()=>{const i=input();i.legacyBody='옛 본문';i.bonusPhotos=['https://example.com/bonus.jpg'];i.oldQuotes=['낡은 명언'];const a=compileUnifiedArticle(i),html=renderUnifiedArticle(a);for(const value of ['옛 본문','bonus.jpg','낡은 명언'])assert.ok(!html.includes(value));assert.ok(UNIFIED_ARTICLE.remove.includes('video'));assert.ok(html.includes('font-size:'+UNIFIED_ARTICLE.font.body+'px'));});
test('기관은 작은 감상자 아바타와 전체 선정 목록을 보존하며 사진 역할을 구별한다',()=>{const i=input();i.kind='curated';i.serviceUrl='https://feelandnote.com/library/curated/type/name';i.books[0].reviews=[{id:'r',review:'감상입니다.',source_url:'https://example.com/source',person:{name:'감상자',title:'봄·봄 작가',avatar_url:'https://example.com/avatar.jpg'}}];i.fullList={columns:['작품','작가'],rows:[['책','작가'],['다른 책','다른 작가']],source:'official-list'};const a=compileUnifiedArticle(i),avatarAt=a.operations.findIndex(o=>o.role==='avatar');assert.equal(a.operations[avatarAt].width,UNIFIED_ARTICLE.avatarWidth);assert.equal(a.operations[avatarAt].name,'감상자');assert.equal(a.operations[avatarAt+1].text,'봄·봄 작가 감상자');assert.throws(()=>{const blank=structuredClone(i);blank.books[0].reviews[0].person.title=' ';compileUnifiedArticle(blank);},/title/);assert.deepEqual(a.operations.find(o=>o.kind==='table').rows,i.fullList.rows);delete i.fullList;assert.throws(()=>compileUnifiedArticle(i));});
test('HTML은 재료의 태그를 실행하지 않고 준비한 요약의 문단과 끝 문장까지 보존한다',()=>{const i=input();i.subject.name='<script>alert(1)</script>';i.books[0].introduction='완성된 소개입니다. '.repeat(30)+'\n\n마지막 문단입니다.';const a=compileUnifiedArticle(i),html=renderUnifiedArticle(a);assert.ok(!html.includes('<script>'));assert.ok(a.operations.some(o=>o.text==='완성된 소개입니다. '.repeat(30).trim()));assert.ok(a.operations.some(o=>o.text==='마지막 문단입니다.'));i.books[0].introductionSource='content_locales:book:ko';assert.throws(()=>compileUnifiedArticle(i),/fallback is disabled/);});
test('YES24 상품 링크와 검색 링크를 구별하고 ISBN을 우선하며 잘못된 목적지를 거부한다',()=>{const b=input().books[0];b.isbn='978-89-374-6044-9';assert.equal(new URL(yes24Link(b).href).searchParams.get('query'),'9788937460449');assert.equal(yes24Link(b).text,'YES24에서 찾기');b.yes24={url:'https://www.yes24.com/Product/Goods/12345',kind:'product'};assert.equal(yes24Link(b).text,'YES24에서 보기');b.yes24.url='https://yes24.com.evil.example/Product/Goods/12345';assert.throws(()=>yes24Link(b));b.yes24={url:'https://www.yes24.com/Product/Search?query=test',kind:'product'};assert.throws(()=>yes24Link(b));});
test('링크 조회 시각만 달라지면 같은 원고로 판단하고 감상이 바뀌면 다른 원고로 판단한다',()=>{const a=input();a.books[0].yes24={url:'https://www.yes24.com/Product/Goods/12345',kind:'product',resolvedAt:'first'};const before=compileUnifiedArticle(a);a.books[0].yes24.resolvedAt='later';assert.equal(compileUnifiedArticle(a).articleHash,before.articleHash);a.books[0].review+='\n\n새 감상입니다.';assert.notEqual(compileUnifiedArticle(a).articleHash,before.articleHash);});
test('마무리에 필앤노트의 용도를 설명하고 브랜드·인물·목적을 담은 링크를 한 번 둔다',()=>{const a=compileUnifiedArticle(input()),last=a.operations.at(-1);assert.deepEqual(last,{kind:'link',text:'필앤노트에서 인물의 전체 감상 기록 보기',href:'https://feelandnote.com/celeb/test',role:'body',align:'center',bold:true,gapBefore:true});assert.ok(a.operations.some(o=>o.text?.startsWith('필앤노트는 인물들의 감상 기록을 통해')));assert.equal(a.operations.filter(o=>o.kind==='link'&&o.href===a.serviceUrl).length,1);});
test('상단 번호 목차가 본문 순서와 기관 목록·한마디 유무를 반영하며 미동작 내부 링크를 만들지 않는다',()=>{for(const kind of ['celeb','curated'])for(const closing of [true,false]){const i=input();i.kind=kind;if(!closing)delete i.closingLine;if(kind==='curated'){i.books[0].reviews=[{id:'r',review:'감상',source_url:'https://example.com',person:{name:'독자',title:'수식어',avatar_url:'https://example.com/a.jpg'}}];i.fullList={columns:['작품'],rows:[['책']],source:'list'};}const a=compileUnifiedArticle(i),entries=a.operations.filter(o=>o.tocTarget),targets=a.operations.filter(o=>o.anchor).map(o=>'#'+o.anchor),html=renderUnifiedArticle(a);assert.deepEqual(entries.map(o=>'#'+o.tocTarget),targets);assert.ok(!a.operations.some(o=>o.kind==='link'&&o.href.startsWith('#')));assert.ok(a.operations.findIndex(o=>o.text==='목차')<a.operations.findIndex(o=>o.anchor==='book-01'));for(const entry of entries)assert.ok(html.includes('id="'+entry.tocTarget+'"'));}});

test('다섯 권을 구할 수 있는데 옛 세 권 선정만 재사용하거나 적은 권수의 근거가 없으면 차단한다',()=>{const i=input();i.selection.eligibleBooks=5;assert.throws(()=>compileUnifiedArticle(i),/Five books required/);i.books=Array.from({length:5},(_,n)=>({...i.books[0],id:'r'+n,content_id:'b'+n}));assert.equal(compileUnifiedArticle(i).operations.filter(o=>o.role==='cover').length,5);delete i.selection;assert.doesNotThrow(()=>compileUnifiedArticle(i));i.books=i.books.slice(0,3);assert.throws(()=>compileUnifiedArticle(i),/Five books required/);i.selection={eligibleBooks:3};assert.equal(compileUnifiedArticle(i).operations.filter(o=>o.role==='cover').length,3);});
test('감상 원문만 초록색으로 두고 구획명과 제목을 강조하며 내용 사이의 빈 줄과 중앙정렬을 공통 적용한다',()=>{const a=compileUnifiedArticle(input()),html=renderUnifiedArticle(a),review=a.operations.find(o=>o.text==='읽게 된 경위입니다.'),intro=a.operations.find(o=>o.text==='책의 내용입니다.');assert.equal(review.color,UNIFIED_ARTICLE.reviewColor);assert.equal(textPresentation(review).gapBefore,false);assert.ok(review.attachPrevious);assert.ok(textPresentation(review).bold);assert.equal(intro.color,undefined);for(const op of a.operations.filter(o=>o.role==='heading'||o.text==='감상 배경'||o.text==='책 소개')){assert.ok(textPresentation(op).bold);assert.equal(op.align,'center');}assert.ok(html.includes('color:'+UNIFIED_ARTICLE.reviewColor));assert.ok(html.includes('<strong>감상 배경</strong>'));assert.equal(a.operations.at(-1).align,'center');});

test('표지 설명란의 YES24 링크와 붙인 감상 본문, 우측 상세 링크를 공통 구성한다',()=>{const a=compileUnifiedArticle(input()),ops=a.operations,cover=ops.findIndex(o=>o.role==='cover'),purchase=ops[cover+1];assert.equal(purchase.kind,'link');assert.ok(purchase.text.startsWith('YES24'));assert.equal(purchase.placement,'cover-caption');assert.equal(purchase.align,'center');assert.equal(ops.filter(o=>o.href?.includes('/content/')).map(o=>o.text).join(), '작품 상세');assert.equal(ops.find(o=>o.tocTarget==='closing-line').text,'인용구');assert.ok(ops.filter(o=>o.text?.startsWith('필앤노트는')||o.text?.startsWith('인물의 감상 기록과')).every(o=>o.align==='center'));assert.ok(renderUnifiedArticle(a).includes('<figcaption>'));assert.ok(ops.filter(o=>['감상 근거 · 원문','작품 상세'].includes(o.text)).every(o=>o.align==='right'));});


test('원장 slug가 비어 있어도 정확한 서비스 URL로 인물을 대조하며 상충·다른 호스트는 거부한다',()=>{const post={kind:'celeb',slug:null,url:'https://feelandnote.com/celeb/kim-young-ha'};assert.equal(servicePostUrl(post),'https://feelandnote.com/celeb/kim-young-ha');assert.equal(servicePostUrl({...post,slug:'kim-young-ha'}),post.url);assert.equal(servicePostUrl({...post,slug:'kim-young-ha',url:null}),post.url);assert.throws(()=>servicePostUrl({...post,slug:'other-person'}));assert.throws(()=>servicePostUrl({...post,url:'https://example.com/celeb/kim-young-ha'}));assert.throws(()=>servicePostUrl({...post,url:null}));});


test('가로로 긴 전집 사진은 네이버 최소 높이를 지키며 모바일 열 안에서 비율을 보존한다',()=>{const i=input(),book=i.books[0];book.coverGeometry={url:book.coverUrl,width:458,height:73,sourceSha256:'a'.repeat(64)};assert.equal(compileUnifiedArticle(i).operations.find(o=>o.role==='cover').width,314);book.coverGeometry.height=680;assert.equal(compileUnifiedArticle(i).operations.find(o=>o.role==='cover').width,200);book.coverGeometry.url='https://example.com/other.jpg';assert.throws(()=>compileUnifiedArticle(i),/geometry/);book.coverGeometry.url=book.coverUrl;book.coverGeometry.height=1;assert.throws(()=>compileUnifiedArticle(i),/panoramic/);});


test('기관 목록의 연속 일반 공백은 HTML 표시와 맞추고 원자료는 보존한다',()=>{const i=input();i.kind='curated';i.books[0].reviews=[{id:'r',review:'감상',source_url:'https://example.com',person:{name:'독자',title:'수식어',avatar_url:'https://example.com/a.jpg'}}];i.fullList={columns:['작품','저자'],rows:[['사냥꾼의 일기 - 연세대학교  권장도서','이반 투르게네프']],source:'원자료'};const table=compileUnifiedArticle(i).operations.find(o=>o.kind==='table');assert.equal(table.rows[0][0],'사냥꾼의 일기 - 연세대학교 권장도서');assert.equal(i.fullList.rows[0][0],'사냥꾼의 일기 - 연세대학교  권장도서');});


test('기존에 준비한 제목을 보존하며 이름의 책장으로 자동 축약하지 않는다',()=>{const i=input();i.title='배우가 읽은 책 5권 · 감상과 기록';assert.equal(compileUnifiedArticle(i).title,i.title);delete i.title;assert.throws(()=>compileUnifiedArticle(i),/existing title/);});


test('전체 도서 수와 소개분을 구별하고 기존 책·감상·사진은 제목 안내 수정에서 보존한다',()=>{const i=input(),before=compileUnifiedArticle(i);i.libraryFunnel=true;i.selection.totalServiceBooks=7;i.title='인물이 읽은 7권의 책';const after=compileUnifiedArticle(i),patch=titleAndFunnelPatch(before,after);assert.ok(patch);assert.equal(patch.replacements.length,1);assert.equal(after.operations.find(o=>o.kind==='text'&&o.role==='heading').text,'인물');assert.ok(after.operations.at(-2).text.includes('6권'));assert.ok(after.operations.at(-1).text.includes('필앤노트'));assert.equal(after.operations.at(-1).text,before.operations.at(-1).text);i.selection.totalServiceBooks=1;assert.ok(!compileUnifiedArticle(i).operations.at(-2).text.includes('나머지'));i.selection.totalServiceBooks=0;assert.throws(()=>compileUnifiedArticle(i),/library count/);i.selection.totalServiceBooks=7;i.books[0].review+='변경';assert.equal(titleAndFunnelPatch(before,compileUnifiedArticle(i)),null);});
test('국문본이 원서보다 뒤에 위치하는 순서 역전을 거부한다',()=>{const i=input();i.selection.eligibleBooks=2;i.books[0]={...i.books[0],title:'원서 책 (원서)',isDomestic:false};i.books.push({...i.books[0],content_id:'domestic-2',title:'국문본 책',isDomestic:true});assert.throws(()=>compileUnifiedArticle(i),/Domestic Korean editions must be placed before foreign editions/);});

test('목차 항목은 인용구 하나로 묶고 책장 카드는 목차 라벨과 항목 사이에 둔다',()=>{
 const card={file:'C:/work/123-shelf-card.png',sha256:'a'.repeat(64)},a=compileUnifiedArticle({...input(),shelfCard:card}),flow=unifiedFlow(a);
 const at=a.operations.findIndex(o=>o.role==='shelf-card');assert.equal(a.operations[at-1].text,'목차');assert.equal(a.operations[at-2].kind,'divider');assert.ok(a.operations[at+1].tocTarget);
 const quotes=flow.filter(o=>o.kind==='quote');assert.equal(quotes.length,1);assert.deepEqual(quotes[0].paragraphs,a.operations.filter(o=>o.tocTarget).map(o=>o.text));
 const images=a.operations.filter(o=>o.kind==='image');assert.equal(images[1].role,'shelf-card');assert.equal(images[1].sha256,card.sha256);assert.ok(images[1].url.startsWith('file:'));
 assert.throws(()=>compileUnifiedArticle({...input(),shelfCard:{...card,sha256:'bad'}}),/shelf card/);
});
