# 신규 인물 등록 체크리스트

`data/celeb/new-figures/*.json`에서 지목된 인물 한 명을 실제 `celebs` 행으로 만들 때 밟는 절차다. 파이프라인 규칙은 `docs/project/celeb/celeb-00-01-pipeline.md`, 필드 계약은 `celeb-01-00-profile.md`가 원천이다 — 여기서는 순서만 잡는다. 명단 수집부터 등록·배정·콘텐츠·공개까지의 전체 순서는 [`celeb-00-03-real-figure-runbook.md`](celeb-00-03-real-figure-runbook.md)가 쥔다.

## 인물 1명당

1. **레코드 꺼내기**: 이번 회차의 임시 원고 `data/celeb/new-figures/<분야>.json`에서 `nickname`으로 레코드를 찾는다. 등록 여부는 DB에서 확인한다. 완료 원고가 없거나 오래된 `status`가 남았다는 이유로 등록을 다시 발주하지 않는다.
2. **중복 재확인**: 등록 폼에 이름·영문 이름·생몰일과 본명·결혼 전 성·다른 로마자 표기(「다른 이름」 칸)를 넣으면 폼이 같은 사람 후보를 보여 준다. 「같은 사람 의심」이면 저장이 막히므로 등록하지 않는다. 폼 밖에서는 `pnpm --dir sw/web-bo celeb:dup-check`로 본다. 기준은 `celeb-00-01-pipeline.md` 「중복 확인」이다.
3. **팩트체크**: `bio`의 날짜·직업·핵심 일화를 독립 사료와 대조한다. 검증이 안 된 일화는 문장을 빼거나 「전해진다」를 유지한다. `is_verified`는 등록 시 항상 `false`.
4. **필드 매핑**: 레코드를 `createCeleb` 입력 계약(nickname, nickname_en, profession, nationality, gender, birth_date, death_date, bio, bio_en, title, title_en, headline, headline_en, is_verified)에 맞춘다. slug·uuid는 등록 경로가 만들므로 손대지 않는다. `aliases`는 폼의 「다른 이름」 칸에 한 줄씩 넣는다. `wikidata_qid`는 폼에 칸이 없어 등록 뒤 DB에 넣는다(일괄 경로 `celeb:seed:inactive`는 두 값을 함께 싣는다).
5. **등록**: web-bo `/celebs/new`의 `createCeleb`로 생성한다. 신규 인물은 `celeb_tier='light'`·`publication_status='inactive'`가 기본이고 `celeb_reality`는 레코드 값(대부분 `REAL`)을 넣는다.
6. **반영 확인**: 반환된 `celeb_id`·`slug`로 DB를 재조회한다. 후속 작업까지 끝나면 작업 자료를 전량 폐기한다. 부가데이터 생성·보관 금지는 [데이터 원칙](../data/README.md)을 따른다.
7. **후속(등록과 별개)**: 아바타 등록은 `celeb-avatar-register` 스킬, 나머지 데이터 작업은 실존 인물 런북을 따른다. 공개 전환의 필수·선택 기준은 [`active 요건`](celeb-00-02-active-requirements.md), 상태 변경은 [`인물 공개 상태`](celeb-00-05-publication.md)를 따른다.

## 주의

- `celeb_reality`는 `REAL`이 기본. 전승층이 두꺼운 인물(생제르맹 백작)만 `BOTH`, 존 티터처럼 실존 불명 인물은 원장에 없다 — 판정 보류.
- 등록은 DB 반영이다. JSON을 직접 `celebs`에 insert하지 않고 반드시 `createCeleb` 경로를 탄다(`celeb_metrics` 초기화 때문).
- 한 파일을 여러 세션이 동시에 고칠 수 있으므로 DB 반영 여부를 재조회하고, 진행 중인 다른 인물의 원고를 함께 삭제하지 않는다.
