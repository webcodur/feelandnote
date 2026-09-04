# 인물 공개 상태

이 문서는 `celebs.publication_status`와 사용자 노출만 쥔다. 허용값·일반 관리 상태·신규 기본값은 [`packages/shared/src/constants/celeb-publication.ts`](../../../packages/shared/src/constants/celeb-publication.ts)가 SSoT다. 인물의 데이터 완성도와 `celeb_tier` 분기는 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md)를 따른다.

## 상태

| 값 | 의미 |
|---|---|
| `inactive` | DB에는 있으나 사용자에게 공개하지 않음 |
| `active` | 사용자 상세와 허용된 목록·검색·색인에 공개 |
| `suspended` | DB 제약에는 남아 있으나 셀럽의 일반 공개 흐름에서 사용하지 않는 비공개 상태 |
| `deleted` | 삭제 대신 숨겨 둔 소프트 삭제 상태 |

신규 인물의 기본값은 `inactive`다. 일반 운영은 `active`와 `inactive`만 오가며 `suspended`를 새 작업 상태로 사용하지 않는다. `publication_status`는 공개 여부만 나타내며 콘텐츠 조사 완료, 관계 존재, 팩션 배정, 영문 완성 여부를 대신하지 않는다.

## 티어별 노출

허용값과 목록·검색·색인 게이트는 `packages/shared/src/constants/celeb-tiers.ts`가 유일한 SSoT다. 기본 목록 노출은 `celeb_reality`가 가른다 — `REAL`·`BOTH`는 포함되고 `FICTION`은 빠진다. 인물 검색과 직접 상세 접근은 실존 축을 거르지 않으므로 `FICTION`도 닿는다. 노출 범위를 바꿀 때는 문서 표를 고치는 대신 그 코드 상수와 소비처를 함께 수정한다.

자료가 없는 선택 구획은 사용자 상세에서 숨긴다. 읽어보기·연표·서재 또는 원전·분석·관계·미디어가 없다는 사실 자체는 DB의 active 거부 조건이 아니다. 반쯤 만든 자식 행을 공개해 빈 상자를 남기는 것은 별도의 데이터 결함이다.

## DB 불변사항

- `trg_active_celeb_requires_avatar`: 신규 active 전환에는 비어 있지 않은 `avatar_url`이 필요하다.
- `trg_celeb_full_requires_content`: `full` 전환에는 `celeb_contents` 한 건 이상이 필요하다.
- `celeb_contents_promote_tier`: light 인물의 첫 콘텐츠 연결은 티어를 full로 자동 승격한다.

콘텐츠의 표지·ISBN·locale, 영향력·스펙트럼·Speech·인물 안내·연표·관계는 DB가 active 전환에 직접 강제하지 않는다. 각 도메인의 완성 기준은 해당 문서와 파이프라인이 쥔다.

## 공개 전환

개별 공개 상태는 web-bo 인물 관리 화면에서 바꾼다. 아바타 없는 active 전환은 화면과 DB가 모두 거부한다.

`pnpm --dir sw/web-bo celeb:audit:activation`은 기본적으로 읽기 전용이지만, 현재 구현은 프로필·콘텐츠 조사·영향력·스펙트럼·Speech·읽어보기·출처 응답까지 DB 최소조건보다 넓은 준비도를 계산한다. `--apply`는 그 넓은 기준을 통과한 inactive 행을 실제로 공개한다. 따라서 단순히 공개 상태만 바꾸려는 작업에서 이 명령을 쓰거나, 그 출력의 gap을 `publication_status`의 뜻으로 일반화하지 않는다.

공개 전환 전에 최소한 다음을 직접 확인한다.

- 인물 신원과 티어가 맞는가
- 기본 프로필의 이름·소개가 비어 있지 않은가
- 아바타가 해당 인물인가
- 현재 언어 화면에 반대 언어 문구나 빈 자식 행이 노출되지 않는가

이 확인은 DB 제약의 목록이 아니라 실제 공개 화면의 품질 검사다.
