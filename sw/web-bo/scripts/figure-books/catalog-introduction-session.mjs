/** 요청받은 작품의 소개 출처만 읽는 RAM 서버. 작업 배정과 DB 반영은 중앙 coordinator가 소유한다. */
import {createServer} from 'node:http'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {loadSeriesAuditCatalog} from './series-split-audit.mjs'
import {loadFullLocaleMetadata,publicMetadata} from './catalog-review-session.mjs'
import {extractCatalogIntroductionCandidates,createCatalogIntroductionResearch,readOpenLibraryIntroductionWork} from './lib/catalog-review-introductions.mjs'
import {fetchDaumBookDescription} from '../../../../packages/content-search/src/kakao-books.ts'
import {coordinatorUrl} from './lib/catalog-session-url.mjs'
export {coordinatorUrl} from './lib/catalog-session-url.mjs'

const fail=(status,message)=>{throw Object.assign(Error(message),{status})}
const unique=values=>[...new Set(values)]
const key=row=>JSON.stringify([row.contentId,row.editionId,row.locale])

export function createCentralIntroductionCollector(coordinator,fetcher=fetch) {
 const base=coordinatorUrl(coordinator)
 return async(provider,isbns)=>{
  const response=await fetcher(base+'/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,isbns}),redirect:'error',signal:AbortSignal.timeout(120000)})
  if(!response.ok)throw Error('Central introduction research unavailable')
  const result=await response.json()
  if(!Array.isArray(result.results))throw Error('Central research returned no results')
  return result
 }
}

export function createIntroductionSession(catalog,{collect,readOpenLibraryWork=readOpenLibraryIntroductionWork,readDaumDescription=fetchDaumBookDescription,localesObservedAt=null}={}) {
 const research=createCatalogIntroductionResearch({collect,readOpenLibraryWork,readDaumDescription})
 const candidates=extractCatalogIntroductionCandidates(catalog,{includeLocales:true})
 const works=new Set(catalog.contents.map(work=>work.id)),byWork=new Map(),editionOwners=new Map(catalog.editions.map(row=>[String(row.id),row.content_id]))
 for(const row of candidates){const group=byWork.get(row.contentId)??[];group.push(row);byWork.set(row.contentId,group)}
 const sourceWorkIds=[...byWork.keys()];let sourceCursor=0
 const artifacts=new Map(),pending=new Set(),tasks=new Set();let failedRequests=0
 function selection({contentIds,editionIds}={}) {
  if(!Array.isArray(contentIds)||!contentIds.length||contentIds.length>100||contentIds.some(id=>typeof id!=='string'||!id||id.length>100))fail(400,'contentIds must contain 1..100 work IDs')
  const ids=unique(contentIds)
  if(ids.some(id=>!works.has(id)))fail(404,'Work ID absent from the source snapshot')
  if(editionIds!==undefined&&(!Array.isArray(editionIds)||editionIds.length>1000||editionIds.some(id=>!['string','number'].includes(typeof id)||!editionOwners.has(String(id))||!ids.includes(editionOwners.get(String(id))))))fail(400,'editionIds must belong to the requested works')
  const selected=editionIds===undefined?null:new Set(editionIds.map(String))
  return {ids,rows:ids.flatMap(id=>byWork.get(id)??[]).filter(row=>!selected||row.editionId!==null&&selected.has(String(row.editionId)))}
 }
 return {
  status(){const rows=[...artifacts.values()];return {catalogObservedAt:catalog.observedAt,localesObservedAt,bookWorks:works.size,candidateWorks:byWork.size,candidateRows:candidates.length,
   candidateEditions:candidates.filter(row=>row.editionId!==null).length,candidateLocales:candidates.filter(row=>row.editionId===null).length,
   cachedArtifactRows:rows.length,sourceIntroRows:rows.filter(row=>row.sourceIntro).length,sourceCandidateRows:rows.filter(row=>row.sourceCandidates?.length).length,sourceMissingRows:rows.filter(row=>!row.sourceIntro).length,pendingRows:pending.size,activeRequests:tasks.size,failedRequests,sourceCursor,sourceRemainingWorks:sourceWorkIds.length-sourceCursor}},
  prefetchNext({maxWorks=20}={}){
   if(!Number.isSafeInteger(maxWorks)||maxWorks<1||maxWorks>100)fail(400,'maxWorks must be 1..100')
   const ids=[]
   while(sourceCursor<sourceWorkIds.length&&ids.length<maxWorks){
    const id=sourceWorkIds[sourceCursor++]
    if((byWork.get(id)??[]).some(row=>!artifacts.has(key(row))&&!pending.has(key(row))))ids.push(id)
   }
   return ids.length?{...this.prefetch({contentIds:ids}),remainingWorks:sourceWorkIds.length-sourceCursor}:{requestedWorks:0,scheduledRows:0,remainingWorks:sourceWorkIds.length-sourceCursor}
  },
  prefetch(input){
   const selected=selection(input),missing=selected.rows.filter(row=>!artifacts.has(key(row))&&!pending.has(key(row)))
   if(missing.length){
    for(const row of missing)pending.add(key(row))
    const task=research.prefetch(missing).then(results=>{for(const row of results)artifacts.set(key(row),publicMetadata(row))}).catch(()=>{failedRequests++}).finally(()=>{
     for(const row of missing)pending.delete(key(row));tasks.delete(task)
    })
    tasks.add(task)
   }
   return {requestedWorks:selected.ids.length,candidateRows:selected.rows.length,scheduledRows:missing.length,cachedRows:selected.rows.filter(row=>artifacts.has(key(row))).length}
  },
  artifacts(input){const selected=selection(input);return {artifacts:selected.rows.flatMap(row=>artifacts.has(key(row))?[structuredClone(artifacts.get(key(row)))]:[]),pendingRows:selected.rows.filter(row=>pending.has(key(row))).length}},
  async drain(){await Promise.all([...tasks])},
 }
}

export function createIntroductionHttpServer(session) {
 const server=createServer(async(request,response)=>{
  const send=(status,data)=>{response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(data))}
  try{
   const host='127.0.0.1:'+server.address().port
   if(!['127.0.0.1:'+server.address().port,'localhost:'+server.address().port].includes(request.headers.host))fail(403,'Loopback host required')
   if(request.headers.origin&&request.headers.origin!=='http://'+request.headers.host)fail(403,'Foreign origin rejected')
   const path=new URL(request.url,'http://'+host).pathname
   if(request.method==='GET'&&path==='/status')return send(200,session.status())
   if(request.method!=='POST')fail(404,'Unknown endpoint')
   let size=0;const chunks=[]
   for await(const chunk of request){size+=chunk.length;if(size>65536)fail(413,'Request too large');chunks.push(chunk)}
   let input;try{input=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}catch{fail(400,'Invalid JSON')}
   if(!input||Array.isArray(input)||typeof input!=='object')fail(400,'JSON object required')
   if(path==='/prefetch')return send(202,session.prefetch(input))
   if(path==='/prefetch-next')return send(202,session.prefetchNext(input))
   if(path==='/artifacts')return send(200,session.artifacts(input))
   if(path==='/shutdown'){send(200,{shutdown:true});server.close();server.closeIdleConnections();return}
   fail(404,'Unknown endpoint')
  }catch(error){if(!response.headersSent)send(error.status??500,{error:error.status?error.message:'Introduction source session failed'})}
 })
 server.requestTimeout=120000
 return server
}

export function parseIntroductionSessionArgs(args) {
 let port=2413,coordinator='http://127.0.0.1:2411';const seen=new Set()
 for(let i=0;i<args.length;i+=2){
  const name=args[i],value=args[i+1]
  if(!['--port','--coordinator'].includes(name)||seen.has(name)||!value)throw Error('Usage: catalog-introduction-session.mjs [--port N] [--coordinator http://127.0.0.1:N]')
  seen.add(name)
  if(name==='--port'){if(!/^\d+$/u.test(value)||Number(value)<1||Number(value)>65535)throw Error('Invalid source session port');port=Number(value)}
  else coordinator=coordinatorUrl(value)
 }
 return {port,coordinator}
}

export async function main(args=process.argv.slice(2)) {
 const {port,coordinator}=parseIntroductionSessionArgs(args)
 const catalog=loadSeriesAuditCatalog(),full=loadFullLocaleMetadata(),workIds=new Set(catalog.contents.map(row=>row.id))
 catalog.locales=full.locales.filter(row=>workIds.has(row.content_id))
 const session=createIntroductionSession(catalog,{collect:createCentralIntroductionCollector(coordinator),localesObservedAt:full.observedAt})
 const server=createIntroductionHttpServer(session)
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',done)})
 console.log(JSON.stringify({port,coordinator,...session.status()}))
 return server
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main()
