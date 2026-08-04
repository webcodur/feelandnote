# 셀럽 상세 DB locale 대응

## 자동 검사 범위

`audit-celeb-data.mjs`는 다음 KO→EN 쌍을 읽기 전용으로 확인한다.

| 화면 영역 | 테이블·필드 |
|---|---|
| 프로필 | `profiles.nickname/bio/title/virtual_monologue/cultural_journey/consumption_philosophy`와 각 `_en` |
| 읽어보기 | `celeb_explanations.plain_text/interpretive_title/interpretive_text`와 각 `_en` |
| 정량 지표 | `celeb_influence.{axis}_exp/_en` |
| 인물 자질 | `celeb_persona.persona`의 `rationale_ko/en`, 각 `reason_ko/en` |
| 한마디·대사 | `celeb_dialogues.lines/lines_en`, key·값 shape |
| 타임라인 | `celeb_timeline_events.title/description/place_name`와 각 `_en` |
| 관계 | 내부·외부 관계의 `name_ko/en`, `note/note_en` |
| 세력도감 | `celeb_tag_assignments.short_desc/long_desc`와 각 `_en` |
| 기록물 감상 | `user_contents.review/review_en` |

전체 조회는 `profiles.id` 순서와 range pagination을 사용한다. 관련 테이블의 UUID는 100개씩 나눠 조회해 PostgREST 1,000행 절단과 긴 `.in()` URL을 피한다.

## 판정

- 한국어 값 자체가 없으면 번역 누락으로 세지 않는다.
- 한국어 값이 있고 영어 값이 없으면 warning이다.
- `nickname_en` 부재와 KO/EN JSON key·shape 불일치는 error다.
- 숫자, 날짜, URL, 좌표처럼 언어 중립인 필드는 대상이 아니다.
- 커버리지 100%는 존재 여부만 뜻한다. 번역의 의미·문체·사실성은 실화면에서 따로 읽어야 한다.

## 수정할 때

- 감사 스크립트에 쓰기 기능을 추가하지 않는다.
- 읽어보기 번역·조건부 반영은 `sw/web-bo/scripts/translate-celeb-readings.ts`를 따른다.
- 프로필 독백은 `sw/web-bo/scripts/translate-virtual-monologue.ts`를 따른다.
- 페르소나는 평면 컬럼이 아니라 `persona` JSONB가 원본이다.
- 한마디는 `set_celeb_quote` RPC만 사용한다. `lines` 전체를 덮지 않는다.
- 타임라인은 `docs/project/celeb-journey.md`를 따른다.
- 감상문은 DB↔Remotion SSoT와 팩트체크 원칙을 따른다.
- 인용·대사·사료는 번역 누락이라는 이유만으로 생성하거나 의역하지 않는다.

## 자동 검사 밖

- 외부 콘텐츠 제목·창작자·썸네일의 locale 적합성
- 번역된 고유명사의 표준 표기
- 문장 뜻, 시대 용어, 관계 방향의 사실성
- 데이터는 있으나 UI 분기 때문에 렌더되지 않는 경우
- 사용자 입력처럼 번역 대상이 아닌 콘텐츠

이 항목은 route 스크린샷, 실제 DOM, 관련 action의 locale 선택 로직을 함께 확인한다.
