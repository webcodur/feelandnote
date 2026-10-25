# 검색엔진 색인·수집 신청

일일 작업은 [SEO 실행 규칙](../project/operations/ops-02-seo.md#일일-seo-실행)을 먼저 읽는다. 이 문서는 현재 검색 문제와 엔진별 재개 위치를 쥔다. 마지막 작업 기록은 [지속 과제 규칙](README.md)에 따라 교체하고, 미확정 주소는 해결될 때까지 유지한다.

**현재 검색 문제(2026-10-25):** Google의 한국어·한국 설정에서 `필앤노트` 검색 1~5페이지에 홈페이지가 없고, `feelandnote`는 첫 웹 결과다. 한글 검색 AI 개요는 다른 전자칠판 프로그램을 설명한다. 네이버는 한영 서비스명 검색에 현재 한글 제목·설명과 HTTPS 홈페이지를, Daum은 한영 검색의 사이트 영역에서 현재 등록명·설명과 HTTPS 홈페이지를 확인했다. Google 홈페이지 색인·자기 canonical은 정상이며 마지막 크롤은 10-24 16:23:56 KST다. 한영 홈의 현재 응답도 200·검색 허용·정본 주소가 정상이다.

**사이트맵 확인(2026-10-25):** active 인물 6,906명(REAL 5,955·BOTH 141·FICTION 810)의 한영 정본 13,812주소와 운영 XML을 전수 대조해 누락·중복·추가 주소 0을 확인했다. 주요 페이지 968주소를 합하면 14,780주소다. 이전 배포 슬롯에 남아 있던 사이트맵의 6,739명과 현재 명단을 대조해 새로 공개된 실존인물 167명·334주소를 확인했으며, 작업 마감 전 재조회에서도 추가·삭제가 없었다. 생성일로 공개일을 추측하지 않았다.

특수문자·다국어 slug 34명의 한영 68주소가 상세 페이지의 정본 표기와 달랐던 문제는 `8144cccf9` 운영 배포로 해소했다. 사이트맵도 상세 페이지와 같은 주소 생성 함수를 쓰며 `/celeb/e:u`는 `/celeb/e%3Au`로 싣는다. 관련 테스트 8개·ESLint·격리 운영 빌드·배포 검증 및 SEO 캐시 퍼지가 통과했다. 새 운영 XML은 정본 표기까지 전수 대조했다. Google은 수정된 인물 사이트맵을 10-25 16:41:47 재읽기·13,812주소·오류 0으로 확인하며 루트 집계도 14,780주소다. Bing 루트 사이트맵은 재제출 후 마지막 읽은 날짜 10-25·Processing이며 발견 수는 아직 14.3K다. 새 공개 334주소의 IndexNow 공용 변경 통지는 16:25:23 HTTP 200이며 개별 신청 수와 합치지 않는다.

**다음 대상 유형은 네 엔진 모두 실존인물이다.** 아래 우선대조 목록의 엔진별 미완료 구간을 먼저 처리한 뒤 기존 실존인물 재개 주소를 잇는다. 신청 순서는 [SEO 실행 규칙](../project/operations/ops-02-seo.md#일일-seo-실행)을 따른다.

아래 시각은 모두 KST(UTC+9)다. 경로는 `https://feelandnote.com` 기준이다.

| 엔진 | 마지막 작업·접수 결과 | 마지막 성공 주소 | 실존인물 재개 후보·미확정 |
|---|---|---|---|
| Google | 2026-10-25 16:15:39 일일 할당량 초과 확인. 새 공개 실존인물 11주소의 새 완료 대화상자로 접수 확정 | `/celeb/julie`(16:15:12) | `/en/celeb/julie`부터 새 공개 나머지. 그 뒤 기존 우선대조 묶음 `/celeb/heejin` → `/en/celeb/heejin` |
| 네이버 | 2026-10-25 16:18:39 「사이트별 일간 최대 요청 수를 초과하였습니다.」 확인. 새 공개 25명·한영 50주소 접수. 전체 5페이지 재조회로 오늘 50건·고유 주소 50개·시작 전 최근 50개와 겹침 0 확인 | `/en/celeb/kim-chaewon-2`(16:18:26) | `/celeb/park-shion` → `/en/celeb/park-shion`부터 새 공개 나머지. 기존 우선대조 묶음은 `/celeb/jung-soyeon`부터, 그 뒤 `/celeb/alain-resnais` 구간 |
| Bing | 2026-10-25 16:12:18 검수 완료. 새 공개 50명·한영 100주소 접수. 전체 CSV가 700→800주소, 선정 100주소 전부 추가·이력 겹침 0·오늘 제출 100·잔여 한도 0 확인 | 선정 목록 마지막 `/en/celeb/zena` | `/celeb/yoonchae` → `/en/celeb/yoonchae`부터 새 공개 나머지. 기존 우선대조 묶음은 `/celeb/geummi`부터, 그 뒤 `/celeb/sejong-the-great` 구간 |
| Daum | 2026-10-25 16:56:26 제한 재검수. 오늘 고유 499주소의 `result:true` 확정(새 공개 167명·334주소 전부 포함). 기본 5초 간격으로 진행했으며 제한 후 2분 이상 간격 재시도와 다른 미접수 주소에서도 「요청을 처리할 수 없습니다.(중복 URL, 과도한 호출)」 확인. 공식 일일 한도·초기화 시각 미확인 | `/celeb/el-cid`(16:51:23) | `/en/celeb/el-cid`부터 재대조. 이번 미접수 `/en/celeb/el-cid` · `/celeb/andrew-carnegie` · `/en/celeb/andrew-carnegie`는 성공 수에서 제외. 별도 과거 미확정 `/en/celeb/yi-hwang` · `/en/celeb/kim-jeong-ryong`은 접수 증거 확인 필요 |

**실존인물 우선대조 목록:** 모든 엔진에서 처리가 확인된 앞부분 10명은 제거했다. 아래 앞 162명(julie~choi-yena)은 이번 새 공개 묶음의 잔여, 뒤 81명(heejin~yang-jiwon)은 이전 공개 묶음의 잔여다. Google은 julie 한국어까지 완료이며 기존 묶음은 heejin부터 남았다. 네이버는 새 묶음 kim-chaewon-2의 한영까지·기존 묶음 jinyea의 한영까지, Bing은 새 묶음 zena의 한영까지·기존 묶음 way의 한영까지 완료다. Daum은 두 묶음 모두 한영 전부 완료다. 완료 구간은 재신청하지 않는다.

```text
julie natty haneul belle hina magenta
siyeon chodan athena-2 yewon keena chanelle-moon
hana yoon-seoyeon kim-nakyoung kim-chaeyeon joobin kotone
jiyeon kim-chaewon-2 park-shion kwak-yeonji mayu kim-yooyeon
seoah lynn jeong-hyerin sullin park-sohyun kaede
kim-soomin nien jeong-hayeon anna-2 sooin gawon
lee-jiwoo seo-dahyun gong-yubin xinyu liv minami
woni may zena yoonchae daniela sophia
megan lara manon isa seeun sieun
sumin j yoon huening-bahiyyih seo-youngeun choi-yujin
kim-dayeon hikaru xiaoting kim-chaehyun jang-gyuri lee-saerom
song-hayoung lee-nagyung lee-chaeyoung baek-jiheon lee-seoyeon roh-jisun
park-jiwon tsuki moon-sua haram siyoon haruna
sheon suhyeon aisha onda e:u han-eunji
sihyeon wang-yiren melanie-c mel-b geri-halliwell emma-bunton
victoria-beckham kelly-rowland michelle-williams-2 t-boz left-eye chilli
camila-cabello lauren-jauregui normani ally-brooke dinah-jane jade-thirlwall
perrie-edwards leigh-anne-pinnock jesy-nelson sinb yerin yuju
sowon umji eunha arin mimi yooa
jiho hyojung seunghee yubin-2 hyebin nayun
jooe jane ahin yeonwoo nancy jiu
handong dami gahyeon yoohyeon siyeon-2 sua-2
exy dayoung eunseo dawon luda meng-meiqi
cheng-xiao yeoreum bona wu-xuanyi seola yeonjung
soobin-2 zhou-jieqiong choi-yoojung kim-doyeon kim-sejeong jung-chaeyeon
kim-sohye jeon-somi lim-nayoung kang-mina chungha kim-minju
jo-yuri yabuki-nako kang-hyewon lee-chaeyeon kwon-eunbi choi-yena
heejin haseul vivi choerry yeojin go-won
jinsoul kim-lip nam-yujeong minyoung eunji-2 yuna-3
ki-heehyun baek-yebin jueun kwon-chaewon eunice lee-soyul
haein jinyea jung-soyeon solbin yulhee kim-yujeong
sorn oh-seunghee elkie jang-seungyeon jang-yeeun rachel
yoon-chaekyung yang-yena lee-naeun lee-jinsol kim-chaewon-3 lee-jin
ock-joohyun sung-yuri lee-hyori shim-eunjin kim-e-z yoon-eunhye
lee-heejin kan-miyeon way geummi soyul ellin
choa zuny lee-sojung ashley-choi eunb rise
seo-inyoung lee-jihyun ha-jooyeon park-semi park-jungah kim-eunjung
yewon-2 yezi cao-lu linzy jei hyemi
lina stephanie sunday dana jung-ryeowon hwangbo
lee-minkyung hwang-jungeum ayumi chae-rina kim-boa kim-bohyung
park-narae park-sihyun yang-jiwon
```

Google의 기존 재개 후보는 eric-rohmer·anne-bronte·moon-geun-young·alan-ritchson·im-soo-jung·kim-ok-vin·kim-tae-hee·shin-min-a(각 한영)다. 위 실존인물 묶음을 처리한 뒤 접수·색인 상태와 대조한다. 전갈정 한국어의 이전 미색인은 이후 미확인이며 실존인물보다 먼저 신청하지 않는다.

과거 미확정이던 `/en/celeb/chuu`와 `/en/celeb/yves`는 오늘 URL Inspection에서 색인 PASS·자기 canonical·검색 허용·가져오기 성공을 확인해 해소했다. 마지막 크롤은 각각 10-25 04:55:16과 10-25 12:10:27이다. 두 주소를 오늘 신규 접수 수에 넣지 않았다. Google 페이지 색인 집계의 최종 갱신은 10-16이며 색인 328·발견됨 미색인 13,764·크롤링됨 미색인 106이므로 오늘 개별 검사 결과와 같은 시점의 수치로 해석하지 않는다.

빌 게이츠·다리오 아모데이·젠슨 황의 운영 상세는 모두 200·검색 허용·자기 canonical, 대표이미지는 200·JPEG·800×800이며 실제 인물 사진을 열어 대조했다. 오늘 검색·저장본 확인 결과는 다음과 같다.

| 표본 | Google | 네이버 |
|---|---|---|
| 빌 게이츠 | 색인 PASS·마지막 크롤 10-22 05:34:54. 검색 제목의 책 177권·음악 73곡·영상 13편과 설명의 「등을 읽었다」가 현재 메타와 일치 | 정확한 상세주소 `site:` 결과에 현재 제목·감상 수와 책 표지 표시 |
| 다리오 아모데이 | 색인 PASS·마지막 크롤 10-23 21:17:15. 정확한 상세주소 검색에는 현재 제목과 인물 안내 본문을 설명으로 표시 | 정확한 상세주소 `site:` 결과에 현재 제목·인물 소개·현재 서비스 SEO 이미지 표시 |
| 젠슨 황 | 색인 PASS·마지막 크롤 10-12 18:16:40. 정확한 상세주소 검색에는 현재 제목과 인물 안내 본문 표시 | 정확한 상세주소 `site:` 결과에 현재 제목·인물 안내 본문과 이전 버전 SEO 이미지(`v=t4rccr`, 현재 `v=18p5h0`) 표시 |

네이버의 `필앤노트 + 인물명` 검색 첫 페이지에서는 세 인물의 해당 상세를 찾지 못했다. 다리오 검색에는 다니엘라 아모데이 상세가 대신 나왔고 빌 게이츠·젠슨 황 검색에는 인물 탐색 페이지가 나왔다. 정확한 상세주소의 `site:` 검색에는 셋 다 나온다. Daum의 빌 게이츠 상세주소 `site:` 검색에는 결과가 없었다.

Daum 리스트 Seed는 메인·탐색·인물 명부·직군 명부 16개·`/explore/faction`·`/explore/myth`·`/explore/works/curated`까지 접수 완료다. 과거 개별 상세의 전체 접수 목록은 보관되어 있지 않으므로 과거 건수만으로 특정 주소의 접수 여부를 확정하지 않는다.
