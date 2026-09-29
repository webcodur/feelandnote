import {spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {db} from './myth-missing-20260922/prepare.mjs';
import {read,save,chunks} from './myth-coherence.mjs';
const s=read('before.json');
const groups=[];
const add=(book,people,url,location)=>groups.push({contentId:book,people:people.split('|'),url,location});
add('79334378-a390-40bb-9dd9-025c41eed94f','bak-hyeokgeose|lady-aryeong|alpyeong|sobeoldori|guryema|jibaekho|jita|hojin|seok-talhae|kim-alji','https://www.gb.go.kr/data/sinra/pdf/sin_pdf_c15.pdf','삼국유사 기이 제1: 신라 시조 혁거세왕·제4 탈해왕·김알지 탈해왕대. 육촌장 이름과 탄강처는 혁거세왕조.');
add('79334378-a390-40bb-9dd9-025c41eed94f','kim-suro|heo-hwang-ok|the-nine-gan|the-five-gaya-founder-brothers','https://contents.history.go.kr/front/ht/view.do?levelId=ht_001_0060_0010_0030','삼국유사 기이 제2 가락국기: 여섯 알과 여섯 왕, 구간과 수로, 허황옥 혼인 전승. 정견모주·이진아시 계보는 이 대목에 일괄 합치지 않는다.');
add('467d387e-c688-43b0-8570-01df791de22b','king-ijinasi','https://encykorea.aks.ac.kr/Article/E0046124','삼국사기 권34 지리지 고령군조의 대가야 시조 이진아시/내진주지.');
add('ca211625-352b-593d-829d-51d87180828d','boyuk|jinui|the-dragon-maiden|yonggeon','https://m.yes24.com/Goods/Detail/3528665','출판사 소개에 보육·진의·작제건·서해 용왕의 딸 저민의·용건이 명시된다. 기존 호경·강충·작제건 연결과 합친다.');
add('3e1d16ce-9d69-5738-8f57-395905f85849','go-eulla','https://www.yes24.com/product/goods/150379244','삼 을라: 고을라·양을라·부을라와 벽랑국 세 공주 이야기.');
add('b9bced59-9d15-5a41-bf27-410a9280b98d','fanca','https://www.manchustudiesgroup.org/home-2/about-our-logo/','만주실록 권1, 범찰이 도망하다 머리에 앉은 까치 덕분에 살아남는 대목.');
add('23773b1c-bc69-5d6f-a9c9-3b77d525bee9','ashina','https://contents.nahf.or.kr/id/jo.k_0012_0050_0010_0020','주서 권50 이역전 하: 아사나 및 이질니사도·눌도륙설의 돌궐 기원 전승.');
add('b85a1921-d679-5688-b7b5-85de8bc78bf4','kyi|khoryv|lybid|rurik','https://warwick.ac.uk/fac/arts/history/students/modules/hi3t4/topics/sourcesi/mythsandfolktales/the_russian_primary_chronicle.pdf','키이·셰크·호리브와 누이 리비드의 키이우 기원; 862년 류리크·시네우스·트루보르 초청 기사.');
add('5f5c2868-e47d-47af-993d-66a2c9fa19be','brutus-of-troy|hengist|horsa','https://www.globalgreyebooks.com/online-ebooks/geoffrey-of-monmouth_histories-of-the-kings-of-britain_complete-text.html','Book I: Brute와 Corineus, Book VI: Hengist와 Horsus. Brute=Brutus, Horsus=Horsa.');
add('70761e61-104d-5aed-b8ad-1017b9e22af5','hengist','https://www.gutenberg.org/files/657/657-h/657-h.htm','449년 Hengest와 Horsa의 도착, 455년 전투. 기존 Horsa 연결과 합친다.');
add('078abc06-1f1b-557b-b50e-0a06c9837906','scota|mil-espaine|breogan|eriu','https://www.ancienttexts.org/library/celtic/irish/lebor.html','The Sons of Mil: Breogan의 탑, Mil의 아들들, Eriu와 Amergin의 대화, Scota의 죽음. 스코타는 Mil의 아내인 계보로 확인.');
add('8e548b8c-7060-432c-921b-7dbe0e448045','hersilia|rhea-silvia|numitor|titus-tatius|acca-larentia|amulius|faustulus|numa-pompilius|servius-tullius|romulus|remus','https://www.gutenberg.org/files/19725/19725-h/19725-h.htm','Livy Book I: 3–7 왕가·쌍둥이·Faustulus와 Laurentia; 11–14 Hersilia·Tatius; 18–21 Numa; 39–48 Servius Tullius.');
add('44f3609f-d4b5-4673-9db6-cd28e4c07025','agenor','https://www.theoi.com/Text/Apollodorus2.html','Bibliotheca 2.1.4 및 3.1.1: Libya와 Poseidon의 아들, Phoenicia로 가서 Europa·Cadmus 계보를 연 Agenor. 동명 아르고스계 Agenor와 구별.');
add('f4f15b88-5575-51cf-ac49-bd95b87cbaa3','prince-vijaya','https://www.cristoraul.org/ENGLISH/readinghall/CR-PDF-LIBRARY/INDIA/The-Mahavamsa-or-the-great-chronicle-of-Ceylon.pdf','Mahavamsa VI–VII: Sinhabahu와 Vijaya의 출자, Vijaya의 상륙과 Kuveni.');
add('88302d12-7df5-57a4-a1ae-4ea079320e58','enmerkar|lugalbanda|etana|sargon-of-akkad|ur-nammu','https://isac-assets.s3.amazonaws.com/isac-publications/as11.pdf','Jacobsen 비판판의 Kish Etana, Uruk En-me(r)-kar·Lugal-banda, Agade Sargon, Ur III Ur-Nammu 왕명표. 대조: https://etcsl.orinst.ox.ac.uk/section2/tr211.htm');
add('225d437d-321b-538b-b273-976d860c1487','manco-capac|mama-ocllo|mama-huaco|ayar-cachi|ayar-uchu|ayar-auca|con-ticci-viracocha','https://www.gutenberg.org/cache/epub/58359/pg58359-images.html','Chapter VII: Viracocha와 Inca 기원. pp.248–251의 Ayar 네 형제와 아내들, Manco Capac·Mama Ocllo 계보.');
add('27a88ed7-ad15-4b09-bac0-e208f7c44a9d','zhurong','https://ncu.uedu.tw/shanhaijing/juan/haiwai-nan','산해경 해외남경: 남방 축융, 짐승 몸에 사람 얼굴로 두 용을 탐.');
for(const {book,plan} of read('new-book-plans.json'))groups.push({contentId:plan.contentId,people:book.people,url:book.url,location:book.location});
const additions=[];
for(const g of groups)for(const slug of g.people){const p=s.profiles.find(p=>p.slug===slug);if(!p)throw Error(slug);if(!s.relations.some(r=>r.celeb_id===p.id&&r.content_id===g.contentId))additions.push({content_id:g.contentId,celeb_id:p.id,relation_type:'appearance',sort_order:0,description:null,description_en:null,evidence:{url:g.url,location:g.location},slug});}
const removals=[];
function remove(content,slug,reason){const p=s.profiles.find(p=>p.slug===slug);const r=s.relations.find(r=>r.celeb_id===p.id&&r.content_id===content);if(r)removals.push({...r,slug,reason});}
remove('39f41186-0a02-5acc-b3bd-c8916e0810d6','dan','덴마크 시조 Dan과 창세기의 야곱의 아들 Dan을 혼동한 연결. 덴마크 연대기 연결은 유지.');
remove('e84d64fa-b765-4194-84f0-ba7e41135cb8','tadodaho','이로쿼이 지도자 Tadodaho에게 중국 유교 경전 예기가 붙은 오연결. 이로쿼이 헌법 연결은 유지.');
remove('7ea04905-3703-58b0-b488-b60cbf822139','zhurong','삼국지 인물과 상고 신화의 화신 축융을 혼동한 연결. 실제 신화 본문 산해경으로 교체.');
for(const r of s.relations.filter(r=>r.content_id==='de0f2876-3401-5258-9d9b-292f513748d7')){const p=s.profiles.find(p=>p.id===r.celeb_id);if(p.slug!=='māui')remove(r.content_id,p.slug,'세계 영웅 설화집의 마우이 장을 오세아니아 전승 전체로 확장했던 연결. 인물별 본문 근거가 확인된 책으로 교체.');}
const plan={groups,additions,removals};save('relation-plan.json',plan);
console.log('additions',additions.length,'removals',removals.length,'affected',new Set([...additions,...removals].map(r=>r.celeb_id)).size);
if(process.argv.includes('--apply')){
 const q=x=>"'"+String(x).replaceAll("'","''")+"'";
 const values=additions.map(r=>`(${q(r.content_id)},${q(r.celeb_id)}::uuid,'appearance',0,NULL,NULL)`).join(',\n');
 const del=removals.map(r=>`(content_id=${q(r.content_id)} AND celeb_id=${q(r.celeb_id)}::uuid)`).join(' OR ');
 const sql=`BEGIN; SET LOCAL lock_timeout='10s';\nINSERT INTO figure_book_contents(content_id) SELECT DISTINCT x.content_id FROM (VALUES ${additions.map(r=>`(${q(r.content_id)})`).join(',')}) x(content_id) ON CONFLICT(content_id) DO NOTHING;\nINSERT INTO figure_book_characters(content_id,celeb_id,relation_type,sort_order,description,description_en) VALUES ${values} ON CONFLICT(content_id,celeb_id) DO NOTHING;\nDELETE FROM figure_book_characters WHERE (${del}) AND relation_type='appearance';\nCOMMIT;`;
 const rr=spawnSync('ssh.exe',['-i',homedir()+'/.ssh/feelandnote_oracle','-o','BatchMode=yes','-o','ConnectTimeout=15','ubuntu@152.67.198.197','sudo','docker','exec','-i','supabase-db','psql','-X','-qAt','--set','ON_ERROR_STOP=1','--username','postgres','--dbname','postgres'],{input:sql,encoding:'utf8',timeout:60000,windowsHide:true});if(rr.status!==0)throw Error(rr.stderr||String(rr.error));console.log('Transaction applied');
}
if(process.argv.includes('--verify')||process.argv.includes('--apply')){
 const rs=await chunks('figure_book_characters','*','celeb_id',s.profiles.map(p=>p.id));
 for(const a of additions)if(!rs.some(r=>r.content_id===a.content_id&&r.celeb_id===a.celeb_id&&r.relation_type==='appearance'&&r.description===null&&r.description_en===null))throw Error('Missing/invalid '+a.slug);
 for(const a of removals)if(rs.some(r=>r.content_id===a.content_id&&r.celeb_id===a.celeb_id))throw Error('Still connected '+a.slug);
 const ids=[...new Set(rs.map(r=>r.content_id))];const [contents,locales,editions]=await Promise.all([chunks('contents','*','id',ids),chunks('content_locales','*','content_id',ids),chunks('figure_book_editions','*','content_id',ids)]);
 const gaps=s.profiles.filter(p=>!rs.some(r=>r.celeb_id===p.id));if(gaps.length)throw Error('Empty profiles '+gaps.map(p=>p.slug));
 const preserved=s.relations.filter(r=>!removals.some(d=>d.content_id===r.content_id&&d.celeb_id===r.celeb_id));for(const p of preserved)if(!rs.some(r=>r.content_id===p.content_id&&r.celeb_id===p.celeb_id))throw Error('Unexpected removal');
 save('after.json',{...s,relations:rs,contents,locales,editions});console.log('Verified',rs.length,'relations',contents.length,'books',gaps.length,'empty profiles');
}
