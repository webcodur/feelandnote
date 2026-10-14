import fs from 'node:fs';
import path from 'node:path';
const root=import.meta.dirname;
const dest=path.join(root,'assets');
fs.mkdirSync(dest,{recursive:true});
for(const [name,url] of [
 ['book.jpg','https://t1.daumcdn.net/lbook/image/692616?timestamp=20260801110922'],
 ['gsap.min.js','https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js']
]) {
 const target=path.join(dest,name);
 if(!fs.existsSync(target)){const r=await fetch(url);if(!r.ok)throw new Error(`${name}: HTTP ${r.status}`);fs.writeFileSync(target,Buffer.from(await r.arrayBuffer()));}
}
fs.copyFileSync(path.join(root,'capture/assets/photo-display-480.webp'),path.join(dest,'iu.webp'));
fs.cpSync('C:/project/feelandnote/sw/web/public/fonts/pretendard-v1.3.9',path.join(dest,'fonts/pretendard-v1.3.9'),{recursive:true});
const fontCss=fs.readFileSync('C:/project/feelandnote/sw/web/src/app/pretendard.css','utf8').replaceAll('/fonts/','fonts/');
fs.writeFileSync(path.join(dest,'fonts.css'),fontCss);
const brand={title:'Feel&Note',description:'인물의 감상 아카이브',colors:['#121110','#1a1917','#d4af37','#e8e6e1','#aaa7a0'],cssVariables:{'--color-bg-main':'#121110','--color-accent':'#d4af37','--color-text-primary':'#e8e6e1'},fonts:[{family:'Pretendard Variable',weights:[400,500,700,800,900]}]};
fs.writeFileSync(path.join(root,'capture/extracted/brand-tokens.json'),JSON.stringify(brand,null,2));
console.log('Staged IU portrait, actual Korean book cover, local GSAP, and Korean fonts.');
