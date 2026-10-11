import test from 'node:test'
import assert from 'node:assert/strict'
import {createIntroductionSession,createIntroductionHttpServer,createCentralIntroductionCollector,parseIntroductionSessionArgs,coordinatorUrl} from './catalog-introduction-session.mjs'

const isbn='9780141439518',prose='The story of a family and its life is told in this book.'
const catalog=()=>({observedAt:'snapshot',contents:[{id:'a',figureBook:{}},{id:'b',figureBook:{}}],
 editions:[{id:11,content_id:'a',locale:'en',isbn,title:'Book',creator:'Author',description:null},{id:12,content_id:'b',locale:'en',isbn,title:'Book',creator:'Author',description:'OPEN'}],
 locales:[{content_id:'a',locale:'en',isbn,title:'Book',creator:'Author',description:prose,sources:{description:'https://openlibrary.org/books/OL123M?api_key=hidden'}}]})
const collect=async()=>{throw Error('Unexpected provider request')}

test('source session starts idle; requested rows reuse exact locale prose without provider calls',async()=>{
 const session=createIntroductionSession(catalog(),{collect,readOpenLibraryWork:null,readDaumDescription:null})
 assert.equal(session.status().cachedArtifactRows,0)
 assert.equal(session.status().activeRequests,0)
 assert.deepEqual(session.prefetch({contentIds:['a'],editionIds:[11]}),{requestedWorks:1,candidateRows:1,scheduledRows:1,cachedRows:0})
 assert.equal(session.prefetch({contentIds:['a']}).scheduledRows,0)
 await session.drain()
 const row=session.artifacts({contentIds:['a']}).artifacts[0]
 assert.equal(row.sourceIntro,prose)
 assert.equal(row.sourceUrl,'https://openlibrary.org/books/OL123M')
 assert.equal(session.status().sourceIntroRows,1)
 assert.equal(session.status().candidateWorks,1)
 assert.equal(session.artifacts({contentIds:['b']}).artifacts.length,0)
})

test('prefetch validates bounded snapshot ownership and isolates secret provider errors',async()=>{
 const data=catalog();data.locales=[]
 const session=createIntroductionSession(data,{collect:async()=>{throw Error('api_key=private')},readOpenLibraryWork:null,readDaumDescription:null})
 for(const input of [{contentIds:[]},{contentIds:Array(101).fill('a')},{contentIds:['b'],editionIds:[11]}])assert.throws(()=>session.prefetch(input),error=>error.status===400)
 assert.throws(()=>session.prefetch({contentIds:['outside']}),error=>error.status===404)
 session.prefetch({contentIds:['a']});await session.drain()
 assert.equal(session.status().failedRequests,1)
 assert.equal(session.status().pendingRows,0)
 assert.equal(JSON.stringify(session.status()).includes('private'),false)
})

test('whole-catalog source prefetch stays bounded, explicit, and reuses requested rows',async()=>{
 const data=catalog();data.editions.push({...data.editions[0],id:13,content_id:'b'})
 data.locales.push({...data.locales[0],content_id:'b'})
 const session=createIntroductionSession(data,{collect,readOpenLibraryWork:null,readDaumDescription:null})
 assert.equal(session.status().activeRequests,0)
 assert.equal(session.status().sourceRemainingWorks,2)
 assert.equal(session.prefetchNext({maxWorks:1}).requestedWorks,1)
 await session.drain()
 assert.equal(session.status().sourceRemainingWorks,1)
 assert.equal(session.prefetchNext({maxWorks:1}).requestedWorks,1)
 await session.drain()
 assert.equal(session.prefetchNext({maxWorks:1}).requestedWorks,0)
 assert.equal(session.status().cachedArtifactRows,2)
 for(const maxWorks of[0,101,1.2])assert.throws(()=>session.prefetchNext({maxWorks}),error=>error.status===400)
})

test('separate requested works share the central ISBN lookup and cached artifacts remain immutable to callers',async()=>{
 const data=catalog();data.locales=[];data.editions[1].description=null
 const requests=[]
 const session=createIntroductionSession(data,{collect:async(provider,isbns)=>{requests.push({provider,isbns});return {results:[{isbn,data:{isbn,editionIsbns:[isbn],languageKeys:['/languages/eng'],title:'Book',creator:'Author',description:prose,sourceUrl:'https://openlibrary.org/books/OL123M'}}]}},readOpenLibraryWork:null,readDaumDescription:null})
 session.prefetch({contentIds:['a']});session.prefetch({contentIds:['b']})
 await session.drain()
 assert.equal(requests.length,1)
 assert.deepEqual(requests[0],{provider:'openlibrary',isbns:[isbn]})
 assert.equal(session.status().cachedArtifactRows,2)
 const rows=session.artifacts({contentIds:['a']}).artifacts;rows[0].sourceIntro='Changed by caller'
 assert.equal(session.artifacts({contentIds:['a']}).artifacts[0].sourceIntro,prose)
 assert.equal(session.prefetch({contentIds:['a','b']}).scheduledRows,0)
 assert.equal(requests.length,1)
})

test('central research adapter uses configured loopback coordinator and never exposes raw response errors',async()=>{
 let request
 const adapter=createCentralIntroductionCollector('http://127.0.0.1:2412',async(url,options)=>{request={url,options};return {ok:true,json:async()=>({results:[{isbn,data:null}]})}})
 assert.equal((await adapter('openlibrary',[isbn])).results.length,1)
 assert.equal(request.url,'http://127.0.0.1:2412/research')
 assert.equal(request.options.redirect,'error')
 assert.deepEqual(JSON.parse(request.options.body),{provider:'openlibrary',isbns:[isbn]})
 const bad=createCentralIntroductionCollector('http://localhost:2411',async()=>({ok:false,text:async()=>'private'}))
 await assert.rejects(bad('kakao',[isbn]),error=>!error.message.includes('private'))
 for(const url of ['https://127.0.0.1:2411','http://remote.test:2411','http://user:secret@localhost:2411','http://localhost:2411/path'])assert.throws(()=>coordinatorUrl(url))
 assert.deepEqual(parseIntroductionSessionArgs([]),{port:2413,coordinator:'http://127.0.0.1:2411'})
 assert.deepEqual(parseIntroductionSessionArgs(['--port','2414','--coordinator','http://localhost:2412']),{port:2414,coordinator:'http://localhost:2412'})
 assert.throws(()=>parseIntroductionSessionArgs(['--port','2413','--port','2414']))
})

test('loopback HTTP endpoints expose aggregate status and requested artifacts; reject foreign origin and stop only own server',async()=>{
 const session=createIntroductionSession(catalog(),{collect,readOpenLibraryWork:null,readDaumDescription:null})
 const server=createIntroductionHttpServer(session)
 await new Promise(done=>server.listen(0,'127.0.0.1',done))
 const base='http://127.0.0.1:'+server.address().port
 try{
  const status=await(await fetch(base+'/status')).json()
  assert.equal(Object.hasOwn(status,'artifacts'),false)
  const post=(path,input,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(input)})
  assert.equal((await post('/prefetch',{contentIds:['a']})).status,202)
  await session.drain()
  assert.equal((await(await post('/artifacts',{contentIds:['a']})).json()).artifacts.length,1)
  assert.equal((await post('/prefetch',{contentIds:['a']},{Origin:'http://foreign.test'})).status,403)
  assert.equal((await post('/prefetch',[])).status,400)
  assert.equal((await post('/prefetch',{contentIds:['missing']})).status,404)
  const closed=new Promise(done=>server.once('close',done))
  assert.equal((await post('/shutdown',{})).status,200)
  await closed
 }finally{if(server.listening)await new Promise(done=>{server.close(done);server.closeIdleConnections()})}
})
