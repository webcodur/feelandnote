import crypto from 'node:crypto';
import {libraryFunnel} from './unified-library-funnel.mjs';
import {AVATAR_WIDTH} from '../apply-institution-revisions.mjs';
import {EDITORIAL_PORTRAIT_WIDTH} from './editorial-editor.mjs';
import {readingWaySection} from './reading-way-section.mjs';
import {PERSON_FULL_LIST,personFullListSection,listTableHtml} from './person-full-list.mjs';
import {formattedPlainText, formattedTextHtml, NAVER_REVIEW_COLOR} from './formatted-text.mjs';
import {pathToFileURL} from 'node:url';

// One policy for the HTML preview, native writer, and completion checker.
export const UNIFIED_ARTICLE = Object.freeze({
  version: 'service-library-2',
  contents: 'numbered-list',
  reviewColor: NAVER_REVIEW_COLOR,
  purchaseBackground: '#e8f0f8',
  font: Object.freeze({ body: 15, heading: 16, author: 13, label: 13 }),
  contentsQuote: 'quotation_line',
  portraitWidth: EDITORIAL_PORTRAIT_WIDTH, coverWidth: 200, avatarWidth: AVATAR_WIDTH, maxBooks: 5,
  remove: Object.freeze(['legacy-body', 'bonus-photos', 'background-music', 'video', 'duplicate-quotes', 'person-full-list']),
});
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const url = value => { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol)) throw Error('HTTP source required'); return u.href; };
export function canonicalHttpHref(value){const u=new URL(url(value));u.pathname=u.pathname.replace(/\(/g,'%28').replace(/\)/g,'%29');u.search=u.search.replace(/\(/g,'%28').replace(/\)/g,'%29');return u.href;}
export function servicePostUrl(post){
 if(post.kind!=='celeb')return post.url;
 let pathSlug=null;if(post.url){const u=new URL(post.url),match=u.pathname.match(/^\/celeb\/([a-z0-9.-]+)\/?$/);if(u.origin!=='https://feelandnote.com'||!match)throw Error('Person service URL identity differs');pathSlug=match[1];}
 if(post.slug&&pathSlug&&post.slug!==pathSlug)throw Error('Person slug and service URL differ');
 const slug=post.slug||pathSlug;if(!slug||!String(slug).match(/^[a-z0-9.-]+$/))throw Error('Exact person slug or service URL required');
 return 'https://feelandnote.com/celeb/'+slug;
}
// 네이버 편집기는 문단 안의 연속 공백을 한 칸으로 줄인다. 원고도 같게 맞춰야 붙여넣기 대조가 어긋나지 않는다.
const clean = value => String(value ?? '').replace(/\r\n/g, '\n').replace(/[ \t ]{2,}/g, ' ').trim();
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// SmartEditor turns pasted <br> into separate paragraphs as well.
const split = value => clean(value).split(/\n+/).map(clean).filter(Boolean);
const materialHash = input => {const stable=structuredClone(input);for(const book of stable.books??[])if(book.yes24)delete book.yes24.resolvedAt;return digest(stable);};
export function textPresentation(op){return{size:UNIFIED_ARTICLE.font[op.role],align:op.align,bold:op.bold??(op.kind==='text'&&['heading','label'].includes(op.role)),color:op.color??'#222222',background:op.background??null,gapBefore:op.gapBefore??(op.kind==='text'&&['heading','label'].includes(op.role))};}

export const SMARTEDITOR_IMAGE_MIN_HEIGHT=50;
export function coverDisplayWidth(book) {
  const g=book.coverGeometry;if(!g)return UNIFIED_ARTICLE.coverWidth;
  if(g.url!==book.coverUrl||!Number.isInteger(g.width)||!Number.isInteger(g.height)||g.width<=0||g.height<=0||!/^[a-f0-9]{64}$/.test(g.sourceSha256??''))throw Error('Verified cover geometry differs');
  const width=Math.max(UNIFIED_ARTICLE.coverWidth,Math.ceil(SMARTEDITOR_IMAGE_MIN_HEIGHT*g.width/g.height));
  if(width>UNIFIED_ARTICLE.portraitWidth)throw Error('Cover is too panoramic for the mobile column');
  return width;
}

export function yes24Link(book) {
  if (book.yes24?.url) {
    const target = new URL(book.yes24.url);
    if (target.protocol !== 'https:' || !(target.hostname === 'yes24.com' || target.hostname.endsWith('.yes24.com')) || target.username || target.password) throw Error('YES24 destination differs');
    if (book.yes24.kind === 'product') {
      if (!/^\/Product\/Goods\/\d+\/?$/i.test(target.pathname)) throw Error('YES24 product address required');
      return {text:'YES24에서 보기',href:target.href};
    }
    if (book.yes24.kind !== 'search' || !/^\/Product\/Search\/?$/i.test(target.pathname)) throw Error('YES24 link kind differs');
    return {text:'YES24에서 찾기',href:target.href};
  }
  const isbn = clean(book.isbn).replace(/[-\s]/g,'');
  const query = /^(?:\d{13}|\d{9}[\dXx])$/.test(isbn) ? isbn : clean(book.title)+' '+clean(book.creator);
  const encodedQuery = encodeURIComponent(query).replace(/\(/g,'%28').replace(/\)/g,'%29');
  return {text:'YES24에서 찾기',href:'https://www.yes24.com/Product/Search?domain=BOOK&query='+encodedQuery};
}

export function isVerifiedSelectionOnlyInstitution(input){
 return input.kind==='curated'&&input.books?.length===UNIFIED_ARTICLE.maxBooks&&input.selection?.method==='verified-curated-selection-without-reader-notes'
  &&input.selection.publicReviewCount===0&&input.selection.eligibleBooks>=input.books.length
  &&typeof input.selection.listId==='string'&&input.selection.listId.length>0
  &&input.fullList?.source==='curated_lists:'+input.selection.listId;
}

export function compileUnifiedArticle(input) {
  if(typeof input.title!=='string'||!input.title.trim())throw Error('Prepared existing title required');
  if (!/^\d+$/.test(String(input.logNo)) || !['celeb','curated'].includes(input.kind)) throw Error('Exact post identity required');
  const serviceUrl = url(input.serviceUrl);
  if (new URL(serviceUrl).origin !== 'https://feelandnote.com') throw Error('Service origin differs');
  const subject = input.subject;
  if (!subject?.name || !subject.imageUrl) throw Error('Subject name and current portrait/logo required');
  if(input.kind!=='celeb'&&subject.readingWay!==undefined)throw Error('Reading way belongs to a person');
  const readingWay=readingWaySection(subject);
  if (input.kind==='celeb'&&(!clean(subject.introduction)||subject.introductionSource!=='celeb_explanations:'+subject.id+':plain_text')) throw Error('Exact service person guide and provenance required');
  if (!Array.isArray(input.books) || !input.books.length || input.books.length > UNIFIED_ARTICLE.maxBooks) throw Error('One to five explicit book selections required');
  if(input.books.length<UNIFIED_ARTICLE.maxBooks){const eligible=input.selection?.eligibleBooks;if(!Number.isInteger(eligible)||eligible!==input.books.length||eligible>=UNIFIED_ARTICLE.maxBooks)throw Error('Five books required unless the complete eligible service set is smaller');}
  if (new Set(input.books.map(b=>b.content_id)).size!==input.books.length) throw Error('Duplicate book selections');
  let seenForeign=false;
  for(const b of input.books){
    const isForeign=b.isDomestic===false||b.title?.includes('(원서)');
    if(isForeign)seenForeign=true;
    else if(seenForeign&&b.isDomestic===true)throw Error('Domestic Korean editions must be placed before foreign editions: '+b.title);
  }
  const funnel=libraryFunnel(input),selectionOnly=isVerifiedSelectionOnlyInstitution(input);
  if(selectionOnly&&input.books.some(b=>(b.reviews??(b.review?[b]:[])).length))throw Error('Selection-only institution cannot discard existing reading notes');
  const operations = [], sources = [], addText = (text, role='body', align=null,anchor=null,format={}) => {
    const formatted = role==='body' && (align===null || align==='left' || format.formattedText===true);
    for (const [i,part] of split(text).entries()) operations.push({kind:'text',text:formatted?formattedPlainText(part):part,role,align:align??(['heading','label','author'].includes(role)?'center':'left'),...(formatted?{formattedText:true,bold:true}:{}),...format,...(anchor&&i===0?{anchor}:{})});
  }, addLink = (text,href,align='center') => operations.push({kind:'link',text,href:url(href),role:'label',align});
  operations.push({kind:'image',url:url(subject.imageUrl),width:UNIFIED_ARTICLE.portraitWidth,role:input.kind==='celeb'?'portrait':'logo',name:subject.name});
  addText(funnel?.heading??(subject.name+(subject.profession?' · '+subject.profession:'')),'heading','center');
  if (subject.introduction){const first=operations.length;addText(subject.introduction,'body','left',null,{gapBefore:true});if(funnel)operations[first].gapBefore=false;}
  if(selectionOnly)addText('수상작을 만날 수 있는 다섯 권과 전체 선정 목록을 함께 소개합니다.','body','left',null,{gapBefore:true});
  // 「목차」는 「독서 방식」 같은 소제목 크기로 쓴다(26.11.12 사용자 지시).
  operations.push({kind:'divider'});addText('목차','heading');
  // 책장 카드는 구분선으로 목차 구획에 넘어간 뒤 「목차」 라벨과 항목 사이에 둔다(인물 사진 바로 아래 두면 사진이 연달아 보였다).
  if(input.kind==='celeb'&&input.shelfCard){const card=input.shelfCard;if(!/^[a-f0-9]{64}$/.test(card.sha256??'')||!card.file||!/\.png$/i.test(card.file))throw Error('Rendered shelf card file and hash required');operations.push({kind:'image',url:pathToFileURL(card.file).href,sha256:card.sha256,width:UNIFIED_ARTICLE.portraitWidth,role:'shelf-card',name:subject.name+' 책장'});}
  // 목차 항목은 왼쪽 선 인용구 하나에 왼쪽 정렬로 묶는다(가운데 정렬은 줄 길이마다 들쭉날쭉했다).
  const contents=(text,target)=>operations.push({kind:'text',text:clean(text),role:'body',align:'left',tocTarget:target,quote:'contents'});
  if(readingWay.length)contents('독서 방식','reading-way');
  for(const [i,book]of input.books.entries())contents(String(i+1).padStart(2,'0')+'. '+book.title,'book-'+String(i+1).padStart(2,'0'));
  if(input.kind==='curated')contents('전체 선정 목록','full-list');
  else if(input.fullList)contents(PERSON_FULL_LIST.heading,PERSON_FULL_LIST.anchor);
  if(input.closingLine?.text)contents('인용구','closing-line');
  contents('필앤노트에서 이어보기','service-info');
  if(readingWay.length){operations.push({kind:'divider'},...readingWay);}
  for (const [index, book] of input.books.entries()) {
    if (!book.content_id || !clean(book.title) || !clean(book.creator) || !book.coverUrl || !clean(book.introduction)) throw Error('Book title, author, cover and sourced introduction required: '+book.title);
    if (!book.introductionSource || book.introductionSource.startsWith('content_locales:')) throw Error('Prepared book summary required; raw description/excerpt fallback is disabled');
    operations.push({kind:'divider'});
    addText(String(index+1).padStart(2,'0')+' · 『'+book.title+'』','heading','center','book-'+String(index+1).padStart(2,'0'));
    addText(book.creator,'author','center');
    operations.push({kind:'image',url:url(book.coverUrl),width:coverDisplayWidth(book),role:'cover',name:book.title+' 표지'});
    const yes24=yes24Link(book);addLink(yes24.text,yes24.href,'center');
    Object.assign(operations.at(-1),{placement:'cover-caption',bold:true,gapBefore:false});
    addText('책 소개','label',null,null,{gapBefore:false});const introductionStart=operations.length;addText(book.introduction,'body','left',null,{gapBefore:true});Object.assign(operations[introductionStart],{gapBefore:false,attachPrevious:true});
    const notes = book.reviews ?? (book.review ? [book] : []);
    if (!notes.length&&!selectionOnly) throw Error('Service reading background required: '+book.title);
    for (const note of notes) {
      if (!clean(note.review)||!note.source_url||!note.id) throw Error('Exact service review and source required: '+book.title);
      if (input.kind==='curated') {
        if (!note.person?.name||!clean(note.person.title)||!note.person.avatar_url) throw Error('Institution reader identity/title/avatar required');
        operations.push({kind:'image',url:url(note.person.avatar_url),width:UNIFIED_ARTICLE.avatarWidth,role:'avatar',name:note.person.name});
        addText(clean(note.person.title)+' '+note.person.name,'author','center');
      }
      addText('감상 배경','label');
      const first=operations.length;addText(note.review,'body','left',null,{color:UNIFIED_ARTICLE.reviewColor,bold:true,gapBefore:true});
      Object.assign(operations[first],{gapBefore:false,attachPrevious:true});
      if (operations.slice(first).map(p=>p.text).join('\n\n')!==split(note.review).map(formattedPlainText).join('\n\n')) throw Error('Service review text was altered');
      addLink('감상 근거 · 원문',note.source_url,'right');
      sources.push({review_id:note.id,content_id:book.content_id,sha256:digest(note.review),source_url:url(note.source_url)});
    }
    addLink('작품 상세','https://feelandnote.com/content/'+book.content_id+'?category=book','right');
  }
  if (input.kind==='celeb'&&input.fullList) {
    if (!input.fullList.source?.startsWith('celeb_contents:')) throw Error('Person full list provenance required');
    operations.push({kind:'divider'});
    for(const op of personFullListSection(input.fullList))if(op.kind==='table')operations.push(op);else addText(op.text,op.role,op.align,op.anchor??null,op.gapBefore?{gapBefore:true}:{});
  }
  if (input.kind==='curated') {
    if (!input.fullList?.rows?.length||!input.fullList.columns?.length||!input.fullList.source) throw Error('Institution complete selection list and provenance required');
    const {columns,rows}=input.fullList;if(rows.some(r=>r.length!==columns.length))throw Error('Institution list width differs');
    operations.push({kind:'divider'});addText('전체 선정 목록','heading','center','full-list');operations.push({kind:'table',columns:columns.map(c=>c.replace(/ {2,}/g,' ')),rows:rows.map(row=>row.map(c=>c.replace(/ {2,}/g,' ')))});
  }
  if (input.closingLine?.text) {
    if (!['verified_quote','service_line'].includes(input.closingLine.kind)) throw Error('Closing line provenance kind required');
    if(input.closingLine.kind==='verified_quote'&&!input.closingLine.source_url)throw Error('Real quotation source required');
    operations.push({kind:'divider'});
    addText(input.closingLine.text,'body','center','closing-line',{bold:true});
    addText('- '+(input.closingLine.person||subject.name),'author','center');
    if(input.closingLine.source_url)addLink('한마디 출처',input.closingLine.source_url);
  }
  operations.push({kind:'divider'});
  addText(input.kind==='celeb'
    ?'필앤노트는 인물들의 감상 기록을 통해 책과 작품을 발견하는 서비스입니다.\n\n'+(funnel?.footer??'인물의 감상 기록과 작품별 정보를 함께 살펴볼 수 있습니다.')
    :'필앤노트에서는 기관별 선정 도서와 작품 정보, 인물들의 감상 기록을 함께 살펴볼 수 있습니다.','body','center','service-info',{gapBefore:true});
  addLink(funnel?.link??('필앤노트에서 '+subject.name+(input.kind==='celeb'?'의 전체 감상 기록 보기':'의 전체 선정 도서 보기')),serviceUrl);
  Object.assign(operations.at(-1),{role:'body',bold:true,gapBefore:!funnel});
  const article={version:UNIFIED_ARTICLE.version,policyHash:digest(UNIFIED_ARTICLE),logNo:String(input.logNo),kind:input.kind,title:input.title,serviceUrl,operations,sources,sourceHash:materialHash(input)};
  return {...article,articleHash:digest(article)};
}

// 편집기·공개 화면의 구성 순서. 목차 인용구 항목은 인용구 하나로 묶는다.
export function unifiedFlow(article){
 const flow=[];let image=0,prior=null;
 for(const o of article.operations){
  if(o.placement==='cover-caption')continue;
  if(o.quote){if(prior?.quote===o.quote)flow.at(-1).paragraphs.push(o.text);else flow.push({kind:'quote',paragraphs:[o.text]});prior=o;continue;}
  prior=o;
  flow.push(['text','link'].includes(o.kind)?{kind:'text',text:o.text}:o.kind==='image'?{kind:'image',index:image++}:o.kind==='divider'?{kind:'divider'}:{kind:'table',rows:[o.columns,...o.rows]});
 }
 return flow;
}

export function renderUnifiedArticle(article,{imageSources={}}={}) {
  const f=UNIFIED_ARTICLE.font;
  const body=article.operations.map((op,index)=>{
    if(op.placement==='cover-caption')return '';
    if(op.kind==='image'){const next=article.operations[index+1],caption=next?.placement==='cover-caption'?`<figcaption><p data-role="label" style="font-size:${f.label}px;text-align:center;font-weight:700;line-height:1.5;margin:9px 0 0"><a href="${escape(next.href)}"><strong>${escape(next.text)}</strong></a></p></figcaption>`:'';return `<figure style="text-align:center;margin:28px 0"><img src="${escape(imageSources[op.url]??op.url)}" alt="${escape(op.name)}" style="display:block;margin:auto;width:${op.width}px;max-width:100%;height:auto">${caption}</figure>`;}
    if(op.kind==='divider')return '<hr style="border:0;border-top:1px solid #ddd;margin:40px 0">';
    if(op.kind==='table')return listTableHtml(op);
    const p=textPresentation(op),style=`font-size:${p.size}px;line-height:1.7;text-align:${p.align};font-weight:${p.bold?700:400};color:${p.color};margin:${p.gapBefore?26:0}px 0 ${op.role==='label'?8:op.quote?4:12}px;${op.quote?'border-left:3px solid #ccc;padding-left:16px;':''}`;
    const value=op.kind==='link'?'<a href="'+escape(op.href)+'">'+escape(op.text)+'</a>':op.formattedText?formattedTextHtml(op.text,p):escape(op.text).replace(/\n/g,'<br>');
    const content=p.bold?'<strong>'+value+'</strong>':value;
    return `<p data-role="${op.role}"${op.anchor?' id="'+escape(op.anchor)+'"':''} style="${style}scroll-margin-top:24px">${p.background?'<span style="background-color:'+p.background+'">'+content+'</span>':content}</p>`;
  }).join('\n');
  return '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(article.title)+'</title><style>body{margin:0;background:#fff;color:#222;font-family:"Malgun Gothic",sans-serif}main{max-width:680px;margin:40px auto;padding:0 20px}h1{font-size:24px;line-height:1.5;text-align:center;margin:0 0 28px}a{color:#315a75;text-decoration:underline}a:hover{color:#173e58;text-decoration-thickness:2px}a:active{color:#142c3b}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px}td,th{border:1px solid #ddd;padding:8px;text-align:left;overflow-wrap:anywhere}p{overflow-wrap:anywhere}@media(max-width:480px){main{margin-top:24px}h1{font-size:22px}}</style><main><h1>'+escape(article.title)+'</h1>'+body+'</main></html>';
}
