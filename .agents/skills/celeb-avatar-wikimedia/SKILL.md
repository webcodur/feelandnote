---
name: celeb-avatar-wikimedia
description: 셀럽 avatar 이미지를 자동 등록한다. 1차로 위키미디어 Commons P18 자동 조회를 시도하고, 실패한 인물은 2차로 임의 출처(Commons 카테고리·검색, 일반 웹 검색)에서 적당한 인물 사진을 찾아 단건 등록한다. 라이선스 까다롭게 따지지 않는다 — 얼굴이 분명한 사람이 맞으면 그대로 등록한다. face detection 기반 얼굴 중앙 크롭·R2 업로드·DB 갱신을 포함한다. "셀럽 이미지 채워줘", "avatar 자동 등록", "얼굴 사진 채워줘", "초상화 세팅" 등으로 호출.
---

# 셀럽 avatar 자동 등록

`profiles.avatar_url`이 비어있는 셀럽에게 인물 사진을 등록한다. face-api.js로 얼굴 box 좌표를 산출해 정사각형 중앙 정렬을 보장한다.

## 등록 정책 (중요)

- **얼굴 일치만 본다.** 정확한 본인 얼굴이 분명하게 보이는 사진이면 그대로 등록한다.
- **출처 불명 얼굴을 신원 REF로 쓰지 않는다.** `D:\image\_재료` 등 로컬 재료 얼굴과 기존 서비스 아바타는 단독 신원 근거가 아니다. 본인·소속기관·공식/권위 매체의 사진 또는 인물명이 확인되는 역사 초상·도상으로 독립 대조한다. 근거 없이 준비된 임의 얼굴을 특정 인물에게 할당한 후보는 업로드하지 않는다.
- **라이선스로 막지 않는다.** CC/PD 우선이지만, 그 외(KOGL, Attribution-only, No restrictions, 출처 불명 등)도 등록 가능. 자동 배치가 라이선스 사유로 실패한 인물은 단건 처리로 그대로 밀어 등록한다.
- **출처는 위키미디어에 한정되지 않는다.** Commons에 없으면 일반 웹 검색(공식 사이트·뉴스 기사·소셜 프로필 이미지 등)으로 찾아 단건 스크립트에 직접 URL을 넣어 등록한다.
- **AI 생성 이미지는 금지.** 메모리 `feedback_no_auto_generation.md` 준수.

## 핵심 스크립트

- 일괄: `sw/web-bo/scripts/batch-celeb-wikimedia-avatars.ts`
- 단건: `sw/web-bo/scripts/upload-celeb-image-from-wikimedia.ts`
- 크레딧 로그: `sw/web-bo/scripts/celeb-image-credits.log`

## 의존성 (이미 설치됨)

`@vladmandic/face-api` (SSD MobileNet v1), `@tensorflow/tfjs`, `@tensorflow/tfjs-backend-wasm`, `sharp`, `@aws-sdk/client-s3`. 추가 설치 불필요.

## 실행 흐름 (인물 1명당)

1. **위키데이터 QID 조회** — 영문명으로 `wbsearchentities`. description에 profession 키워드 매칭 점수 우선 정렬.
2. **동명이인 차단** — `profiles.profession` 컬럼(12종) 기반 키워드 사전 매칭. 매칭 0점이면 `ambiguous_disambig`로 스킵. "fictional", "film/movie/novel(작품)", "company", "school" 등 부정 토큰은 강제 페널티(-100).
3. **P18(image) 조회** — Wikidata SPARQL/wbgetentities. 없으면 enwiki pageimage fallback.
4. **라이선스 처리** — 자동 배치는 안전상 CC/PD만 자동 등록한다. CC/PD가 아니어서 자동 단계에서 빠진 인물은 단건 처리에서 라이선스 무시하고 등록한다 (정책 참조).
5. **다운로드 + face detection** — sharp raw RGB → tf.tensor3d → `detectAllFaces`(minConfidence 0.4) → 가장 큰 박스 채택 → 얼굴 중심 좌표 산출 → sharp.extract로 정확 좌표 크롭 → 800×800 WebP(기본 q=95).
6. **얼굴 미감지 fallback** — entropy 크롭 + 로그 경고(`face_not_detected`).
7. **R2 업로드** — `celebs/{profile_id}/avatar.webp` PUT.
8. **DB 갱신** — `profiles.avatar_url` UPDATE. wikidata_qid도 비어있으면 함께 저장.
9. **credits.log 누적** — `{timestamp} | {slug} | {commons_url} | {license} | {author}`.

## 인자 옵션

- `--scan-db`: DB에서 avatar_url 비어있는 CELEB 자동 조회.
- `--only <slug>,<slug>,...`: 특정 인물만 처리.
- `--offset <n> --limit <n>`: 배치 단위 슬라이스(50명 권장, face-api 모델·tf 동시 사용 충돌 방지).
- `--exclude-file <path>`: 이전 실패자 슬러그 목록 제외.
- `--dry-run`: R2/DB 미반영, `.tmp/celeb-preview/`에 미리보기만 저장.
- `--crop-gravity <attention|entropy|center|north|south|...>`: face detection 비활성 시 수동 크롭 방향.
- `--face-detect <true|false>`: 기본 true. false면 sharp 자동 크롭만.
- `--face-frame-ratio <0~1>`: 기본 0.45. 얼굴이 결과 정사각형에서 차지할 비율(작을수록 얼굴이 결과 중앙에 작게 들어옴).
- `--quality <1~100>`: 최종 WebP 저장 품질. 기본 95. 인물 피부·머리카락 디테일 때문에 특별한 이유 없이 낮추지 않는다.
- `--identity-evidence <URL|fiction:SSoT>`: 모든 업로드 모드 필수. 실존 인물은 공식·기관·본인 페이지 URL, fiction은 원전·팩션 SSoT 경로를 쓴다.
- `--source-note <설명>`: 모든 업로드 모드 필수. 인물 신원과 직접 사용/재구성 방식을 12자 이상으로 적는다.
- `--source-note <설명>`: `--image-file`·`--image-url` 모드 필수. 신원 보존·크롭·재구성 방식을 구체적으로 적는다.

## 실패 분류

- `no_p18`: Wikidata에 P18 이미지·enwiki pageimage 모두 부재.
- `no_qid`: 위키데이터에 P31=Q5 후보 없음.
- `license_unsuitable`: CC/PD 외 라이선스(KOGL, GODL, Attribution, No restrictions 등).
- `ambiguous_disambig`: 동명이인 차단으로 강제 스킵.
- `face_not_detected`: entropy fallback으로 업로드(성공으로 분류, 얼굴 중앙 정렬 미보장).
- `other_error`: sharp pixel limit 초과 등 기타 오류.

## 실행 패턴

**A. 신규 등록 직후 일괄**
```
node --experimental-loader tsx sw/web-bo/scripts/batch-celeb-wikimedia-avatars.ts --scan-db --offset 0 --limit 50
```
50명 단위로 반복 호출, 실패자는 `.tmp-exclude-failed.txt`에 누적해 다음 배치에서 제외.

**B. 단건 재처리 (자동 배치 실패자, 또는 얼굴 크롭 조정)**

Commons 파일이 있을 때 — 파일명만 넘긴다(`File:` 접두사 없이, 공백 그대로, 라이선스 무관):
```
node --experimental-loader tsx sw/web-bo/scripts/upload-celeb-image-from-wikimedia.ts \
  --celeb-id <uuid> --commons-file "Akira_Toriyama_2023.jpg" --slug <slug> \
  --source-note "<신원·편집 설명>" --identity-evidence "https://commons.wikimedia.org/wiki/File:Akira_Toriyama_2023.jpg"
```

Commons에 사진 자체가 없을 때 — 일반 웹에서 인물 사진 URL을 직접 찾아 `--image-url`로 넣는다. 라이선스 따지지 않는다:
```
node --experimental-loader tsx sw/web-bo/scripts/upload-celeb-image-from-wikimedia.ts \
  --celeb-id <uuid> --image-url "https://..." --slug <slug> \
  --source-note "<신원·편집 설명>" --identity-evidence "https://공식·기관·본인 페이지"
```

로컬 완성본을 올릴 때도 같은 두 인자가 필요하다. `_재료`·`서비스_재료`·`_refs` 경로와 기존 Feel&Note R2 아바타 URL은 신원 근거로 거부된다. `celeb-id`와 `slug`도 DB에서 같은 프로필인지 업로드 전에 검증한다.

신원 불일치·근거 부재로 아바타를 내린 프로필은 업로드 스크립트의 `PROVENANCE_QUARANTINED_SLUGS`에 격리한다. 파일명을 바꾸거나 임시 폴더로 복사해도 등록할 수 없다. 인물 고유의 신원·도상 근거를 검토한 뒤 검역 목록을 명시적으로 해제해야 한다.

`upload-celeb-image-from-url.ts`의 자동 웹 검색 등록과 `fill-faction-avatars.ts`의 팩션 REF 직접 승격은 신원 오등록 위험 때문에 폐기·실행 차단됐다. 우회 진입점으로 되살리지 않는다. `batch-celeb-wikimedia-avatars.ts`도 DB의 `celeb-id`–`slug`–`profile_type` 일치를 먼저 검증하며, 실서비스 쓰기는 DB에 사전 검증된 `wikidata_qid`가 있는 경우에만 허용한다. QID가 없거나 기존 QID에 이미지가 없으면 `--dry-run` 후보 조사까지만 하고 자동 QID 채택·교체·업로드는 하지 않는다.

**C. 동명이인 사고 시 되돌림**
잘못된 사진이 채택된 경우 `profiles.avatar_url`, `profiles.wikidata_qid` 모두 NULL로 UPDATE.

**D. 위키미디어 Rate Limit (HTTP 429)**
upload.wikimedia.org가 일시적으로 429를 반환하면 60~90초 텀을 두고 재시도한다. 같은 파일이 계속 429면 더 작은 해상도(thumb)나 다른 후보 파일로 교체한다.

## 보고 형식

| 슬러그 | 상태 | URL 또는 사유 |
|--------|------|---------------|
| ... | ✓ uploaded | r2 url |
| ... | ⚠ face_not_detected_fallback | r2 url(얼굴 중앙 정렬 미보장) |
| ... | ✗ ambiguous_disambig | wikidata hit이 다른 직군 |
| ... | ✗ license_unsuitable | (라이선스명) |
| ... | ✗ no_p18 | wikidata QID는 있으나 사진 부재 |
| ... | ✗ no_qid | wikidata 인물 항목 자체 부재 |

마지막에 성공/실패 합계, 실패자 분류별 명단, 크레딧 로그 누적 위치 출력.

## 운영 주의

- 위키데이터·Commons API 실제 반환값만 사용. 파일명 fabrication 금지(허위 File: 이름을 만들어 넘기지 말 것).
- **라이선스로 막지 말 것.** 자동 배치가 라이선스 사유로 빠뜨린 인물도 단건 처리에서 끝까지 등록한다. 정책: 얼굴 일치만 본다.
- face detection 미감지 인물(주로 고전 초상화·고대 인물 그림)은 시각 검수 후 수동 크롭 권장.
- 음성·이미지 AI 생성은 별도 사전 승인 필요(메모리 `feedback_no_auto_generation.md`). 검색·등록은 사전 승인 불요.
- 잘못된 인물 사진이 들어가지 않게 — 동명이인·작품 표지·캐릭터·기념물 사진은 등록 금지. 본인 얼굴 사진만.
