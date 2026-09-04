# 영문 데이터

이 문서는 셀럽 데이터의 영문 필드를 어느 도메인이 작성하는지 정하고, 이미 공개된 인물의 영문 결손을 공용 백필로 보완하는 범위를 쥔다. 개별 필드의 분량·문체·DB 저장 규격은 해당 도메인 문서를 따른다.

## 적용 경계

- 한국어 데이터만 작성·교정하라는 요청에는 영문 열·영문 JSON·영문 locale을 함께 수정하지 않는다.
- full·light는 각 도메인 작업에서 필요한 영문을 함께 작성하고, 공개 뒤 발견된 결손만 공용 백필로 채운다.
- fiction은 프로필·인물 안내·연표·원전 설명처럼 공개에 필요한 영문을 각 생성 단계에서 함께 쓴다. 영향력·스펙트럼을 만들지 않으며 공용 번역 트랙을 정상 생성 경로로 삼지 않는다.
- 기존에 값이 있는 영문 필드는 별도 교정 요청 없이 덮어쓰지 않는다.

## 필드별 책임

| 영문 데이터 | 담당 문서 |
|---|---|
| `nickname_en` | [`celeb-01-01-profile-facts.md`](celeb-01-01-profile-facts.md) |
| `title_en`·`bio_en`·`headline_en` | [`celeb-01-02-profile-intro.md`](celeb-01-02-profile-intro.md) |
| 작품 locale과 인물별 `review_en` | [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md) · [`celeb-02-03-content-review.md`](celeb-02-03-content-review.md) |
| 영향력 설명 | [`celeb-03-01-influence.md`](celeb-03-01-influence.md) |
| 스펙트럼 근거 | [`celeb-03-02-spectrum.md`](celeb-03-02-spectrum.md) |
| 한마디와 상황 대사 | [`celeb-04-01-speech.md`](celeb-04-01-speech.md) · [`celeb-04-02-speech-pipeline.md`](celeb-04-02-speech-pipeline.md) |
| 인물 안내 | [`celeb-05-01-reading.md`](celeb-05-01-reading.md) |
| 생애·서사 연표 | [`celeb-06-01-timeline.md`](celeb-06-01-timeline.md) |
| 관계 설명과 외부 인물명 | [`celeb-07-01-relations.md`](celeb-07-01-relations.md) |
| fiction 원전별 인물 설명 | [`celeb-02-05-figure-books.md`](celeb-02-05-figure-books.md) |
| 대표 화보 캡션 | [`celeb-08-02-hero-photo.md`](celeb-08-02-hero-photo.md) |
| 세력도감 인물 텍스트 | [`../remotion/faction/README.md`](../remotion/faction/README.md) |

`celebs.quotes`와 `celebs.quotes_en` 컬럼은 없다. 한마디의 정본은 `celeb_dialogues.lines.quote`와 `lines_en.quote`이며 speech 문서가 책임진다.

## 공통 작성 원칙

- 인물명·기관명·작품명은 공식 영문명이나 널리 통용되는 표기를 우선한다. 공식 영문판이 없는 작품에 임의의 정식 제목을 만들지 않는다.
- 원래 외국어로 발화된 인용은 한국어를 다시 영어로 번역하지 말고 확인 가능한 원문이나 공인 번역을 복원한다.
- 한국어와 영어는 같은 사실 범위를 담되 각 언어에서 자연스럽게 쓴다. 한국어 어순과 생략을 그대로 옮기지 않는다.
- JSON·배열·오디오 태그가 있는 필드는 기존 키와 구조를 보존한다. 세부 구조는 해당 도메인 문서를 따른다.
- 빈 영문값을 채울 때도 한국어 원문에 없는 사실을 보태지 않는다.

## 공용 누락 백필

`celeb:i18n-backfill`은 slug가 있는 공개 인물을 조회해, 한국어 값은 있지만 영문값이 비어 있는 다음 항목만 찾는다.

| 대상 | 보완값 |
|---|---|
| `celebs` | `title_en`, `bio_en`, 기존 감상 여정 호환값의 영문 결손 |
| `celeb_persona.persona` | `rationale_en` |
| `celeb_tag_assignments` | `short_desc_en`, `long_desc_en` |
| `celeb_contents` | `review_en` |
| `celeb_relations` | `note_en` |
| `celeb_relations_external` | `name_en`; QID의 공식 영문 라벨을 우선 사용 |

기존 감상 여정 값은 호환을 위해 보존·보완할 뿐 새 프로필에서 생성하지 않는다. 이 백필은 영향력 설명, 대사, 인물 안내, 연표, fiction 원전 설명을 처리하지 않는다. 해당 값은 위 책임 문서의 작업으로 작성한다.

기본 실행은 DB를 바꾸지 않는 dry-run이다.

```bash
pnpm --dir sw/web-bo celeb:i18n-backfill
pnpm --dir sw/web-bo celeb:i18n-backfill -- --apply
```

중단된 적용을 이어갈 때는 `--resume`, 일부만 확인할 때는 `--limit <건수>`를 뒤에 붙인다. `--apply`는 사용자가 DB 반영을 명시한 경우에만 실행한다. 반영 뒤에는 대상별 결손 수와 비어 있지 않던 영문값이 보존됐는지 확인한다.

DB를 갱신할 때는 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md#업데이트-가드)의 업데이트 가드를 함께 따른다.
