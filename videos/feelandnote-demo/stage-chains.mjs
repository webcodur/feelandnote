import fs from 'node:fs';
import path from 'node:path';
const root=import.meta.dirname;
const project='C:/project/feelandnote';
const copy=JSON.parse(fs.readFileSync(path.join(project,'sw/web/messages/ko/home.json'),'utf8')).home.ui.intro;
if(!copy?.inspirationChains)throw new Error('Could not find website chains');
const env={};
for(const line of fs.readFileSync(path.join(project,'sw/web/.env'),'utf8').split(/\r?\n/)){
 const m=line.match(/^\s*([\w]+)\s*=\s*(.*)$/); if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');
}
const slugs=[...new Set(copy.inspirationChains.flatMap(c=>c.flatMap(s=>[s.reader,s.author])))];
const base=env.NEXT_PUBLIC_DB_API_URL;
const key=env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY;
if(!base||!key)throw new Error('Public DB connection is missing');
const url=new URL(base.replace(/\/$/,'')+'/rest/v1/celebs');
url.searchParams.set('select','slug,nickname,nickname_en,avatar_url');
url.searchParams.set('slug','in.('+slugs.join(',')+')');
const response=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});
if(!response.ok)throw new Error('Public profile fetch failed: '+response.status);
const profiles=await response.json();
if(!Array.isArray(profiles))throw new Error('Profiles response was not an array');
fs.mkdirSync(path.join(root,'assets/chains'),{recursive:true});
for(const p of profiles){
 if(!p.avatar_url)throw new Error('Missing service avatar: '+p.slug);
 const dest=path.join(root,'assets/chains',p.slug+'.webp');
 if(!fs.existsSync(dest)){
  const image=await fetch(p.avatar_url,{signal:AbortSignal.timeout(20000)});
  if(!image.ok)throw new Error('Avatar fetch failed: '+p.slug);
  fs.writeFileSync(dest,Buffer.from(await image.arrayBuffer()));
 }
 p.local='assets/chains/'+p.slug+'.webp';
}
const output={source:'sw/web/messages/ko/home.json:home.ui.intro.inspirationChains',chains:copy.inspirationChains,conclusion:copy.inspirationConclusion,profiles};
fs.writeFileSync(path.join(root,'assets/chains/source.json'),JSON.stringify(output,null,2));
console.log('Staged actual website chains: '+profiles.map(p=>p.nickname).join(', '));
