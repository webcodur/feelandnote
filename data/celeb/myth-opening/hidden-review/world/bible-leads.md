# 성서 신화 대표 인물

`myth-bible`의 대표 얼굴을 **아브라함 → 모세 → 마리아**로 저장했다. 2026-09-23 DB 재조회에서 `lead_person_ids`가 이 순서로 확인됐다. 팩션 `published=false`, 세 배정의 `hidden=true`, 인물 `inactive`는 그대로다. 갱신 전 행과 후보 상태는 [백업](bible-leads-before-20260923.json)에 보존했다.

대표 얼굴은 타이틀 아트 위에 별도로 서며, 화면은 세 자리를 사용한다([탐색 규칙](../../../../../docs/project/service/service-01-explore.md), `MythOverview.tsx`). 현재 성서 타이틀 아트는 노아와 올리브 잎을 문 비둘기의 장면이다. 세 얼굴에는 그 장면의 노아를 반복하는 대신 전승의 다른 두 구간을 열었다.

| 차례 | 인물 ID | 선택 근거 |
|---|---|---|
| 1 | 아브라함 `05340b60-dad1-487e-b705-f81833cd5679` | [창세기 12장](https://www.biblegateway.com/passage/?search=Genesis+12%3A1-3&version=NIV)의 땅·민족 언약. 등록된 성서 소개도 아브라함에서 족장 시대를 시작한다. |
| 2 | 모세 `afaaeba2-9731-47a4-a326-c5d9102f81c3` | [출애굽기 3장](https://www.biblegateway.com/passage/?search=Exodus+3%3A7-10&version=NIV)의 이집트 탈출 사명. 족장 계보 다음에 공동체의 출발을 대표한다. |
| 3 | 마리아 `c5eb467e-d3d9-4819-b714-f7384506a7ae` | [누가복음 1장](https://www.biblegateway.com/passage/?search=Luke+1%3A26-38&version=NIV)의 예수 탄생 예고. 구약 인물만 세우지 않고, 도감의 두 번째 그룹인 「예수 곁의 사람들」을 대표한다. |

다윗은 왕국 서사의 중심이지만 세 자리에 넣으면 구약 인물만 남는다. 노아는 타이틀 아트에서 이미 주요 장면을 맡는다. 실제 DB에서 세 후보 모두 해당 팩션에 배정됐고 한영 bio·읽어보기 초안·`appearance` 관계가 각각 1건 이상이다. 세 아바타 URL은 HTTP 200 `image/webp`로 응답했고 이미지도 직접 열어 확인했다. 작품 관계의 본문 진위와 읽어보기 게시 여부는 이 대표 선정의 검증 범위가 아니다.

갱신은 `lead_person_ids=[]`, `published=false`, 기존 `updated_at`인 원본 행에만 조건부로 적용했다. 변경된 열은 `lead_person_ids`와 `updated_at`뿐이다. 공개 플래그는 건드리지 않았다.
