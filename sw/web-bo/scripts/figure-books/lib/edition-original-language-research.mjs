/** 작품 제목과 원저자가 모두 일치하는 위키백과·위키데이터만 원문 언어 근거로 쓴다. */
const headers={'User-Agent':'FeelAndNoteBookAudit/1.0 (https://feelandnote.com)'}
const names=value=>String(value ?? '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s\p{P}]/gu,'')
export function wikidataOriginalLanguage(claims = {}) {
 const usable=list=>(list ?? []).filter(claim=>claim.rank!=='deprecated')
 const original=usable(claims.P364),language=usable(claims.P407)
 const selected=original.length?original:language.some(claim=>claim.rank==='preferred')?language.filter(claim=>claim.rank==='preferred'):language
 const languages=[...new Set(selected.map(claim=>claim.mainsnak?.datavalue?.value?.id).filter(Boolean))]
 return languages.length===1?({Q1860:'en',Q9176:'ko'}[languages[0]] ?? null):null
}
export function wikipediaBookLanguage(wikitext='') {
 if(!/\{\{\s*Infobox (?:book|novel)\b/iu.test(wikitext))return null
 const raw=wikitext.match(/\|\s*language\s*=\s*([^\n]+)\n/iu)?.[1]
 const value=raw?.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/gu,'$1').replace(/<!--.*?-->/gu,'').trim()
 return value==='English'?'en':value==='Korean'?'ko':null
}
async function read(base,parameters) {
 const response=await fetch(base+'?'+new URLSearchParams({...parameters,format:'json'}),{headers,signal:AbortSignal.timeout(60000)})
 if(!response.ok)throw Error('Original language lookup HTTP '+response.status)
 const result=await response.json();if(result.error)throw Error(result.error.info);return result
}
export async function researchOriginalLanguages(works,catalog,progress=console.log) {
 const candidates=works.filter(work=>!work.figureBook?.originalLanguage)
 const byTitle=new Map()
 for(const work of candidates){
  const en=catalog.locales.find(row=>row.content_id===work.id&&row.locale==='en')
  const figure=work.figureBook ?? {}
  for(const raw of [figure.originalTitle,figure.workTitle,en?.title]){
   if(typeof raw!=='string'||!raw.trim())continue
   const clean=raw.replace(/^원제\s*/u,'').replace(/\s*\((?:Penguin Classics|Bantam Classics)[^)]*\)/iu,'').trim()
   const base=clean.split(':')[0].trim()
   for(const title of [clean,base,`${base} (book)`,`${base} (novel)`,`${base} (autobiography)`,`${base} (biography)`,`${base} (play)`,...( /^(?:A|The)\s/iu.test(base)?[]:[`A ${base}`,`The ${base}`])]){
    if(!title || /[|#]/u.test(title))continue
    const group=byTitle.get(title) ?? [];if(!group.includes(work))group.push(work);byTitle.set(title,group)
   }
  }
 }
 const titles=[...byTitle.keys()],matches=[]
 for(let start=0;start<titles.length;start+=50){
  const data=await read('https://en.wikipedia.org/w/api.php',{action:'query',titles:titles.slice(start,start+50).join('|'),prop:'pageprops|revisions',rvprop:'content',rvslots:'main',redirects:'1'})
  const normalized=new Map((data.query?.normalized ?? []).map(row=>[row.from,row.to]))
  const redirects=new Map((data.query?.redirects ?? []).map(row=>[row.from,row.to]))
  for(const title of titles.slice(start,start+50)){
   let name=normalized.get(title) ?? title;const seen=new Set()
   while(redirects.has(name)&&!seen.has(name)){seen.add(name);name=redirects.get(name)}
   const page=Object.values(data.query?.pages ?? {}).find(page=>page.title===name)
   const qid=page?.pageprops?.wikibase_item;if(!qid || page?.pageprops?.disambiguation!==undefined)continue
   const language=wikipediaBookLanguage(page.revisions?.[0]?.slots?.main?.['*'] ?? '')
   for(const work of byTitle.get(title))matches.push({work,qid,page:page.title,language})
  }
  progress(JSON.stringify({originalTitleLookup:{checked:Math.min(start+50,titles.length),total:titles.length}}))
 }
 const qids=[...new Set(matches.map(match=>match.qid))],entities={}
 for(let start=0;start<qids.length;start+=50){
  const data=await read('https://www.wikidata.org/w/api.php',{action:'wbgetentities',ids:qids.slice(start,start+50).join('|'),props:'claims'})
  Object.assign(entities,data.entities ?? {})
 }
 const authorIds=[...new Set(Object.values(entities).flatMap(entity=>(entity.claims?.P50 ?? []).map(claim=>claim.mainsnak?.datavalue?.value?.id).filter(Boolean)))],authors={}
 for(let start=0;start<authorIds.length;start+=50){
  const data=await read('https://www.wikidata.org/w/api.php',{action:'wbgetentities',ids:authorIds.slice(start,start+50).join('|'),props:'labels|aliases',languages:'en|ko'})
  Object.assign(authors,data.entities ?? {})
 }
 const accepted=new Map()
 for(const {work,qid,page,language:pageLanguage} of matches){
  const existing=String(work.figureBook?.workIdentity ?? '').match(/^wikidata:(Q\d+)$/iu)?.[1] ?? work.figureBook?.wikidataQid
  if(existing && existing.toUpperCase()!==qid)continue
  const entity=entities[qid],claimed=wikidataOriginalLanguage(entity?.claims)
  if(claimed && pageLanguage && claimed!==pageLanguage)continue
  const language=claimed ?? pageLanguage;if(!language)continue
  const writerIds=(entity.claims?.P50 ?? []).map(claim=>claim.mainsnak?.datavalue?.value?.id).filter(Boolean);if(!writerIds.length)continue
  const creator=[work.figureBook?.originalCreator,work.figureBook?.workCreator,...catalog.locales.filter(card=>card.content_id===work.id).map(card=>card.creator)].map(names).filter(Boolean)
  const match=writerIds.every(id=>{
   const author=authors[id],known=[...Object.values(author?.labels ?? {}).map(item=>item.value),...Object.values(author?.aliases ?? {}).flat().map(item=>item.value)].map(names).filter(name=>name.length>=3)
   return known.some(name=>creator.some(value=>value===name||value.includes(name)))
  })
  if(!match)continue
  const previous=accepted.get(work.id);if(previous && previous.language!==language){accepted.set(work.id,{conflict:true});continue}
  if(!previous?.conflict)accepted.set(work.id,{work,language,url:claimed?'https://www.wikidata.org/wiki/'+qid:'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.replaceAll(' ','_'))})
 }
 let changed=0
 for(const item of accepted.values()){
  if(item.conflict)continue
  item.work.figureBook={...item.work.figureBook,originalLanguage:item.language,identityEvidence:item.url};changed++
 }
 progress(JSON.stringify({originalLanguagesConfirmed:changed,candidates:candidates.length}))
 return candidates.filter(work=>work.figureBook?.originalLanguage)
}
