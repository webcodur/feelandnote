import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {db} from './myth-missing-20260922/prepare.mjs';
import {read,save} from './myth-coherence.mjs';
import contract from '../../../sw/web-bo/scripts/figure-books/source-book-batch-contract.ts';
const {buildFigureBookPlan,buildResolvedSourceBookRegistration,buildAtomicSourceBookApplySql,parseFigureBookManifest}=contract;
const defs=[
 {isbn:'9780824805142',identity:'martha-warren-beckwith/hawaiian-mythology',title:'Hawaiian Mythology',creator:'Martha Warren Beckwith',creatorKo:'마사 워런 베크위드',people:['wākea','hāloa','paʻao','pilikaʻaiea'],url:'https://tianmu.org/good-work-library/oceanic/general-texts/hawaiian-mythology-beckwith',location:'XX. Papa and Wakea; XXI. Genealogies; XXVI. Hawaiiloa and Paao Migrations; Paao and Pili-kaaiea legend'},
 {isbn:'9780342418749',identity:'roland-burrage-dixon/oceanic-mythology',title:'Oceanic Mythology',creator:'Roland Burrage Dixon',creatorKo:'롤런드 버리지 딕슨',people:['nareau','māui','tagaloa'],url:'https://www.globalgreyebooks.com/online-ebooks/roland-b-dixon_oceanic-mythology_complete-text.html',location:'Part I: Samoan Tangaloa creation and Maui cycle; Part IV: Nareau and Kobine'},
 {isbn:'9780341793434',identity:'basil-thomson/the-fijians',title:'The Fijians',creator:'Basil Thomson',creatorKo:'바질 톰슨',people:['lutunasobasoba','degei'],url:'https://www.gutenberg.org/files/38432/38432-h/38432-h.htm',location:'Chapter I: Kaunitoni migration, Lutu-na-sombasomba and Ndengei'},
 {isbn:'9780313258909',identity:'robert-d-craig/dictionary-of-polynesian-mythology',title:'Dictionary of Polynesian Mythology',creator:'Robert D. Craig',creatorKo:'로버트 D. 크레이그',people:['ʻahoʻeitu','kupe',"hotu-matu'a"],url:'https://www.scribd.com/document/731520056/Robert-D-Craig-Dictionary-of-Polynesian-Mythology-1989',location:'Aho’eitu pp.2–3 and Tu’i Tonga pp.295–296; Kupe pp.127–128; Hotu-Matua p.76'},
 {isbn:'9781404360891',identity:'k-langloh-parker/australian-legendary-tales',title:'Australian Legendary Tales',creator:'K. Langloh Parker',creatorKo:'K. 랭로 파커',people:['baiame'],url:'https://en.wikisource.org/wiki/Australian_Legendary_Tales/The_Borah_of_Byamee',location:'The Borah of Byamee; Byamee is the recorded spelling of Baiame'},
 {isbn:'9781641892148',identity:'madi-williams/polynesia-900-1600',title:'Polynesia, 900–1600',creator:'Madi Williams',creatorKo:'매디 윌리엄스',people:['toi','kupe',"hotu-matu'a"],url:'https://dokumen.pub/polynesia-9001600-9781641892155.html',location:'Discussion of Percy Smith’s migration narrative: Toi and Whatonga; distinguishes the constructed migration account from indigenous traditions'},
];
const ol=read('ol-editions.json');
// Read the complete work identities and ISBNs so a translated title cannot create a duplicate.
async function all(table,select,order){const out=[];for(let start=0;;start+=1000){let q=db.from(table).select(select).order(order);if(table==='content_locales')q=q.order('locale');const r=await q.range(start,start+999);if(r.error)throw r.error;out.push(...r.data);if(r.data.length<1000)return out;}}
let snapshot;
try{snapshot=read('registration-catalog.json')}catch{snapshot={contents:await all('contents','id,type,subtype,external_source,external_id,release_date,metadata,member_count,celeb_count,record_count,created_at','id'),locales:await all('content_locales','content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,affiliate_url,sources,verified,created_at,updated_at','content_id')};save('registration-catalog.json',snapshot)}
const plans=[];
for(const b of defs){const e=ol[b.isbn];if(!e||!(e.languages?.some(x=>x.key==='/languages/eng')||(!e.languages?.length&&/^978[01]/.test(b.isbn))))throw Error('Unverified edition '+b.isbn);
 const sourceUrl='https://openlibrary.org'+e.key;
 const manifest=parseFigureBookManifest({work:{identity:b.identity,title:b.title,creator:b.creator,titleAliases:[e.title],creatorAliases:e.resolvedAuthors},edition:{kind:'full',scope:'complete'},ko:{translationStatus:'verified_unavailable',creator:b.creatorKo,evidenceUrls:['https://search.daum.net/search?w=book&q='+encodeURIComponent(b.title)]},en:{isbn:b.isbn}});
 const resolved=buildResolvedSourceBookRegistration(manifest,{en:{source:'openlibrary',isbn:b.isbn,title:e.title,creator:e.resolvedAuthors.join(', '),thumbnailUrl:e.coverUrl,publisher:e.publishers[0],description:null,sourceUrl,descriptionSourceUrl:null,releaseDate:null,sourceMetadata:{isbn:b.isbn,editionKey:e.key,workKey:e.works[0].key}}});
 Object.assign(resolved.metadata.figureBook,{originalTitle:b.title,originalCreator:b.creator});
 const plan=buildFigureBookPlan(manifest,resolved,snapshot);plans.push({book:b,plan});console.log(b.title,plan.action,plan.contentId,JSON.stringify(plan.conflicts));
}
save('new-book-plans.json',plans);
if(plans.some(p=>p.plan.action==='conflict'))throw Error('Book identity conflict');
if(process.argv.includes('--apply'))for(const {book,plan} of plans){
 try{read('book-'+plan.contentId+'.json');console.log('Already applied',book.title);continue}catch{}
 const r=spawnSync('ssh.exe',['-i',homedir()+'/.ssh/feelandnote_oracle','-o','BatchMode=yes','-o','ConnectTimeout=15','ubuntu@152.67.198.197','sudo','docker','exec','-i','supabase-db','psql','-X','-qAt','--set','ON_ERROR_STOP=1','--username','postgres','--dbname','postgres'],{input:buildAtomicSourceBookApplySql(plan),encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024,windowsHide:true});
 if(r.status!==0)throw Error(r.stderr||String(r.error));const receipt=r.stdout.split(/\r?\n/).map(l=>{try{return JSON.parse(l)}catch{return null}}).find(x=>x?.status==='applied');if(receipt?.readback!=='all_columns_match')throw Error('No verified receipt');save('book-'+plan.contentId+'.json',receipt);console.log('Applied',book.title);
}
