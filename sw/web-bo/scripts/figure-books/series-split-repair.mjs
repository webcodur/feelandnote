/** 출처 검수를 마친 국내 연속권을 기존 통합기의 참조·충돌 검사로 정리한다. */
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { dbClient, argumentValue, hasFlag } from './lib/figure-work.mjs'
import { numberedTitle, seriesSetTitle, normalizeAuditText } from './lib/series-audit.mjs'
import { sqlLiteral } from './lib/merge-work-sql.mjs'
import { applyOne, captureDatabaseSnapshot, planSnapshot, checkFixedReferences, executeTemporaryMergeSql } from './merge-works.mjs'

const json = value => sqlLiteral(JSON.stringify(value)) + '::jsonb'
const sameText=value=>normalizeAuditText(value).replace(/[\p{P}\p{Z}]/gu,'')
const rows = async (db, table, ids) => {
  const result = await db.from(table).select('*').in(table==='contents'?'id':'content_id',ids)
  if (result.error || !Array.isArray(result.data)) throw new Error(table+': '+(result.error?.message ?? '조회 결과 없음'))
  return result.data
}

export function planSeriesRepair(candidate, current) {
  if (candidate.sourceReview?.verdict !== 'series_split_confirmed' || candidate.sourceReview.method !== 'independent_series_review') throw new Error('시리즈의 동일 본문을 확인한 독립 출처 검수 필요')
  const sourceUrl = candidate.sourceReview.sources[0]
  if (new URL(sourceUrl).protocol !== 'https:') throw new Error('시리즈 HTTPS 출처 필요')
  const title = candidate.sourceReview.title ?? candidate.evidence.find(row=>row.stem)?.stem
  if (!title || !current.contents.length) throw new Error('시리즈 표제·현재 작품 필요')
  if (current.contents.some(work=>{const identity=work.metadata?.figureBook?.workIdentity??work.metadata?.workIdentity;return work.type!=='BOOK'||(identity&&!/^book\//.test(identity))})) throw new Error('국내서 외 원작 정체성은 별도 검수 필요')
  if (current.readings.length || current.members.length) throw new Error('실독·회원 기록이 있는 시리즈는 범위 검수 필요')
  const real = current.editions.filter(row=>row.isbn)
  if (!real.length || real.some(row=>row.locale!=='ko')) throw new Error('한국어 실제 판본만 지원')
  const normalized = normalizeAuditText(title).replace(/\s/g,'')
  for (const edition of real) {
    const number = numberedTitle(edition.title)
    if (normalizeAuditText(number?.stem ?? seriesSetTitle(edition.title)?.stem ?? edition.title).replace(/\s/g,'') !== normalized) throw new Error('시리즈 밖 판본: '+edition.title)
    const proof=candidate.sourceReview.editions?.[edition.isbn]
    if(candidate.sourceReview.method==='kakao_isbn_series_review'&&(!proof||sameText(proof.title)!==sameText(edition.title)||proof.authors.map(sameText).sort().join('|')!==edition.creator?.split(/[,，]/).map(sameText).sort().join('|')))throw new Error('현재 판본과 출처의 제목·저자 불일치: '+edition.isbn)
    const confirmed=(edition.sources?.edition_work_evidence??[]).some(row=>['independent_work_review','independent_series_review','independent_omnibus_review'].includes(row.method))
    if(confirmed&&number&&(edition.edition_kind!=='volume'||edition.text_scope!=='volume/'+number.part))throw new Error('이미 검수한 판본 범위와 충돌: '+edition.id)
    const set=seriesSetTitle(edition.title)
    if(confirmed&&set?.scope&&(edition.edition_kind!=='selection'||edition.text_scope!==set.scope))throw new Error('이미 검수한 세트 범위와 충돌: '+edition.id)
  }
  const ranked = [...current.contents].sort((a,b)=> {
    const ae=real.filter(e=>e.content_id===a.id),be=real.filter(e=>e.content_id===b.id)
    const part = editions=>Math.min(...editions.map(e=>!numberedTitle(e.title)&&sameText(e.title)===sameText(title)?0:Number(numberedTitle(e.title)?.part) || Infinity))
    return Number(!!b.metadata?.figureBook?.series)-Number(!!a.metadata?.figureBook?.series) || part(ae)-part(be) || a.id.localeCompare(b.id)
  })
  const keep=ranked[0], creator=keep.metadata?.figureBook?.workCreator??candidate.sourceReview.authors?.join(', ')
  if (!creator) throw new Error('대표 저자 필요')
  return { keep:keep.id,drops:ranked.slice(1).map(row=>row.id),title,creator,sourceUrl,editionSources:candidate.sourceReview.editions,workIdentity:keep.metadata?.figureBook?.workIdentity??keep.metadata?.workIdentity??'book/'+real.find(e=>e.content_id===keep.id).isbn }
}

export function buildSeriesPrepareSql(plan, current) {
  const stamp=new Date().toISOString(), statements=[]
  function update(table,row,changes,key) {
    const where=key==='locale'?`content_id=${sqlLiteral(row.content_id)} AND locale=${sqlLiteral(row.locale)}`:`id::text=${sqlLiteral(String(row.id))}`
    statements.push(`PERFORM 1 FROM public.${table} WHERE ${where} FOR UPDATE;
IF (SELECT to_jsonb(t) FROM public.${table} t WHERE ${where}) IS DISTINCT FROM ${json(row)} THEN RAISE EXCEPTION 'SERIES_REVIEW: concurrent ${table}'; END IF;
UPDATE public.${table} SET ${Object.entries(changes).map(([field,value])=>`${field}=${value===null?'NULL':typeof value==='object'?json(value):sqlLiteral(value)}`).join(',')} WHERE ${where};`)
  }
  const work=current.contents.find(row=>row.id===plan.keep)
  const figure={...work.metadata.figureBook,workIdentity:plan.workIdentity,workTitle:plan.title,workCreator:plan.creator,series:{title:plan.title,creator:plan.creator,locale:'ko',sourceUrl:plan.sourceUrl}}
  update('contents',work,{metadata:{...work.metadata,figureBook:figure}},'id')
  for(const edition of current.editions.filter(row=>row.isbn)) {
    const part=numberedTitle(edition.title)?.part,set=seriesSetTitle(edition.title)
    // 번호가 없는 책을 전권으로 추정하지 않는다. 이전 일괄 추정 full/complete도 해제한다.
    const confirmed=(edition.sources?.edition_work_evidence??[]).some(row=>['independent_work_review','independent_series_review','independent_omnibus_review'].includes(row.method))
    const kind=part?'volume':set?.scope?'selection':confirmed?edition.edition_kind:null,scope=part?'volume/'+part:set?.scope??(confirmed?edition.text_scope:null)
    const sourceUrl=plan.editionSources?.[edition.isbn]?.sourceUrl??plan.sourceUrl
    const sources={...edition.sources,scope_evidence:{edition_title:edition.title,isbn:edition.isbn,source_url:sourceUrl,scope,reviewed_at:stamp}}
    if(part||set?.scope) {
      const proof={method:'independent_work_review',content_id:plan.keep,locale:edition.locale,isbn:edition.isbn,
        edition_title:edition.title,edition_creator:edition.creator,original_title:plan.title,original_creator:plan.creator,
        work_identity:plan.workIdentity,edition_kind:kind,text_scope:scope,source_url:sourceUrl,reviewed_at:stamp}
      sources.edition_work_evidence=[...(Array.isArray(sources.edition_work_evidence)?sources.edition_work_evidence:[]).filter(row=>!(row.method==='independent_work_review'&&row.content_id===plan.keep&&row.isbn===edition.isbn)),proof]
    }
    update('figure_book_editions',edition,{edition_kind:kind,text_scope:scope,sources},'id')
  }
  for(const card of current.locales.filter(row=>row.content_id===plan.keep&&row.locale==='ko')) {
    update('content_locales',card,{title:plan.title,sources:{...card.sources,edition_title:card.sources?.edition_title??card.title,series_title:plan.title,series_source_url:plan.sourceUrl}},'locale')
  }
  for(const card of current.locales.filter(row=>row.content_id===plan.keep&&row.locale==='en'&&row.sources?.primary==='none')) {
    const stem=numberedTitle(card.title)?.stem
    const peers=current.locales.filter(row=>row.locale==='en'&&row.sources?.primary==='none')
    if(stem&&peers.every(row=>sameText(numberedTitle(row.title)?.stem??row.title)===sameText(stem)))update('content_locales',card,{title:stem,sources:{...card.sources,edition_title:card.sources?.edition_title??card.title,series_title:stem,series_source_url:plan.sourceUrl}},'locale')
  }
  return `\\set ON_ERROR_STOP on\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='30s';\nDO $series_repair$ BEGIN\n${statements.join('\n')}\nEND; $series_repair$;\nCOMMIT;\nSELECT 'MERGE_COMMITTED';\n`
}

export async function repairSeries(db,candidate,apply=false) {
  const ids=candidate.contentIds
  const [contents,locales,editions,readings,members]=await Promise.all(['contents','content_locales','figure_book_editions','celeb_contents','member_contents'].map(table=>rows(db,table,ids)))
  let current={contents,locales,editions,readings,members}
  const title=candidate.sourceReview.title??candidate.evidence.find(row=>row.stem)?.stem
  if(contents.length===1&&contents[0].metadata?.figureBook?.series?.title===title)return {keep:contents[0].id,drops:[],completed:true,alreadyMerged:true,editionCount:editions.length}
  if(!editions.some(e=>e.isbn)&&candidate.sourceReview.method==='kakao_isbn_series_review') {
    const cards=locales.filter(c=>c.isbn)
    if(contents.some(c=>!cards.some(l=>l.content_id===c.id))||cards.some(c=>c.locale!=='ko'))throw Error('기존 카드에서 실제 한국어 판본 확인 필요')
    for(const card of cards){const proof=candidate.sourceReview.editions?.[card.isbn];if(!proof||sameText(proof.title)!==sameText(card.title)||proof.authors.map(sameText).sort().join('|')!==card.creator?.split(/[,，]/).map(sameText).sort().join('|'))throw Error('기존 언어 카드와 공식 ISBN 불일치: '+card.isbn)}
    const virtual={...current,editions:cards.map(c=>({...c,id:'locale/'+c.content_id,edition_kind:null,text_scope:null}))},preflight=planSeriesRepair(candidate,virtual)
    for(const drop of preflight.drops){checkFixedReferences({keep:preflight.keep,drop});const p=planSnapshot(await captureDatabaseSnapshot(db,{keep:preflight.keep,drop}),{keep:preflight.keep,drop});if(p.skip)throw Error('목록 편입 전 참조·기록 충돌: '+p.skip)}
    if(!apply)return {...preflight,editionCount:cards.length,dryRun:true}
    const guards=[...contents.map(c=>`IF (SELECT to_jsonb(t) FROM public.contents t WHERE id=${sqlLiteral(c.id)} FOR UPDATE) IS DISTINCT FROM ${json(c)} THEN RAISE EXCEPTION 'SERIES_REVIEW: concurrent catalog work'; END IF;`),
      ...locales.map(c=>`IF (SELECT to_jsonb(t) FROM public.content_locales t WHERE content_id=${sqlLiteral(c.content_id)} AND locale=${sqlLiteral(c.locale)} FOR UPDATE) IS DISTINCT FROM ${json(c)} THEN RAISE EXCEPTION 'SERIES_REVIEW: concurrent catalog card'; END IF;`)]
    executeTemporaryMergeSql(`\\set ON_ERROR_STOP on\nBEGIN;\nSET LOCAL lock_timeout='5s';\nDO $series_catalog$ BEGIN\n${guards.join('\n')}\nINSERT INTO public.figure_book_contents(content_id) VALUES ${contents.map(c=>'('+sqlLiteral(c.id)+')').join(',')} ON CONFLICT(content_id) DO NOTHING;\nEND; $series_catalog$;\nCOMMIT;\nSELECT 'MERGE_COMMITTED';\n`,randomUUID())
    current={...current,editions:await rows(db,'figure_book_editions',ids)}
  }
  const plan=planSeriesRepair(candidate,current)
  if(!apply)return {...plan,editionCount:editions.length,dryRun:true}
  if(contents.length<2&&contents[0].metadata?.figureBook?.series?.title===plan.title)return {...plan,completed:true,alreadyMerged:true}
  for(const drop of plan.drops) {
    checkFixedReferences({keep:plan.keep,drop})
    const check=planSnapshot(await captureDatabaseSnapshot(db,{keep:plan.keep,drop}),{keep:plan.keep,drop})
    if(check.skip)throw new Error('반영 전 참조·기록 충돌: '+check.skip)
  }
  executeTemporaryMergeSql(buildSeriesPrepareSql(plan,current),randomUUID())
  for(const drop of plan.drops) {
    const result=await applyOne(db,{keep:plan.keep,drop},{capture:captureDatabaseSnapshot})
    if(!result.completed)throw new Error(drop+': '+result.skip)
    console.log(JSON.stringify({series:plan.title,keep:plan.keep,drop,completed:true}))
  }
  const after=await rows(db,'figure_book_editions',[plan.keep])
  for(const before of current.editions) {
    const found=after.find(row=>row.id===before.id)
    const equivalent=!found&&after.find(row=>row.isbn===before.isbn&&row.locale===before.locale&&row.title===before.title&&row.creator===before.creator)
    if(!equivalent&&(!found||found.isbn!==before.isbn||found.title!==before.title||found.thumbnail_url!==before.thumbnail_url))throw new Error('판본 ID·ISBN·제목·표지 재조회 불일치: '+before.id)
  }
  const remaining=await rows(db,'contents',ids)
  if(remaining.length!==1||remaining[0].id!==plan.keep||remaining[0].metadata?.figureBook?.series?.title!==plan.title)throw new Error('시리즈 대표 재조회 불일치')
  return {...plan,completed:true,editionCount:after.length}
}

export async function main() {
  const input=argumentValue('file')
  if(!input)throw Error('--file=<독립 검수한 임시 후보 파일>이 필요합니다')
  const file=resolve(input)
  const report=JSON.parse(readFileSync(file,'utf8')),db=dbClient(),apply=hasFlag('apply')
  for(const candidate of report.candidates.filter(row=>row.sourceReview?.verdict==='series_split_confirmed')) {
    const result=await repairSeries(db,candidate,apply)
    console.log(JSON.stringify(result))
    if(apply) {
      candidate.repair={keep:result.keep,mergedContentIds:result.drops,editionCount:result.editionCount,completed:true,checkedAt:new Date().toISOString()}
      writeFileSync(file,JSON.stringify(report,null,2)+'\n','utf8')
    }
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1})
