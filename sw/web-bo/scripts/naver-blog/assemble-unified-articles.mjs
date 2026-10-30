// Deterministic preparation only. No model, browser, or remote DB calls.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withApprovedSummaries} from './lib/approved-summary-material.mjs';
import {compileUnifiedArticle} from './lib/unified-article.mjs';

import {renderPreparedPreview} from './lib/unified-preview.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function write(file,value){const tmp=file+'.tmp';fs.writeFileSync(tmp,typeof value==='string'?value:JSON.stringify(value,null,2));fs.renameSync(tmp,file);}
export function assembleUnifiedArticles({materials,summaries,out,ids=null,supplement=null,portraits=null}){
  if(![materials,summaries,out].every(path.isAbsolute)||path.resolve(materials)===path.resolve(out))throw Error('Separate absolute source and ready directories required');
  fs.mkdirSync(out,{recursive:true});
  const cache={...read(summaries),...(supplement?read(supplement):{})},state={ready:[],pending:[],modelCalls:0};
  const currentPortraits=portraits?read(portraits):null;
  for(const file of fs.readdirSync(materials).filter(file=>/^\d+-material\.json$/.test(file))){
    const logNo=file.split('-')[0];if(ids&&!ids.includes(logNo))continue;
    try{
      const material=withApprovedSummaries(read(path.join(materials,file)),cache);
      if(currentPortraits&&material.kind==='celeb'){
        const person=currentPortraits[material.subject.id];
        if(!person?.portrait_url||'https://feelandnote.com/celeb/'+person.slug!==material.serviceUrl)throw Error('Current service portrait identity differs');
        material.subject.imageUrl=person.portrait_url;
      }
      const article=compileUnifiedArticle(material);
      const previous=path.join(out,logNo+'-article.json');
      // A native transaction owns its prepared input until its receipt exists.
      if(fs.existsSync(previous)&&read(previous).articleHash===article.articleHash){const html=renderPreparedPreview(article,out),preview=path.join(out,logNo+'.html');if(!fs.existsSync(preview)||fs.readFileSync(preview,'utf8')!==html)write(preview,html);state.ready.push({logNo,articleHash:article.articleHash});continue;}
      if(fs.existsSync(previous)){const receiptFile=path.join(out,logNo+'-native-verified.json'),old=read(previous);if(fs.existsSync(receiptFile)){const receipt=read(receiptFile);if(receipt.saved&&receipt.verified&&receipt.articleHash===old.articleHash){const folder=path.join(out,'revision-base');fs.mkdirSync(folder,{recursive:true});const previewFile=path.join(out,logNo+'-preview-images.json');write(path.join(folder,logNo+'.json'),{article:old,material:read(path.join(out,file)),receipt,preview:fs.existsSync(previewFile)?read(previewFile):null});}}}
      write(path.join(out,file),material);write(previous,article);write(path.join(out,logNo+'.html'),renderPreparedPreview(article,out));
      state.ready.push({logNo,articleHash:article.articleHash});
    }catch(error){state.pending.push({logNo,error:String(error)});}
  }
  write(path.join(out,'assembly-state.json'),state);return state;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const options={};for(const arg of process.argv.slice(2)){const match=arg.match(/^--(materials|summaries|out|ids|supplement|portraits)=(.+)$/);if(!match)throw Error('--materials= --summaries= --out= [--ids=] [--supplement=] [--portraits=]');options[match[1]]=match[1]==='ids'?match[2].split(','):match[2];}
  const state=assembleUnifiedArticles(options);console.log(JSON.stringify({ready:state.ready.length,pending:state.pending.length,modelCalls:0}));
}
