import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {renderUnifiedArticle} from './unified-article.mjs';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function verifiedPreviewManifest(article,receipt,preview){
 if(!receipt.saved||!receipt.verified||receipt.articleHash!==article.articleHash)throw Error('Verified image receipt required');
 const wanted=article.operations.filter(o=>o.kind==='image'),images=[];
 for(const [i,op]of wanted.entries()){
  const prefix='revision-'+(receipt.uploadLogNo??article.logNo)+'-'+(i+1)+'-',existing=preview?.images?.[i];let match=null;
  const candidates=[];
  if(existing?.url===op.url&&fs.existsSync(existing.file))candidates.push(existing.file);
  if(receipt.dir&&fs.existsSync(receipt.dir))for(const f of fs.readdirSync(receipt.dir))if(f.includes(prefix)&&/\.(?:png|jpe?g)$/i.test(f))candidates.push(path.join(receipt.dir,f));
  for(const file of new Set(candidates)){const sha256=hash(fs.readFileSync(file));if(receipt.snapshot.images[i]?.src.includes(prefix+sha256.slice(0,12))){match={url:op.url,file,sha256};break;}}
  if(!match)throw Error('Verified original image file unavailable: '+article.logNo+' / '+i);images.push(match);
 }
 return{articleHash:article.articleHash,images};
}
export function renderPreparedPreview(article,out){
 const manifest=path.join(out,article.logNo+'-preview-images.json');if(!fs.existsSync(manifest))return renderUnifiedArticle(article);
 const saved=JSON.parse(fs.readFileSync(manifest,'utf8'));if(saved.articleHash!==article.articleHash)return renderUnifiedArticle(article);
 const wanted=article.operations.filter(o=>o.kind==='image');if(saved.images.length!==wanted.length)throw Error('Preview image coverage differs');
 const imageSources={};for(const [i,image]of saved.images.entries()){const bytes=fs.readFileSync(image.file);if(image.url!==wanted[i].url||hash(bytes)!==image.sha256)throw Error('Prepared preview image differs');imageSources[image.url]='data:image/'+(path.extname(image.file).toLowerCase()==='.png'?'png':'jpeg')+';base64,'+bytes.toString('base64');}
 return renderUnifiedArticle(article,{imageSources});
}
export function savePreparedPreview(article,images,out){
 const wanted=article.operations.filter(o=>o.kind==='image');if(images.length!==wanted.length||images.some((image,i)=>image.url!==wanted[i].url))throw Error('Exact downloaded preview images required');
 const manifest={articleHash:article.articleHash,images:images.map(image=>({url:image.url,file:image.file,sha256:hash(fs.readFileSync(image.file))}))};
 const file=path.join(out,article.logNo+'-preview-images.json');fs.writeFileSync(file,JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(out,article.logNo+'.html'),renderPreparedPreview(article,out));
}
