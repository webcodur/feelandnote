import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {createCatalogReviewClient} from './catalog-review-client.mjs'

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
test('failed or redirected calls do not retry mutations or expose response bodies',async()=>{
 let calls=0;const server=createServer((req,res)=>{calls++;res.writeHead(409);res.end('private-token-in-error')})
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const api=createCatalogReviewClient('http://127.0.0.1:'+server.address().port)
 try{await assert.rejects(api.post('/finish',{}),error=>error.status===409&&!error.message.includes('private'));assert.equal(calls,1)}
 finally{await new Promise(done=>server.close(done))}
 for(const url of['http://outside.example:2414','http://user:secret@localhost:2414','https://localhost:2414'])assert.throws(()=>createCatalogReviewClient(url))
})
