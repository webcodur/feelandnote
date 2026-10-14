import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import {readFileSync} from 'node:fs'
import {createClient} from '@feelandnote/db'
import {externalBookWorkKey,sameBookIdentity} from '@feelandnote/content-search/external-book-input'

const source=ts.transpileModule(readFileSync(new URL('./external-search.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const isbn='9780062301253',book={externalId:isbn,externalSource:'openlibrary',locale:'en',title:'Elon Musk',creator:'Ashlee Vance',coverImageUrl:null,
 metadata:{isbn,publisher:'Ecco',link:'https://openlibrary.org/books/OL29732932M',workKey:'/works/OL17184556W'}}
function fixture(rows:Record<string,Record<string,unknown>[]>) {
 const writes:unknown[]=[],db=createClient('https://db.test','test-key',{auth:{persistSession:false},global:{fetch:async(value,init)=>{
  const url=new URL(String(value)),table=url.pathname.split('/').at(-1)!,method=init?.method??'GET'
  if(method!=='GET'){writes.push({table,method});throw Error('unexpected write')}
  const selected=(rows[table]??[]).filter(row=>[...url.searchParams].every(([key,value])=>{
   if(!value.startsWith('eq.'))return true
   const actual=key.split(/->>?/u).reduce<unknown>((value,part)=>(value as Record<string,unknown>|undefined)?.[part],row)
   return String(actual)===value.slice(3)
  }))
  return Response.json(new Headers(init?.headers).get('Accept')?.includes('vnd.pgrst.object')?selected[0]??null:selected)
 }}})
 const mocks:Record<string,unknown>={
  '@feelandnote/content-search/unified-search':{},'@/lib/db/server':{createClient:async()=>db},'@/lib/revalidate-web':{},
  '@feelandnote/shared/constants/cache-tags':{},'@feelandnote/shared/lib/book-metadata':{},'@feelandnote/content-search/book-introduction':{},
  '@/lib/admin-auth':{requireAdmin:async()=>{}},'@/lib/external-book-input':{resolveExternalBookInput:async()=>book,sameBookIdentity},
  '@feelandnote/content-search/external-book-input':{externalBookWorkKey},
 }
 const module={exports:{} as {createContentFromExternal:(input:unknown,type:string)=>Promise<{success:boolean;contentId?:string;error?:string}>}}
 new Function('require','module','exports',source)((name:string)=>{assert.ok(name in mocks,name);return mocks[name]},module,module.exports)
 return {create:()=>module.exports.createContentFromExternal(book,'BOOK'),writes}
}

test('백오피스 외부 등록도 보조 판본 ISBN의 기존 작품을 재사용한다',async()=>{
 const f=fixture({contents:[{id:'original',type:'BOOK',external_id:'9780062301239'}],figure_book_editions:[{content_id:'original',isbn}]})
 assert.deepEqual(await f.create(),{success:true,contentId:'original'});assert.equal(f.writes.length,0)
})

test('백오피스에서 원작 키가 같은 다른 ISBN을 새 작품으로 만들지 않는다',async()=>{
 const f=fixture({contents:[{id:'original',type:'BOOK'}],figure_book_editions:[{content_id:'original',isbn:'9780062301239',sources:{workKey:book.metadata.workKey}}]})
 const result=await f.create();assert.equal(result.success,false);assert.match(result.error??'',/같은 원작/);assert.equal(f.writes.length,0)
})

test('이미 같은 ISBN이 두 작품에 있으면 임의의 첫 작품을 선택하지 않는다',async()=>{
 const f=fixture({content_locales:[{content_id:'a',isbn},{content_id:'b',isbn}]})
 const result=await f.create();assert.equal(result.success,false);assert.match(result.error??'',/여러 작품/);assert.equal(f.writes.length,0)
})
