/** 동기 SSH/SQL 실행 뒤 만료된 keep-alive 소켓을 재사용하지 않는 RAM 조정 서버 클라이언트. */
import {request} from 'node:http'
import {coordinatorUrl} from './catalog-session-url.mjs'

export function createCatalogReviewClient(origin,{timeoutMs=180000}={}){
 const base=coordinatorUrl(origin)
 const call=(path,body)=>new Promise((resolve,reject)=>{
  if(typeof path!=='string'||!/^\/[a-z-]+(?:\/job-\d+)?$/u.test(path))return reject(Error('Invalid coordinator path'))
  const req=request(base+path,{agent:false,method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('error',()=>reject(Error('Coordinator response interrupted')))
   res.on('end',()=>{
    if(res.statusCode<200||res.statusCode>=300)return reject(Object.assign(Error('Coordinator HTTP '+res.statusCode),{status:res.statusCode}))
    try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(Error('Coordinator returned invalid JSON'))}
   })
  })
  req.setTimeout(timeoutMs,()=>req.destroy(Error('Coordinator request timed out')))
  req.on('error',error=>reject(Object.assign(Error('Coordinator transport failure'),{code:error.code})))
  req.end(body===undefined?undefined:JSON.stringify(body))
 })
 return {get:path=>call(path),post:(path,body)=>call(path,body)}
}
