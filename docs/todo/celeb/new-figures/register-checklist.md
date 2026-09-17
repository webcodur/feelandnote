# 신규 인물 등록 체크리스트

`data/celeb/new-figures/*.json`에서 지목된 인물 한 명을 실제 `celebs` 행으로 만들 때 밟는 절차다. 파이프라인 규칙은 `docs/project/celeb/celeb-00-01-pipeline.md`, 필드 계약은 `celeb-01-00-profile.md`가 원천이다 — 여기서는 순서만 잡는다.

## 인물 1명당

1. **레코드 꺼내기**: `data/celeb/new-figures/<분야>.json`에서 `nickname`으로 레코드를 찾는다. `status`가 `registered`면 이미 등록된 것 — 중복 발주 금지.
2. **중복 재확인**: 한영 이름 정규화 일치 + 본명·결혼 전 성·다른 로마자 표기를 `celebs`에 부분 검색한다(초안 작성 시점 대조 이후 신규 등록이 있을 수 있다).
3. **팩트체크**: `bio`의 날짜·직업·핵심 일화를 독립 사료와 대조한다. 검증이 안 된 일화는 문장을 빼거나 「전해진다」를 유지한다. `is_verified`는 등록 시 항상 `false`.
4. **필드 매핑**: 레코드를 `createCeleb` 입력 계약(nickname, nickname_en, profession, nationality, gender, birth_date, death_date, bio, bio_en, title, title_en, headline, headline_en, is_verified)에 맞춘다. slug·uuid는 등록 경로가 만들므로 손대지 않는다.
5. **등록**: web-bo `/celebs/new`의 `createCeleb`로 생성한다. 신규 인물은 `celeb_tier='light'`·`publication_status='inactive'`가 기본이고 `celeb_reality`는 레코드 값(대부분 `REAL`)을 넣는다.
6. **원장 갱신**: 레코드에 `status: "registered"`와 반환된 `celeb_id`·`slug`를 써 넣는다.
7. **후속(등록과 별개)**: 공개하려면 아바타(`celeb-avatar-register` 스킬)와 첫 `celeb_contents` 행이 필요하다. 익명·신원불명 인물(뱅크시·디비 쿠퍼·철가면의 사내)은 `faction-image` 스킬의 익명 규칙을 먼저 확인한다.

## 주의

- `celeb_reality`는 `REAL`이 기본. 전승층이 두꺼운 인물(생제르맹 백작)만 `BOTH`, 존 티터처럼 실존 불명 인물은 원장에 없다 — 판정 보류.
- 등록은 DB 반영이다. JSON을 직접 `celebs`에 insert하지 않고 반드시 `createCeleb` 경로를 탄다(`celeb_metrics` 초기화 때문).
- 한 파일을 여러 세션이 동시에 고칠 수 있으므로 `status` 갱신은 등록 직후 바로 한다.
