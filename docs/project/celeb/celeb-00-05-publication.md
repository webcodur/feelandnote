# 인물 공개 상태

이 문서는 `celebs.publication_status`와 사용자 노출만 쥔다. 허용값·일반 관리 상태·신규 기본값은 [`packages/shared/src/constants/celeb-publication.ts`](../../../packages/shared/src/constants/celeb-publication.ts)가 SSoT다. 공개 전환의 필수 데이터와 조사는 [`active 요건`](celeb-00-02-active-requirements.md), `celeb_tier` 분기는 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md)를 따른다.

## 상태

| 값 | 의미 |
|---|---|
| `inactive` | DB에는 있으나 사용자에게 공개하지 않음 |
| `active` | 사용자 상세와 허용된 목록·검색·색인에 공개 |

신규 인물의 기본값은 `inactive`다. 공개 상태는 `active`와 `inactive`만 사용한다. 인물을 삭제하면 프로필 행과 FK로 연결된 인물 전용 데이터를 영구 삭제하며 삭제 상태를 남기지 않는다. `publication_status`는 공개 여부만 나타내며 콘텐츠 조사 완료, 관계 존재, 팩션 배정, 영문 완성 여부를 대신하지 않는다.

인물 삭제는 영구 삭제가 기본이다. 소프트 삭제가 필요하다고 판단되면 그 이유를 설명하고 사용자의 명시적 승인을 받은 뒤에만 적용한다.

세력·신화 도감의 인물 노출에는 인물 자체의 `active`와 해당 배정의 `hidden=false`가 모두 필요하다. 팩션 배정은 비활성 인물의 공개를 대신하지 않는다. 관리자에게는 비공개 인물과 배정도 보이며, 인물 공개 상태가 바뀌면 DB가 도감 캐시를 함께 갱신한다.

## 티어별 노출

허용값과 목록·검색·색인 게이트는 `packages/shared/src/constants/celeb-tiers.ts`가 유일한 SSoT다. 기본 목록 노출은 `celeb_reality`가 가른다 — `REAL`·`BOTH`는 포함되고 `FICTION`은 빠진다. 인물 검색과 직접 상세 접근은 실존 축을 거르지 않으므로 `FICTION`도 닿는다. 노출 범위를 바꿀 때는 문서 표를 고치는 대신 그 코드 상수와 소비처를 함께 수정한다.

자료가 없는 선택 구획은 사용자 상세에서 숨긴다. 반쯤 만든 자식 행을 공개해 빈 상자를 남기는 것은 별도의 데이터 결함이다.

## DB 불변사항

- `trg_active_celeb_requires_avatar`: 신규 active 전환에는 비어 있지 않은 `avatar_url`이 필요하다.
- `trg_celeb_full_requires_content`: `full` 전환에는 `celeb_contents` 한 건 이상이 필요하다.
- `celeb_contents_promote_tier`: light 인물의 첫 콘텐츠 연결은 티어를 full로 자동 승격한다.

콘텐츠의 표지·ISBN·locale, 영향력·스펙트럼·Speech·인물 안내·연표·관계는 DB가 active 전환에 직접 강제하지 않는다. 이 DB 제약 목록과 운영상 [`active 요건`](celeb-00-02-active-requirements.md)은 구분한다.

## 공개 전환

`pnpm --dir sw/web-bo celeb:audit:inactive-required`는 현행 active 요건의 DB 필수값이 채워진 inactive 인물을 읽기 전용으로 조회한다. `--json`은 후보를 JSON으로, `--show-gaps`는 미비 항목도 함께 출력하며, `--slugs="a,b"`로 대상을 좁힐 수 있다. 선택 데이터는 완비 판정에 넣지 않는다. 조사 완료 여부와 문구의 진위·품질은 값의 존재로 확정하지 않으며 실제 공개 전환 전에 별도로 확인한다.

개별 공개 상태는 web-bo 인물 관리 화면에서 바꾼다. 아바타 없는 active 전환은 화면과 DB가 모두 거부한다.

`pnpm --dir sw/web-bo celeb:audit:activation`은 기본적으로 읽기 전용이지만, 현재 구현은 프로필·콘텐츠 조사·영향력·스펙트럼·Speech·읽어보기·출처 응답까지 DB 최소조건보다 넓은 준비도를 계산한다. `--apply`는 그 넓은 기준을 통과한 inactive 행을 실제로 공개한다. 따라서 단순히 공개 상태만 바꾸려는 작업에서 이 명령을 쓰거나, 그 출력의 gap을 `publication_status`의 뜻으로 일반화하지 않는다.

`scripts/celeb/activate.ts`도 별도의 기존 조건으로 판정한다. 두 스크립트의 판정은 현행 [`active 요건`](celeb-00-02-active-requirements.md)과 일치하지 않으므로, 통과·탈락 결과를 이 룰북의 충족 여부로 대신하지 않는다.

공개 전환은 [`active 요건`](celeb-00-02-active-requirements.md)의 필수 데이터와 조사를 확인한 뒤 진행한다. 실제 공개 화면에서는 인물 신원·티어와 현재 언어의 문구·빈 자식 행 노출을 검수한다.
