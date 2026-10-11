import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {createCatalogReviewClient,withCatalogMutationLease} from './catalog-review-client.mjs'

test('sequential coordinator operations use fresh connections after blocking execution',async()=>{
 const sockets=new Set(),server=createServer(async(req,res)=>{sockets.add(req.socket);const chunks=[];for await(const chunk of req)chunks.push(chunk)
  res.end(JSON.stringify({path:req.url,body:chunks.length?JSON.parse(Buffer.concat(chunks).toString()):null}))})
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const api=createCatalogReviewClient('http://127.0.0.1:'+server.address().port)
 try{
  assert.equal((await api.get('/status')).path,'/status')
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,20)
  assert.deepEqual((await api.post('/mutation-release',{lane:'lane-1',jobId:'job-1'})).body,{lane:'lane-1',jobId:'job-1'})
  assert.equal(sockets.size,2)
  await assert.rejects(api.get('//untrusted.example/status'),/Invalid coordinator path/)
 }finally{await new Promise(done=>server.close(done))}
})

test('FIFO waits for acquired, runs mutation once and releases its exact owner',async()=>{
 const owner={lane:'lane-7',jobId:'job-14060'},calls=[];let leases=0,mutations=0
 const api={post:async(path,body)=>{calls.push([path,body]);return path==='/mutation-release'?{released:true}:
  ++leases===1?{acquired:false,busy:true,position:1,lease:{lane:'lane-8',jobId:'job-26000'}}:{acquired:true,busy:false,lease:owner}}}
 assert.equal(await withCatalogMutationLease(api,owner,async()=>{mutations++;return 'committed'},{pollMs:1}),'committed')
 assert.equal(mutations,1);assert.equal(leases,2)
 assert.deepEqual(calls.at(-1),['/mutation-release',owner])
})

test('failed mutation is never retried and its lease is released',async()=>{
 const owner={lane:'lane-7',jobId:'job-14060'},calls=[];let mutations=0
 const api={post:async(path,body)=>{calls.push([path,body]);return {acquired:true,lease:owner}}}
 await assert.rejects(withCatalogMutationLease(api,owner,async()=>{mutations++;throw Error('SQL failed')}),/SQL failed/)
 assert.equal(mutations,1);assert.deepEqual(calls.at(-1),['/mutation-release',owner])
})

test('granted and mismatched acquired replies cannot authorize a mutation',async()=>{
 const owner={lane:'lane-7',jobId:'job-14060'}
 for(const reply of[{granted:true,lease:owner},{acquired:true,lease:{lane:'lane-8',jobId:'job-26000'}}]){
  const calls=[];const api={post:async(path,body)=>{calls.push([path,body]);return reply}}
  await assert.rejects(withCatalogMutationLease(api,owner,()=>assert.fail('must not mutate')),/Invalid mutation lease response/)
  assert.deepEqual(calls.at(-1),['/mutation-release',owner])
 }
})

test('release failure exposes mutation attempt without repeating a successful mutation',async()=>{
 const owner={lane:'lane-7',jobId:'job-14060'};let mutations=0
 const api={post:async path=>{if(path==='/mutation-release')throw Error('transport');return {acquired:true,lease:owner}}}
 await assert.rejects(withCatalogMutationLease(api,owner,()=>{mutations++;return 'committed'}),error=>error instanceof AggregateError&&error.mutationAttempted===true)
 assert.equal(mutations,1)
})
test('failed or redirected calls do not retry mutations or expose response bodies',async()=>{
 let calls=0;const server=createServer((req,res)=>{calls++;res.writeHead(409);res.end('private-token-in-error')})
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const api=createCatalogReviewClient('http://127.0.0.1:'+server.address().port)
 try{await assert.rejects(api.post('/finish',{}),error=>error.status===409&&!error.message.includes('private'));assert.equal(calls,1)}
 finally{await new Promise(done=>server.close(done))}
 for(const url of['http://outside.example:2414','http://user:secret@localhost:2414','https://localhost:2414'])assert.throws(()=>createCatalogReviewClient(url))
})
