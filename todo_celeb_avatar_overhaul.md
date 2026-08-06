# TODO — 셀럽 아바타 전수 정비 인수인계

> 작성일: 2026-07-30
> 목적: 현재 대화 세션을 폐기하고 다음 작업자가 이 문서에서 바로 재개할 수 있게 한다.
> 상태: **미완료. 서비스 전체 재검수와 교체 작업을 계속해야 한다.**

## 1. 단일원천과 현재 숫자

다음 파일을 함께 본다.

- 확정 결함: `celeb-avatar-defects.md`
- 미등록·신원 결함: `celeb-avatar-missing.md`
- 현대 인물 특수 보류: `celeb-avatar-modern-targets.md`
- 로컬 자산 정책: `celeb-avatar-local-assets.md`
- 기계 판독 큐: `.tmp/celeb-avatar-audit-queue.json`
- **초상 구도 규격(SSoT)**: `docs/project/celeb-avatar-spec.md`
- 이미지 규격: `docs/project/db-celeb.md`
- 배경 제거: `.agents/skills/nobg-cutout/SKILL.md`
- 자동 등록 규칙: `.agents/skills/celeb-avatar-register/SKILL.md`

2026-07-30 현재 문서·큐 실측:

- `celeb-avatar-defects.md`: 확정 잔여 **164명**
- `.tmp/celeb-avatar-audit-queue.json`
  - `confirmed_unresolved`: **164명**
  - `probable_review`: **148명**
- `celeb-avatar-missing.md`: 비fiction CELEB 미등록 **13명**
  - 활성 6명, 비활성 7명
  - `fiction` 미등록 209명은 이번 초상화 정비 범위 밖
- 최초 확정·후속 신원 감사 결함 390명 중 **226명은 교체·역검증 완료**

성공한 인물은 R2 역다운로드 검증을 끝낸 뒤 `celeb-avatar-defects.md`와 큐에서 제거한다. probable은 신원·원본을 대조하기 전 확정 결함에 섞지 않는다.

## 2. 최근 회차에서 완료한 13명

열세 명 모두 다음을 완료했다.

1. 인물명이 직접 붙은 공식·권위 출처로 신원 대조
2. `C:\project\nobg` 전용 도구로 배경 제거
3. 밝은 배경·어두운 배경·원형 크롭 육안 검수
4. 800×800 RGBA WebP, 품질 100 업로드
5. DB `profiles.avatar_url` 갱신
6. R2 파일 재다운로드 후 로컬 업로드 사본과 SHA-256 일치 확인
7. `celebs` 캐시 무효화
8. 원본·REF·생성본·누끼본·최종본·업로드 미리보기 즉시 삭제

### 카밀로 호세 셀라 — 완료

- slug: `camilo-jose-cela`
- profile id: `78db9737-1f8c-4d45-9c6d-59187d6341ee`
- 결함: 기존 서비스 이미지는 저해상도 회화 기반 재구성에 가까웠고 얼굴 디테일이 부족했음
- 신원 근거: `https://www.nobelprize.org/prizes/literature/1989/cela/photo-gallery/`
- REF: 노벨재단이 Camilo José Cela로 직접 명명한 1989년 실사진 `91548`, `91550`, `91544` 세 장
- 처리: 기존 서비스 이미지는 REF에서 제외하고, 위 공식 실사진 세 장만 교차 사용해 정면 컬러 스튜디오 초상으로 재구성
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/78db9737-1f8c-4d45-9c6d-59187d6341ee/avatar.webp?v=1785399935514`
- 역검증 SHA-256: `22a5cec5163be932248757cb9ec62b2dd904bcff144cb04f709e86a6b57adf40`
- 판정: 정면 신원 일치, 자연스러운 노화·안경, 양쪽 어깨, 닫힌 셔츠 칼라, 완전 투명·불투명 알파 범위 확인

### 아라키 히로히코 — 완료

- slug: `hirohiko-araki`
- profile id: `a405b0b1-6c64-4280-acaa-c9e718b0c0c4`
- 결함: 기존 파일은 800×800이지만 실효 해상도가 낮고 확대 흔적이 컸음
- 신원 근거:
  - T JAPAN 공식 인터뷰 `https://www.tjapan.jp/entertainment/17224457`
  - 보물시 공식 행사 보고 `https://takarazuka-city.note.jp/n/n85cd3c796457`
- 조사: T JAPAN 기사 소속 `*_xlarge.jpg` 27개를 전수 접촉시트로 검수했다. 인물이 나온 직접 사진은 책상 장면과 전신 행사 사진뿐이라 얼굴 크기·구도가 최종 아바타에 부족했음
- 처리: T JAPAN 공식 사진 1장과 보물시 공식 행사 근접 사진 2장만 REF로 사용했다. 기존 서비스 이미지는 REF에서 제외하고 신원·나이·머리 특징을 보존한 정면 컬러 스튜디오 초상으로 재구성한 뒤 `C:\project\nobg`로 배경을 제거했음
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/a405b0b1-6c64-4280-acaa-c9e718b0c0c4/avatar.webp?v=1785402694989`
- 역검증 SHA-256: `fd915a2b4e80fba0ba27bc0be0c7876458b62213ac40cbabc93c66b485f8a88d`
- 역검증: HTTP 200, `image/webp`, 800×800, RGBA, 알파 0~255, 업로드 미리보기와 원격 파일 해시 일치
- 서비스 반영: `celebs` 캐시 무효화 200. 공개 `/ko/celeb/hirohiko-araki`와 `/celeb/hirohiko-araki` HTML이 모두 위 최종 URL을 참조함
- 판정: 공식 REF와 눈·코·턱선·헤어라인 일치, 정면, 머리 전체, 양쪽 상부 어깨, 닫힌 목선, 손·소품·쇄골 노출 없음. 밝은 배경·`#0a0a0a`·원형 크롭에서 누끼 경계 통과

### 라이트 형제 — 검증 완료·교체 불필요

- slug: `wright-brothers`
- profile id: `3121376c-4f07-4b2e-ba36-102640634491`
- 사용자 관찰: 원래 두 얼굴이던 계정이 서비스에서 한 명처럼 보였음
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/3121376c-4f07-4b2e-ba36-102640634491/avatar.webp?v=1785362873317`
- DB·서비스 일치: DB `profiles.avatar_url`과 공개 `/ko/celeb/wright-brothers`·`/celeb/wright-brothers` HTML이 모두 위 URL을 참조함. `/ko` 요청은 현재 비locale 경로로 정상 리다이렉트됨
- R2 역검증: HTTP 200, `image/webp`, 800×800, RGBA, 알파 0~255. 재다운로드 SHA-256은 `a9b45b6be6e8f76173c34709488fa4390860b396de60fdd8566875d5979da7be`
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`의 최종 기록 `2026-07-29T22:07:53.452Z`가 현재 두 사람 배치와 `WrightBrothers.jpg`·미 의회도서관 근거를 명시함. 직전 기록 `2026-07-29T14:59:48.863Z`도 Wilbur·Orville 두 사람의 LOC/Wikimedia 초상을 보존한 2인 재구성본임을 기록함
- 독립 신원 근거:
  - 미 의회도서관 Orville Wright 개별 초상 `https://www.loc.gov/pictures/item/2001696610/` — 1905년, 34세, 콧수염이 있는 머리·어깨 초상, `LC-DIG-ppprs-00680`
  - 미 의회도서관 Wilbur Wright 개별 초상 `https://www.loc.gov/pictures/item/2001696613/` — 1905년, 38세, 머리·어깨 초상, `LC-DIG-ppprs-00683`
  - Wikimedia Commons 결합 초상 `https://commons.wikimedia.org/wiki/File:WrightBrothers.jpg` — 위 두 LOC 디지털 원본을 Wilbur와 Orville로 각각 명명한 1905년 2인 초상, Public Domain Mark
  - 미 의회도서관 2인 사진 `https://www.loc.gov/pictures/item/2003680184/` — 제목에서 Wilbur Wright와 Orville Wright를 함께 직접 명명하며 출판 제한 없음
- 육안 판정: LOC 개별 초상의 Wilbur 얼굴형·헤어라인과 Orville 눈·코·콧수염 특징이 각각 보존됨. 밝은 배경·`#0a0a0a`·원형 크롭 모두 두 형제의 얼굴과 상부 어깨가 분리되어 보이고, 얼굴 겹침·한 명 잘림·긴 몸통·누끼 구멍이 없음
- 결론: 사용자 지적의 서비스/R2 불일치는 재현되지 않았고 DB·공개 HTML·R2가 동일 최종본을 가리킨다. 교체하거나 캐시를 다시 무효화할 필요가 없음

### 포청천 / 포증 — 완료

- slug: `bao-zheng`
- profile id: `1522c277-b2c3-4b67-b279-f103e943ef35`
- 결함: 기존 서비스 이미지는 회화 원본 자체는 아니지만 전통 초상 기반 재구성 흔적이 강해 그림처럼 보였음
- 신원·도상 근거:
  - 국립고궁박물원 `歷代聖賢半身像　冊　包拯`, 문물 통일 번호 `中畫000328N000000022`: `https://digitalarchive.npm.gov.tw/Collection/Detail/17874?dep=P`
  - Smithsonian National Museum of Asian Art `Portrait of Bao Zheng (998-1061)`, `F1919.181`: `https://asia-archive.si.edu/object/F1919.181/`
- 근거 한계: 두 자료 모두 포증 사후의 도상이므로 정확한 생전 얼굴을 주장하지 않고, 두 권위 컬렉션이 공통으로 보이는 얼굴·수염·직선 날개 복두·원령포만 보존한 `iconography-based historical reconstruction`으로 처리함
- 배제: 권위 도상에 없는 검은 얼굴·이마 월아문·희곡 분장·드라마 복식·손·홀·장식 문양은 넣지 않음
- 생성 검수: NPM·Smithsonian 로컬 원본 두 장만 REF로 사용. 1차 후보는 가슴·긴 몸통 노출로 탈락시켰고, 한 번의 표적 교정으로 얼굴·복식은 고정한 채 상부 어깨 구도로 수정함
- 누끼: `C:\project\nobg`의 `birefnet-general`을 CPU 단일 프로세스로 실행. 최초 출력이 검은 복두 양익을 배경으로 오인해 제거하여 불합격 처리한 뒤, 같은 승인 생성본의 날개 수평대에서 저명도 픽셀만 기존 알파에 복원함
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/1522c277-b2c3-4b67-b279-f103e943ef35/avatar.webp?v=1785404852805`
- 역검증: HTTP 200, `image/webp`, 800×800, RGBA, 알파 0~255, 86,646 bytes. 업로드 미리보기와 R2 재다운로드본 SHA-256이 `514827a72c5137ee9b074b0f90ee31139a82be387b716929d798bbc7dd588141`로 일치
- DB·서비스 반영: DB `profiles.avatar_url` 재조회 일치, `celebs` 캐시 무효화 HTTP 200. 공개 `/ko/celeb/bao-zheng`·`/celeb/bao-zheng` HTML이 모두 위 최종 URL을 참조함
- 육안 판정: 자연스러운 동아시아 피부·무분장 이마·작고 긴 눈·가는 콧수염과 긴 수염·직선 양익 복두·무늬 없는 높은 원형 목선이 두 도상의 공통분모와 부합함. 밝은 배경·`#0a0a0a`·원형 크롭에서 관체와 양익이 대칭으로 읽히고, 파란 fringe·누끼 구멍·잘린 머리·손·소품·긴 몸통이 없음
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`의 `2026-07-30T09:47:32.957Z` 기록에 두 기관 URL, 배제 기준, 누끼 날개 복원 내역을 함께 보존함

### 김지하 — 완료

- slug: `kim-chi-ha`
- profile id: `8296dec8-4e05-4984-8b53-3b34d6190cf3`
- 결함: 기존 등록 얼굴이 연합뉴스의 직접 명명 사진과 달라 DB·R2에서 제거했으며, 문체부 직접 사진 한 장은 원본부터 정수리가 잘려 단독 사용이 불가능했음
- 주 신원 근거: 문화체육관광부 2022년 보도자료의 공공누리 제1유형 원본 `문화훈장_금관_김지하.JPG`(4288×2848): `https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pSeq=19805`
- 보조 신원 REF: 연합뉴스 2012년 직접 명명 행사 사진과 뉴시스 2022년 직접 명명 자료사진 중 머리 전체·헤어라인·얼굴 무안경 특징만 교차 사용. 마이크·손·안경·핀마이크·그림·문자·워터마크·배경은 복제하지 않음
- 생성 검수: built-in imagegen 1차 후보는 신원은 읽혔지만 문체부 주 REF보다 얼굴이 넓고 대칭적으로 평준화돼 조건부 탈락. 한 번의 표적 교정으로 구도·머리·의상은 고정하고 더 길고 좁은 얼굴 비율, 넓은 코, 입·턱 비대칭과 자연 피부를 복원함
- 누끼·최종 QA: `C:\project\nobg`의 `birefnet-general`을 CPU 단일 프로세스로 실행. 800×800 RGBA WebP 품질 100으로 변환했으며 밝은 배경·`#0a0a0a`·원형에서 머리 전체 안전 여백, 양귀, 양쪽 상부 어깨, 높은 닫힌 목선, 머리카락·의상 경계를 확인함
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/8296dec8-4e05-4984-8b53-3b34d6190cf3/avatar.webp?v=1785406803837`
- 역검증: HTTP 200, `image/webp`, 800×800, RGBA, 78,508 bytes. 업로드 미리보기와 R2 재다운로드본 SHA-256이 `56D6218F159EC7777CDDADF7768B41511408311EC96325F3822FF13784952A20`으로 일치
- DB·서비스 반영: DB `profiles.avatar_url` 재조회 일치, `celebs` 캐시 무효화 HTTP 200. 공개 `/ko/celeb/kim-chi-ha` 리다이렉트와 `/celeb/kim-chi-ha` HTML이 모두 위 최종 URL을 참조함
- 판정: 문체부 주 REF의 노년 얼굴 골격·두꺼운 눈썹·좁은 눈·넓은 코·긴 얼굴과 보조 REF의 정수리·헤어라인이 함께 보존됨. 1인, 무안경·무손·무소품·무문자, 21세기 컬러 실사 규격 통과
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`의 `2026-07-30T10:20:04.057Z` 기록에 문체부 주 REF, 보조 REF 사용 범위와 배제 요소, 재구성·누끼 방식을 보존함

### 루카 돈치치 — 완료

- slug: `luka-doncic`
- profile id: `8648174a-7c36-49bc-aa9e-ca52dea4ff48`
- 결함: 기존 아바타가 농구 경기 중 저해상도 장면이라 얼굴이 작고 표정·어깨 구도가 서비스 초상에 부적합했음
- 신원 근거: FIBA 공식 선수 프로필 person 196610 `https://www.fiba.basketball/en/players/196610-luka-doncic`
- 사용 원본: FIBA 공식 headshot `https://assets.fiba.basketball/image/upload/.headshot--person_196610?buster=24`의 3346×5030 RGBA PNG. 원본 SHA-256은 `A48D8A8F0A7DB20566E076F6B3CC2F41E985CE3AD4C8827F4704252101C9516E`
- 처리: 보고서 권장 3346×3346 크롭은 상체·유니폼 문구·번호가 과도하게 남아 탈락시켰다. 원본의 x=623, y=80, 2100×2100 중앙 크롭으로 머리 안전 여백·양쪽 어깨·V넥을 보존한 뒤 `C:\project\nobg` CPU 단일 프로세스로 배경을 제거함
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/8648174a-7c36-49bc-aa9e-ca52dea4ff48/avatar.webp?v=1785407670848`
- 역검증: HTTP 200, `image/webp`, 800×800, RGBA, 118,334 bytes. 업로드 미리보기와 R2 재다운로드본 SHA-256이 `6166867211C3E2C2858A82D5D030467FBA86B69FBC63B67467E16095453C8958`로 일치
- DB·서비스 반영: DB `profiles.avatar_url` 재조회 일치, `celebs` 캐시 무효화 HTTP 200. 공개 `/ko/celeb/luka-doncic` 리다이렉트와 `/celeb/luka-doncic` HTML이 모두 위 최종 URL을 참조함
- 판정: FIBA 공식 선수 사진의 얼굴·헤어라인·수염과 일치하는 정면 1인 컬러 실사. 머리 전체와 안전 여백, 양귀, 양쪽 상부 어깨, V넥을 보존했고 손·공·마이크·워터마크·긴 몸통·큰 유니폼 문구·번호가 없음. 밝은 배경·`#0a0a0a`·원형 크롭에서 누끼 경계 통과
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`의 `2026-07-30T10:34:31.104Z` 기록에 FIBA person 196610, 원본 해시, 크롭 좌표와 CPU 누끼·QA 내역을 보존함

### 매직 존슨 — 완료

- slug: `magic-johnson`
- profile id: `860f68f6-c379-44b6-b01d-ae8a65220dcd`
- 결함: 기존 아바타는 강한 황색 누끼 잔상과 거친 경계가 남았고, 저해상도 행사 사진을 확대해 어깨가 잘리고 얼굴이 과대하게 보였음
- 신원 근거: 매직 존슨 본인 공식 사이트의 수상 기사 `https://magicjohnson.com/news/345`. NBA 선수 77142, Lakers 동문 프로필, Naismith Hall of Fame 프로필로 얼굴·이름을 독립 대조함
- 사용 원본: MagicJohnson.com 공식 기사 원본 `https://magicjohnson.com/public/img/news/345_2.jpg?133`의 1819×2123 RGB JPEG. 원본 SHA-256은 `32F05AA2D127970560C28FED1FD042E9379EA05E308F2871B4E23F9845CE7933`
- 처리: 보고서 권장 1600×1600 크롭은 얼굴이 왼쪽에 치우치고 긴 상체가 남아, 1600·1500·1400·1350·1300px 크롭을 비교했다. x=0, y=0, 1300×1300 크롭으로 얼굴을 중앙에 두고 머리 안전 여백·양쪽 상부 어깨·셔츠 칼라·넥타이를 보존한 뒤 `C:\project\nobg` CPU 단일 프로세스로 배경을 제거함
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/860f68f6-c379-44b6-b01d-ae8a65220dcd/avatar.webp?v=1785408097004`
- 역검증: HTTP 200, `image/webp`, 800×800, RGBA, 128,660 bytes. 업로드 미리보기와 R2 재다운로드본 SHA-256이 `C5D76C36DAB9B8F3DBA5AF4B999F63D8A5D0F5D6076DEF6B0DFC559CF1BFCC2F`로 일치
- DB·서비스 반영: DB `profiles.avatar_url` 재조회 일치, `celebs` 캐시 무효화 HTTP 200. 공개 `/ko/celeb/magic-johnson` 리다이렉트와 `/celeb/magic-johnson` HTML이 모두 위 최종 URL을 참조함
- 판정: 본인 공식 사이트 스튜디오 사진의 얼굴·미소와 독립 프로필 신원이 일치하는 정면에 가까운 1인 컬러 실사. 머리 전체·양귀·양쪽 상부 어깨·닫힌 셔츠 칼라·넥타이가 남고 손·공·마이크·문자·워터마크·긴 몸통·황색 잔상이 없음. 밝은 배경·`#0a0a0a`·원형 크롭에서 누끼 경계 통과
- 권리 메모: MagicJohnson.com의 공식 직접 명명 사진이지만 오픈 라이선스 자산은 아니며, 공개·상업 재사용 권한 처리는 신원·화질·구도 통과와 별도임
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`의 `2026-07-30T10:41:37.143Z` 기록에 공식 기사·독립 대조·원본 해시·크롭 좌표·CPU 누끼·QA와 권리 메모를 보존함

### 포송령 — 완료

- slug: `pu-songling`
- profile id: `85f98a0a-edf4-40de-b6e9-a2775d4cda9b`
- 결함: 기존 아바타가 전통 회화 원본을 그대로 배경 제거한 결과라 21세기 컬러 실사 초상 규격에 미달했음
- 신원·도상 근거: 주상린이 1713년에 그린 생전 초상 `清康熙五十二年朱湘鳞绘蒲松龄画像图轴`. 포송령 본인의 친필 `筠嘱江南朱湘鳞为余肖此像`이 피사체·의뢰자·화가·시점을 작품 자체에서 고정하며, 포송령기념관 소장 국가 1급 문물임
- 기관 교차 근거:
  - 쯔보시 상무국 포송령기념관 소장품 소개 `https://boftec.zibo.gov.cn/cec/charm/detail?charmid=171`
  - China Daily 정부 문화면 `https://govt.chinadaily.com.cn/s/202501/03/WS677791cb498eec7e1f72c564/pu-songling-museum.html`
  - 산둥성 문화여유청 국유 소장 1급 문물 목록 `https://whhly.shandong.gov.cn/module/download/downfile.jsp?classid=0&filename=83aebc5fc6aa44edb585218a839196e6.pdf`
- 재구성: 같은 1713년 생전 초상의 China Daily 기관 복제본과 광명망 정면 전시 사진만 동일 작품 REF로 사용했다. 조사 문서의 단일 발주안으로 built-in imagegen을 정확히 1회 실행했고, 길고 야윈 노년 얼굴·가늘고 처진 눈·긴 코·얇은 회백 콧수염·짧고 성긴 턱수염·무장식 붉은 관모·무문 청회색 옷·정면 양어깨 구도가 거절 기준을 모두 통과해 표적 교정은 사용하지 않음
- 생성 원본: 1254×1254 RGB PNG, SHA-256 `62668C7C4A5773EABE9E8B935651B243893B5E0FC71C9399844FAF7680805C61`
- 누끼·최종 QA: `C:\project\nobg` CPU 단일 프로세스로 배경을 제거하고 800×800 RGBA WebP 품질 100으로 변환했다. 밝은 배경·`#0a0a0a`·원형에서 관모 전체와 안전 여백, 양귀, 양쪽 상부 어깨, 닫힌 목선, 피부·수염·옷 경계를 확인함
- 최종 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/85f98a0a-edf4-40de-b6e9-a2775d4cda9b/avatar.webp?v=1785408774887`
- 역검증: HTTP 200, `image/webp`, 800×800, RGBA, 87,328 bytes. 업로드 미리보기와 R2 재다운로드본 SHA-256이 `14CA400C8AF2F256C575B72C8E3C1D4F23D9E382804707B9D47C4B3731908E8C`로 일치
- DB·서비스 반영: DB `profiles.avatar_url` 재조회 일치, `celebs` 캐시 무효화 HTTP 200. 공개 `/ko/celeb/pu-songling` 리다이렉트와 `/celeb/pu-songling` HTML이 모두 위 최종 URL을 참조함
- 판정 한계: 유일 생전 회화의 확실한 비례·노년 특징·단순 복식만 복원한 `iconography-based historical reconstruction`이며, 정확한 사진 likeness·피부색·눈동자색·미세 주름·관등을 주장하지 않음
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`의 `2026-07-30T10:52:55.212Z` 기록에 생전 초상 근거·배제 자료·생성 횟수·생성 해시·복원 한계·누끼·QA를 보존함


앞선 6명은 원래 171명 큐에 들어 있지 않았던 후속 발견 결함이다. 김지하는 `confirmed_unresolved`와 미등록 명단에서, 루카 돈치치·매직 존슨·포송령·토리야마 아키라·이문열·이노우에 다케히코는 `confirmed_unresolved`에서 해결되어 제거했다. 따라서 현재 큐는 164/148이다.

## 2A. 이번 회차 HOLD

### 벤지 테일러

- slug: `benji-taylor`
- profile id: `91657923-9aa4-4162-be46-bb1449ce2b12`
- 신원·QID: 본인 사이트 `benji.org`가 직접 연결한 `@benjitaylor`의 X 합류 발표와 CoinDesk의 `Elon Musk ... and Benji Taylor` 실명 캡션, Avara의 LFE 인수 발표를 교차 대조했다. Wikidata 네 검색어에서 항목이 없어 `no_qid`를 유지하며 임의 QID를 채택하지 않음
- 검토 후보: 2026-03-25 본인 X 게시물의 1209×1361 RGB JPEG 원본 `HER04KSbwAAnzA_.jpg?name=orig`. SHA-256 `10FC1C079EC0DE4527CB4517EB21917274EA9A13873B4C980E282C30E1641F5D`
- 크롭·확대 판정: `x=700, y=270, 500×500` 수동 크롭은 Elon Musk·SpaceX 로고·팔·손을 완전히 제외하고 Benji의 머리 전체·양쪽 귀·상부 어깨를 보존했다. 800×800 Lanczos 1.6배 확대 뒤에도 눈·눈썹·콧날·입술·귀·짧은 두피 경계가 식별됐으며, 800px dry-run SHA-256은 `665164018355136D997A134D214675E60642197374F769B22D205E7B5456C117`
- 누끼·QA: `C:\project\nobg`의 `birefnet-general`을 CPU 단일 프로세스로 정확히 1건 실행하고 800×800 RGBA WebP 품질 100 후보를 만들었다. 후보 SHA-256은 `8A625E45C9E81D4C1C344707B4CD71A3143711571A6618AACC13572A5577DE97`. 밝은 배경과 보라색 원형에서는 얼굴·두피·귀가 유지됐지만, `#0a0a0a`에서 검은 폴로의 양쪽 어깨가 배경에 거의 완전히 합쳐지고 원본의 청록 배경색 halo만 희미한 외곽선처럼 남음
- 최종 판정: **IMAGE HOLD**. 확대 디테일과 타인·로고 배제는 통과했지만 어두운 서비스 배경에서 상의 경계를 유지하지 못했다. imagegen, R2 업로드, DB·`avatar_url`·캐시 변경은 모두 0건이며, 결함 문서와 `confirmed_unresolved` 큐는 제거하지 않고 164/148을 유지함
- 재개 조건: 검은 상의가 아닌 고대비 복장 또는 밝은 원본 배경에서 촬영된 권위 있는 단독 사진을 확보할 때 다시 검토한다. 현재 후보의 옷 경계나 배경을 생성·합성해 보충하지 않는다

## 3. 사용자 지적 6명 — 미완료 0명

사용자가 직접 지적한 여섯 명은 모두 교체 또는 역검증을 마쳤다.

## 4. 절대 규칙

### 신원

- `D:\image\_재료`, `D:\image\서비스_재료`, 팩션 `_refs`, 기존 서비스 아바타를 특정 실존 인물의 단독 신원 근거로 쓰지 않는다.
- 파일명을 인물명으로 바꾸거나 임시 폴더로 복사해 신원 가드를 우회하지 않는다.
- 현대 실존 인물은 본인·소속기관·공식 행사·권위 매체가 직접 명명한 실제 사진으로 대조한다.
- 역사 인물은 인물명이 붙은 초상·도상 또는 기관이 근거를 명시한 재구성을 사용한다.
- 근거 없는 “그럴듯한 시대 얼굴”은 업로드하지 않는다.
- 검색 결과 첫 이미지를 자동 채택하지 않는다.
- 실제 사진이 충분히 좋으면 그대로 사용하고, 구도·해상도가 부족할 때만 복수의 검증된 REF로 재구성한다.
- 사용자에게 이미 사고로 지적된 제베·방연 같은 임의 얼굴 재사용을 절대 반복하지 않는다.

### 서비스 초상 규격

- **프레임 기하·안전 영역·발주 프롬프트·판정 기준은 `docs/project/celeb-avatar-spec.md`가 단일원천이다.** 아래는 요약이며, 충돌하면 그 문서를 따른다.
- 화면을 100단위로 볼 때 눈높이 46 · 턱끝 81 · 콧대 가로 50(목표값. 판정 허용은 SSoT §1).
- **머리 위는 자유다.** 머리카락·모자·투구·관모가 화면 위로 잘려도 무방하다. 다만 이마·눈썹·귀 등 얼굴 자체가 잘리면 불합격이다.
- **턱 아래도 자유다.** 맨 목·옷깃·러프·관복 깃·투구 목가리개·갑옷 어깨보호구·긴 머리카락 무엇이 채워도 되고, 어깨가 아예 안 보여도 된다. 어깨를 담으려고 카메라를 빼지 않는다. 턱 아래가 텅 비어 원형 안에 머리만 떠 보이는 것만 불합격이다.
- 고대인까지 모두 21세기 고급 카메라로 촬영한 듯한 컬러 하이퍼리얼리스틱 결과가 목표다.
- 흑백사진·회화·조각·동전을 그대로 최종 서비스 이미지로 쓰지 않는다.
- 한 사람 계정은 한 명, 형제·듀오·집단 계정은 실제 구성원을 모두 표시한다.
- 정면~3/4 15도 이내, 카메라 응시를 기본으로 한다.
- 쇄골·가슴·긴 몸통은 보이지 않게 하고 높은 닫힌 목선으로 가린다.
- 손, 마이크, 헤드셋, 책, 공, 휴대전화, 무기 등 불필요한 소품을 넣지 않는다.
- 너무 멀거나 얼굴만 과도하게 확대된 구도 모두 탈락이다.
- 최종본: 800×800 RGBA WebP.
- 저장 품질은 **95**다(SSoT §6). 2026-08-01 기준 모든 등록 경로가 95로 통일됐으므로, 아래 §5 절차의 업로드 명령도 100에서 95로 고쳤다. 이전 회차 기록에 남은 품질 100은 그 세션 한정 판단이었고 기본값이 아니다.

## 5. 인물 한 명 처리 절차

여러 명의 원본과 누끼를 한 폴더에 쌓지 않는다. 한 명을 완전히 끝내고 모든 중간 파일을 지운 뒤 다음 인물로 넘어간다.

1. DB의 UUID·slug·profile type을 다시 조회한다.
2. 공식·권위 출처에서 신원 근거와 원본을 확보한다.
3. 직접 사진 사용 여부 또는 복수 REF 재구성 여부를 결정한다.
4. `C:\project\nobg\batch\batch_work\originals\<slug>.webp` 한 장만 준비한다.
5. CPU 단일 프로세스로 nobg를 실행한다.

```powershell
cd C:\project\nobg\batch
$env:CUDA_VISIBLE_DEVICES='-1'
uv run --with "rembg[cpu]>=2.0" --with "pillow>=10.0" python batch_nobg.py rembg
```

6. 최종 800×800 RGBA WebP를 만든다.
7. 다음 세 화면을 직접 본다.
   - 밝은 배경
   - 서비스에 가까운 어두운 배경 `#0a0a0a`
   - 원형 크롭
8. `upload-celeb-avatar.ts`의 로컬 파일 모드로만 업로드한다.

```powershell
cd C:\project\feelandnote\sw\web-bo
pnpm.cmd exec tsx scripts/upload-celeb-avatar.ts `
  --celeb-id '<UUID>' `
  --slug '<slug>' `
  --image-file '<최종 webp 절대경로>' `
  --identity-evidence '<외부 공식 신원 페이지 URL>' `
  --source-note '<신원 근거, 원본, 편집·재구성 방식의 구체적 설명>' `
  --face-detect false `
  --size 800 `
  --quality 95 `
  --preview-path '<업로드 사본 절대경로>'
```

9. R2 URL을 다시 내려받아 확인한다.
   - HTTP 200
   - `image/webp`
   - 800×800
   - 4채널 RGBA
   - 투명 알파 존재
   - 업로드 미리보기와 원격 파일 SHA-256 정확히 일치
10. `POST https://feelandnote.com/api/revalidate`에 `tag=celebs`, 로컬 `.env`의 `CRON_SECRET`을 보내 캐시를 갱신한다.
11. 완료된 인물이 큐·결함 문서에 있으면 둘 다 제거한다.
12. 원본·REF·생성본·누끼 입력·누끼 출력·최종본·업로드 미리보기·접촉시트뿐 아니라, 인물별 research 문서·PDF/HTML 원문·페이지 렌더·임시 스크립트·로컬 설치 패키지까지 모두 삭제한다. 완료뿐 아니라 HOLD로 판정한 인물도 결론을 `celeb-avatar-defects.md`와 기계 큐에 옮긴 뒤 조사 잔재를 남기지 않는다.
13. 소진된 `next-targets-*.md`, 빈 `.tmp\avatar-work`, 인물별 `.tmp\celeb-avatar-batch\<slug>`, `C:\project\nobg\batch\batch_work`까지 제거한다.
14. 다음 인물로 넘어가기 전에 세 경로를 전수 재검사한다. 완료·HOLD 인물의 잔재가 1개라도 남으면 다음 인물을 시작하지 않는다. 허용되는 것은 현재 처리 중인 단 한 명의 작업물, 아직 처리하지 않은 READY 조사 문서, 기계 판독 큐뿐이다.

## 6. 중단 시점 로컬 상태

2026-07-30 실측:

- `C:\project\feelandnote\.tmp\avatar-work`: 존재하지 않음
- `C:\project\nobg\batch\batch_work`: 존재하지 않음
- 위 완료 6명의 원본·REF·생성본·누끼본·최종본·미리보기: **0개**
- 아라키 조사 산출물: 로컬 파일 없음
- 라이트 형제 재검증 산출물과 `.tmp\avatar-work\wright-brothers`: 로컬 파일·폴더 없음
- 포증 원본·REF·연구 문서·생성본·누끼본·마스크 복원본·QA·업로드 미리보기·R2 역다운로드본·`nobg\batch_work`: 로컬 파일·폴더 없음
- 김지하 문체부 원본·권위 매체 보조 REF·연구 문서·생성본·누끼본·QA·업로드 미리보기·R2 역다운로드본·`nobg\batch_work`: 로컬 파일·폴더 없음
- `D:\image\서비스_재료`의 파일:
  - `R2_아바타_검색기.cmd` 1개만 존재
  - 인물 재료 파일 없음
- `.tmp`의 다른 작업 파일과 `sw/web-bo/.tmp`의 가상 독백 작업물은 다른 작업 소유이므로 건드리지 않는다.

## 7. 재개 순서

1. `celeb-avatar-defects.md`의 확정 잔여 164명을 한 명씩 처리
2. probable 148명을 신원·원본 대조하여 확정 결함과 정상으로 분류
3. 누락을 막기 위해 등록 아바타 전체를 새 접촉시트로 다시 전수 육안검수
4. 비fiction 미등록 13명은 `celeb-avatar-missing.md`의 신원 가드를 지키며 별도로 처리

완료 판정은 “명단을 한 차례 돌았다”가 아니다. 서비스 실제 화면에서 신원 불일치, 회화·흑백 원본 노출, 옆모습, 복수 인물 누락, 지나친 확대·축소, 저해상도, 거친 누끼가 더 이상 발견되지 않고, 모든 교체본의 R2 역검증 증거가 있을 때만 가능하다.
