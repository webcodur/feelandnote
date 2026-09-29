# 인물 안내

## 집필

인물 안내는 한 사람이 어떻게 생각하고 어떤 활동을 하려 했는지 알 수 있는 글이다.
한국인이 한국어로 쓴 글이어야 한다.

- 사전·족보·연표처럼 인적사항과 이력을 나열하지 않는다.
- 근거 없는 생각이나 동기를 지어내지 않는다.
- 번역투와 상투적인 미사여구를 쓰지 않는다.
- 글이 둘 이상의 흐름(예: 자리 잡기 → 전개·몰락)으로 나뉘면 빈 줄(`\n\n`)로 문단을 적당히 나눈다. 짧은 안내는 한 문단으로 둔다.

## DB 스키마

`celeb_explanations`에 인물당 한 행을 저장한다. 사용자 화면에서는 인물 상세의 ‘읽어보기’와 인물 모달에 표시한다.

| 필드 | 타입 | 용도 |
|---|---|---|
| `profile_id` | `uuid`, PK·FK | `celebs.id` 참조 |
| `plain_text` | `text`, 필수 | 한국어 안내 |
| `plain_text_en` | `text`, nullable | 영어 안내 |
| `published_at` | `timestamptz`, nullable | 게시 시각. 값이 있는 행을 공개 조회 |
| `interpretive_title`, `interpretive_text` | `text`, 필수 | 현재 비노출인 인물 탐구의 보존값 |
| `interpretive_title_en`, `interpretive_text_en` | `text`, nullable | 인물 탐구의 영어 보존값 |
| `created_at`, `updated_at` | `timestamptz`, 필수 | 생성·수정 시각. DB에서 관리 |

## 저장·검수·게시

1. 대상 인물과 기존 한영 안내, 게시 여부를 확인한다. 평소에는 누락된 안내를 채우고, 기존 글의 재검토·수정은 요청받은 대상을 처리한다.
2. 한국어와 같은 사실·의미를 담은 영어 안내를 함께 검수한다. 통과한 기존 글은 보존하고, 보완이 필요한 글을 고친다.
3. 한영 본문은 한 행 갱신으로 함께 저장한다. 배치에서 기존 행을 갱신할 때는 읽어 둔 `updated_at`과 대조해 동시 편집을 보호한다.
4. 기존 `interpretive_*`는 그대로 보존한다. 신규 행은 필수인 `interpretive_title`·`interpretive_text`에 `미작성`, 영어 두 필드에 `NULL`을 넣는다.
5. 게시 여부는 `published_at`으로 관리한다. 게시 요청을 받은 active 인물은 시각을 기록하고, 비공개는 `NULL`로 둔다. 본문 수정 시 기존 게시 여부를 보존한다. 인물이 비활성화되면 DB가 안내를 비공개로 전환하며, 재활성화 뒤에는 명시적으로 다시 게시한다.
6. 반영 뒤 DB를 재조회해 한영 본문·게시 여부와 보존값을 대조하고, 한국어·영어 화면을 확인한다. 신규 행이 반영 검증에 실패하면 해당 행의 게시 시각을 조건부로 `NULL`로 되돌린다.

DB 접속·운영은 [외부 서비스의 Oracle DB 운영](../platform/platform-05-external-services.md#oracle-db-운영)을 따른다.
배치 실행은 [celeb-reading 스킬](../../../.agents/skills/celeb-reading/SKILL.md)과
[`readings.ts`](../../../sw/web-bo/scripts/celeb/readings.ts)를 참조한다. `--stats`는 읽기 전용 현황 조회이며, 배치 게시는 `--publish`로 명시한다.
안내 음성 작업은 [읽어보기 음성](../../continuous/celeb-tts-reading.md)이 쥔다.
