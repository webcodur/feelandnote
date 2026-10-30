# 검색엔진 색인·수집 신청

일일 작업은 [SEO 실행 규칙](../project/operations/ops-02-seo.md#일일-seo-실행)을 먼저 읽는다. 이 문서는 현재 검색 문제와 엔진별 재개 위치를 쥔다. 마지막 작업 기록은 [지속 과제 규칙](README.md)에 따라 교체하고, 미확정 주소는 해결될 때까지 유지한다.

**현재 검색 문제(2026-10-30):** Google `필앤노트`는 첫 페이지 홈페이지 노출을 재확인했다(`safe=off`, 언어·국가 미지정에서 두 번째 웹 결과). 앞선 1~5페이지 미노출은 `safe=active&hl=ko&gl=KR` 조건의 결과이며, 매개변수별 노출 차이의 원인은 미확인이다. `feelandnote`는 현재 제목·설명의 홈페이지가 첫 웹 결과다. 네이버 한영 서비스명 첫 페이지에서는 홈페이지의 독립 결과를 확인하지 못했다. 사이트명 링크는 HTTPS 홈으로 가지만 주요 결과는 한국어 검색에서 《Notes towards the Definition of Culture》 상세, 영문 검색에서 제이크 영문 상세다. Daum 한영 서비스명은 사이트 등록 영역에 현재 등록명·설명과 HTTPS 홈페이지·공식 블로그를 표시하며, 빌 게이츠 상세주소의 `site:` 검색에는 결과가 없다. Google 홈과 주요 인물 3개의 URL 검사는 PASS·검색 허용·자기 canonical이며, 홈 마지막 크롤은 10-29 21:15:42 KST다. Daum 상세주소 검색 부재의 원인은 미확인이다.

**사이트맵 확인(2026-10-30):** active 인물 6,929명(REAL 5,978·BOTH 141·FICTION 810)의 한영 정본 13,858주소와 운영 XML을 대조해 누락·추가·중복 0을 확인했다. 주요 사이트맵은 972주소로 전체 14,830주소다. 한영 홈과 인물 표본은 200·검색 허용·자기 canonical이 정상이다.

Google 인물·주요 페이지·루트 사이트맵의 10-30 재제출과 18:18~18:21 실제 재읽기를 확인했다. 인물 13,858·주요 972·루트 14,830주소, 오류와 경고 0이며 하위 파일 합계와 일치한다. Bing 루트 사이트맵도 10-30 재제출·재읽기 뒤 Success를 확인했다. 루트 행의 발견 수 표시는 2이며 운영 XML의 전체 주소 수와 구분한다.

**미접수 실존인물 → 가상인물 → 세력·신화 순으로 처리하며, 이미 접수한 주소의 변경분 재수집은 그 뒤다.** 네 엔진 모두 실존인물 미접수가 남았다. 아래 이전 공개 묶음의 미완료 구간과 엔진별 기존 재개 주소를 먼저 잇는다. 신규·변경이라는 이유로 이미 접수한 주소를 앞세우지 않는다.

아래 시각은 KST(UTC+9), 경로는 `https://feelandnote.com` 기준이다.

| 엔진 | 마지막 작업·접수 결과 | 마지막 성공 주소 | 실존인물 재개 후보·미확정 |
|---|---|---|---|
| Google | 2026-10-30 18:23:20 「일일 할당량을 초과하여 이 요청을 처리할 수 없습니다. 내일 다시 제출해 주세요.」 확인. 새 완료 응답 11주소 확정. 나띠 영문 1주소는 이미 색인돼 신청에서 제외. 미확정 0 | `/en/celeb/siyeon`(18:22:51 확인) | `/celeb/chodan`부터. 이후 10-24 묶음 `/celeb/heejin` → 기존 재개 후보 8명 |
| 네이버 | 2026-10-30 18:21:21 「사이트별 일간 최대 요청 수를 초과하였습니다.」 확인. 기존 대기 50주소 접수. 전체 5페이지 재조회: 오늘 50·고유 50·선정 누락 0·시작 전 최근 50개와 겹침 0 | `/en/celeb/roh-jisun`(18:21:06) | `/celeb/park-jiwon`부터. 이후 10-24 묶음 `/celeb/jung-soyeon` → 기존 `/celeb/alain-resnais` 구간. 전체 과거 이력은 제공되지 않음 |
| Bing | 2026-10-30 18:14:28 검수. 전체 CSV 1,064→1,164주소. 이력에 없던 100주소 모두 오늘 시각으로 추가 확인, 오늘 제출 100·잔여 한도 0 | `/en/celeb/seo-inyoung` | `/celeb/lee-jihyun`부터. 이후 기존 `/celeb/sejong-the-great` 구간에서 전체 이력의 완료 주소 제외 |
| Daum | 2026-10-30 18:53:16 기존 대기 500주소의 HTTP 200·`result:true` 확정. 5초 간격으로 진행했으며 제한 후 같은 주소를 2분 뒤, 다른 주소를 추가 2분 뒤 요청해 「요청을 처리할 수 없습니다.(중복 URL, 과도한 호출)」 제한 지속 확인. 공식 일일 한도·초기화 시각 미확인 | `/en/celeb/henry-miller`(18:49:10) | `/celeb/mick-jagger`부터. 구간 밖 `/en/celeb/kim-jeong-ryong`은 접수 완료이므로 제외. 미확정 0. 전체 과거 접수 목록은 제공되지 않음 |

**이전 공개 묶음:** 순서대로 10-26 공개·변경 23명(ella~forest-whitaker), 10-25 공개 167명(yunah~choi-yena), 10-24 공개 86명(nicole-scherzinger~yang-jiwon)이다. Google은 첫 23명 전부와 167명 묶음 siyeon 한영까지 접수·색인을 확인했고, 86명 묶음은 이브 한영까지 완료다. 네이버는 첫 묶음 전부·167명 묶음 roh-jisun 한영까지·86명 묶음 진예 한영까지, Bing은 첫 묶음과 167명 묶음 전부·86명 묶음 seo-inyoung 한영까지 완료다. Daum은 아래 276명 한영 전부 완료이므로 기존 대기열에서 제외한다.

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

**후순위 변경분:** 10-26 23:09:26 KST 이후의 공개 프로필 변경을 DB `updated_at`으로 다시 대조한다. 미접수 실존인물이 남아 변경분 재수집은 시작하지 않았다. 아래 10-27 변경 묶음 276명은 Google 접수 0, 네이버 son-woong-jung 한영까지 50주소, Bing ada-lovelace 한영까지 100주소, Daum jaegwon-kim 한영까지 500주소를 접수한 대조 목록이다. 그 뒤의 내용 변경과 미접수는 구분한다.

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

Google 페이지 색인 보고서는 여전히 10-23 집계로 색인 383·발견됨 미색인 13,833·크롤링됨 미색인 80이다. 오늘 개별 URL 검사와 같은 시점의 수치가 아니다.

| 표본 | Google | 네이버 |
|---|---|---|
| 빌 게이츠 | URL 검사 PASS·마지막 크롤 10-22 05:34:54. 정확한 상세주소 검색 제목에 현재 책 177권·음악 73곡·영상 13편 표시 | 정확한 상세주소 `site:`에는 현재 제목·감상 수·대표사진(`v=3wwyo4`) 표시. `필앤노트 빌 게이츠`에는 인물 상세 대신 《더 커밍 웨이브》 상세가 나옴 |
| 다리오 아모데이 | URL 검사 PASS·마지막 크롤 10-23 21:17:15. 정확한 상세주소 검색 제목은 책 4권으로 운영의 5권보다 오래됨 | 정확한 상세주소 `site:`에는 책 4권·기존 소개·현재 대표사진(`v=kb6kca`) 표시. `필앤노트 다리오 아모데이`에는 얀 라이케 상세가 대신 나옴 |
| 젠슨 황 | URL 검사 PASS·마지막 크롤 10-12 18:16:40. 정확한 상세주소 `site:` 실제 화면에는 결과가 없어 URL 검사와 구분해 기록 | 정확한 상세주소 `site:`에는 책 5권으로 운영의 7권보다 오래된 제목 표시. 썸네일은 현재 대표사진(`v=18p5h0`)으로 반영됨. `필앤노트 젠슨 황`에는 키 상세가 대신 나옴 |

현재 인물 대표사진 3개는 200·JPEG·800×800이며 실제 사진을 열어 대조했다. Daum 리스트 Seed는 메인·탐색·인물 명부·직군 명부 16개·세력·신화·기관 선정 허브까지 이전 접수 완료다.
