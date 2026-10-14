import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=import.meta.dirname;
const assets=path.join(root,'assets/impact');
fs.mkdirSync(assets,{recursive:true});
const sources={pop:path.join(root,'.media/audio/sfx/sfx_002.mp3'),whoosh:path.join(root,'.media/audio/sfx/sfx_003.mp3'),bass:'C:/Users/webco/.agents/skills/media-use/audio/assets/sfx/impact-bass-1.mp3'};
const metadata={};
for(const [name,source] of Object.entries(sources)){
 const target=path.join(assets,name+'.mp3');if(!fs.existsSync(target))fs.copyFileSync(source,target);
 const raw=execFileSync('ffmpeg',['-v','error','-i',target,'-ac','1','-ar','48000','-f','f32le','pipe:1'],{maxBuffer:10*1024*1024});
 const pcm=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
 let max=0,peakAt=0;
 for(let i=0;i<pcm.length;i+=480){let sum=0;const end=Math.min(i+480,pcm.length);for(let k=i;k<end;k++)sum+=pcm[k]*pcm[k];const rms=Math.sqrt(sum/(end-i));if(rms>max){max=rms;peakAt=i/48000;}}
 metadata[name]={path:'assets/impact/'+name+'.mp3',duration:pcm.length/48000,peakAt,rms:max,source:'HyperFrames bundled SFX library'};
 const shortTarget=path.join(assets,name+'-hit.wav');
 const keep=name==='bass'?.62:name==='pop'?.52:.574;
 if(!fs.existsSync(shortTarget))execFileSync('ffmpeg',['-v','error','-i',target,'-t',String(keep),'-af',`afade=t=out:st=${keep-.12}:d=0.12,volume=${name==='bass'?.5:.8}`,'-ar','48000',shortTarget]);
 metadata[name].hitPath='assets/impact/'+name+'-hit.wav';
 metadata[name].hitDuration=keep;
}
fs.writeFileSync(path.join(assets,'timing.json'),JSON.stringify(metadata,null,2));
console.log(JSON.stringify(metadata));
