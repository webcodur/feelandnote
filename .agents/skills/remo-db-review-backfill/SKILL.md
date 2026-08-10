---
name: remo-db-review-backfill
description: Remotion 에피소드(ko.json/en.json)의 책별 감상경위를 DB(celeb_contents.review/review_en)에 반영한다. 기존 DB review를 base로 두고 Remotion이 더 풍부한 부분만 흡수한다. /remo-db-review-backfill <인물명|slug> 으로 실행.
---

# 감상경위 백필 (Remotion → DB)

Remotion 영상 제작 과정에서 새로 다듬어진 일화·디테일을 DB review에 흡수한다.
**기존 DB review를 base로 존중하고, Remotion에만 있는 새 정보로 빈 곳을 채운다.** 통째 덮어쓰기 금지.

## 실행

```
/remo-db-review-backfill <인물명|slug>
```

예: `/remo-db-review-backfill 알렉산더 대왕`, `/remo-db-review-backfill alexander-the-great`

## 필수 사전 읽기

실행 전 Read tool로 아래를 읽는다:
- `AGENTS.md`
- `docs/project/celeb/celeb-content-audit.md` — `celeb_contents`/`content_locales` 스키마·규칙
- `docs/project/celeb/celeb-2-content-collector.md` §body 작성 가이드라인 — **첫 문장·출처·인물명·인용 말투 룰. 백필도 100% 준수**

## 파일 위치

```
sw/remotion/public/episodes/{done|live|todo}/<slug>/ko.json
sw/remotion/public/episodes/{done|live|todo}/<slug>/en.json
```

탐색 순서: **done → live → todo**. `pre-todo/`는 검수 전 flat 구조이므로 **제외**.
첫 번째 발견된 디렉토리의 ko.json/en.json을 사용한다.

## 핵심 원칙: 존중 + 보강

- **기존 DB review가 base**다. 사료 인용·1차 출처·고증 디테일은 그대로 보존한다.
- Remotion `contextMain`/`quotePairs[].after`/`quotePairs[].quote`에 있고 **기존 DB에 없는 일화**만 식별하여 흡수한다.
- 기존 DB가 이미 충실하면 가이드 룰 위반(첫 문장 등)만 손보고 본문은 그대로 둔다.
- Remotion 본문이 압도적으로 풍부한 책(기존 DB가 단문)만 사실상 새 작성에 가까워진다.

## 소스 필드 (Remotion → DB review)

각 `books[i]`에서 흡수 후보로 본다:

| Remotion 필드 | 처리 |
|---|---|
| `contextMain` | 기존 DB에 없는 일화·디테일만 추출하여 흡수 |
| `quotePairs[].after` | 동일 |
| `quotePairs[].quote` | 기존 DB에 같은 인용이 없으면 본문 안 인용구로 흡수 (화자·맥락 한 문장 도입 후 큰따옴표) |
| `quotePairs[].quoteSource` | 인용 도입 문장에 흡수 ("플루타르코스가 전하는 바로는…") |
| `source` | 본문 안 자연스러운 거명. 별도 라벨 금지 |
| `summary` | 사용 안 함 (책 요약은 review 대상이 아니다) |
| `title`, `creator`, `thumbnail_url`, `stats`, `images`, `imagePrompts` | 사용 안 함 |

ko.json → `review`, en.json → `review_en`.

## 문체·룰

`celeb-2-content-collector.md` §body 작성 가이드라인을 **100% 준수**한다.

1. 나레이터체 "~합니다", "~입니다" → **서술체 "~다", "~이다"**로 변환
2. **첫 문장 = 셀럽 풀네임 + "은/는"으로 시작**. 기존 DB가 룰 위반이면 이번 작업에서 손본다
   - ❌ "기원전 335년, 알렉산더는…" → ⭕ "알렉산더는 기원전 335년…"
3. **출처는 본문에 자연스럽게 거명**. `출처: …`/`Source: …` 별도 라벨 금지 (ko·en 동일)
4. **quotePairs[].quote는 본문 안 인용구**. 인용 직전에 화자·맥락을 한 문장으로 풀어준 뒤 큰따옴표
5. **인물명 표기는 Remotion 표기 우선**. 영상에서 굳힌 표기를 DB에 이양 (예: "알렉산드로스" → "알렉산더")
6. 한국어 자연어순 유지 (도치 금지)
7. 연결어 반복 금지
8. 영상 연출용 감정 호소·수사 과잉은 덜어낸다. **단어 삭제가 아닌 재작문**으로 다듬는다
9. "~것이다" 남발 금지 (한 본문 1회 이내)
10. 길이 제한 없음. **기존 DB의 정보량을 절대 줄이지 않는다.** Remotion에서 흡수한 만큼 늘어나는 게 정상
11. en.json 본문 흡수 시에도 출처 본문 통합 원칙 동일 (`Source: …` 라벨 금지)

## 책 매칭 — 키: 제목 + 저자

### 셀럽 ID 조회

```sql
SELECT id, nickname, nickname_en
FROM celebs
WHERE nickname ILIKE '%<입력>%' OR nickname_en ILIKE '%<입력>%';
```

복수 건이면 객관식으로 되묻는다 (임의 선택 금지).

교차 검증: ko.json의 `host.avatar_url`에서 `celebs/<uuid>/avatar.webp` 패턴으로 uuid를 추출해 `celebs.id`와 일치하는지 확인한다. 불일치면 중단.

### DB 책 + 본문 전체 조회 (LEFT 금지)

**중요**: `LEFT(review, N)` 으로 미리보기만 가져오면 백필 실패 시 복원 불가능하다. 반드시 본문 전체를 가져온다.

```sql
SELECT cc.content_id,
       cl_ko.title  AS title_ko, cl_ko.creator AS creator_ko,
       cl_en.title  AS title_en, cl_en.creator AS creator_en,
       cc.review     AS review_ko_full,
       cc.review_en  AS review_en_full
FROM celeb_contents cc
LEFT JOIN content_locales cl_ko ON cl_ko.content_id = cc.content_id AND cl_ko.locale = 'ko'
LEFT JOIN content_locales cl_en ON cl_en.content_id = cc.content_id AND cl_en.locale = 'en'
WHERE cc.celeb_id = '<celeb_id>'
ORDER BY cl_ko.title;
```

### 매칭 알고리즘

Remotion `books[i].title` + `books[i].creator` 를 DB 행과 매칭한다.

**정규화**:
- 공백·구두점·괄호·『』「」"" 제거
- 대소문자 무시
- 저자는 `,`·`/`·`·` 기준 분할 후 **첫 번째 저자**만 비교

**매칭 순서**:
1. `normalize(title) == normalize(title_ko)` AND `normalize(creator) == normalize(creator_ko)` → 확정
2. 1 실패 시 `normalize(title) == normalize(title_ko)` 단독 → **중복 없을 때만** 확정
3. 1·2 실패 시 en 쪽도 동일 절차로 보조 매칭
4. 여전히 매칭 실패 또는 1:N 중복 발견 시 → **즉시 중단**. 폴백 금지.

매칭 실패 시 객관식 질문으로 사용자에게 수동 매핑을 요청한다.
DB에는 있으나 Remotion에 없는 책은 건드리지 않는다 (보고만 한다).
Remotion에는 있으나 DB에 없는 책은 중단 후 보고 (`celeb_contents` 등록은 이 스킬 범위 밖).

## 워크플로우

### Phase 1 — 로드

1. 인물명 → `celebs.id` 조회
2. done/live/todo 순서로 에피소드 디렉토리 탐색
3. ko.json 로드, en.json이 있으면 함께 로드
4. host.avatar_url의 uuid와 `celebs.id` 교차 검증
5. **`celeb_contents` + `content_locales`(ko/en) + review/review_en 본문 전체 조회** (LEFT 금지, 복원용 백업 겸함)

### Phase 2 — 매칭

1. 정규화 후 매칭 테이블 작성
2. 매칭 실패/중복 → 중단 + 객관식 질문
3. 매칭 확정 후 진행

### Phase 3 — 흡수 (Dry-run)

각 매칭 건에 대해:
1. **기존 DB review를 base로 둔다.** 사료 인용·1차 출처·고증 디테일은 그대로 보존
2. Remotion `contextMain`/`quotePairs[].after`/`quotePairs[].quote`에 있고 **기존 DB에 없는** 일화·디테일·인용을 식별
3. 식별된 새 정보를 base에 자연스럽게 흡수 (시간 순서·주제 결합)
4. 가이드 룰 위반(첫 문장·출처 라벨·인물명 등)이 있으면 그것만 손본다
5. 결과: **기존 길이 ≤ 신규 길이**. 줄어들면 안 된다 (사료 손실 신호)
6. en도 동일 절차

### Phase 4 — 보고 + 승인 대기

```
=== 매칭 ===
| # | Remotion 책 | DB 책 | 상태 |

=== 신규 review 초안 ===
[1] 일리아스
  기존: N자 → 신규: M자  (M ≥ N)
  흡수한 새 정보: (Remotion에서 가져와 추가한 일화·디테일 목록)
  ---
  (신규 ko 본문 전문)
  ---
  (신규 en 본문 전문)

[2] ...

=== 제외 ===
- DB에만 있음: 건드리지 않음
- Remotion에만 있음: 등록 필요 → 보고
```

**사용자 승인 없이 UPDATE 실행 금지.**

### Phase 5 — 적용

승인 후 일괄 UPDATE:

```sql
UPDATE celeb_contents
SET review = $1, review_en = $2, updated_at = NOW()
WHERE celeb_id = $celeb_id AND content_id = $content_id;
```

en.json이 없으면 `review_en`은 건드리지 않는다 (기존 값 유지).

### Phase 6 — 최종 보고

```
=== 적용 결과 ===
| # | 책 | review (기존→신규) | review_en (기존→신규) | 상태 |
```

## 안전장치 (필수)

- **존중 우선**: 기존 DB review를 base로 두고 흡수한다. 통째 덮어쓰기 금지
- **길이 단조 증가**: 신규 길이가 기존보다 줄어들면 사료 손실 신호. 즉시 중단하고 원인 점검
- **본문 전체 백업**: Phase 1에서 `LEFT(review, N)` 미리보기 금지. 본문 전체를 SELECT하여 컨텍스트에 보존 (UPDATE 실패·롤백 대비)
- **사전 승인 필수**: 매칭 결과 + 초안 전체 + 흡수한 새 정보 목록을 보고한 뒤 명시적 승인을 받은 뒤에만 UPDATE
- **폴백 금지**: 매칭 실패·중복·교차 검증 실패 시 즉시 에러로 중단. 조용한 스킵·추정 금지
- **의도 모호 시 객관식 질문**
- **pre-todo 디렉토리는 제외** (검수 전 초안)
- **DB에 있고 Remotion에 없는 책은 건드리지 않는다**
- **Remotion에 있고 DB에 없는 책은 중단 후 보고** (신규 등록은 범위 밖)
- **`celebs.cultural_journey`는 건드리지 않는다** (generated column, 이 스킬 대상 아님)
