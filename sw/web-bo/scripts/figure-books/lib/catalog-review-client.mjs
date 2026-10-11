/** 동기 SSH/SQL 실행 뒤 만료된 keep-alive 소켓을 재사용하지 않는 RAM 조정 서버 클라이언트. */
import {request} from 'node:http'
import {coordinatorUrl} from './catalog-session-url.mjs'

/** FIFO 취득 뒤 확정 SQL을 한 번만 실행하고, 자기 lease를 반드시 반환한다. */
export async function withCatalogMutationLease(api,{lane,jobId},mutate,{pollMs=1500}={}){
 if(typeof lane!=='string'||!lane||!/^job-\d+$/u.test(jobId)||typeof mutate!=='function'
  ||!Number.isSafeInteger(pollMs)||pollMs<1||pollMs>5000)throw Error('Invalid mutation lease request')
 const owner={lane,jobId};let acquired=false,result,error
 try{
  for(;;){
   const state=await api.post('/mutation-lease',owner)
   if(state?.acquired===true&&state.lease?.lane===lane&&state.lease.jobId===jobId){acquired=true;break}
   if(state?.acquired!==false||state.busy!==true)throw Error('Invalid mutation lease response')
   await new Promise(resolve=>setTimeout(resolve,pollMs))
  }
  result=await mutate()
 }catch(cause){error=cause}
 try{await api.post('/mutation-release',owner)}catch(cause){
  // 서버는 다른 소유자의 lease를 반환하지 않는다. 취득 여부가 불명확해도 자기 ID로만 요청한다.
  error=new AggregateError(error?[error,cause]:[cause],'Mutation lease release failed; check actual DB state before retry')
  error.mutationAttempted=acquired
 }
 if(error)throw error
 return result
}

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
 const api={get:path=>call(path),post:(path,body)=>call(path,body)}
 api.withMutationLease=(owner,mutate,options)=>withCatalogMutationLease(api,owner,mutate,options)
 return api
}
