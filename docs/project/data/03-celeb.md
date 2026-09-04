# 인물 DB

`celebs`와 인물 전용 자식 데이터의 물리 구조를 설명한다. full·light·fiction의 작업 흐름은 [`../celeb/celeb-00-01-pipeline.md`](../celeb/celeb-00-01-pipeline.md), 각 값의 조사·작성·검수는 [`../celeb/README.md`](../celeb/README.md)가 쥔다.

## 인물 원본

`celebs`는 Auth 계정과 독립된 인물 원본이다. 인물에게 로그인 계정이나 저장형 `profile_type`을 만들지 않는다.

| 필드 묶음 | 주요 필드 | 규칙 소유자 |
|---|---|---|
| 이름·분류·생몰 | `nickname(_en)`, `profession`, `gender`, `nationality`, `birth_date`, `death_date`, `wikidata_qid` | [`celeb-01-01-profile-facts.md`](../celeb/celeb-01-01-profile-facts.md) |
| 소개 | `title(_en)`, `headline(_en)`, `bio(_en)` | [`celeb-01-02-profile-intro.md`](../celeb/celeb-01-02-profile-intro.md) |
| 티어·공개 | `celeb_tier`, `publication_status`, `content_research_confirmed_empty_at` | [`celeb-00-01-pipeline.md`](../celeb/celeb-00-01-pipeline.md) · [`celeb-00-02-publication.md`](../celeb/celeb-00-02-publication.md) |
| 실존 표시 | `celeb_reality`(`REAL`·`BOTH`·`FICTION`, DB CHECK `celebs_celeb_reality_check`) — `celeb_tier`와 독립된 축. 파이프라인이 아니라 세상이 그 인물을 실존·가상 중 어느 쪽으로 보는지만 나타낸다 | [`celeb-00-01-pipeline.md`](../celeb/celeb-00-01-pipeline.md) |
| 이미지 | `avatar_url`, `portrait_url`, `portrait_caption(_en)`, `awakened_image_url` | [`celeb-08-00-image-map.md`](../celeb/celeb-08-00-image-map.md) |
| 발화·음성 | `speech_tone`, `has_voice`, `voice_id_ko`, `voice_id_en`, `voice_v`, `voice_speed` | [`celeb-04-01-speech.md`](../celeb/celeb-04-01-speech.md) · `celeb-dialogue-voice-publish` 스킬 |
| 보존값 | `cultural_journey(_en)`, `virtual_monologue(_en)`, `virtual_monologue_locked_at` | 신규 기본 트랙에서 만들지 않으며 기존값만 보존 |

`birth_date`와 `death_date`는 기원전 음수 표기와 연도만 있는 값을 담기 위해 `text`다. `slug`는 `nickname_en`과 선택적인 `slug_suffix`에서 계산되는 열이므로 직접 쓰지 않는다. 영문 이름을 바꾸면 공개 URL도 바뀐다.

### 허용값 SSoT

| 값 | SSoT |
|---|---|
| `celeb_tier`와 목록·검색·색인 게이트 | [`packages/shared/src/constants/celeb-tiers.ts`](../../../packages/shared/src/constants/celeb-tiers.ts). DB에는 tier CHECK가 없다 |
| `profession` 허용값 | [`packages/shared/src/constants/celeb-professions.ts`](../../../packages/shared/src/constants/celeb-professions.ts). DB CHECK는 같은 집합을 강제하는 사본이다 |
| 콘텐츠 조사 표시와 모집단 | [`packages/shared/src/constants/celeb-content-research.ts`](../../../packages/shared/src/constants/celeb-content-research.ts) |
| `publication_status` | [`packages/shared/src/constants/celeb-publication.ts`](../../../packages/shared/src/constants/celeb-publication.ts). DB CHECK는 같은 집합을 강제하는 사본이다 |
| `speech_tone` | [`packages/shared/src/constants/celeb-speech.ts`](../../../packages/shared/src/constants/celeb-speech.ts). DB CHECK는 같은 집합을 강제하는 사본이다 |

신규 인물은 `inactive`다. active 전환에는 아바타가 필요하고, full 전환에는 `celeb_contents`가 한 건 이상 필요하다. 첫 감상 관계는 light를 full로 자동 승격한다. 트리거 이름과 공개 작업은 [`../celeb/celeb-00-02-publication.md`](../celeb/celeb-00-02-publication.md)에서 관리한다.

## 인물별 1:1 데이터

| 저장소 | 물리 원본과 파생값 | 작성 규칙 |
|---|---|---|
| `celeb_metrics` | `celeb_id`가 PK. 팔로워·콘텐츠 개수 캐시 | 앱이 직접 증감하지 않음 |
| `celeb_influence` | 일곱 점수와 한영 설명은 평면 컬럼. `total_score`는 DB 트리거 계산 | [`celeb-03-01-influence.md`](../celeb/celeb-03-01-influence.md) |
| `celeb_persona` | `persona` JSONB가 스펙트럼 원본. 평면 16축은 조회용 파생 사본 | [`celeb-03-02-spectrum.md`](../celeb/celeb-03-02-spectrum.md) |
| `celeb_dialogues` | `celeb_id`가 PK. `lines`와 `lines_en` JSONB | [`celeb-04-01-speech.md`](../celeb/celeb-04-01-speech.md) |
| `celeb_explanations` | 역사적 이름인 `profile_id`가 `celebs.id`를 참조하는 PK | [`celeb-05-01-reading.md`](../celeb/celeb-05-01-reading.md) |

영향력 축·상한·랭크는 `packages/influence-constants/src/core.ts`, 스펙트럼 16축·범위·기준점은 [`packages/shared/src/constants/celeb-spectrum-scale.ts`](../../../packages/shared/src/constants/celeb-spectrum-scale.ts)가 각각 SSoT다. 사용자 웹의 `sw/web/src/lib/spectrum/constants.ts`는 화면 표시용 키·라벨 모음이며 채점 척도의 원천이 아니다.

`celeb_persona`를 갱신할 때는 `persona` JSONB를 쓴다. 평면 점수만 바꾸면 원본과 어긋난다. `celeb_dialogues.lines.quote`와 `lines_en.quote`가 한마디의 유일한 저장소이며, 갱신은 다른 대사 키를 보존하는 `set_celeb_quote` RPC를 사용한다.

`celeb_explanations.plain_text(_en)`가 현재 화면의 인물 안내다. `published_at`이 게시 여부를, `review_status`가 검수 상태를 나타낸다. `interpretive_*`는 화면에서 닫힌 보존값이다.

## 여러 행을 갖는 인물 데이터

| 저장소 | 관계 | 규칙 |
|---|---|---|
| `celeb_timeline_events` | 인물 1 → 사건 N | [`celeb-06-01-timeline.md`](../celeb/celeb-06-01-timeline.md) |
| `celeb_relations` | 등록 인물 ↔ 등록 인물 | [`celeb-07-01-relations.md`](../celeb/celeb-07-01-relations.md) |
| `celeb_relations_external` | 등록 인물 → 명단 밖 인물 | 같은 문서 |
| `celeb_guestbook_entries` | 인물 1 → 회원 작성 방명록 N | 서비스 프로필 문서 |
| `celeb_views_daily` | 인물·날짜별 조회 집계 | 서비스 탐색 문서 |

타임라인은 실존 인물의 연도 기반 사건과 fiction의 `sequence_label(_en)` 기반 서사 사건을 같은 테이블에 저장하되 DB CHECK로 두 방식을 구분한다. 위치 좌표는 `lat`·`lng`가 함께 있거나 함께 비어야 한다.

`celeb_relations`의 관계 방향과 중복 정규화는 [`packages/shared/src/constants/celeb-relations.ts`](../../../packages/shared/src/constants/celeb-relations.ts)가 SSoT다. `celeb_relations_external`은 상대의 `to_id` 대신 QID·이름·사진을 저장한다.

누적 조회수는 `celebs.view_count`, 기간별 순위는 `celeb_views_daily`에서 계산한다. 조회 증가와 최근 인기 조회는 공개 테이블 직접 쓰기 대신 전용 RPC를 사용한다.

## 다른 도메인에 속하는 연결

- `celeb_contents`와 `figure_book_*`: [`02-content.md`](02-content.md)
- `celeb_tags`·`celeb_tag_assignments`·`faction_people`·`faction_atlas_members`: [`../remotion/faction/README.md`](../remotion/faction/README.md)
- BookRecommend 영상 데이터: [`../remotion/book-recommend/README.md`](../remotion/book-recommend/README.md)
- 이미지 파일 규격과 fallback: [`../celeb/celeb-08-00-image-map.md`](../celeb/celeb-08-00-image-map.md)

`celeb_task_queue`는 물리적으로 남아 있는 이전 작업 큐다. 현재 파이프라인의 진행 상태나 트랙 완료 원장으로 사용하지 않는다.
