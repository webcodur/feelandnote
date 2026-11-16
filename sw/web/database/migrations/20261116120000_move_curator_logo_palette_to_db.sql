-- 기관 로고 팔레트를 코드 상수(curatorLogoPalettes.ts)에서 curators.logo_palette로 옮긴다.
--
-- 왜: 로고는 R2 + logo_url로 배포 없이 바뀌는데 팔레트(카드 배경색·강조색·흰 바탕 처리)만 코드에 있어
-- 새 기관의 색이 배포를 기다렸다(26.11.16 사용자 지시로 DB 관리 전환).
-- 값 형식: { treatment: paper|dark|transparent|original, monochrome: bool, accent: '#rrggbb',
--           colors: [{ hex: '#rrggbb', weight: 0~1 }] } — 128px 표본을 오프라인 분석한 값. 런타임 분석은 하지 않는다.
-- null이면 화면은 기관 종류별 기본 배색을 쓴다.
--
-- 되돌리기: alter table public.curators drop column logo_palette;

begin;

set local lock_timeout = '2s';
set local statement_timeout = '10s';

alter table public.curators add column if not exists logo_palette jsonb;

comment on column public.curators.logo_palette is '로고 팔레트(오프라인 분석). treatment·monochrome·accent·colors[{hex,weight}]. null이면 기관 종류별 기본 배색';

-- 26.11.16 시점 코드 상수 70곳 이관
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#009060","weight":0.86},{"hex":"#f0f0c0","weight":0.074},{"hex":"#d80000","weight":0.063}],"accent":"#259f76"}$p$::jsonb where slug = 'academie-goncourt';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":false,"colors":[{"hex":"#c09018","weight":0.238},{"hex":"#786018","weight":0.012},{"hex":"#303000","weight":0.005}],"accent":"#c09018"}$p$::jsonb where slug = 'academy-awards';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#1878c0","weight":0.43},{"hex":"#60a8d8","weight":0.021},{"hex":"#c0d8f0","weight":0.012}],"accent":"#4893cb"}$p$::jsonb where slug = 'academy-of-interactive-arts-and-sciences';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#d81830","weight":0.046},{"hex":"#f090a8","weight":0.014},{"hex":"#f04860","weight":0.007}],"accent":"#e06271"}$p$::jsonb where slug = 'american-film-institute';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#a80000","weight":0.88},{"hex":"#a86060","weight":0.047},{"hex":"#903030","weight":0.025}],"accent":"#cb7575"}$p$::jsonb where slug = 'american-library-association';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#d89000","weight":0.229},{"hex":"#f0d8a8","weight":0.065},{"hex":"#d8a848","weight":0.051}],"accent":"#d89000"}$p$::jsonb where slug = 'bafta';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#783090","weight":0.042},{"hex":"#a878a8","weight":0.015},{"hex":"#c0a8d8","weight":0.009}],"accent":"#a77cb6"}$p$::jsonb where slug = 'baillie-gifford-prize';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'bbc';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#301860","weight":0.847},{"hex":"#786090","weight":0.021},{"hex":"#a890c0","weight":0.005}],"accent":"#958aac"}$p$::jsonb where slug = 'bbc-culture';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":false,"colors":[{"hex":"#f0c000","weight":0.091},{"hex":"#906000","weight":0.05},{"hex":"#483000","weight":0.027}],"accent":"#f0c000"}$p$::jsonb where slug = 'blue-dragon-film-awards';
update public.curators set logo_palette = $p${"treatment":"transparent","monochrome":false,"colors":[{"hex":"#d83000","weight":1}],"accent":"#df6644"}$p$::jsonb where slug = 'bokklubben';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#784860","weight":0.133},{"hex":"#a87890","weight":0.024}],"accent":"#a18191"}$p$::jsonb where slug = 'booker-prize-foundation';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'brit-awards';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#d84818","weight":0.706},{"hex":"#f0a890","weight":0.055},{"hex":"#d87860","weight":0.037}],"accent":"#dd6d48"}$p$::jsonb where slug = 'british-psychological-society';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#186078","weight":0.644},{"hex":"#f03030","weight":0.145},{"hex":"#f0f018","weight":0.058}],"accent":"#6291a1"}$p$::jsonb where slug = 'cambridge-philosophy';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#181848","weight":0.817},{"hex":"#d8c060","weight":0.093},{"hex":"#a89060","weight":0.047}],"accent":"#8a8aa1"}$p$::jsonb where slug = 'cannes-film-festival';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'chosun-ilbo';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#0060c0","weight":0.046},{"hex":"#60a8d8","weight":0.014},{"hex":"#f07878","weight":0.008}],"accent":"#5291d0"}$p$::jsonb where slug = 'chung-ang-university';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#c00000","weight":0.828},{"hex":"#d89090","weight":0.024},{"hex":"#c04848","weight":0.018}],"accent":"#d56a6a"}$p$::jsonb where slug = 'cnn';
update public.curators set logo_palette = $p${"treatment":"transparent","monochrome":false,"colors":[{"hex":"#3078c0","weight":0.227},{"hex":"#1860a8","weight":0.065},{"hex":"#a87830","weight":0.029}],"accent":"#5c99d6"}$p$::jsonb where slug = 'columbia-university';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#a81818","weight":0.232},{"hex":"#c03030","weight":0.011},{"hex":"#c04848","weight":0.008}],"accent":"#e64c4c"}$p$::jsonb where slug = 'cornell-university';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'crime-writers-association';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#001860","weight":0.496},{"hex":"#183078","weight":0.01},{"hex":"#486090","weight":0.008}],"accent":"#4c73e6"}$p$::jsonb where slug = 'duke-university';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#f0d8a8","weight":0.873},{"hex":"#907860","weight":0.014},{"hex":"#c0a890","weight":0.01}],"accent":"#f0d8a8"}$p$::jsonb where slug = 'financial-times';
update public.curators set logo_palette = $p${"treatment":"transparent","monochrome":false,"colors":[{"hex":"#60c048","weight":1}],"accent":"#60c048"}$p$::jsonb where slug = 'game-developers-choice-awards';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":false,"colors":[{"hex":"#f0a830","weight":0.089},{"hex":"#784800","weight":0.058},{"hex":"#301800","weight":0.03}],"accent":"#f0a830"}$p$::jsonb where slug = 'golden-joystick-awards';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'gramophone-awards';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#004830","weight":0.235},{"hex":"#609078","weight":0.017},{"hex":"#306060","weight":0.013}],"accent":"#6a9285"}$p$::jsonb where slug = 'hankook-ilbo';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#004890","weight":0.15},{"hex":"#a8c0d8","weight":0.069},{"hex":"#001860","weight":0.059}],"accent":"#6a92ba"}$p$::jsonb where slug = 'hanyang-university';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#901818","weight":0.078},{"hex":"#c09090","weight":0.035},{"hex":"#a86060","weight":0.029}],"accent":"#ba7878"}$p$::jsonb where slug = 'horror-writers-association';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'hugo-awards';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#f0c090","weight":0.732},{"hex":"#a89060","weight":0.056},{"hex":"#604830","weight":0.025}],"accent":"#f0c090"}$p$::jsonb where slug = 'hyundae-munhak';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#0060a8","weight":0.038},{"hex":"#90c0d8","weight":0.012},{"hex":"#00a8f0","weight":0.007}],"accent":"#5291c1"}$p$::jsonb where slug = 'inha-university';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#90a8d8","weight":0.067},{"hex":"#1848a8","weight":0.049},{"hex":"#c0d8f0","weight":0.025}],"accent":"#90a8d8"}$p$::jsonb where slug = 'kaist';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'korean-music-awards';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#900030","weight":0.199},{"hex":"#c07878","weight":0.059},{"hex":"#d8a8a8","weight":0.029}],"accent":"#bf758d"}$p$::jsonb where slug = 'korea-university';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#001890","weight":0.185},{"hex":"#6078c0","weight":0.016},{"hex":"#a8a8d8","weight":0.014}],"accent":"#7f8ac3"}$p$::jsonb where slug = 'latin-recording-academy';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'le-monde';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#f0d8c0","weight":0.35},{"hex":"#c01830","weight":0.12},{"hex":"#d87878","weight":0.011}],"accent":"#f0d8c0"}$p$::jsonb where slug = 'locus-magazine';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#301848","weight":0.076},{"hex":"#90a8d8","weight":0.045},{"hex":"#f0d8c0","weight":0.027}],"accent":"#958aa1"}$p$::jsonb where slug = 'mercury-prize';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'modern-library';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'munhaksasang';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'mystery-writers-of-america';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#a89060","weight":0.047},{"hex":"#183048","weight":0.027},{"hex":"#d8c0a8","weight":0.017}],"accent":"#a89060"}$p$::jsonb where slug = 'national-book-foundation';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'new-york-times';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'nihon-bungaku-shinkokai';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#1878c0","weight":0.319},{"hex":"#d81818","weight":0.314},{"hex":"#184878","weight":0.008}],"accent":"#4893cb"}$p$::jsonb where slug = 'npr';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#d86060","weight":0.036},{"hex":"#d81860","weight":0.029},{"hex":"#f0c0d8","weight":0.011}],"accent":"#da6c6c"}$p$::jsonb where slug = 'postech';
update public.curators set logo_palette = $p${"treatment":"transparent","monochrome":false,"colors":[{"hex":"#f07818","weight":0.312},{"hex":"#f07830","weight":0.019},{"hex":"#d87818","weight":0.014}],"accent":"#e6914c"}$p$::jsonb where slug = 'princeton-university';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#906030","weight":0.36},{"hex":"#c09048","weight":0.359},{"hex":"#f0c078","weight":0.064}],"accent":"#ab8966"}$p$::jsonb where slug = 'pulitzer-prize';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":false,"colors":[{"hex":"#a89060","weight":0.048},{"hex":"#786030","weight":0.033},{"hex":"#483018","weight":0.022}],"accent":"#a89060"}$p$::jsonb where slug = 'recording-academy';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#78a818","weight":0.073},{"hex":"#a8c060","weight":0.016},{"hex":"#d8d8a8","weight":0.014}],"accent":"#78a818"}$p$::jsonb where slug = 'romance-writers-of-america';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#d81848","weight":0.93},{"hex":"#d890a8","weight":0.023},{"hex":"#d84878","weight":0.019}],"accent":"#e06281"}$p$::jsonb where slug = 'royal-society';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#003090","weight":0.294},{"hex":"#7890c0","weight":0.07},{"hex":"#a8c0d8","weight":0.051}],"accent":"#758dbf"}$p$::jsonb where slug = 'seoul-national-university';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#301860","weight":0.74},{"hex":"#f0c030","weight":0.125},{"hex":"#906048","weight":0.092}],"accent":"#958aac"}$p$::jsonb where slug = 'sfwa';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#f0a830","weight":0.026},{"hex":"#c0a878","weight":0.016},{"hex":"#f0d8a8","weight":0.015}],"accent":"#f0a830"}$p$::jsonb where slug = 'sight-and-sound';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#a81818","weight":0.045},{"hex":"#d89090","weight":0.008},{"hex":"#c04848","weight":0.006}],"accent":"#c87878"}$p$::jsonb where slug = 'sogang-university';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#901830","weight":0.034},{"hex":"#c06078","weight":0.007},{"hex":"#d8a8a8","weight":0.005}],"accent":"#ba7885"}$p$::jsonb where slug = 'st-johns-college';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#a80030","weight":0.192},{"hex":"#a81830","weight":0.059},{"hex":"#c06078","weight":0.007}],"accent":"#e64d78"}$p$::jsonb where slug = 'stanford-university';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#003060","weight":0.035},{"hex":"#90c018","weight":0.02},{"hex":"#c0d848","weight":0.012}],"accent":"#758da6"}$p$::jsonb where slug = 'sungkyunkwan-university';
update public.curators set logo_palette = $p${"treatment":"transparent","monochrome":false,"colors":[{"hex":"#f0a860","weight":0.939},{"hex":"#c07848","weight":0.061}],"accent":"#f0a860"}$p$::jsonb where slug = 'the-game-awards';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'the-guardian';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#d80000","weight":0.062},{"hex":"#f06060","weight":0.02},{"hex":"#f0a8a8","weight":0.017}],"accent":"#e15e5e"}$p$::jsonb where slug = 'time-magazine';
update public.curators set logo_palette = $p${"treatment":"dark","monochrome":true,"colors":[],"accent":"#c4bdad"}$p$::jsonb where slug = 'time-out';
update public.curators set logo_palette = $p${"treatment":"transparent","monochrome":false,"colors":[{"hex":"#900078","weight":0.986},{"hex":"#900090","weight":0.014}],"accent":"#e64ccc"}$p$::jsonb where slug = 'tsinghua-university';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#0048a8","weight":0.073},{"hex":"#6090c0","weight":0.037},{"hex":"#a8c0d8","weight":0.037}],"accent":"#6a92c8"}$p$::jsonb where slug = 'university-of-seoul';
update public.curators set logo_palette = $p${"treatment":"transparent","monochrome":false,"colors":[{"hex":"#181890","weight":1}],"accent":"#5050e2"}$p$::jsonb where slug = 'university-of-tokyo-press';
update public.curators set logo_palette = $p${"treatment":"original","monochrome":false,"colors":[{"hex":"#903030","weight":0.911},{"hex":"#c09090","weight":0.031},{"hex":"#f0d8c0","weight":0.018}],"accent":"#b67c7c"}$p$::jsonb where slug = 'venice-film-festival';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#48c0c0","weight":0.047},{"hex":"#90d8d8","weight":0.006},{"hex":"#183048","weight":0.003}],"accent":"#48c0c0"}$p$::jsonb where slug = 'womens-prize';
update public.curators set logo_palette = $p${"treatment":"paper","monochrome":false,"colors":[{"hex":"#003078","weight":0.17},{"hex":"#90a8c0","weight":0.033},{"hex":"#306090","weight":0.028}],"accent":"#758db2"}$p$::jsonb where slug = 'yonsei-university';

commit;

notify pgrst, 'reload schema';
