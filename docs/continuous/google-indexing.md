# 검색엔진 색인·수집 신청

일일 작업은 [SEO 실행 규칙](../project/operations/ops-02-seo.md#일일-seo-실행)을 먼저 읽는다. 이 문서는 현재 검색 문제와 엔진별 재개 위치를 쥔다. 마지막 작업 기록은 [지속 과제 규칙](README.md)에 따라 교체하고, 미확정 주소는 해결될 때까지 유지한다.

**현재 검색 문제(2026-11-25):** 네이버 노출은 10-28 31,157에서 10-30 1,586으로 급감했고 11-10 167이 바닥이었다. 그 뒤 11-15 1,253·11-20 2,191·11-22 3,161·11-24 2,729로 회복 중이지만 급감 전의 10분의 1에 못 미친다. 최근 30일 합계는 클릭 1.0천(-72.5%)·노출 16.8만(-74.8%)이다(서치어드바이저, 11-24 집계). 브랜드 검색은 홈페이지가 다시 첫 화면에 나온다. 원인은 미확인이다. [공식 사이트 미노출 제보](https://help.naver.com/inquiry/input.help?categoryNo=17727&lang=ko&serviceNo=30010)는 11-03 11:07:18 KST 운영자 계정으로 접수했고, [10-28 네이버 공지](https://blog.naver.com/naver_webmaster/224456824688)는 통계 표시 변경이 실제 노출·랭킹과 무관하다고 밝히므로 원인으로 확정하지 않는다. 11-25부터 네이버에는 한국어 주소만 사이트맵·수집 신청으로 보낸다. Yeti의 `/en` 접근은 막지 않았으므로 이 변경의 효과는 노출 추이로 지켜본다. Google 검색 노출은 하루 5~27회, 14일 클릭 1회다.

**브랜드·상세 검색 확인(2026-11-25):** Google `필앤노트`·`feelandnote`는 모두 첫 웹 결과가 홈페이지다(`safe=off` 실제 화면). 네이버는 두 검색어 모두 첫 화면에 홈페이지와 하위 링크(탐색·작품)가 나온다. `필앤노트 빌 게이츠`는 Google 첫 화면에 자체 도메인이 없고, 네이버는 인물 상세 대신 《국가는 왜 실패하는가》 상세가 나온다. Google 홈과 주요 인물 3개의 URL 검사는 색인 정상·검색 허용·자기 canonical이며, 홈 마지막 크롤은 11-24 22:54:51 KST다.

**사이트맵 확인(2026-11-25):** active 인물 9,630명(REAL 8,679·BOTH 145·FICTION 806)과 운영 `naver.xml`의 한국어 인물 주소를 전수 대조해 누락·추가·중복 0을 확인했다. `naver.xml`은 주요 목록 505개를 더해 10,135주소·영문 0이다. Google·Bing용 우선 명단 `celebs.xml`은 810주소, `core.xml`은 1,008주소다. 이번 신청 후보 260주소는 200·검색 허용·자기 canonical이 정상이다.

Google은 `celebs.xml` 810주소를 11-24 15:27, `core.xml` 1,008주소를 11-25 00:09 KST에 다시 읽었고 오류·경고가 없다. Bing 루트는 11-22 크롤·Success·발견 1.8K다. 네이버는 11-25 11:15:10에 `sitemaps/naver.xml`을 등록하고 `sitemap.xml`·`sitemaps/celebs-all.xml`을 삭제해 사이트맵 등록이 한 건뿐임을 재조회했다. 네이버의 실제 재읽기는 미확인이다.

**미접수 실존인물 → 가상인물 → 세력·신화 순으로 처리하며, 이미 접수한 주소의 변경분 재수집은 그 뒤다.** 세 엔진 모두 실존인물 미접수가 남았다. 아래 이전 공개 묶음의 미완료 구간과 엔진별 기존 재개 주소를 먼저 잇는다. 신규·변경이라는 이유로 이미 접수한 주소를 앞세우지 않는다.

아래 시각은 KST(UTC+9), 경로는 `https://feelandnote.com` 기준이다.

| 엔진 | 마지막 작업·접수 결과 | 마지막 성공 주소 | 실존인물 재개 후보·미확정 |
|---|---|---|---|
| Google | 2026-11-25 11:22경 일일 할당량 초과(「일일 할당량을 초과하여 이 요청을 처리할 수 없습니다. 내일 다시 제출해 주세요.」) 확인. 새 완료 응답 12주소 확정. `/en/celeb/zena`는 11-19 크롤로 색인돼 제외. 미확정 0 | `/en/celeb/manon`(11:21:27) | `/celeb/isa`부터(`isa`~`choi-yena`). 이후 10-24 묶음 `/celeb/heejin` → 기존 재개 후보 8명 |
| 네이버 | 2026-11-25 11:04경까지 한국어 50주소 접수 후 한도 초과(`POST /api-console/request/crawl` → `code: 110, FAIL_MAX_DOCUMENT_COUNT`) 확인. 5쪽 재조회: 오늘 50·고유 50·영문 0·누락 0·미확정 0 | `/celeb/jay-shetty`(11:04:29) | `/celeb/phil-libin`부터 `created_at` 순 한국어 주소만(아래 이전 공개 묶음 제외). 전체 과거 이력은 제공되지 않음 |
| Bing | 2026-11-25 11:20 제출 후 CSV·콘솔 검수. CSV 800→900주소(내려받는 이력은 오래된 것부터 빠진다). 오늘 추가 100·선정 누락 0·잔여 한도 0·미확정 0 | `/en/celeb/kate-winslet` | `/celeb/marion-cotillard`부터(`charles-baudelaire`~`kate-winslet` 50명 한영 완료). 이후 최근 CSV 이력의 완료 주소 제외 |

**이전 공개 묶음:** 순서대로 10-26 공개·변경 23명(ella~forest-whitaker), 10-25 공개 167명(yunah~choi-yena), 10-24 공개 86명(nicole-scherzinger~yang-jiwon)이다. Google은 첫 23명 전부와 167명 묶음 manon 한영까지 접수·색인 또는 기존 요청을 확인했고, 86명 묶음은 이브 한영까지 완료다. 네이버는 첫 두 묶음 전부·86명 묶음 전부(마지막 yang-jiwon은 한국어만), Bing은 아래 276명 한영 전부 완료다.

```text
ella narin shin-dong-yup han-ye-ri sophie-okonedo han-ga-in
debra-messing ha-ji-won bae-yong-joon song-il-gook yoo-jae-suk lee-ji-ah
choi-soo-jong reshma-saujani linda-yaccarino go-min-si ursula-burns han-ji-min
kang-ho-dong so-ji-sub eric-bana go-youn-jung forest-whitaker yunah
minju iroha wonhee moka julie natty
haneul belle hina magenta siyeon chodan
athena-2 yewon keena chanelle-moon hana yoon-seoyeon
kim-nakyoung kim-chaeyeon joobin kotone jiyeon kim-chaewon-2
park-shion kwak-yeonji mayu kim-yooyeon seoah lynn
jeong-hyerin sullin park-sohyun kaede kim-soomin nien
jeong-hayeon anna-2 sooin gawon lee-jiwoo seo-dahyun
gong-yubin xinyu liv minami woni may
zena yoonchae daniela sophia megan lara
manon isa seeun sieun sumin j
yoon huening-bahiyyih seo-youngeun choi-yujin kim-dayeon hikaru
xiaoting kim-chaehyun jang-gyuri lee-saerom song-hayoung lee-nagyung
lee-chaeyoung baek-jiheon lee-seoyeon roh-jisun park-jiwon tsuki
moon-sua haram siyoon haruna sheon suhyeon
aisha onda e:u han-eunji sihyeon wang-yiren
melanie-c mel-b geri-halliwell emma-bunton victoria-beckham kelly-rowland
michelle-williams-2 t-boz left-eye chilli camila-cabello lauren-jauregui
normani ally-brooke dinah-jane jade-thirlwall perrie-edwards leigh-anne-pinnock
jesy-nelson sinb yerin yuju sowon umji
eunha arin mimi yooa jiho hyojung
seunghee yubin-2 hyebin nayun jooe jane
ahin yeonwoo nancy jiu handong dami
gahyeon yoohyeon siyeon-2 sua-2 exy dayoung
eunseo dawon luda meng-meiqi cheng-xiao yeoreum
bona wu-xuanyi seola yeonjung soobin-2 zhou-jieqiong
choi-yoojung kim-doyeon kim-sejeong jung-chaeyeon kim-sohye jeon-somi
lim-nayoung kang-mina chungha kim-minju jo-yuri yabuki-nako
kang-hyewon lee-chaeyeon kwon-eunbi choi-yena nicole-scherzinger chuu
kim-hyunjin hyeju yves heejin haseul vivi
choerry yeojin go-won jinsoul kim-lip nam-yujeong
minyoung eunji-2 yuna-3 ki-heehyun baek-yebin jueun
kwon-chaewon eunice lee-soyul haein jinyea jung-soyeon
solbin yulhee kim-yujeong sorn oh-seunghee elkie
jang-seungyeon jang-yeeun rachel yoon-chaekyung yang-yena lee-naeun
lee-jinsol kim-chaewon-3 lee-jin ock-joohyun sung-yuri lee-hyori
shim-eunjin kim-e-z yoon-eunhye lee-heejin kan-miyeon way
geummi soyul ellin choa zuny lee-sojung
ashley-choi eunb rise seo-inyoung lee-jihyun ha-jooyeon
park-semi park-jungah kim-eunjung yewon-2 yezi cao-lu
linzy jei hyemi lina stephanie sunday
dana jung-ryeowon hwangbo lee-minkyung hwang-jungeum ayumi
chae-rina kim-boa kim-bohyung park-narae park-sihyun yang-jiwon
```

Google의 기존 재개 후보는 eric-rohmer·anne-bronte·moon-geun-young·alan-ritchson·im-soo-jung·kim-ok-vin·kim-tae-hee·shin-min-a(각 한영)다. 공개 묶음 뒤 접수·색인 상태와 대조한다. 전갈정 한국어는 실존인물보다 먼저 신청하지 않는다.

**후순위 변경분:** 10-26 23:09:26 KST 이후의 공개 프로필 변경을 DB `updated_at`으로 다시 대조한다. 미접수 실존인물 신청을 우선하며 변경분 재수집 대기 목록은 그대로다. 아래 10-27 변경 묶음 276명은 Google 접수 0, 네이버 son-woong-jung 한영까지 50주소, Bing ada-lovelace 한영까지 100주소를 접수한 대조 목록이다. 그 뒤의 내용 변경과 미접수는 구분한다.

```text
bill-gates elon-musk kim-jong-un napoleon-bonaparte steve-jobs yuval-noah-harari
warren-buffett ernest-hemingway albert-einstein yi-sun-sin frederick-the-great abraham-lincoln
syngman-rhee lee-jae-yong sejong-the-great yi-hwang mao-zedong vladimir-lenin
joseph-stalin king-jeongjo john-stuart-mill marcus-aurelius john-von-neumann alan-turing
son-woong-jung chung-ju-yung helen-keller john-milton genghis-khan daniel-pink
richard-wagner bill-ackman reid-hoffman masayoshi-son denzel-washington matt-damon
adolf-hitler andrew-carnegie edmund-burke otto-von-bismarck igor-stravinsky charlie-munger
tim-ferriss larry-page jamie-dimon han-feizi beyonce christopher-nolan
scipio-africanus ada-lovelace friedrich-engels barack-obama shin-kyuk-ho johann-sebastian-bach
oprah-winfrey mary-wollstonecraft maria-sharapova carl-sagan kevin-spacey nassim-nicholas-taleb
liv-tyler viggo-mortensen anthony-hopkins venerable-beopjeong lucy-liu esai-morales
kevin-feige gottfried-wilhelm-leibniz rachel-mcadams ralph-fiennes rosamund-pike michael-b.-jordan
michael-fassbender bernhard-riemann wesley-snipes james-hetfield tony-jaa wu-zetian
desiderius-erasmus ibn-sina omar-khayyam harun-al-rashid xuanzang chandragupta-maurya
gustavus-adolphus qi-jiguang al-mamun queen-christina edgar-allan-poe huang-zongxi
peter-paul-rubens shangguan-wan-er oliver-cromwell heo-gyun kautilya origen
aeschylus zengzi zixia zeng-guofan liang-qichao yongle-emperor
yuan-shikai emperor-xiaowen-of-northern-wei emperor-huizong-of-song emperor-yang-of-sui ban-gu huang-tingjian
bang-si-hyuk novak-djokovic lewis-hamilton conor-mcgregor yi-mun-yol mikhail-bulgakov
octavio-paz chung-ji-yong anna-akhmatova glenn-gould mikhail-sholokhov shengjia-zhao
lee-chun-keun timothee-lacroix jiahui-yu jack-garabedian luo-fuli warren-mcculloch
jurgen-schmidhuber pavel-durov gaius-cassius-longinus seleucus-i-nicator jean-de-dieu-soult ishak-pasha
zaganos-pasha milan-kovac frank-wang son-jae-il armin-papperger joseph-goebbels
viktor-netyksho xu-huang chen-gong xiao-qiao lee-soo-man hamilcar-barca
king-goujian jennifer-doudna marquis-wen-of-wei wu-zixu tim-ellis king-zhuang-of-chu
kim-ki-hoon edward-c-johnson-ii leonard-bleecker kang-ji-young lee-pace carlos-ghosn
choi-hyun-woo lee-kuk-jong ricky-jay samuel joseph utae
myscellus soumaoro-kante gediminas virginia-hall count-of-st.-germain vladimir-peniakoff
jean-bedel-bokassa josiah-harlan tomas-harris joseph-paris-duverney elkan-blout william-hall-walker
benigne-dauvergne-de-saint-mars william-watts jack-humphreys william-norris jean-louis-blondeau bruce-perens
hans-wilhelm-koepcke lambert-meertens valentin-glushko frank-malina bram-moolenaar yukihiro-matsumoto
aubrey-de-grey chris-sawyer viktor-orban roger-penrose lata-mangeshkar edi-rama
david-schwimmer vjosa-osmani angela-bassett brian-de-palma calvin-harris rahul-gandhi
khadga-prasad-sharma-oli julia-louis-dreyfus hakainde-hichilema regina-king sonam-kapoor kamal-haasan
eric-s.-raymond lawrence-wong thurgood-marshall hun-manet padma-lakshmi agnes-jaoui
gaston-browne hakeem-jeffries kathleen-kennedy bebe-neuwirth adam-schiff robert-eggers
uday-chopra tanishaa david-deutsch bob-balaban gauri-khan mammootty
arbaaz-khan miguel-de-icaza ta-nehisi-coates j.-edgar-hoover eliezer-yudkowsky hans-moravec
anton-bukov denelle-dixon stani-kulechov mike-novogratz sophia-yang quedo
zvi-mowshowitz park-jeong-seok kim-cheol-ho choi-chang-yeong lee-tae-seong lee-boo-jin
ryu-jin gi-dae-seung jo-sik lee-i-hwa han-ja-gyeong park-i-mun
eom-jeong-sik kim-tae-gil shin-gyeong-jun jaegwon-kim kim-sang-bong heo-jun
park-chi-u baek-nak-cheong kim-du-bong yoo-hong-jun lee-su-jong kimoon-kim
kim-gyu-won seo-pan-gil no-hee-park lee-u-ju han-mun-hui kim-jae-gwan
stephen-fry kim-nakyoung park-sohyun gong-yubin sophia left-eye
ock-joohyun sophie-okonedo ha-ji-won go-min-si go-youn-jung forest-whitaker
```

Google 페이지 색인 보고서는 11-09 확인 당시 10-23 집계로 색인 383·발견됨 미색인 13,833·크롤링됨 미색인 80이다. 개별 URL 검사와 같은 시점의 수치가 아니다.

| 표본 | Google | 네이버 |
|---|---|---|
| 빌 게이츠 | 콘솔 URL 검사 색인 정상·마지막 크롤 11-21 18:06:11. 정확한 상세주소 검색 제목은 책 177권·음악 73곡·영상 13편이며 운영의 책 178권보다 오래됨 | 정확한 상세주소 `site:`에는 책 177권·현재 대표사진(`v=3wwyo4`) 표시. `필앤노트 빌 게이츠`에는 인물 상세 대신 《국가는 왜 실패하는가》 상세가 나옴 |
| 다리오 아모데이 | 콘솔 URL 검사 색인 정상·마지막 크롤 11-03 17:19:34. 정확한 상세주소 검색 제목이 현재 책 5권으로 갱신됨 | 정확한 상세주소 `site:`에는 현재 책 5권·현재 소개·대표사진(`v=kb6kca`)이 반영됨. `필앤노트 다리오 아모데이`에는 다니엘라 아모데이 상세가 대신 나옴 |
| 젠슨 황 | 콘솔 URL 검사 색인 정상·마지막 크롤 10-12 18:16:40. 정확한 상세주소 `site:` 실제 화면에도 책 5권의 결과가 나오며 운영의 8권보다 오래됨 | 정확한 상세주소 `site:`에는 책 5권으로 운영의 8권보다 오래된 제목 표시. 썸네일은 현재 대표사진(`v=18p5h0`)으로 반영됨. `필앤노트 젠슨 황`에는 젠슨 황 상세가 나옴 |

현재 인물 대표사진 3개는 200·JPEG·800×800이며 실제 사진을 열어 대조했다.
