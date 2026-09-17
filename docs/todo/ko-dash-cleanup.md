# 한국어 대시 정리

서비스 한국어 장문에 섞인 대시(`—`·`–`·`―`)를 직접 재작문으로 없앤다. 기계 치환 금지. 검출만 기계, 수정은 단락 단위로 한다.

## 범위

- 감상배경 `celeb_contents.review`, 작품소개 `content_locales.description`(ko), `celebs.bio`·`headline`·`title`·`virtual_monologue`·`portrait_caption`, 상황대사 `celeb_dialogues.lines`, 연표 `celeb_timeline_events.title`·`description`, 영향력 `celeb_influence.*_exp`, 스펙트럼 `celeb_persona.persona` 내 ko 근거, 관계 `celeb_relations.note`·`label_ko`, 원전인물 `figure_book_characters.description`, 배정 `faction_members.short_desc`·`long_desc`·`quote`.
- 인물 안내(`celeb_explanations`)는 제외. 다른 에이전트가 잡고 있다.
- `" - "`(하이픈 공백형)은 별도 분류 대상으로만 모으고 이번에 고치지 않는다.

## 절차와 게이트

1. 위치 검출(이쪽): 컬럼별 대시 포함 행과 앞뒤 문맥을 묶어 후보로 뽑는다.
2. 재작문(agy): 후보를 문맥째 받아 다시 쓴다. 결과물은 temp에만 쌓는다.
3. 검수(devin swe-2): 쌓인 결과물을 devin-cli로 swe-2에 넘겨 방식·품질을 묻는다.
4. 승인(사용자): devin 검수까지 붙여 전부 보고하고 승인받는다.
5. 반영: 승인된 것만 `현재값 일치 + 잠금 확인` 조건으로 쓴다.
6. temp 삭제.

## 원칙

- SSoT는 `ko-detranslate` 스킬 #8 (em dash 금지, 마침표·쉼표·괄호로 분해). 규칙 본문을 여기 복제하지 않는다.
- 영문 필드는 손대지 않는다 (`celeb-09-01-i18n.md` 경계).
- 직접 인용·검증된 실제 발화 내부는 보존한다. 출처 대조 없이 재번역하지 않는다.
- 반영은 `현재값 일치 + 잠금 확인` 조건으로만 한다 (`virtual_monologue_locked_at`, `human_reviewed`, `published_at` 보존).

## 실측 (26.09.16, 읽기 전용)

| 대상 | `—` | `–` | `―` | `" - "` |
|---|---|---|---|---|
| 작품소개 `content_locales.description` (ko) | 369 | 22 | 37 | 93 |
| 감상배경 `celeb_contents.review` | 178 | 6 | 6 | 15 |
| 인물 안내 `celeb_explanations.plain_text` | 0 | 0 | 0 | 3 |
| 가상독백 `celebs.virtual_monologue` | 0 | 0 | 1 | 0 |
| `celebs.bio` | 1 | 10 | 0 | 0 |

인물 안내는 사실상 깨끗하다. 본량은 작품소개·감상배경이다.

## 남은 일 (역할분담)

1. 위치 검출(이쪽): 컬럼별 대시 포함 행과 앞뒤 문맥을 묶어 후보로 뽑는다. 검출만 하고 문장은 고치지 않는다.
2. 재작문(agy): 후보의 앞뒤 문맥을 함께 보고 문장을 다시 쓴다. 한 문장만 주지 않는다.
3. 반영·검증: 확정된 문장만 `현재값 일치 + 잠금 확인` 조건으로 쓰고 재조회·실화면 확인한다.
4. 예방: 생성 프롬프트·기계 검사·web-bo 입력 검증에 대시 검사를 추가한다.
5. 부수 발견(별도 건): 담사동 감상배경의 `_…_` 밑줄 잔재, 헬렌 켈러 인용 내부 ` - `는 보류.

## 진행

- 시범 1차 (26.09.16): 감상배경 `—` 5건 후보 추출·agy 재작문 완료, DB 미반영.
- 게이츠 배치 (26.09.16): `—` 포함 20건 확인, 2건(개인사·내일의 식탁) agy 재작문 완료, DB 미반영.
- 전량 배치 (26.09.16 진행중): 감상배경 189·작품소개 425·소개 12·연표 277·영향력 23·스펙트럼 574·대사 7·관계 2·태그 46, 총 1555건 큐. 결과물은 temp에만 쌓는다. `figure_book_characters`는 대시 0건으로 제외.
