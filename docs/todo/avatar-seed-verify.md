# 아바타 씨앗 신원 인증 — 인수인계

## 개요·미션

아바타 없는 실존 근현대 인물에게 생성 아바타를 달기 위한 **시드(참조 사진) 신원 인증** 작업. 목표는 "씨앗이 그 인물임을 인증할 수 있는 상태"로 만드는 것이지, 사진 수를 늘리는 게 아니다.

배경: 생성 아바타 배치(335명)가 씨앗 검증 없이 돌아 오인물·날조 얼굴이 대량 발생해 R2 업로드분 전량 폐기했다. 원인은 수집기가 Commons 파일명 토큰으로 후보를 모으고 얼굴 품질 점수로 골랐기 때문 — 잭 처칠 자리에 어머니 단체사진, 로니 리드 자리에 무관한 군인이 들어갔다.

관련 문서: [`img/avatar-backlog.md`](img/avatar-backlog.md)는 아바타 대기 인물의 DB측 명단·지침을 쥔다(별개 범위 — 사진 부재 신화·고대 인물 위주). 이 문서는 실사 생성 아바타의 씨앗 인증을 쥔다.

재발 방지로 **LV 인증 게이트**를 도입했다. 규칙 SSoT는 `docs/project/celeb/celeb-08-01-avatar.md` 「씨앗 신원 인증 게이트」.

## 현재 상태 (335명 → 분류 확정, 306명 불투명 원본 등록 완료)

| 등급 | 인원 | 의미 |
|---|---:|---|
| 3LV | 306 | 본인 확인. **전원 불투명 원본 프레임 아바타로 R2·DB 등록 완료**(승인 303 + 명단 밖 3) |
| 2LV | 15 | 근거 있으나 불확실 — 아래 「남은 29명」 표 |
| 1LV | 14 | 검증된 얼굴 이미지 없음(익명·초상 부재·조사 실패). 억지 승격 금지 |

### 등록 방향 변경 (9/20 확정)

사용자 지시로 **등록 아바타는 누끼를 쓰지 않고 생성 원본을 프레임만 맞춰 올린다**(투명 누끼본 전량 교체 완료). birefnet 누끼는 앞으로도 소스가 지저분한 경우에만 선택적으로 쓴다.

- 경로: `sw/web-bo/scripts/avatar/reframe-opaque.ts`(신규) — 생성본 균일 배경과의 색차로 실루엣 추정 + 동일 `computeCropFromSilhouette`. 머리 장식 잘림은 `--loose slug[:eyeMax:minSpan]` 완화(기본 0.58, 심하면 0.62~0.66+minSpan 0.26~0.33), 실루엣 미검출은 코너 배경색 30% 패딩으로 회수.
- 기등록 전환: 145명은 과거 reframe 좌표+반전 플래그를 `final/`(누끼 전 크롭)에 재적용해 등록본과 픽셀 동일 프레임 재현, 112명(리프레임 미거친 구등록분)은 `out/` 원본에서 신규 재단. 로그는 `_gen/_logs/reframed-opaque-all-_apply-log.json`(260건).
- Node: 업로드 계열은 `C:\tools\node24\node.exe`로 실행(Node 20은 네이티브 WebSocket 부재로 supabase 사망).

### 사용자 메모 반영 (approved-slugs.txt) — 46명 교정 완료

- 교정 지시 14명 + 메모 32명 전수 재작업: 9개 씨앗 교체(elizabeth-lyon Cruikshank 판화·boesky 방송 캡션 컷·tremulis MotorCities·guitart 교구 공식·anahareo·irving·selim-ahmed·zaharoff·churchill Commons 검증본) → 인물별 `prompt-extras.json` 지시(복면·복식·안경·수염·파이프·나이 유지)로 STRICT 재생성 46/46 → `reframe-opaque` → 등록.
- 복면 인물(ramona·fernando·moises·marcos) 전원 마스크 유지 확인 — "clothing simple and tidy" 제너릭 문구가 복식을 벗기던 게 원인이었고 extras의 drop 토큰으로 제거함.
- fernando-yanez-munoz 신원 확인: DB상 「코만단테 헤르만」 FLN 창립 멤버 — 마르코스 오인물 아님.

### 씨앗 미확보 잔여 해소 (13명 → 11명 확보·등록)

wayback·PDF 직접 추출·캡션 위치 대응으로 11명 확보: william-hall-walker(NPG)·william-herbert-hunt·john-mulheren·jean-caneri·marc-rich·elkan-blout(NAS 회고록 PDF)·leon-amundsen(MiA)·subcomandante-moises·rudolf-hamburger(DOM 유품)·bernard-cornfeld(Commons CC)·angele-egwuna(Ottertooth wayback, seed-degraded). **noah-dietrich만 미확보**(UNLV 레코드 whh000406 존재하나 이미지 전달 경로 전부 403 — 사람이 브라우저로 저장 필요). raleigh-rimmell·ootah는 얼굴 ~30px로 씨앗 불가 확정.

### 이미 등록된 인물 (이력)

구 승인분·2차 등록분 전부 위 불투명 재등록으로 덮어씀. 과거 투명 누끼 파이프라인(누끼→빛통일→reframe→등록) 로그는 `_gen/_logs/`에 보존.

### 출처 검증 승격 (132명, 2차 패스)

1LV·2LV 191명 전수에 대해 Commons 파일 페이지 위키텍스트(설명·카테고리·depicts) + Wikidata(P18 대표 이미지·P373 인물 카테고리·별칭)를 배치 검증했다:

- **P18 일치 113명** — 후보 파일이 인물의 Wikidata 대표 이미지와 동일 → 확정
- **인물 카테고리 소속 7명** — 파일이 `Category:<본인>` 안에 있음 → 확정
- **TITLE 육안 통과 7명** — 파일 제목이 본인을 명시하고 이미지가 초상 → 확정
- **enwiki 대표이미지 5명** — 기사 최상단 사진(자유 라이선스만 반환됨) → 확정

같은 검증이 걸러낸 오탐: `banksy`(작품 사진), `elizabeth-philpot`(화석), `marc-rich`(도서관 건물), `rudolf-hamburger`(기념석), `crazy-horse`(상품명), `ivan-boesky`(영화 스틸), `john-mitchell`(동명이인 Kemble家) 등.

### 서브에이전트 웹 검증 승격 (36명, 3차 패스)

잔여 1LV·2LV 58명을 6개 병렬 서브에이전트로 나눠 인물별 출처 페이지를 개별 조사시켰다. 판정 기준: **페이지 설명·캡션이 인물을 이름으로 명시 + 이미지가 얼굴·초상** — 둘 다 충족만 승격. 결과는 `subagent-results.json`에 근거 문장과 함께 저장.

- 승격 36명: RGS 아카이브(raleigh-rimmell), 아우슈비츠 박물관 수용자사진(edward-ciesielski), dewiki·IWM·Art UK·NPG·UNLV 소장 명명 초상, La Jornada 복면 사진(subcomandante-moises — 복면이 공개 얼굴), Getty/로이터 캡션 명시 언론 사진 등
- 유보(2LV): banksy(본인 부인), crazy-horse(진위 논쟁), cameahwait·catherwood(상상 묘사), dan-collins(QID 불명), leroy-king·paul-goillot(미확인 출처), melchor-arteaga·william-courtenay(초상 미확보), ootah(위치는 명시되나 얼굴 수십 px로 씨앗 불가)
- 없음 확정(1LV): john-mitchell(공식 초상 부재), sofya-nedyuzheva, len-beurton, karl-erich-kuhlenthal, frank-abagnale-sr. 등 12명

주의: 서브에이전트가 **존재하지 않는 Commons 파일명을 지어낸 사례**가 있다(elizabeth-philpot P18 오보 → 실제 없어 1LV 복귀). 승격은 에이전트 보고가 아니라 **실제 이미지를 받아 얼굴을 확인한 것**만으로 셈.

## 다음 단계 — 남은 29명 (2LV 15 + 1LV 14)

3LV 306명은 전부 불투명 등록 완료. 남은 것은 신원 미확정·얼굴 부재 29명뿐이다. 인물별 막힘과 다음 아이디어:

### 2LV — 후보는 있으나 확정 못 함 (15명)

| 인물 | 막힘 | 다음 아이디어 |
|---|---|---|
| noah-dietrich | UNLV whh000406 레코드 실존, 이미지 전달 경로 전부 차단(직접·IIIF·TIF·wayback·arquivo.pt·DPLA·Primo·LAPL) | **사람이 브라우저로 UNLV 페이지를 열어 이미지 저장** — 받아두면 즉시 설치·생성·등록 |
| abel-corbin | 후보 파일명이 "Jay Abel Hubbell"(다른 의원) — Brady-Handy 컬렉션 명명 오류 의심 | LOC Brady-Handy 컬렉션에서 `Corbin, Abel` 직접 검색 — 같은 컬렉션에 본명 초상이 따로 있을 수 있다 |
| dan-collins | 후보가 "1982 Lotus 91" 차 사진 | F1 드라이버 DB(oldracingcars.com·Motorsport Stats) 선수 사진 |
| james-timothy-hoffman | 후보가 WBC 바텐딩 대회 사진(동명이인), P18도 동명이인 | 마약 밀매 정보원 — 『Catching the Dragon』 삽화·법정 스케치·방송 인터뷰 |
| kalian-singh | 출처 원본 없음 | nain-singh과 같은 펀디트 탐사대 — RGS·Schlagintweit 탐사 기록 |
| leroy-king | 파일명 "LeRoy Clayton"(다른 인물) | WWI 행방불명→DNA 확인 보병 — 부대 기록·DPAA 발표 자료 |
| martin-siegel | 파일명 "Daniel Rakete Siegel"(NRW 행사의 다른 인물) | 냉전 인물 — 독일 연방 아카이브·Stasi 기록 |
| melchor-arteaga | 1911 원정 단체사진 속 소형 얼굴 | Yale Peabody의 Bingham 원정 사진 아카이브 — 명명 개별 컷 가능성 |
| ootah | 단체사진 후드 실루엣, 얼굴 ~30px — 씨앗 불가 확정 | Library and Archives Canada의 MacMillan 원정 사진에 명명 인물 컷 있는지 한 번만 확인 |
| raleigh-rimmell | 얼굴 ~30px + 모자 그림자 — 씨앗 불가 확정 | RGS 원정 기록 사진 전수 확인 여지 |
| saburo-shimizu | 파일명 "Saburo Kitajima"(가수 — 동명이인) | 등반가 — 일본 산악회 기록·Himalayan Index |
| bartus-korteling | 원본에 얼굴 3개 — 본인 불명, 52px | 네덜란드 식민지 관리 — KITLV 컬렉션에 단독 초상 가능성 |
| crazy-horse | 5명 얼굴 + 사진 자체의 진위 논쟁 | 논쟁 사진을 쓰면 「추정」 표기가 필요 — 아바타 없음도 정당한 결론 |
| john-mitchell | 2명 얼굴 — 본인 불명 | 어떤 John Mitchell인지 DB 신원부터 확인(동명 다수) |
| roger-b.-smith | P18이 동명 배우의 필름스틸, 211px | GM 회장 — GM Heritage Center·당시 보도 사진 |

### 1LV — 검증된 얼굴 이미지 없음 (14명)

| 인물 | 상황 | 다음 아이디어 |
|---|---|---|
| banksy | 신원 비공개가 본질 | 아바타 없음이 정답 — 익명 표현(후드·형상화)은 별도 정책 결정 |
| cameahwait | 사카가웨아의 오빠 — 사진 이전 시대 | 묘사도 없음 — 없음 확정 |
| carl-mark-force-iv | 기록 부재 | DB 신원·QID 재확인부터 |
| elizabeth-philpot | 메리 애닝 동료 — 사진 이전 시대 | 후대 판화·화석 문헌 삽도에 명명 묘사 있는지 조사 |
| forster-fitzgerald-arbuthnot | 빅토리아 번역가 | NPG·영국 기록 초상 |
| frank-abagnale-sr. | 아들(아바그네일 주니어)이 유명 | Catch Me If You Can 보도·가족 사진 |
| james-m.-davis | "Jimmy Davis songwriter"는 주지사 가수와 혼동 오탐 | 어떤 James M. Davis인지 DB 신원 확인 후 재검색 |
| karl-erich-kuhlenthal | 스페인 주재 게슈타포 | Abwehr 관련 문헌 삽도·스페인 기록 |
| len-beurton | 영국 공산당·SOE 연관 | IWM·공산당 기록 |
| lilian-maclaughlin-brown | 화가의 뮤즈 | Norman Lindsay 관련 기록 |
| paul-goillot | 미확인 출처 | 프랑스 기록 재조사 |
| sofya-nedyuzheva | 소련 인물 | '실화 바탕' 관련 소련 문헌 |
| william-courtenay | 초상 미확보 | 어느 Courtenay인지 DB 신원 확인부터 |
| william-watts | 기록 부재 | DB 신원 재확인부터 |

### 공통 지침

- 2LV 승격 조건: 페이지·캡션이 이름으로 명시하고 이미지에 얼굴이 보이는 것 — 둘 다 확인 후 `faces-final/` 설치 → `seed-class.json` 3LV → 생성 → `reframe-opaque` → 등록.
- 사진 이전 시대 인물은 명명된 후대 묘사를 `depiction-only` 플래그로 채택 가능(elizabeth-lyon Cruikshank 선례). 근거 없는 상상화는 금지.
- banksy·crazy-horse처럼 신원 자체가 논쟁·비공개인 인물은 아바타 없음이 정답일 수 있다 — 억지 승격 금지.

### 설치 후 육안검수에서 잡은 P18 오류 (중요 교훈)

Wikidata P18·카테고리도 무조건 믿으면 안 된다 — 대표 이미지가 인물 미출연 사진이거나 동명이인일 수 있다:

- george-koval — P18이 '푸틴이 유족에게 증서 수여' 사진(코발 사망 후 촬영, 미출연). enwiki 신분증 사진으로 교체
- james-timothy-hoffman — P18이 WBC 바텐딩 대회 사진(동명이인). 2LV 강등, 재검증 필요
- reginald-johnston — 완룽+존스턴 사진에서 여성 쪽이 잡혀 선 남성으로 수동 재크롭

seed-provenance.json이 slug→출처→설치본 대응관계를 담는다(342건).


## 기술·함정 (재작업 시 그대로 씀)

- **얼굴검출**: `@vladmandic/face-api` + tfjs WASM. `setWasmPaths` → `setBackend('wasm')` → `await tf.ready()` 순서 필수. `detectAllFaces` 단독 호출은 `d.box`, `.withFaceLandmarks()` 붙이면 `d.detection.box`. 대형 이미지는 1400px로 축소해 검출하고 좌표를 배율로 환원한다.
- **랜드마크 불량 폴백**: 그림·측면·복면은 턱 랜드마크가 눈 위로 올라간다(eyeChin≤0) — 검출 박스 기준 크롭(박스 높이/0.52)으로 폴백한다. 프로필·초소형 얼굴은 검출 자체가 안 된다 → 수동 크롭.
- **Wikimedia 429 = IP 제한**: `Retry-After` 헤더(600초)를 준다. 브라우저 UA·Aside 경유도 같은 IP라 소용없다 — 헤더를 존중해 대기 후 4초 간격으로 재개한다. Action API(api.php)와 파일 CDN(upload.wikimedia.org)은 별도 한도다.
- **Commons 파일 경로**: `upload.wikimedia.org/wikipedia/commons/<md5[0]>/<md5[0:2]>/<파일명>` — 파일명 공백은 `_`로.
- **판정 등급별 신뢰도**: P18·카테고리 > TITLE(본인명 명시+육안) > DESC(기증자·작품 언급 오탐 다수 — 단독 근거 금지) > 파일명 토큰(무의미).
- **enwiki pageimages 함정**: 자유 라이선스만 반환 → 근현대 인물은 대부분 없음. 기사명 추측 검색은 동명이인을 잡는다(Jonathan Plummer→Terry McMillan) — 반드시 Wikidata sitelink로 기사를 확정한다.
- **외국어·필명 함정**: "溥仪"=푸이, "川岛芳子"=카와시마, "MacLeod Zelle"=마타하리, "Nimrod"=애퍼리 필명.
- **검출 실패 ≠ 없음**: 흑백·저대비 옛 사진은 검출기가 못 잡는다 — 출처·육안이 우선.
- **기사 이미지 ≠ 본인**: 기사 본문 사진은 배우자·동료·사건 인물일 수 있다 — 무조건 육안 대조.
- **몽타주 검수 패턴**: sharp로 170~200px 격자 합성 → 묶어서 판독.
- **QID 오류 주의**: `targets.json`의 QID가 동명이인일 수 있다(조슈아 노턴은 화가 QID가 박혀 있었고 황제는 Q299204).
- 기관 사이트(NPG·Art UK·LOC)는 JS 렌더링·Cloudflare로 직접 다운로드가 안 되는 경우가 많다 — 소장 확인 자체가 근거다.
- **다중 인물 사진**: 제목의 "왼쪽/left" 명시는 좌측 얼굴 선택 근거가 된다. 누가 누군지 불명이면 `multiface` 플래그로 남겨 사용자에게 묻는다.
- **생성 프롬프트의 제너릭 문구가 정체성을 지운다**: "clothing simple and tidy" 한 줄이 터번·복면·군복·주교복을 벗긴다. 인물별 지시는 `_gen/prompt-extras.json`의 `extras[slug]` 배열 + drop 토큰으로 충돌 문구를 제거한다 — 지시만 추가하고 제너릭을 남기면 충돌한다.
- **불투명 원본 리프레임**: 생성본의 균일 회색 배경은 코너 중앙값과의 색차로 실루엣을 추정할 수 있다(`reframe-opaque.ts`). 실사 사진 배경엔 못 쓴다 — 그 경우 랜드마크 폴백(recenter 방식)이나 수동 크롭.
- **eye-line이 머리 장식을 자른다**: 면류관·제돔·부피 머리는 정수리 추정이 높아 eyeLine 상한에 걸려 상단이 잘린다 — `--loose` 완화가 정석 처리. 실루엣이 프레임 가장자리까지 차면 배경색 패딩으로 여백을 만든다.
- **기관 아카이브 차단**: UNLV(Cloudflare)·DPLA·Primo·LAPL 같은 경로가 전부 403/봇차단일 때 wayback 직접 스냅샷은 동작할 수 있다(대량 크롤 방식과 별개). 그래도 안 되면 사람이 브라우저로 저장하는 게 최종 경로다.
- **upload-* 는 Node 22+**: Node 20엔 네이티브 WebSocket이 없어 supabase 클라이언트가 생성 즉시 죽는다 — 이 머신은 `C:\tools\node24\node.exe`.
- **apply-log는 덮어써진다**: upload-reframed를 `--only`로 두 번 돌리면 `_apply-log.json`이 마지막 실행분으로 교체된다 — 배치 쪼개 돌릴 때는 로그를 먼저 빼두거나 DB에서 재구성한다.

## 잔류 성격 메모

- banksy·crazy-horse처럼 신원 자체가 논쟁·비공개인 인물은 아바타 없음이 정답일 수 있다 — 억지 승격 금지.
- 사진 이전 시대 인물은 명명된 후대 묘사를 `depiction-only`로 채택 가능(elizabeth-lyon 선례). 근거 없는 상상화는 금지.
- 동명이인 함정이 1LV·2LV의 최다 원인 — 파일명 토큰 일치만으로는 절대 승격하지 않는다.
