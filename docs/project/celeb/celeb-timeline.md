# 인물 타임라인 (생애 연표 · 서사 연표 · 활동 반경)

인물 상세 04번 구획의 데이터와 화면 규격 SSoT다. 서비스에 표시하는 값은
`public.celeb_timeline_events`가 유일한 원천이며, 관리자는 web-bo에서 이 테이블의 기존 사건
필드만 추가·수정·삭제한다.

타임라인에는 조사 이력·작업 큐·클레임·리스·실패 상태·교정 계보를 영속하지 않는다. 별도 조사
테이블이나 조사 RPC 없이 최종 사건 데이터만 보존한다.

실존 인물은 달력 시점이 있는 「생애 연표」로, `fiction` 인물은 대표 원전 안의 순서를 따르는
「서사 연표」로 표시한다. 사건 가운데 검증된 좌표가 있는 행만 활동 반경 지구본에 오른다.
좌표가 없는 중요한 사건도 연표에는 그대로 남는다.

## 사건 데이터

### `public.celeb_timeline_events`

| 컬럼 | 의미 |
|---|---|
| `id` | 사건 UUID |
| `celeb_id` | 사건 소유 인물. `celebs.id` 참조 |
| `year`, `year_end` | `life` 사건의 시점. 기원전 연도는 음수 |
| `sequence_label`, `sequence_label_en` | `fiction` 사건의 원전 내 국·영문 단계 |
| `title`, `title_en` | 국·영문 제목 |
| `description`, `description_en` | 국·영문 서술 |
| `kind` | 사건 종류 |
| `place_name`, `place_name_en` | 국·영문 장소명 |
| `lat`, `lng` | 검증된 좌표. 선택 필드다 |
| `source` | 등록 경로. 관리자 손질본은 `manual` |
| `sort_order` | 화면에 표시할 순서 |
| `created_at`, `updated_at` | 생성·수정 시각 |

`kind`는 다음 값 가운데 하나다.

```text
birth, death, education, work, publish,
battle, travel, office, meeting, other
```

### 폐기한 필드 (2026-08-14)

`source_url`·`place_qid`·`month`·`day`를 제거했다. **사용자 화면과 관리 화면 어디에서도 읽지 않으면서
조사 비용만 발생시키던 값들이다.** 마이그레이션은
`sw/web/supabase/migrations/20260814030000_drop_unused_timeline_fields.sql`이다.

- **`source_url`** — 확인되지 않은 링크는 근거가 아니라 근거라는 주장이다. 아무도 열어보지 않는 값이
  붙어 있으면 「출처가 있으니 맞겠지」라는 잘못된 안심만 준다. 사실 확인은 본문 문장을 직접 검색해
  대조한다. **다시 넣자는 제안이 나오면 「누가 그 값을 읽는가」부터 답한다.**
- **`place_qid`** — 좌표를 따로 저장하므로 읽는 곳이 없었다.
- **`month`·`day`** — 연도까지는 쉽지만 그 아래로 내려가는 순간 조사비가 급등하는데 화면에 나오지 않는다.
  `day`는 조회조차 하지 않았다.

`kind`는 조사 비용이 사실상 없고 관리 화면이 쓰므로 유지한다.

> 판단 기준: **필드를 늘릴 때는 「어느 화면이 이 값을 그리는가」를 먼저 답한다.** 답이 없으면 넣지 않는다.
> 조사 대상 필드 하나는 인물당 십수 번, 전체로는 수천 번 반복되는 비용이다.


### 위치 값의 두 형식

한 사건은 인물 유형에 따라 다음 두 형식 중 정확히 하나를 사용한다.

| 인물 | 달력 필드 | 서사 단계 |
|---|---|---|
| 실존 인물 (`life`) | 확인된 시점이면 `year` 정수. 날짜 미상이면 `year`, `year_end` 모두 `null` | `sequence_label`, `sequence_label_en` 모두 `null` |
| 허구 인물 (`fiction`) | `year`, `year_end` 모두 `null` | 국·영문 `sequence_label`, `sequence_label_en` 모두 필수 |

`life`의 날짜 미상 사건에 임의 연도나 서사 라벨을 만들지 않는다. `fiction`에도 원전 속 사건을
실제 역사 연도로 환산해 넣지 않는다.

### 표시 순서

화면과 백오피스는 사건을 다음 순서로 읽는다.

1. `sort_order` 오름차순
2. 값이 같을 때 `id` 오름차순

연도는 정렬 기준이 아니다. 같은 해의 사건, 날짜 미상 사건, 원전 순서형 사건을 모두 명시한
배치대로 보여 주기 위해 `sort_order`가 우선한다.

## 조사 운영

신규 조사 실행 절차는 루트의 [`RESEARCH_RELAY_ALGORITHM.md`](../../../RESEARCH_RELAY_ALGORITHM.md)가
유일한 원본이다. 이 문서에는 조사 알고리즘을 중복해서 적지 않는다.

## 사용자 화면

### 연표 카드

- `life`에서 연도가 있으면 연도 또는 연도 범위를 표시한다. 기원전은 `BC`와 절댓값으로 쓴다.
- 날짜 미상 `life`는 왼쪽 위치칸을 비우고 `현재/전체` 자동 번호만 표시한다.
- `fiction`은 현재 locale의 서사 단계 라벨을 위치 표지로 쓴다.
- 제목·서술·장소는 영문 locale에서 영문 값이 있으면 영문을, 없으면 한국어 값을 사용한다.
- 카드는 `이전 열 | 본문 | 다음 열`의 3열이다. 두 이동 열은 카드의 전체 높이가 클릭 영역이며,
  본문 길이에 따라 프레임 높이가 바뀌지 않는다.
- 프레임 높이는 좁은 화면 360px, `md` 이상 396px이다. 연도와 현재 위치 아래의 제목·장소·서술은
  하나의 내부 세로 스크롤 영역으로 읽으며, 브라우저 스크롤 앵커링을 사용하지 않는다.
- 본문 위 세로 휠과 터치는 내부 내용을 우선 스크롤하고, 본문을 가로로 밀면 이전·다음 사건으로
  이동한다.
- 조회 실패를 빈 연표로 숨기지 않고 오류로 드러낸다.

### 활동 반경 지구본

- `lat`과 `lng`가 모두 있는 사건만 마커와 이동 경로에 포함한다.
- 연표 카드를 고르면 해당 마커로 이동하고, 마커를 고르면 같은 사건 카드로 이동한다.
- 좌표가 없는 사건의 장소명은 연표에 표시할 수 있지만 지도 조작 버튼은 비활성화한다.
- 전체화면 모달에서도 같은 사건 순서와 `현재/전체` 번호를 사용한다.
- 상세 페이지의 인라인 지구본은 휠과 세로 터치를 페이지 스크롤에 양보한다. 확대·축소는 화면 버튼을
  쓰고, 모든 방향 드래그와 휠 확대가 필요하면 전체화면 지구본을 연다.
- `/explore/timeline`의 국가별 연대기는 생몰년을 사용하는 별도 기능이다.

### 화면 코드

| 파일 | 역할 |
|---|---|
| `sw/web/src/actions/celebs/getCelebTimelineEvents.ts` | locale별 사건 조회와 `sort_order`, `id` 정렬 |
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/JourneySection.tsx` | 연표와 지구본의 선택 상태 연동 |
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/JourneyEventCarousel.tsx` | 3열 사건 이동과 가로 밀기 |
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/JourneyEventCard.tsx` | 고정 높이 사건 본문과 내부 스크롤 |
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/JourneyMapPanel.tsx` | 인라인·전체화면 활동 반경 구성 |
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/JourneyGlobeModal.tsx` | 전체화면 활동 반경과 사건 카드 |
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/celebSectionChapters.ts` | 인물 상세 구획 번호 04 |
| `sw/web/src/components/shared/WorldGlobe/WorldGlobe.tsx` | 공용 지구본 렌더링과 조작 |
| `sw/web/messages/{ko,en}/celeb.json` | 화면 문구 |
| `sw/web/scripts/check-celeb-timeline-scroll.mjs` | 고정 높이·전체 이동 열·내부 스크롤·인라인 지구본 회귀 검사 |

## 백오피스 수동 편집

관리 화면은 `/celebs/timeline/[slug]`다. 사건 목록은 `sort_order`, `id` 순으로 읽고, 저장된
사건을 한 건씩 추가·수정·삭제한다.

| 파일 | 역할 |
|---|---|
| `sw/web-bo/src/actions/admin/timeline.ts` | 조회·검증·추가·수정·삭제와 웹 캐시 갱신 |
| `sw/web-bo/src/app/(admin)/celebs/timeline/[slug]/page.tsx` | 인물과 사건을 불러오는 편집 페이지 |
| `sw/web-bo/src/app/(admin)/celebs/timeline/[slug]/TimelineEditor.tsx` | 날짜·서사 단계·본문·장소·순서 입력 UI |
| `sw/web-bo/src/constants/timeline.ts` | 허용 사건 종류와 한국어 라벨 |

### 추가·수정 규칙

- 제목은 필수다.
- `life`의 연도는 정수 또는 명시적인 `null`이다.
- `life`에서 「날짜 미상」을 선택하면 끝 연도와 두 서사 라벨을 모두 `null`로 저장한다.
- `fiction`은 달력 필드를 모두 비우고 국·영문 서사 단계를 모두 입력한다.
- 끝 연도는 시작 연도보다 앞설 수 없다.
- 위도와 경도는 둘 다 입력하거나 둘 다 비운다.
- 좌표를 입력했다면 장소명도 입력한다.
- 위도는 -90~90, 경도는 -180~180 범위다.
- `kind`는 이 문서의 허용 목록에 있는 값만 쓴다.
- 수정한 행은 `source='manual'`로 표시한다.
- 저장·삭제 뒤 web-bo 경로와 사용자 웹의 인물 캐시를 갱신한다.

### 장소와 사실 확인

장소 좌표는 이름만 보고 기억으로 입력하지 않는다. 백오피스의 Wikidata 후보에서 동일 지명과
설명을 대조한 뒤 선택하고, 현실 좌표가 확인되지 않은 가상 무대에는 좌표를 붙이지 않는다.
**좌표는 선택 필드다. 확인에 시간이 걸리면 장소명만 남기고 넘어간다** — 좌표 없는 사건도 연표에는
그대로 뜬다.

사건은 조사해서 확인한 사실만 적는다. 외부 자료의 문장을 그대로 복사하지 말고 사실관계를 확인한 뒤
국·영문 제목과 설명을 서비스 문장으로 쓴다. **근거 링크 필드는 폐기했으므로 URL을 모으는 데 시간을
쓰지 않는다.** 대신 본문에 적은 사실이 검색으로 재확인되는지를 조사 단계에서 직접 대조한다.

## 화면 구현 함정

### 좌표는 선택 필드다

좌표가 없는 사건을 누락으로 취급하지 않는다. 잘못된 좌표 한 건이 활동 경로 전체를 왜곡하므로,
확인되지 않으면 장소명만 남기는 편이 낫다.

### 연도와 서사 단계를 섞지 않는다

실존 인물의 날짜 미상 사건과 허구 인물의 서사 단계는 DB에서 모두 `year=null`일 수 있지만 의미가
다르다. `celebs.celeb_tier`와 두 `sequence_label`의 존재 여부를 함께 확인한다.

### 지구본을 보기 전환마다 다시 만들지 않는다

- 회전 지시는 한 번만 수행해 사용자가 돌린 각도를 보존한다.
- 드래그 감도는 구 반지름과 확대율에 맞춘다.
- 연표·지도 보기 전환에서는 같은 지구본 인스턴스를 유지하고 배치만 바꾼다.

## 연계

- 인물 DB 스키마: `docs/project/data/db-celeb.md`
- 사용자 대면 화면 지도: `docs/project/service/README.md`
- 한국어·영문 작성 규칙: `docs/project/production/writing-rules.md`
- 관리자 백오피스: `docs/project/apps/web-bo.md`
