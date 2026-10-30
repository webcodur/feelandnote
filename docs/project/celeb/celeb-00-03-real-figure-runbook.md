# 실존 인물 등록 런북

실존 인물 명단을 받아 등록·배정·콘텐츠·공개까지 **이 순서로** 탄다. 각 단계의 판정 규격은 링크된 룰북이 쥐고, 여기는 순서와 단계 간 연결만 둔다. 공개 전환의 필수·선택 작업은 [`active 요건`](celeb-00-02-active-requirements.md)으로 판단한다. 인물 한 명의 등록 절차는 [`celeb-00-04-new-figure-checklist.md`](celeb-00-04-new-figure-checklist.md), 두 축 판정은 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md)가 쥔다.

외부 도구는 어느 단계에서건 [`../agent-tools.md`](../agent-tools.md)(툴북)를 따른다. 이 런북의 현재 배정은 툴북 「시나리오 배정 — 실존 인물 등록」이 쥔다 — 모델명·호출법을 각 단계에 박지 않는다.

## 0. 명단 수집·검증

- 대상의 실존, 소속, 언론·미디어 노출, 얼굴 사진 존재를 확인한다. 이미지가 뜨지 않는 인물은 아바타를 만들 수 없으므로 수집 단계에서 걸러 판단한다. 웹 페이지는 툴북의 열람 도구로 연다.
- 결과는 `docs/todo/` 큐로 올린다. 처리한 인물은 큐에서 지우고 미결만 남긴다.
- celebs 기등록 여부를 먼저 본다 — 이미 있으면 등록 없이 배정만 한다.

## 1. 임시 등록 원고 작성

- [작업 파일·백업 원칙](../data/README.md#작업-파일백업)에 따른 작업 폴더의 `<분야>.json`에 레코드를 쓴다. 필드 계약은 [`celeb-01-00-profile.md`](celeb-01-00-profile.md), 직군 허용값·수식어는 각각 `celeb-01-00`·[`celeb-01-03-title.md`](celeb-01-03-title.md)의 상수를 따른다.
- bio·title·headline은 한영 모두 작성한다. 한국어는 한국인이 쓴 글답게 한다.
- 등록 후보가 많으면 소속사·주제별로 파일을 나눈다. 등록 여부는 DB에서 확인한다. 완료 원고를 다음 회차의 원본으로 재사용하지 않는다.

## 2. 등록

- `pnpm --dir sw/web-bo celeb:seed:inactive --dir "<등록 원고 폴더의 절대경로>"`로 이번 작업의 원고만 dry-run한다. create·conflict·already의 대상과 건수를 확인한다.
- `conflict`가 동명이인이면 다른 사람임을 확인하고 레코드 `distinct_from`에 기존 slug를 **배열로** 넣는다.
- `--apply` 뒤 DB 재조회로 등록 수와 값을 확인한다. 후속 작업까지 끝나면 작업 자료를 전량 폐기한다. 부가데이터 생성·보관 금지는 [데이터 원칙](../data/README.md)을 따른다.
- 신규 인물은 `light`·`inactive`로 들어간다 — 공개는 6단계 판단이다.

## 3. 세력 배정

- 소속 실체(회사·기관) 세력을 우선한다. 인원이 적어 세력이 없으면 뉴웨이브 같은 임시 지역·주제 그룹에 두고, 인원이 불면 전용 세력으로 승격한다.
- `faction_lv2`(세력)와 `faction_lv3`(그룹)을 확인하고 없으면 만든다. 실존 세력도감의 진열은 `is_featured`, 인물 배정의 노출은 `hidden`이 결정한다. `published`는 신화의 공개값이므로 실존 세력의 `published=false`를 비공개로 해석하지 않는다. 인물·아바타·설명이 갖춰지기 전에 진열하지 않는다.
- `faction_members`에 celeb_id·lv3_id를 넣고 `long_desc`·`long_desc_en`을 한영 모두 쓴다. 작성·교정은 [`세력별 인물 소개`](celeb-10-01-faction-long-desc.md)를 따른다. 스키마·화면 연결은 [`../apps/apps-01-web-bo.md`](../apps/apps-01-web-bo.md) 「세력도감」이 쥔다.
- 이직은 양쪽을 다 표현한다 — 이전 세력은 「떠난 인물」류 그룹에, 현재 세력은 현직 그룹에. 이미 배정된 인물의 이동은 lv3_id를 바꾼다.
- 갈 곳이 없는 인물은 억지로 넣지 않는다 — 미배정으로 두고 구조(그룹·세력)를 고칠지 사용자와 정한다.

## 4. 아바타

- 신원·원본·구도 판정은 [`celeb-08-01-avatar.md`](celeb-08-01-avatar.md), 실행은 `celeb-avatar-register` 스킬이 쥔다.
- 대량 자동 수집은 `scripts/avatar/batch.ts --scan-db`다. 라이브 등록 전 **신원 감사**가 필수다 — 위키데이터 이름 검색은 동명이인을 잘못 집는다(실측: 드라이런 성공분의 상당수가 다른 인물의 사진이었다). Commons 파일 페이지의 설명·depicts로 실제 인물을 대조하고, 오인 건은 `--exclude-file`로 뺀다.
- 라이브 등록은 DB에 사전 검증된 `wikidata_qid`가 있어야 한다(`missing_verified_qid` 차단). 감사를 통과한 인물의 QID를 `celebs.wikidata_qid`에 먼저 기록한 뒤 돌린다.
- 자동 경로가 빠진 인물(no_qid·confirmed_no_qid·no_p18·face_not_detected)은 단건 `upload.ts --image-url`로 간다 — `--identity-evidence`에 그 인물을 특정하는 독립 근거 URL이 필요하다.
- 등록 배치마다 정규화(빛 방향 통일·재배치)까지 끝낸다. `celeb-avatar-reframe` 스킬.

## 5. 콘텐츠

도메인별로 병렬이다. 조사·가이드·사실 판정은 작업자가 맡고, 문장 생성은 툴북 「시나리오 배정」이 배정한 도구에 넘긴다(인물안내·가상독백과 상황 대사는 다른 도구다).

작성과 재작업의 담당자는 파이프라인·이 런북과 맡은 필드의 개별 룰북·스킬을 모두 읽은 뒤 발주한다. 인물 안내와 가상독백은 각자의 말투·분량·집필 목적을 적용해 따로 발주한다.

| 데이터 | 룰북 | 비고 |
|---|---|---|
| 인물 안내(한영) | [`celeb-05-01-reading.md`](celeb-05-01-reading.md) | |
| 독서 방식 조사 | [`celeb-05-02-reading-way.md`](celeb-05-02-reading-way.md) | 최초 1회 조사 필수. 조사 미달도 인정 |
| 가상독백(한영) | [`celeb-04-03-virtual-monologue.md`](celeb-04-03-virtual-monologue.md) | 외부 CLI 중간 단계 |
| 말투·한마디·상황 대사 | [`celeb-04-01-speech.md`](celeb-04-01-speech.md) · [`celeb-04-02-speech-pipeline.md`](celeb-04-02-speech-pipeline.md) | 실제 발언 기반 |
| 영향력·스펙트럼(선택) | [`celeb-03-01-influence.md`](celeb-03-01-influence.md) · [`celeb-03-02-spectrum.md`](celeb-03-02-spectrum.md) | 별도 요청 시 작성. 선택 기준은 active 요건을 따른다 |
| 생애 연표 | [`celeb-06-01-timeline.md`](celeb-06-01-timeline.md) · [`celeb-06-02-timeline-real-relay.md`](celeb-06-02-timeline-real-relay.md) | |
| 관계 | [`celeb-07-01-relations.md`](celeb-07-01-relations.md) | |
| 콘텐츠 조사 | [`celeb-02-01-content-research.md`](celeb-02-01-content-research.md) | 첫 행이 생기면 DB가 `full`로 자동 승격 |

## 6. 공개 전환

- 필수 데이터와 조사는 [`active 요건`](celeb-00-02-active-requirements.md), 상태 변경·노출·현재 DB 제약은 [`인물 공개 상태`](celeb-00-05-publication.md)를 따른다.
- 세력 진열은 3단계의 `is_featured`·`hidden`으로 인물 공개와 별도로 판단한다.
