import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {db} from '../../figure-books/myth-missing-20260922/prepare.mjs';
const dir=new URL('./',import.meta.url);
const person='a036c5a5-850c-43ba-ae70-f5019a06ad80';
const pairs=[
 {target:'aed16cb6-be49-4234-925a-651e4d3c55d7',source:'71c42a3b-80dd-594b-a230-689d225e49b6',ol:'OL32349721M',isbn:'9780143441144',title:'The Valmiki Ramayana (3 Volume Box Set)',evidence:'https://www.valmikiramayan.net/aranya/sarga12/aranya_12_prose.htm',section:'Aranya Kanda 12',order:0},
 {target:'ddb59805-cdbc-435b-a0b5-d02ddfc326e3',source:'fa464cc6-4c3a-5d17-bda8-9f9776c15dbc',ol:'OL9070593M',isbn:'9788121505932',title:'Mahabharata of Krishna-Dwaipayana Vyasa (4 Volume Set)',evidence:'https://sacred-texts.com/hin/m03/m03104.htm',section:'Vana Parva 104 (Ganguli)',order:1},
];
const ids=pairs.flatMap(p=>[p.target,p.source]);
async function snapshot(){
 const out={};
 for(const table of ['contents','content_locales','figure_book_contents','figure_book_editions','figure_book_characters']){
  const {data,error}=await db.from(table).select('*').in(table==='contents'?'id':'content_id',ids);if(error)throw error;out[table]=data;
 }
 const {data,error}=await db.from('figure_book_products').select('*').in('edition_id',out.figure_book_editions.map(e=>e.id));if(error)throw error;out.figure_book_products=data;
 return out;
}
const before=await snapshot();
const ol={};
for(const p of pairs){const response=await fetch('https://openlibrary.org/books/'+p.ol+'.json');if(!response.ok)throw new Error('OpenLibrary '+response.status);ol[p.ol]=await response.json();if(!ol[p.ol].isbn_13?.includes(p.isbn))throw new Error('ISBN mismatch');}
const q=x=>x===null?'NULL':"'"+String(x).replaceAll("'","''")+"'";
const j=x=>q(JSON.stringify(x))+'::jsonb';
const statements=['BEGIN;'];
function guard(sql,expected,message){statements.push(`DO $guard$ BEGIN IF (${sql}) <> ${expected} THEN RAISE EXCEPTION ${q(message)}; END IF; END $guard$;`);}
for(const p of pairs){
 const target=before.contents.find(c=>c.id===p.target),source=before.content_locales.find(c=>c.content_id===p.source&&c.locale==='en'),existing=before.content_locales.find(c=>c.content_id===p.target&&c.locale==='en');
 if(!source||!existing||source.isbn!==p.isbn)throw new Error('Missing verified source');
 guard(`SELECT count(*) FROM contents WHERE id=${q(p.target)} AND metadata=${j(target.metadata)}`,1,'Work changed');
 guard(`SELECT count(*) FROM content_locales WHERE content_id=${q(p.target)} AND locale='en' AND updated_at=${q(existing.updated_at)}::timestamptz`,1,'Locale changed');
 guard(`SELECT count(*) FROM figure_book_contents WHERE content_id=${q(p.target)}`,1,'Catalog missing');
 guard(`SELECT count(*) FROM figure_book_editions WHERE content_id=${q(p.target)} AND locale='en'`,0,'English edition already exists');
 guard(`SELECT count(*) FROM figure_book_characters WHERE content_id=${q(p.target)} AND celeb_id=${q(person)}`,0,'Relation already exists');
 const columns=['title','creator','thumbnail_url','description','isbn','publisher','verified','sources'];
 const assignments=columns.map(k=>`${k}=${k==='sources'?j(source[k]):typeof source[k]==='boolean'?String(source[k]):q(source[k])}`);
 statements.push(`UPDATE content_locales SET ${assignments.join(',')},updated_at=now() WHERE content_id=${q(p.target)} AND locale='en';`);
 const edition={content_id:p.target,locale:'en',title:p.title,creator:source.creator,description:source.description,isbn:p.isbn,publisher:source.publisher,thumbnail_url:source.thumbnail_url,edition_kind:'full',text_scope:'complete',sort_order:0,verified:true,sources:{...source.sources,edition_scope:'https://openlibrary.org/books/'+p.ol+'.json'}};
 statements.push(`INSERT INTO figure_book_editions (${Object.keys(edition).join(',')}) VALUES (${Object.values(edition).map(v=>typeof v==='object'&&v!==null?j(v):typeof v==='boolean'||typeof v==='number'?String(v):q(v)).join(',')});`);
 statements.push(`INSERT INTO figure_book_characters(content_id,celeb_id,relation_type,sort_order,description,description_en) VALUES(${q(p.target)},${q(person)},'appearance',${p.order},NULL,NULL);`);
 if(p.order===1){const meta={...target.metadata,figureBook:{workIdentity:'vyasa/mahabharata',workTitle:'Mahabharata',workCreator:'Vyasa',originalTitle:'Mahabharata',originalCreator:'Vyasa',koTranslationStatus:'published'}};statements.push(`UPDATE contents SET metadata=${j(meta)} WHERE id=${q(p.target)};`);}
}
statements.push('COMMIT;');
fs.writeFileSync(new URL('books-plan.json',dir),JSON.stringify({pairs,openLibrary:ol,note:'Canonical source-edition-batch dry-run failed because OpenLibrary api/books returned 404 for 9788121505932; direct edition endpoint succeeded with matching ISBN and 4 Volume Set scope. Existing Korean cards, editions and products are preserved. Existing unregistered English contents are neither deleted nor cataloged.'},null,2));
if(!process.argv.includes('--apply')){console.log('Dry run: 2 existing works; 2 English editions/cards; 2 appearance relations. No new content or product.');process.exit(0);}
fs.writeFileSync(new URL('books-before.json',dir),JSON.stringify(before,null,2),{flag:'wx'});
const result=spawnSync('ssh.exe',['-i',homedir()+'/.ssh/feelandnote_oracle','-o','BatchMode=yes','-o','ConnectTimeout=15','ubuntu@152.67.198.197','sudo','docker','exec','-i','supabase-db','psql','-X','-qAt','--set','ON_ERROR_STOP=1','--username','postgres','--dbname','postgres'],{input:statements.join('\n'),encoding:'utf8',timeout:60000,windowsHide:true});
if(result.status!==0)throw new Error(result.stderr||result.stdout);
const after=await snapshot();fs.writeFileSync(new URL('books-after.json',dir),JSON.stringify(after,null,2));
for(const p of pairs){
 const rel=after.figure_book_characters.filter(r=>r.celeb_id===person&&r.content_id===p.target);
 if(rel.length!==1||rel[0].relation_type!=='appearance'||rel[0].description!==null||rel[0].description_en!==null)throw new Error('Relation mismatch');
 const edition=after.figure_book_editions.filter(e=>e.content_id===p.target&&e.locale==='en');if(edition.length!==1||edition[0].isbn!==p.isbn)throw new Error('Edition mismatch');
}
const stable=x=>JSON.stringify(x,Object.keys(x).sort());
for(const table of ['content_locales','figure_book_editions']) for(const row of before[table].filter(r=>r.locale==='ko')){
 const found=after[table].find(r=>r.content_id===row.content_id&&r.locale===row.locale);if(stable(row)!==stable(found))throw new Error('Korean row changed: '+table);
}
if(JSON.stringify(before.figure_book_products)!==JSON.stringify(after.figure_book_products))throw new Error('Products changed');
if(before.contents.length!==after.contents.length||before.figure_book_contents.length!==after.figure_book_contents.length)throw new Error('Catalog count changed');
console.log('Verified: 2 appearance relations, 2 English complete editions; Korean cards/editions/products preserved; no new works.');
