# 셀럽 아바타 누락 138명 — 로컬 자산 분류

> 조사일: 2026-07-20 · 최종 갱신: 2026-07-20 (일리아스 17명 등록 반영)
> 대상: `celeb-avatar-missing.md`의 아바타 미등록 명단 (문서 작성 기준 138명, **실측 현재 131명**)
> 방법: `sw/remotion/public/factions/` 전수 + `D:\image\완성` 전수 대조 후 인물별 경로·용량 실측

## 자산 판정 기준

팩션 폴더에는 성격이 다른 종류가 섞여 있다. **파일명으로는 구분되지 않고 경로로만 갈린다.**

| 종류 | 경로 | 정체 |
|------|------|------|
| 완성 개인샷 | `<에피소드>/<세력>/<그룹번호>/<이름>.png` | 발주해 만든 인물 그림(전신·연출 포함) |
| **얼굴 완성본** | 일부 에피소드의 `_refs/` | **정면 얼굴 클로즈업 완성본. 아바타 최적** |
| REF(참고 자료) | 그 외 `_refs/` | 발주 참고용 외부 이미지 |
| 폐기분 | `_archive` · `_staging` · `not-using` · `_unused` | 보류·폐기 기획 |

⚠️ **`_refs`를 일괄 참고 자료로 단정하면 안 된다.** 일리아스 편 `_refs`는 실측 결과 전부 정면 얼굴 완성본이었다(2026-07-20 유저 확인 + 전량 육안 검수). 반대로 1차 조사에서는 `_refs`를 완성 개인샷으로 오판해 101명 확보로 보고한 적도 있다. **경로만으로 단정하지 말고 이미지를 열어 확인한다.**

## 분류표

| 그룹 | 인원 | 자산 |
|------|-----:|------|
| **A** 완성 개인샷 보유 | 57 | 우리 그림 |
| **B** REF — 옛 인물 초상 | 37 | 외부 초상화·조각 사진 |
| **C** REF — 오디세이아 신화 | 5 | 고전 회화 |
| **D** REF — 현대 실사 | 3 | 인물 사진 |
| **E** 자산 없음 — 옛 인물 | 2 | 없음 |
| **F** 자산 없음 — 현대 | 25 | 없음 |
| **G** 자산 없음 — 문인 | 7 | 없음 |
| 계 | 136 | |

※ 진수는 B와 D드라이브 양쪽에 있어 A-5로 별도 기재(위 합계에는 B로 계상).

---

# A. 완성 개인샷 57명

등록 수단: `sw/web-bo/scripts/upload-celeb-image-from-wikimedia.ts` 로컬 파일 모드(`--image-file`) — 얼굴 자동 크롭 · R2 업로드 · 인물 정보 갱신 일괄 처리.

## A-1. 일리아스 편 18명 · `factions/Homer-Iliad/`

| 인물 | slug | 파일 |
|------|------|------|
| 아가멤논 | `agamemnon` | `01-greeks/1/agamemnon.png` |
| 메넬라오스 | `menelaus` | `01-greeks/1/menelaus.png` |
| 네스토르 | `nestor` | `01-greeks/1/nestor.png` |
| 아킬레우스 | `achilles` | `01-greeks/2/achilles.png` |
| 대 아이아스 | `ajax-the-great` | `01-greeks/2/ajax-the-great.png` |
| 디오메데스 | `diomedes` | `01-greeks/2/diomedes.png` |
| 파트로클로스 | `patroclus` | `01-greeks/2/patroclus.png` ⚠️ 별도 `patroclus-solo-v1.png` |
| 소 아이아스 | `ajax-the-lesser` | `01-greeks/3/ajax-the-lesser.png` |
| 오디세우스 | `odysseus` | `01-greeks/3/odysseus.png` |
| 시논 | `sinon` | `01-greeks/3/sinon.png` |
| 헥토르 | `hector` | `02-trojans/1/hector-front.png` |
| 파리스 | `paris` | `02-trojans/1/paris.png` |
| 프리아모스 | `priam` | `02-trojans/1/priam.png` |
| 카산드라 | `cassandra` | `02-trojans/1/cassandra.png` |
| 아이네이아스 | `aeneas` | `02-trojans/2/aeneas.png` |
| 사르페돈 | `sarpedon` | `02-trojans/2/sarpedon.png` |
| 멤논 | `memnon` | `02-trojans/2/memnon.png` |
| 펜테실레이아 | `penthesilea` | `02-trojans/2/penthesilea.png` ⚠️ 별도 `penthesilea_old.png` |

## A-2. 올림포스 신 편 7명 · `factions/Gods-Greek/01-olympus/`

제우스 `1/zeus.png` · 헤라 `1/hera.png` · 포세이돈 `2/poseidon.png` · 아테나 `3/athena.png` · 아레스 `3/ares.png` · 아폴론 `4/apollo.png` · 아프로디테 `5/aphrodite.png`

중복·버전 없음.

## A-3. 알렉산드로스 편 10명 · `factions/Path-of-Kings/01-macedonia/1/`

파일명이 한글이라 slug와 직접 매칭되지 않는다.

| 파일명 | slug |
|--------|------|
| 필리포스 2세.png | `philip-ii-of-macedon` |
| 올림피아스.png | `olympias` |
| 록사나.png | `roxana` |
| 헤파이스티온.png | `hephaestion` |
| 파르메니온.png | `parmenion` |
| 클레이토스.png | `cleitus-the-black` |
| 셀레우코스 1세.png | `seleucus-i-nicator` |
| 안티고노스 1세.png | `antigonus-i-monophthalmus` |
| 리시마코스.png | `lysimachus` |
| 카산드로스.png | `cassander` |

## A-4. 현대 22명

### 소셜 네트워크 편 `factions/Social-Network/` (파일명 한글) — 14명

얀 쿰 `01-meta/1` · 케빈 시스트롬 `01-meta/1` · 파벨 두로프 `04-telegram/1` · 목시 말린스파이크 `05-signal/1` · 스티브 허프먼 `07-reddit/1` · 제이 그레이버 `09-bluesky/1` · 저우서우즈 `10-tiktok/1` · 장샤오룽 `11-wechat/1` · 김용현 `14-karrot/1` · 문성욱 `15-blind/1` · 이동형 `16-cyworld/1` · 김영삼 `17-iloveschool/1` · 전제완 `18-freechal/1` · 박수만 `19-me2day/1`

### 디지털 레지스탕스 편 `factions/Digital-Resistance/` — 4명

| 인물 | 파일 |
|------|------|
| 첼시 매닝 | `03-whistleblowers/1/chelsea-manning.png` |
| 존 페리 발로우 | `02-free-software/1/john_perry_barlow.png` |
| 목시 말린스파이크 | `04-privacy-frontline/1/moxie.png` ⚠️ 소셜 편과 중복 |
| 파벨 두로프 | `05-durov/1/durov_airport` · `durov_frontal_closeup` · `durov_frontal_table` · `durov_interrogation` + `01b-builders/1/durov_solo_shot` ⚠️ 총 6장(소셜 편 포함) |

### 스트리밍 제국 편 `factions/Streaming-Empire/` — 3명

제이지 `02-music/1/제이지-new.png` ⚠️ 구버전 `제이지.png` 병존 · 박태훈 `04-korea/1` · 이재현 `04-korea/1`

### X 제국 편 `factions/X-Empire/07-court/1/` — 3명

알렉스 스파이로 · 앤서니 암스트롱 · 존 허링

## A-5. D드라이브 완성본 1명

진수 — `D:\image\완성\역사\역사-삼국지\기타\진수.png`

---

# B. REF — 옛 인물 초상 37명

해당 편(몽골·진·로마·나폴레옹)은 그림 제작 전이라 참고 자료만 존재.

**중복**: 같은 인물이 `Path-of-Kings`(통합 기획)와 `Path-of-Kings-East`/`-West`(분리 기획) 양쪽에 **다른 파일**로 존재. 용량 차가 크다.

## 나폴레옹 11명 · `Path-of-Kings/_refs/04-france` + `Path-of-Kings-West/_refs`

| 인물 | PoK | PoK-West |
|------|----:|---------:|
| 루이니콜라 다부 | 204KB | 93KB |
| 루이알렉상드르 베르티에 | 2,689KB | 270KB |
| 미셸 네 | 436KB | 181KB |
| 조아생 뮈라 | 119KB | 258KB |
| 장 란 | 214KB | 200KB |
| 장드디외 술트 | 330KB | 567KB |
| 장바티스트 베르나도트 | 790KB | 130KB |
| 앙드레 마세나 | 196KB | 72KB |
| 샤를 모리스 드 탈레랑 | 548KB | 626KB |
| 조제프 푸셰 | 442KB | 548KB |
| 조제핀 드 보아르네 | 443KB | 237KB |

## 로마 7명 · `Path-of-Kings/_refs/02-rome` + `Path-of-Kings-West/_refs`

| 인물 | PoK | PoK-West |
|------|----:|---------:|
| 마르쿠스 안토니우스 | 190KB | 194KB |
| 브루투스 | 131KB | 551KB |
| 카시우스 | 361KB | 220KB |
| 크라수스 | 93KB | 682KB |
| 폼페이우스 | 194KB | 190KB |
| 스파르타쿠스 | 682KB | 790KB |
| 베르킨게토릭스 | 279KB | 561KB |

## 몽골 10명 · `Path-of-Kings/_refs/03-mongol` + `Path-of-Kings-East/_refs`

| 인물 | PoK | PoK-East |
|------|----:|---------:|
| 바투 | 234KB | 342KB |
| 수부타이 | 333KB | 139KB |
| 조치 | 329KB | 199KB |
| 차가타이 | 443KB | 222KB |
| 툴루이 | 185KB | 94KB |
| 훌라구 | 276KB | 34KB |
| 자무카 | 59KB | 59KB |
| 보르테 | 73KB | 188KB |
| 제베 | 191KB | 138KB |
| 우구데이(오고타이) | 471KB | 221KB |

## 진·전국 9명 · `Path-of-Kings/_refs/05-qin` + `Path-of-Kings-East/_refs`

| 인물 | PoK | PoK-East | 기타 |
|------|----:|---------:|------|
| 백기 | 2,121KB | — | `not-using/power-and-history/qin-chu-han/_refs/05-qin-rise` 동일본 |
| 몽염 | 128KB | 253KB | |
| 왕전 | 235KB | 114KB | `not-using/power-and-history/qin-chu-han` 동일본 |
| 여불위 | 145KB | 235KB | |
| 조고 | 352KB | 224KB | |
| 부소 | 76KB | 86KB | |
| 호해 | 425KB | 352KB | |
| 노애 | 115KB | 228KB | |
| 방연 | — | — | `not-using/philosophy-and-myth/hundred-schools/_refs/05-military` 59KB · `not-using/power-and-history/warring-states/_refs/04-zhaowei` 138KB |

## 삼국지 1명

진수 — `not-using/power-and-history/three-kingdoms/_refs` 1,426KB (D드라이브 완성본은 A-5 참조)

---

# C. REF — 오디세이아 신화 5명 · `Homer-Odyssey/_refs/`

| 인물 | 위치 | 용량 |
|------|------|-----:|
| 칼립소 | `02-sea-trials` | 168KB |
| 키르케 | `02-sea-trials` | 661KB |
| 폴리페모스 | `02-sea-trials` | 138KB |
| 페넬로페 | `01-ithaca` | 2,516KB |
| 텔레마코스 | `01-ithaca` | 1,869KB |

같은 신화 세계의 다른 인물 25명(A-1·A-2)은 우리 그림 보유. 이 5명만 외부 회화라 화풍이 다르다. 다섯 명 모두 `celeb-avatar-missing.md`에 외형 프롬프트 기작성돼 있다.

---

# D. REF — 현대 실사 3명

| 인물 | 위치 | 용량 |
|------|------|-----:|
| 멕 휘트먼 | `Streaming-Empire/_refs` | 564KB |
| 제프리 카첸버그 | `Streaming-Empire/_refs` | 522KB |
| 애런 슈워츠 | `Digital-Resistance/_refs` | 1,442KB |

---

# E. 자산 없음 — 옛 인물 2명

왕충 (`wang-chong`) · 유협 (`liu-xie`)

팩션 기획에 등장한 적 없어 참고 자료도 없다. `celeb-avatar-missing.md`에 외형 프롬프트 기작성.

---

# F. 자산 없음 — 현대 25명

돔 호프먼 · 라이언 피터슨 · 롭 퍼거스 · 루카스 바이어 · 브라이언 싱어먼 · 비벡 라마스와미 · 샤오화 자이 · 서수길 · 슈차오 비 · 아흐메드 셰리프 · 알렉산더 콜레스니코프 · 앤드루 와인라이크 · 앤드루 털럭 · 에밋 시어 · 위 지아후이 · 조너선 에이브럼스 · 크리스 파블로프스키 · 톰 앤더슨 · 트라핏 반살 · 트레이 스티븐스 · 팔머 럭키 · 호리에 다카후미 · 호안 톤-탓 · 홍위 렌 · 무하마드 알리

**잭 가라베디언**: 팩션은 폐기 폴더(`AI-Supremacy/_refs/_unused` · `_archive/loose_assets/05-xai/hide`)에만 존재. 단 `D:\image\완성\_후보\Jack Garabedian` 에 별도 파일 있음 — 확인 필요.

---

# G. 자산 없음 — 문인 7명

T.S. 엘리엇 · 김수영 · 박완서 · 박경리 · 정유정 · 황지우 · 김경주

한국 근현대 문인 사진은 대부분 언론사·출판사 촬영본이라 다른 인물과 사정이 다르다.
