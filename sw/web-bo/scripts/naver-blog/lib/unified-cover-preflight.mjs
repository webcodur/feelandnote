import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
import {coverDisplayWidth,UNIFIED_ARTICLE} from './unified-article.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,2));fs.renameSync(f+'.tmp',f);};
const localError=message=>Object.assign(Error(message),{deferrableBeforeSave:true});

export function coverGeometryChange(book,geometry){
 const width=coverDisplayWidth({...book,coverGeometry:geometry});
 if(width===UNIFIED_ARTICLE.coverWidth)return book.coverGeometry?null:undefined;
 return JSON.stringify(book.coverGeometry)===JSON.stringify(geometry)?undefined:geometry;
}

export async function preflightUnifiedCovers(materialFile,out){
 const material=read(materialFile),cacheFile=path.join(out,'cover-preflight.json'),cache=fs.existsSync(cacheFile)?read(cacheFile):{};
 let changed=false;
 for(const book of material.books??[]){
  let geometry=cache[book.coverUrl];
  if(!geometry){
   const response=await fetch(book.coverUrl,{cache:'no-store',headers:{'user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(30000)});
   if(!response.ok){if([404,410].includes(response.status))throw localError('Cover unavailable: '+book.title+' / HTTP '+response.status);throw Error('Cover download interrupted: HTTP '+response.status);}
   const bytes=Buffer.from(await response.arrayBuffer());let metadata;
   try{metadata=await sharp(bytes).metadata();}catch{throw localError('Cover is not a readable image: '+book.title);}
   if(!['png','jpeg','webp'].includes(metadata.format)||metadata.width<=1||metadata.height<=1||metadata.pages>1)throw localError('Cover is missing or unsupported: '+book.title);
   geometry={url:book.coverUrl,width:metadata.width,height:metadata.height,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex')};
   cache[book.coverUrl]=geometry;write(cacheFile,cache);
  }
  let next;try{next=coverGeometryChange(book,geometry);}catch(e){throw localError(String(e));}
  if(next!==undefined){if(next===null)delete book.coverGeometry;else book.coverGeometry=next;changed=true;}
 }
 if(changed)write(materialFile,material);
 return changed;
}
