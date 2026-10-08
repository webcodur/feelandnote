import {randomUUID} from 'node:crypto'
import {executeTemporaryMergeSql} from '../merge-works.mjs'
import {sqlLiteral} from './merge-work-sql.mjs'
import {isDeepStrictEqual} from 'node:util'

/** 확인한 행만 변경한다. 실제 현재값·FK를 검사하고 같은 ID로 재조회한다. */
export async function applyCatalogRowCorrections(db,changes) {
  const tables=new Set(['contents','content_locales','figure_book_editions']),statements=[]
  for(const change of changes){
    const {table,before,patch,remove}=change;if(!tables.has(table)||(!patch&&!remove)||table==='contents'&&remove)throw Error('Unsupported catalog correction')
    const where=table==='content_locales'?`content_id=${sqlLiteral(before.content_id)} AND locale=${sqlLiteral(before.locale)}`:`id::text=${sqlLiteral(String(before.id))}`
    statements.push(`PERFORM 1 FROM public.${table} WHERE ${where} FOR UPDATE;
IF (SELECT to_jsonb(t) FROM public.${table} t WHERE ${where}) IS DISTINCT FROM ${sqlLiteral(JSON.stringify(before))}::jsonb THEN RAISE EXCEPTION 'catalog row changed concurrently';END IF;`)
    if(remove){
      if(table!=='figure_book_editions')throw Error('Only an incorrect edition can be removed')
      statements.push(`IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
WHERE c.contype='f' AND c.confrelid='public.figure_book_editions'::regclass AND (n.nspname<>'public' OR r.relname<>'figure_book_products' OR cardinality(c.conkey)<>1 OR a.attname<>'edition_id')) THEN RAISE EXCEPTION 'unhandled edition reference';END IF;
IF EXISTS(SELECT 1 FROM public.figure_book_products WHERE edition_id=${Number(before.id)}) THEN RAISE EXCEPTION 'edition still has a product';END IF;DELETE FROM public.figure_book_editions WHERE ${where};`)
    }else{
      const allowed=table==='contents'?['metadata']:['title','creator','description','publisher','isbn','thumbnail_url','release_date','edition_kind','text_scope','sort_order','sources','affiliate_url',...(table==='figure_book_editions'?['locale','content_id']:[])]
      if(Object.keys(patch).some(field=>!allowed.includes(field)))throw Error('Unsupported catalog patch field')
      if(patch.content_id&&patch.content_id!==before.content_id){
        const proof=patch.sources?.work_attribution
        if(proof?.method!=='independent_work_review'||proof.content_id!==patch.content_id||proof.isbn!==before.isbn||!/^https:\/\//u.test(proof.source_url??''))throw Error('Moving an edition requires current-owner source evidence')
        statements.push(`PERFORM 1 FROM public.contents WHERE id=${sqlLiteral(patch.content_id)} AND type='BOOK' FOR KEY SHARE;IF NOT FOUND THEN RAISE EXCEPTION 'correct work missing';END IF;`)
      }
      const value=v=>v===null?'NULL':typeof v==='object'?`${sqlLiteral(JSON.stringify(v))}::jsonb`:typeof v==='number'?String(v):sqlLiteral(v)
      statements.push(`UPDATE public.${table} SET ${Object.entries(patch).map(([field,v])=>`${field}=${value(v)}`).join(',')} WHERE ${where};`)
    }
  }
  executeTemporaryMergeSql(`BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';DO $correction$ BEGIN ${statements.join('\n')} END $correction$;COMMIT;SELECT 'MERGE_COMMITTED';`,randomUUID())
  const actual = new Map()
  for (const table of tables) {
    const selected = changes.filter(change => change.table === table)
    if (!selected.length) continue
    const key = table === 'content_locales' ? 'content_id' : 'id'
    const ids = [...new Set(selected.map(change => change.before[key]))]
    for(let start=0;start<ids.length;start+=100){
      const {data,error}=await db.from(table).select('*').in(key,ids.slice(start,start+100))
      if(error||!Array.isArray(data))throw Error(error?.message ?? 'Catalog readback missing')
      for(const row of data)actual.set(table+'|'+(table==='content_locales'?row.content_id+'|'+row.locale:row.id),row)
    }
  }
  for(const {table,before,patch,remove} of changes){
    const data=actual.get(table+'|'+(table==='content_locales'?before.content_id+'|'+before.locale:before.id))
    if(remove?data:!data||Object.entries(patch).some(([field,v])=>!isDeepStrictEqual(data[field],v)))throw Error('Catalog correction readback mismatch: '+table+' '+before.id)
  }
  return {changed:changes.length,removed:changes.filter(change=>change.remove).length}
}
