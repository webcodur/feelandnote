# 검색엔진 색인·수집 신청

일일 작업은 [SEO 실행 규칙](../project/operations/ops-02-seo.md#일일-seo-실행)을 먼저 읽는다. 이 문서는 현재 검색 문제와 엔진별 재개 위치를 쥔다. 마지막 작업 기록은 [지속 과제 규칙](README.md)에 따라 교체하고, 미확정 주소는 해결될 때까지 유지한다.

**현재 검색 문제(2026-10-24):** Google의 한국어·한국 설정에서 `필앤노트` 검색 5페이지 하단에 홈페이지가 나온다. `feelandnote`는 첫 결과이며 AI 개요에서도 홈페이지를 인용한다. 한글 검색 상위 노출은 아직 개선 대상이다. 홈페이지의 마지막 크롤은 10-22 19:52:21 KST이며 색인·자기 canonical이 정상이다. 현재 한영 홈은 200·검색 허용·정본 주소가 정상이다. 네이버·Daum의 한글 서비스명 검색에서도 현재 한글 등록명과 HTTPS 홈페이지를 확인했다.

**사이트맵 확인(2026-10-24):** active 인물 6,739명(REAL 5,788·BOTH 141·FICTION 810)과 운영 XML의 인물 한영 13,478주소를 전수 대조해 누락·중복·추가 주소 0을 확인했다. 주요 페이지 968주소를 합하면 14,446주소다. 새 공개 실존인물 86명·172주소 누락은 조회 캐시의 갱신 태그를 연결한 `e7f440ded` 운영 배포와 `celeb`·`seo` 퍼지로 해소했다. 관련 테스트 10개와 배포 검증이 통과했고, 인물 캐시 갱신 API의 200·`complete:true` 및 사이트맵 STALE→HIT·13,478주소 유지도 확인했다. 복구된 인물 사이트맵과 루트 색인을 Google에 재제출했고, Google은 인물 13,478주소·10-24 재읽기·성공을 표시한다. 루트 집계는 아직 이전 수치다. Bing의 기존 루트 사이트맵도 재제출 접수됐으며 `Processing`이다. 새 공개 172주소의 IndexNow 공용 변경 통지는 03:43:05 HTTP 200이며 개별 신청 건수와 합치지 않는다.

**다음 대상 유형은 네 엔진 모두 실존인물이다.** 신규 공개 86명을 우선 대조하고, 기존 미접수 실존인물을 이어간다. [신청 우선순위](../project/operations/ops-02-seo.md#일일-seo-실행)에 따라 엔진별 이력을 대조하며, 가상인물·세력 페이지로 넘어가기 전에 실존인물 잔여를 확인한다.

아래 시각은 모두 KST(UTC+9)다. 경로는 `https://feelandnote.com` 기준이다.

| 엔진 | 마지막 작업·접수 결과 | 마지막 성공 주소 | 실존인물 우선 대조 시 재개 후보·미확정 |
|---|---|---|---|
| Google | 2026-10-24 03:50:03 한도 확인. u1 서비스 계정으로 신규 공개 실존인물 8주소의 새 완료 대화상자 확인. heejin 한국어에서 「일일 할당량을 초과하여 이 요청을 처리할 수 없습니다. 내일 다시 제출해 주세요.」 | `/celeb/yves`(03:46:00) | 실존인물 `/celeb/heejin` → `/en/celeb/heejin`. 별도 미확정 `/en/celeb/chuu`는 검사 도구의 서버 연결 오류로 거부, `/en/celeb/yves`는 일반 제출 오류. 두 주소 모두 성공 수에서 제외했으며 회복 후 먼저 재대조 |
| 네이버 | 2026-10-24 02:54:14 한도 확인. 신규 공개 실존인물 25명 한영 50주소 접수. 5페이지 재조회로 오늘 50건·서로 다른 주소 50개·시작 전 최근 50개와 겹침 0 확인. jung-soyeon 한국어에서 「사이트별 일간 최대 요청 수를 초과하였습니다.」 | `/en/celeb/jinyea`(02:52:06) | 실존인물 `/celeb/jung-soyeon` → `/en/celeb/jung-soyeon`부터 신규 공개 나머지를 대조. 그 뒤 기존 `/celeb/alain-resnais` 구간을 이어간다 |
| Bing | 2026-10-24 08:49:06 검수 완료. u0 기존 소유 계정 로그인을 직접 복구해 신규 공개 실존인물 50명·한영 100주소 접수. 전체 CSV가 604→704주소, 제출한 100주소 전부 추가·기존 이력 겹침 0·오늘 제출 100·잔여 한도 0 확인 | 선정 목록 마지막 `/en/celeb/way` | 실존인물 `/celeb/geummi` → `/en/celeb/geummi`부터 신규 공개 나머지 36명·72주소를 대조. 그 뒤 기존 `/celeb/sejong-the-great` 구간 |
| Daum | 2026-10-24 03:27:28 제한 재검수. 오늘 서로 다른 499주소의 `result:true` 확정(신규 공개 86명·172주소 전부 포함). edward-snowden 한영에서 제한 후 2분 이상 간격 재시도와 다른 미접수 timothy-c.-may 한국어도 「요청을 처리할 수 없습니다.(중복 URL, 과도한 호출)」. 공식 일일 한도·초기화 시각 미확인 | `/en/celeb/julian-assange`(03:22:51) | 실존인물 `/celeb/edward-snowden` → `/en/celeb/edward-snowden` → `/celeb/timothy-c.-may`. 별도 미확정 `/en/celeb/yi-hwang`(오늘 응답 파싱 오류 뒤 중복 응답)·`/en/celeb/kim-jeong-ryong`(기존 HTTP 500 뒤 중복 응답)은 접수 여부 확인 필요 |

**신규 공개 실존인물 묶음:** Google은 nicole-scherzinger부터 yves 한국어까지 8주소 완료(chuu 영문 제외), yves 영문은 제출 오류이며 heejin부터 남았다. Bing은 way의 한영까지 완료했고 geummi부터 남았다. 네이버는 jinyea의 한영까지 완료했고 jung-soyeon부터 남았다. Daum은 86명 한영 전부 완료다. 엔진별 완료 구간은 기존 대기열에서 다시 신청하지 않는다.

```text
nicole-scherzinger chuu kim-hyunjin hyeju yves heejin
haseul vivi choerry yeojin go-won jinsoul
kim-lip nam-yujeong minyoung eunji-2 yuna-3 ki-heehyun
baek-yebin jueun kwon-chaewon eunice lee-soyul haein
jinyea jung-soyeon solbin yulhee kim-yujeong sorn
oh-seunghee elkie jang-seungyeon jang-yeeun rachel yoon-chaekyung
yang-yena lee-naeun lee-jinsol kim-chaewon-3 lee-jin ock-joohyun
sung-yuri lee-hyori shim-eunjin kim-e-z yoon-eunhye lee-heejin
kan-miyeon way geummi soyul ellin choa
zuny lee-sojung ashley-choi eunb rise seo-inyoung
lee-jihyun ha-jooyeon park-semi park-jungah kim-eunjung yewon-2
yezi cao-lu linzy jei hyemi lina
stephanie sunday dana jung-ryeowon hwangbo lee-minkyung
hwang-jungeum ayumi chae-rina kim-boa kim-bohyung park-narae
park-sihyun yang-jiwon
```

Google의 기존 재개 후보는 eric-rohmer·anne-bronte·moon-geun-young·alan-ritchson·im-soo-jung·kim-ok-vin·kim-tae-hee·shin-min-a(각 한국어·영어)다. 신규 공개 실존인물을 처리한 뒤 기존 접수·색인 상태와 대조한다. 다리오 아모데이·젠슨 황의 검색 설명·이미지 반영도 계속 확인한다. 10-22 접수 확정 주소를 신규 미접수로 다시 세지 않는다.

오늘 신청 전 URL Inspection에서 nicole-scherzinger·chuu 한국어는 「Google에는 아직 알려지지 않은 URL」이었고, 이후 두 주소 모두 접수 완료다. chuu 영문은 03:39:30 Google 검사 도구 스마트폰의 「페이지 가져오기 실패: 서버 연결 오류」로 거부됐다. 같은 주소의 일반 접속은 200·자기 canonical·검색 허용이며, 03:42 운영 웹·Caddy active·웹 재시작 0·낮은 부하를 확인했지만 Google 접속 실패 원인은 확정하지 못했다. 이전 확인에서 미색인이었던 전갈정 한국어는 이후 상태 미확인이며, 실존인물보다 먼저 신청하지 않는다.

빌 게이츠·다리오 아모데이·젠슨 황의 운영 상세는 모두 200·검색 허용·자기 canonical, 대표이미지는 200·JPEG·800×800이다. Daum·Yeti·Googlebot UA 시험도 빌 게이츠의 200·H1·책 본문·검색 허용을 확인했다. 같은 날 검색·저장본 확인 결과는 다음과 같다.

| 표본 | Google | 네이버 |
|---|---|---|
| 빌 게이츠 | 색인 PASS·마지막 크롤 10-22 05:34:54 | 정확한 상세주소 `site:` 결과에 현재 제목·감상 수와 책 표지 표시 |
| 다리오 아모데이 | 색인 PASS·마지막 크롤 10-23 21:17:15. 실제 검색 설명은 현재 meta의 「등을 읽었다」 대신 이전 「감상 기록을 모았습니다」를 사용 | 정확한 상세주소 `site:` 결과에 현재 제목·인물 소개·현재 서비스 SEO 이미지 표시 |
| 젠슨 황 | 색인 PASS·마지막 크롤 10-12 18:16:40 | 정확한 상세주소 `site:` 결과에 현재 제목·인물 안내 본문과 이전 버전 서비스 SEO 이미지 URL 표시 |

네이버의 `필앤노트 + 인물명` 검색에서는 세 인물의 해당 상세가 없고, 정확한 주소의 `site:` 검색에는 모두 나온다. Daum의 빌 게이츠 상세주소 `site:` 검색에는 결과가 없었다.

Daum 리스트 Seed는 메인·탐색·인물 명부·직군 명부 16개·`/explore/faction`·`/explore/myth`·`/explore/works/curated`까지 접수 완료다. 과거 개별 상세의 전체 접수 목록은 보관되어 있지 않으므로, 과거 접수 건수만으로 특정 주소의 접수 여부를 확정하지 않는다.
