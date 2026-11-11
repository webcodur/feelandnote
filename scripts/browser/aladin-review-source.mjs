// Public product-page recommendation evidence. Unknown angle-bracketed titles
// must survive HTML parsing: Aladin serves some titles as unescaped <PD수첩>.
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../sw/web/package.json',import.meta.url));
const {load}=require('cheerio');
const htmlTags=new Set('a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search section select slot small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr'.split(' '));
export function preserveTitles(html){
  return html.replace(/<(\/?)([^\s<>/]+)([^<>]*)>/g,(tag,slash,name)=>htmlTags.has(name.toLowerCase())?tag:tag.replaceAll('<','&lt;').replaceAll('>','&gt;'));
}
export function extractRecommendations(html){
  const $=load(preserveTitles(html)),out=[];
  $('[id$="_htmRecommend"] > li').each((_,el)=>{
    const li=$(el),by=li.find('div[onmouseover*="Recommend_"]').first();
    if(!by.length)return;
    const speaker=by.clone();speaker.children().remove();
    const text=li.clone();text.find('div[onmouseover*="Recommend_"]').remove();text.find('br').replaceWith('\n');
    out.push({speaker:speaker.text().replace(/^\s*-\s*/, '').replace(/\s+/g,' ').trim(),author_id:by.find('a[href*="wauthor_recommend"]').attr('href')?.match(/@([0-9]+)/)?.[1]??null,text:text.text().replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n\n').trim()});
  });
  return out;
}
export async function fetchAladinEvidence(url){
  const parsed=new URL(url);
  if(parsed.hostname!=='www.aladin.co.kr'||!parsed.searchParams.get('ItemId'))throw Error('Expected Aladin product source');
  const headers={'User-Agent':'Mozilla/5.0',Referer:url};
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Product HTTP '+response.status);
  const html=await response.text(),$=load(preserveTitles(html));
  const isbn=html.match(/([A-Z0-9]{10,13})_Introduce/)?.[1];
  if(!isbn)throw Error('Source ISBN missing');
  const endpoint=`https://www.aladin.co.kr/shop/product/getContents.aspx?ISBN=${isbn}&name=Introduce&type=0&date=${new Date().getHours()}`;
  const intro=await fetch(endpoint,{headers,signal:AbortSignal.timeout(30000)});
  if(!intro.ok)throw Error('Introduction HTTP '+intro.status);
  const body=await intro.text();
  if(body.length<50)throw Error('Empty source response');
  return {url,endpoint,isbn,edition_isbn:$('meta[property="books:isbn"]').attr('content')||null,title:$('meta[property="og:title"]').attr('content')||$('title').text(),author:$('meta[name="author"]').attr('content'),recommendations:extractRecommendations(body)};
}
