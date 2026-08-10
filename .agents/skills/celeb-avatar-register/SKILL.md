---
name: celeb-avatar-register
description: 셀럽 avatar 이미지를 등록한다. 출처에 서열은 없다 — 어디서 구했든 신원이 확실하고 해상도·얼굴 크기·선명도가 가장 좋은 사진을 쓴다(일반 웹 검색·공식 사이트·뉴스·Commons 모두 동급. Commons P18 자동 배치는 자동화가 싼 수단일 뿐 우선 출처가 아니다). 라이선스 까다롭게 따지지 않는다 — 얼굴이 분명한 사람이 맞으면 그대로 등록한다. 눈·턱 랜드마크 기준 얼굴 크롭·R2 업로드·DB 갱신을 포함한다. "셀럽 이미지 채워줘", "avatar 자동 등록", "얼굴 사진 채워줘", "초상화 세팅" 등으로 호출.
---

# 셀럽 avatar 자동 등록

`celebs.avatar_url`이 비어있는 셀럽에게 인물 사진을 등록한다. 얼굴을 검출한 뒤 68점 랜드마크로 **눈높이와 턱끝**을 직접 재서 정사각형으로 자른다. 크롭 계산은 `sw/web-bo/src/lib/avatar-geometry.ts` 한 곳이 하며, 등록 경로마다 다른 값이 박혀 있던 상태는 2026-08-01에 정리됐다.

> **이전에 이 스킬을 쓴 적이 있다면 먼저 볼 것 — 얼굴을 못 찾았을 때의 동작이 바뀌었다.** 예전에는 entropy 크롭으로 아무 데나 잘라 올리고 성공으로 집계했다. 이제는 **업로드하지 않고 실패**한다. 아래 「실행 흐름」 6번.

## 등록 정책 (중요)

- **출처에 서열이 없다. 기준은 품질뿐이다.** 신원이 확실하다는 전제 아래 해상도·얼굴 크기·정면 여부·선명도가 가장 좋은 사진을 고른다. 일반 웹 검색·공식 사이트·소속사 프로필·뉴스 고화질·Commons 전부 동급 후보다. **Commons P18 자동 배치는 자동화 비용이 싼 수단일 뿐 "1차 출처"가 아니다** — 자동 배치가 채택한 사진보다 좋은 사진이 웹에 있으면 그쪽으로 교체한다. 저품질 P18을 "그래도 Commons니까"라며 채택하지 않는다.
- **얼굴 일치만 본다.** 정확한 본인 얼굴이 분명하게 보이는 사진이면 그대로 등록한다.
- **출처 불명 얼굴을 신원 REF로 쓰지 않는다.** `D:\image\_재료` 등 로컬 재료 얼굴과 기존 서비스 아바타는 단독 신원 근거가 아니다. 본인·소속기관·공식/권위 매체의 사진 또는 인물명이 확인되는 역사 초상·도상으로 독립 대조한다. 근거 없이 준비된 임의 얼굴을 특정 인물에게 할당한 후보는 업로드하지 않는다.
- **라이선스로 막지 않는다.** CC/PD 우선이지만, 그 외(KOGL, Attribution-only, No restrictions, 출처 불명 등)도 등록 가능. 자동 배치가 라이선스 사유로 실패한 인물은 단건 처리로 그대로 밀어 등록한다.
- **일반 웹 사진은 "Commons에 없을 때의 차선"이 아니다.** 공식 사이트·뉴스 기사·소셜 프로필 이미지가 더 크고 선명하면 Commons에 사진이 있어도 그쪽을 쓴다. 단건 스크립트에 직접 URL을 넣어 등록한다.
- **AI 생성 이미지는 금지.** 메모리 `feedback_no_auto_generation.md` 준수.

## 핵심 스크립트

- 일괄: `sw/web-bo/scripts/batch-celeb-avatars.ts`
- 단건: `sw/web-bo/scripts/upload-celeb-avatar.ts`
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`

## 의존성 (이미 설치됨)

`@vladmandic/face-api` (SSD MobileNet v1), `@tensorflow/tfjs`, `@tensorflow/tfjs-backend-wasm`, `sharp`, `@aws-sdk/client-s3`. 추가 설치 불필요.

## 크롭 규격

**프레임 기하(눈높이·턱끝·콧대·안전 영역)와 자르는 계산식의 SSoT는 `docs/project/celeb-avatar-spec.md` §1·§6이다.** 머리 위는 규격에 없다 — 머리카락·모자·투구가 잘려도 무방하고, 얼굴이 잘리는 것만 막는다. 턱 아래도 규격에 없다 — 맨 목이든 옷깃이든 갑옷이든 머리카락이든 무엇이 채워도 되고 어깨가 아예 안 보여도 된다. 이 스킬은 등록 자동화만 담당한다. 계산식·수치를 여기 옮겨 적지 않는다 — 두 벌이 되는 순간 다시 어긋난다.

- **눈·턱 기준으로 통일됐다(2026-08-01).** 얼굴 검출 상자에 배율을 곱하던 방식을 버렸다. 상자는 모델·인물마다 잡는 범위가 달라, 같은 배율을 넣어도 얼굴 크기가 흔들렸다(표본 60명 실측에서 32% 요동). 눈과 턱은 랜드마크로 직접 재므로 검출 모델이 무엇이든 같은 결과가 나온다.
- **계산 구현은 `sw/web-bo/src/lib/avatar-geometry.ts` 하나다.** 일괄 등록·단건 등록·얼굴 정사각 전처리(`crop-faces.ts`)·관리자 화면(`src/utils/faceDetection.ts`)이 전부 이 파일을 부른다. 결과가 이상하면 이 파일과 SSoT §6만 본다.
- **자를 크기·위치를 인자로 흔들 수 없다.** 인물마다 결과가 같으려면 규격이 코드에 고정돼 있어야 한다. 옛 조절 인자는 전부 폐기됐다(아래 「인자 옵션」).
- 랜드마크를 못 얻으면 상자 기준 폴백으로 후퇴한다. 이 경로는 얼굴 크기가 ±14% 흔들리므로, 결과에 그 사실이 경고로 붙는다.
- 원본이 규격보다 작거나 얼굴이 원본 가장자리에 붙어 좌표를 밀어야 했을 때도 **조용히 넘어가지 않는다.** 콘솔·크레딧 로그·배치 보고서에 규격 경고가 남는다. 경고가 붙은 인물은 눈으로 확인한다.

## 실행 흐름 (인물 1명당)

1. **위키데이터 QID 조회** — 영문명으로 `wbsearchentities`. description에 profession 키워드 매칭 점수 우선 정렬.
2. **동명이인 차단** — `celebs.profession` 컬럼 기반 키워드 사전 매칭. 매칭 0점이면 `ambiguous_disambig`로 스킵. "fictional", "film/movie/novel(작품)", "company", "school" 등 부정 토큰은 강제 페널티(-100).
3. **P18(image) 조회** — Wikidata SPARQL/wbgetentities. 없으면 enwiki pageimage fallback.
4. **라이선스 처리** — 자동 배치는 안전상 CC/PD만 자동 등록한다. CC/PD가 아니어서 자동 단계에서 빠진 인물은 단건 처리에서 라이선스 무시하고 등록한다 (정책 참조).
5. **다운로드 + 얼굴 검출·랜드마크** — sharp raw RGB → tf.tensor3d → `detectAllFaces`(SSD MobileNet, minConfidence 0.4) + 68점 랜드마크 → 가장 큰 얼굴의 눈 평균 좌표·턱끝 채택 → `avatar-geometry`가 정사각 좌표 산출 → sharp.extract로 좌표 크롭 → 800×800 WebP **품질 95**. 일괄과 단건이 같은 품질이다(단건만 `--quality`로 바꿀 수 있으나 낮추지 않는다).
6. **얼굴 미검출 — 업로드하지 않고 실패한다.** 예전의 entropy 크롭 폴백은 폐기됐다(얼굴 위치가 사실상 무작위인 그림을 성공으로 올렸다).
   - 일괄: 그 인물만 `face_not_detected`로 실패 집계하고 건너뛴다. 나머지 인물은 계속 돈다.
   - 단건: R2·DB에 손대기 전에 중단한다. 그래도 그 사진을 써야 하면 `--allow-no-face true`를 명시해야 하고, 그때만 **중앙 크롭**으로 진행하며 "규격 기하를 보장하지 않는다"는 경고가 콘솔과 크레딧 로그에 남는다.
   - 얼굴을 못 찾는 것은 대개 전신·측면·군집 사진이거나 고전 회화다. 얼굴이 큰 다른 사진을 먼저 찾는다.
7. **R2 업로드** — `celebs/{profile_id}/avatar.webp` PUT.
8. **DB 갱신** — `celebs.avatar_url` UPDATE. `wikidata_qid`도 비어 있으면 함께 저장.
9. **credits.log 누적** — `{timestamp} | {slug} | {commons_url} | {license} | {author}`.

## 인자 옵션

⚠️ **폐기된 인자 — 넘겨도 무시된다.**

| 인자 | 어디에 있었나 | 지금 |
|------|------|------|
| `--face-frame-ratio` | 단건 등록 | 폐기. 경고 한 줄 찍고 무시한다 |
| `--frame-ratio` · `--headroom` | `crop-faces.ts` | 폐기. 경고 한 줄 찍고 무시한다 |
| `--require-face` | 단건 등록 | 얼굴 필수가 기본 동작이 됐다. `true`는 받아만 준다(단 `--face-detect false`와 같이 주면 오류로 중단). `false`는 경고만 찍고 무시한다 — 대체 크롭이 필요하면 `--allow-no-face true`를 쓴다 |

자를 크기·위치는 SSoT가 정하고 `avatar-geometry.ts`가 계산한다. 조절 인자를 되살리지 않는다.

⚠️ **크롭·품질 인자는 단건 스크립트 `upload-celeb-avatar.ts`에만 있다. 배치 스크립트 `batch-celeb-avatars.ts`에는 없다** — 배치가 파싱하는 인자는 `--dry-run`·`--scan-db`·`--only`·`--targets-file`·`--offset`·`--limit`·`--exclude-file` 뿐이며, 출력 800×800·품질 95·얼굴 검출 사용이 코드에 박혀 있다. 배치에 크롭 옵션을 넘겨도 무시된다.

- `--scan-db`: DB에서 avatar_url 비어있는 CELEB 자동 조회.
- `--only <slug>,<slug>,...`: 특정 인물만 처리.
- `--offset <n> --limit <n>`: 배치 단위 슬라이스(50명 권장, face-api 모델·tf 동시 사용 충돌 방지).
- `--exclude-file <path>`: 이전 실패자 슬러그 목록 제외.
- `--dry-run`: R2/DB 미반영, `.tmp/celeb-preview/`에 미리보기만 저장.
- `--face-detect <true|false>`: 기본 true. false면 규격 크롭을 하지 않고 `--crop-gravity` 방향으로 sharp 자동 크롭만 한다. 규격 기하는 호출자 책임이며 경고가 남는다.
- `--allow-no-face true`: 기본 꺼짐. 얼굴을 못 찾았을 때 중앙 크롭으로 올리는 것을 명시적으로 허용한다. `--face-detect true`와 함께만 쓸 수 있다. 이걸 안 주면 얼굴 미검출은 실패다.
- `--crop-gravity <attention|entropy|center|north|south|...>`: `--face-detect false`일 때만 쓰인다. 기본 attention.
- `--size <64~4096>`: 저장 정사각 한 변. 기본 800.
- `--quality <1~100>`: 최종 WebP 저장 품질. 기본 95. **모든 등록 경로가 95로 통일됐다**(SSoT §6). 올리지도 낮추지도 않는다.
- `--preview-path <경로>`: 업로드한 것과 같은 파일을 로컬에 남긴다. 눈으로 검수할 때 쓴다.
- `--identity-evidence <URL|fiction:SSoT>`: 모든 업로드 모드 필수. 실존 인물은 공식·기관·본인 페이지 URL, fiction은 원전·팩션 SSoT 경로를 쓴다.
- `--source-note <설명>`: 모든 업로드 모드 필수. 인물 신원과 편집·재구성 방식을 12자 이상으로 적는다.

## 실패 분류

- `no_p18`: Wikidata에 P18 이미지·enwiki pageimage 모두 부재.
- `no_qid`: 위키데이터에 P31=Q5 후보 없음.
- `license_unsuitable`: CC/PD 외 라이선스(KOGL, GODL, Attribution, No restrictions 등).
- `ambiguous_disambig`: 동명이인 차단으로 강제 스킵.
- `face_not_detected`: 얼굴을 못 찾아 **업로드하지 않고 건너뛴** 인물. 2026-08-01 이전에는 entropy 크롭으로 올리고 성공으로 쳤으나 이제 실패다.
- `other_error`: sharp pixel limit 초과 등 기타 오류.

성공했더라도 규격 경고가 붙은 인물은 `WARN 규격 이탈`로 따로 세어 명단을 낸다(원본 부족, 얼굴이 원본 가장자리에 붙음, 상자 폴백, 판정 이탈).

## 실행 패턴

**A. 신규 등록 직후 일괄**
```
node --experimental-loader tsx sw/web-bo/scripts/batch-celeb-avatars.ts --scan-db --offset 0 --limit 50
```
50명 단위로 반복 호출, 실패자는 `.tmp-exclude-failed.txt`에 누적해 다음 배치에서 제외.

**B. 단건 재처리 (자동 배치 실패자, 또는 사진 교체)**

크롭이 마음에 안 든다고 인자로 조절할 수는 없다. 결과가 규격을 벗어났다면 원본 사진이 문제이므로 **사진을 바꾼다.**

Commons 파일이 있을 때 — 파일명만 넘긴다(`File:` 접두사 없이, 공백 그대로, 라이선스 무관):
```
node --experimental-loader tsx sw/web-bo/scripts/upload-celeb-avatar.ts \
  --celeb-id <uuid> --commons-file "Akira_Toriyama_2023.jpg" --slug <slug> \
  --source-note "<신원·편집 설명>" --identity-evidence "https://commons.wikimedia.org/wiki/File:Akira_Toriyama_2023.jpg"
```

Commons에 사진 자체가 없을 때 — 일반 웹에서 인물 사진 URL을 직접 찾아 `--image-url`로 넣는다. 라이선스 따지지 않는다:
```
node --experimental-loader tsx sw/web-bo/scripts/upload-celeb-avatar.ts \
  --celeb-id <uuid> --image-url "https://..." --slug <slug> \
  --source-note "<신원·편집 설명>" --identity-evidence "https://공식·기관·본인 페이지"
```

로컬 완성본을 올릴 때도 같은 두 인자가 필요하다. `_재료`·`서비스_재료`·`_refs` 경로와 기존 Feel&Note R2 아바타 URL은 신원 근거로 거부된다. `celeb-id`와 `slug`도 DB에서 같은 프로필인지 업로드 전에 검증한다.

신원 불일치·근거 부재로 아바타를 내린 프로필은 업로드 스크립트의 `PROVENANCE_QUARANTINED_SLUGS`에 격리한다. 파일명을 바꾸거나 임시 폴더로 복사해도 등록할 수 없다. 인물 고유의 신원·도상 근거를 검토한 뒤 검역 목록을 명시적으로 해제해야 한다.

`upload-celeb-image-from-url.ts`의 자동 웹 검색 등록과 `fill-faction-avatars.ts`의 팩션 REF 직접 승격은 신원 오등록 위험 때문에 폐기·실행 차단됐다. 우회 진입점으로 되살리지 않는다. `batch-celeb-avatars.ts`도 DB의 `celeb-id`–`slug` 일치를 먼저 검증하며, 실서비스 쓰기는 DB에 사전 검증된 `wikidata_qid`가 있는 경우에만 허용한다. QID가 없거나 기존 QID에 이미지가 없으면 `--dry-run` 후보 조사까지만 하고 자동 QID 채택·교체·업로드는 하지 않는다.

**C. 동명이인 사고 시 되돌림**
잘못된 사진이 채택된 경우 `celebs.avatar_url`, `celebs.wikidata_qid` 모두 NULL로 UPDATE.

**D. 위키미디어 Rate Limit (HTTP 429)**
upload.wikimedia.org가 일시적으로 429를 반환하면 60~90초 텀을 두고 재시도한다. 같은 파일이 계속 429면 더 작은 해상도(thumb)나 다른 후보 파일로 교체한다.

## 보고 형식

| 슬러그 | 상태 | URL 또는 사유 |
|--------|------|---------------|
| ... | ✓ OK uploaded | r2 url |
| ... | ⚠ WARN 규격 이탈 | r2 url + 경고 내용(원본 부족·얼굴이 가장자리에 붙음·상자 폴백 등) |
| ... | ✗ face_not_detected | 얼굴 미검출 — 업로드하지 않음 |
| ... | ✗ ambiguous_disambig | wikidata hit이 다른 직군 |
| ... | ✗ license_unsuitable | (라이선스명) |
| ... | ✗ no_p18 | wikidata QID는 있으나 사진 부재 |
| ... | ✗ no_qid | wikidata 인물 항목 자체 부재 |

마지막에 성공/경고/실패 합계, 분류별 명단, 크레딧 로그 누적 위치를 찍는다. 같은 내용이 `sw/web-bo/scripts/.tmp-batch-report-<타임스탬프>.json`에도 저장된다 — 개수는 `success`·`warned`·`failures`, 명단은 `successSlugs`·`warnedSlugs`·`byReason`다(예전 이름 `faceFallback`·`fallbackSlugs`는 없어졌다).

## 규격 검증 도구

잘라 놓은 이미지들이 규격대로 앉았는지 다시 재는 도구다. 등록 직후나, 이미 등록된 아바타를 한 폴더에 내려받아 점검할 때 쓴다.

```
cd sw/web-bo
npx tsx scripts/measure-avatar-geometry.ts <이미지폴더>
```

폴더 안의 이미지를 전부 열어 68점 랜드마크를 돌리고, 이미지마다 눈높이·턱끝·얼굴 중심축을 프레임 100단위로 환산해 **규격 허용 범위와 대조한 합격·이탈 판정**을 찍는다. 판정 수치는 `src/lib/avatar-geometry.ts`의 `AVATAR_SPEC` 하나에서만 온다 — 이 도구가 따로 기준을 갖고 있지 않다.

마지막에 합격률과 분포(p10·중앙·p90)를 요약하고, 이미지별 상세는 **입력 폴더의 한 단계 위**에 `measure.json`으로 저장된다(`--json <경로>`로 지정 가능).

**기계가 못 보는 것** — 얼굴이 프레임 밖으로 잘렸는지, 시선·고개 각도, 턱 아래가 비어 인물이 떠 보이는지, 쇄골 노출, 소품, 배경, 질감. 전부 SSoT §5.2의 격자 눈 검수로만 잡힌다. (머리카락·머리 장식 잘림과 턱 아래를 무엇이 채우는지는 규격상 무방하므로 애초에 판정 대상이 아니다.)

## 운영 주의

- 위키데이터·Commons API 실제 반환값만 사용. 파일명 fabrication 금지(허위 File: 이름을 만들어 넘기지 말 것).
- **라이선스로 막지 말 것.** 자동 배치가 라이선스 사유로 빠뜨린 인물도 단건 처리에서 끝까지 등록한다. 정책: 얼굴 일치만 본다.
- 얼굴 미검출 인물(주로 고전 초상화·고대 인물 그림)은 이제 자동으로 등록되지 않는다. 얼굴이 큰 다른 사진을 찾거나, `crop-faces.ts`·관리자 화면에서 사람이 맞춘 뒤 로컬 파일 모드로 올린다.
- **얼굴이 없는 것이 정상인 인물이 있다.** 사토시 나카모토·클로윈디처럼 신원이 공개되지 않아 얼굴 자료가 아예 없는 경우로, 후드 속 어둠이나 복면으로 익명성을 형상화한다. 이들은 기하 규격이 면제되며(SSoT §1) 사람이 직접 올린다 — `--allow-no-face true` 또는 관리자 화면. **미검출 명단에서 이들을 재작업 대상으로 올리지 마라.**
- 음성·이미지 AI 생성은 별도 사전 승인 필요(메모리 `feedback_no_auto_generation.md`). 검색·등록은 사전 승인 불요.
- 잘못된 인물 사진이 들어가지 않게 — 동명이인·작품 표지·캐릭터·기념물 사진은 등록 금지. 본인 얼굴 사진만.
