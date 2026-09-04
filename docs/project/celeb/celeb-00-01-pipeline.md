# 셀럽 데이터 파이프라인

이 문서는 인물을 두 축으로 나누고 각 데이터 문서로 연결하는 오케스트레이터다. 필드와 테이블 구조는 [`../data/03-celeb.md`](../data/03-celeb.md), 공개 상태는 [`celeb-00-02-publication.md`](celeb-00-02-publication.md)가 쥔다.

## 먼저 두 축을 가른다

인물은 독립된 두 축을 가진다. 허용값과 목록·검색·색인 노출 SSoT는 둘 다 `packages/shared/src/constants/celeb-tiers.ts`다.

`celebs.celeb_tier`는 감상 콘텐츠 파이프라인의 진행 단계다.

| 티어 | 뜻 | 일반 감상 콘텐츠 |
|---|---|---|
| `light` | 콘텐츠가 아직 없거나 네 유형 조사 뒤 0건으로 확정됨 | 조사 대상 또는 0건 확정 |
| `full` | `celeb_contents`가 한 건 이상 있음 | 한 건 이상 |

`celebs.celeb_reality`는 세상이 그 인물의 실존을 어떻게 다루는가다.

| 실존 축 | 뜻 | 기본 목록 노출 |
|---|---|---|
| `REAL` | 실존 인물 | 노출 |
| `BOTH` | 실존과 전승이 함께 다뤄지는 인물 | 노출 |
| `FICTION` | 신화·전설·허구 속 존재 | 제외 |

신규 인물은 실존 축과 무관하게 항상 `light`로 시작한다. 첫 `celeb_contents` 행이 생기면 DB가 `full`로 자동 승격한다. 따라서 full과 light는 별도 생성 파이프라인이 아니며, 프로필·영향력·스펙트럼·Speech 등 같은 트랙을 탄다. 차이는 감상 콘텐츠의 조사 결과뿐이다.

두 축은 서로를 결정하지 않는다. `REAL`·`BOTH`는 실존 인물 트랙을 그대로 탄다. `FICTION`은 `celeb_contents`를 쓰지 않고 원전·등장 작품 관계를 쓰며 영향력·스펙트럼을 만들지 않으므로 사실상 `light`에 머문다.

기본 목록·탐색·게임 노출은 `LISTING_DEFAULT_REALITIES`(`REAL`·`BOTH`)가 가른다. 인물 검색은 실존 축을 거르지 않으므로 `FICTION`도 검색된다.

`publication_status`는 두 축과 별개인 공개 여부다. 데이터 조사 상태나 완성도를 공개 상태로 대신 표현하지 않는다.

## 신규 인물 선정과 등록

신규 실존 인물은 단순 인지도보다 그 사람을 독립적으로 설명할 사료와 서술이 충분한지 본다. 정식 단독 전기 한 권으로 좁히지는 않는다. 분야사·산업사·기관 기록·인터뷰 등으로 다른 인물과 같은 깊이의 프로필을 만들 수 있으면 채택할 수 있다. 반대로 화제성만 있고 독립 근거가 빈약한 후보는 신규 발주하지 않는다. 이 기준은 기존 인물을 소급 삭제하는 근거가 아니다.

- 실존 인물은 web-bo `/celebs/new`의 `createCeleb`로 등록한다. 이 경로는 UUID·slug·`celeb_metrics`를 만들고 `light`로 시작하며 공개 상태 기본값은 `inactive`, 실존 축 기본값은 `REAL`이다. 전승·허구 인물은 등록 화면에서 실존 축을 직접 고른다.
- 허구 인물 일괄 등록은 이름·영문명·식별 가능한 bio를 준비한 뒤 `pnpm --dir sw/web-bo faction:seed:inactive --file <명세.json>`을 사용한다. 이 경로는 `light` 티어에 `celeb_reality='FICTION'`으로 넣는다. 기본은 dry-run이며 사용자가 DB 반영을 지시했을 때만 `--apply`한다.
- 공통 결과 계약은 [`celeb-01-00-profile.md`](celeb-01-00-profile.md), 사실 판정은 [`celeb-01-01-profile-facts.md`](celeb-01-01-profile-facts.md), 소개 문구는 [`celeb-01-02-profile-intro.md`](celeb-01-02-profile-intro.md)를 따른다.
- 모든 신규 인물은 공개 전에 [`celeb-08-01-avatar.md`](celeb-08-01-avatar.md)에 맞는 아바타를 등록한다.

### 존재와 속성을 구분한다

`celeb_tier`(감상 콘텐츠 파이프라인 단계)와 `celeb_reality`(세상이 이 인물을 실존·전승·양쪽 다로
다루는가)는 독립된 축이다. 실존 논란은 전부 실존 축이 담으며 티어는 그것으로 바뀌지 않는다.
실존 축이 어느 값이든 등록은 `light`에서 시작한다.

- 동시대 기록·고고학·학계 정설로 실존 코어가 확인되고 그 인물을 둘러싼 전승층이 따로 다뤄지지 않으면 `REAL`이다.
- 예수는 세례와 처형의 역사적 코어를 가지지만 동정녀 탄생·기적·부활 같은 전승층이 함께 다뤄지므로 `BOTH`다. 실존 코어가 있다고 해서 `REAL`로 밀지 않는다. 직군은 종교 지도자이므로 `leader`다.
- 건국신화 등 전승 자체가 본체이고 독립된 실존 코어가 없으면 `FICTION`이다. 건국 기록(영웅전·삼국사기·삼국유사)은 원전·등장 작품 관계로 연결한다.
- `BOTH`는 실존과 전승이 함께 다뤄지는 인물이다. 세 유형이 섞인다 — 실존 코어에 신화층이 덧붙은 경우(예수·무함마드·석가모니·아시시의 프란치스코), 동시대 기록으로 실존이 확인되는 건국·창건자에 후대 전승이 얹힌 경우(주몽·소서노·진무·길가메시), 학계 정설이 갈려 실존·전승 어느 쪽도 단정 못하는 경우(단군왕검·테세우스). 유형에 따라 근거가 다르므로 개별 판단한다.
- 건국영웅형의 공통 대우는 표시층에서 한다. 타이틀에 시조·건국 표기를 넣는다(고구려 시조·아테네를 세운 왕). 건국자용 축을 따로 만들지 않는다.
- 실존·전승 특성은 화면에서 `celeb_reality` 기준의 칩(`CelebTierBadge`, REAL은 무표시, FICTION은 [가상] 칩만, BOTH는 [사실][가상] 칩 둘 다)으로 안내한다. 아직 서비스에 없는 BOTH 후보를 발견하면 `docs/todo/celeb/README.md`에 항목을 만들어 등록되면 반영한다.

## 실존 인물 흐름

`REAL`과 `BOTH`가 이 흐름을 탄다.

```text
인물 등록(light)
  ├─ 기본 프로필·아바타
  ├─ 영향력·스펙트럼·Speech·읽어보기·연표·관계
  ├─ 콘텐츠 조사
  │    ├─ 한 건 이상 연결 → DB가 full로 자동 승격
  │    ├─ 네 유형 조사 후 0건 → 확정 시각 기록, light 유지
  │    └─ 조사 미완료 → 확정 시각 없이 light 유지
  └─ 각 도메인 완료 뒤 영문 누락 보완
```

기본 프로필 뒤의 독립 트랙은 병렬로 진행할 수 있다.

| 데이터 | 문서 |
|---|---|
| 콘텐츠 근거 조사 | [`celeb-02-01-content-research.md`](celeb-02-01-content-research.md) |
| 작품·판본·locale 등록 | [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md) |
| 인물별 감상경위 | [`celeb-02-03-content-review.md`](celeb-02-03-content-review.md) |
| 콘텐츠 품질 감사 | [`celeb-02-04-content-audit.md`](celeb-02-04-content-audit.md) |
| 영향력 | [`celeb-03-01-influence.md`](celeb-03-01-influence.md) |
| 스펙트럼 | [`celeb-03-02-spectrum.md`](celeb-03-02-spectrum.md) |
| 말투·한마디·상황 대사 | [`celeb-04-01-speech.md`](celeb-04-01-speech.md), [`celeb-04-02-speech-pipeline.md`](celeb-04-02-speech-pipeline.md) |
| 인물 안내 | [`celeb-05-01-reading.md`](celeb-05-01-reading.md) |
| 생애 연표 | [`celeb-06-01-timeline.md`](celeb-06-01-timeline.md), [`celeb-06-02-timeline-real-relay.md`](celeb-06-02-timeline-real-relay.md) |
| 관계 | [`celeb-07-01-relations.md`](celeb-07-01-relations.md) |
| 영문 누락 보완 | [`celeb-09-01-i18n.md`](celeb-09-01-i18n.md) |

### 콘텐츠 수 표시

콘텐츠 조사 표시값과 모집단은 `packages/shared/src/constants/celeb-content-research.ts`가 쥔다. `0`은 미조사, `-1`은 네 유형을 모두 조사한 0건 확정이다. `open`·`researching` 같은 진행 상태는 DB에 만들지 않는다.

## 허구 인물 흐름

`FICTION`이 이 흐름을 탄다.

```text
허구 인물 등록(light, inactive)
  → 프로필 사실·소개 한영
  → 원전·등장 작품 등록 및 관계 연결
  ├─ 아바타
  ├─ 인물 안내 한영
  ├─ 원전 기반 서사 연표 한영
  ├─ speech_tone·한마디·한국어 상황 대사
  └─ 확인된 인물 관계·세력 소속
  → 공개 전환
```

`FICTION`은 다음 경계를 지킨다.

- `celeb_contents`에 작품을 넣지 않는다.
- `celeb_influence`와 `celeb_persona`를 만들지 않는다.
- 실존 인물용 일괄 i18n을 실행하지 않는다. 프로필·인물 안내·연표·작품 설명의 영어는 각 생성 단계에서 근거가 있을 때 함께 작성한다.
- Speech의 한국어 한마디와 상황 대사는 작성한다. 영어 상황 대사는 일괄 번역 필수 대상이 아니다.
- 팩션 소속은 해당 인물에게만 연결하며 `FICTION` 전체의 필수조건으로 일반화하지 않는다.

### 원전·등장 도서 연결

허구 인물 등록은 원전·등장 작품 관계까지 연결해야 끝난다. 인물은 작품에 연결하고, ISBN 판본은 작품 아래, 교체 가능한 판매 상품은 판본 아래 둔다. 작품 판정·판본 범위·관계 유형·설명·반영 명령은 [`celeb-02-05-figure-books.md`](celeb-02-05-figure-books.md)가 쥔다. 이 카탈로그는 실존 축과 무관하게 모든 인물을 연결할 수 있다.

서사 연표는 원전 연결 뒤 [`celeb-06-03-timeline-fiction-relay.md`](celeb-06-03-timeline-fiction-relay.md)를 실행한다. 관계와 세력 소속은 원전에서 확인되는 것만 등록한다.

## 공개 전환

공개 여부는 [`celeb-00-02-publication.md`](celeb-00-02-publication.md)를 따른다.

### 최소 필수 조건

DB가 `active` 전환에 직접 강제하는 인물 필드는 `avatar_url`이다. `full` 티어에는 별도로 `celeb_contents` 한 건 이상이 필요하다. 전체 데이터 완성도와 공개 전환의 DB 최소조건을 같은 것으로 다루지 않는다.

## 닫힌 데이터

- `cultural_journey(_en)`와 `virtual_monologue(_en)`는 기존 값을 보존하지만 현재 신규 기본 프로필 트랙에서 생성하지 않는다. 결손 감사의 필수값으로 되살리지 않는다.
- `celeb_explanations.interpretive_*`는 화면에서 닫힌 보존값이다. 읽어보기에는 `plain_text(_en)`만 게시한다.
- `celeb_task_queue`는 물리 테이블만 남은 과거 작업 큐다. 현재 파이프라인의 진행 상태나 새 작업 원장으로 사용하지 않는다.

## 업데이트 가드

- 한 작업은 자신이 맡은 도메인의 필드만 갱신한다. 전체 행을 다시 써서 다른 트랙 값을 덮지 않는다.
- UPDATE 전에 현재값과 대상 ID를 조회하고, 반영 뒤 같은 조건으로 재조회한다.
- 빈 문자열·`null`로 기존 유효값을 지우지 않는다. 삭제가 목적이면 대상과 복구 가능성을 먼저 확인한다.
- 한영 필드를 함께 만드는 도메인은 한쪽만 중간 상태로 남기지 않는다. 사용자가 언어 범위를 제한했으면 그 범위를 넘지 않는다.
- 타임라인·콘텐츠·관계처럼 자식 행을 갱신할 때는 인물 ID와 자식 ID 또는 콘텐츠 ID를 함께 고정한다.
- 배치 진행률과 회차 결과는 문서에 쌓지 않는다. 현행 데이터와 남은 작업은 DB·오케스트레이터에서 확인한다.
