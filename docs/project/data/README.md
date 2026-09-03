# 데이터 문서

현재 DB를 작업할 때 먼저 알아야 할 물리 관계와 불변사항만 설명한다. 전체 컬럼 목록을 복제한 데이터 사전은 아니다.

스키마의 원천은 적용 순서대로 쌓인 [`sw/web/database/migrations/`](../../../sw/web/database/migrations/)다. [`sw/web/src/types/database.generated.ts`](../../../sw/web/src/types/database.generated.ts)는 애플리케이션이 소비하는 생성 타입 스냅샷이며, 마이그레이션보다 늦을 수 있다. 둘이 다르면 최신 마이그레이션과 실제 소비 코드를 확인하고 타입을 갱신한다. 티어·직군·점수처럼 코드가 판정하는 허용값은 각 도메인 문서가 가리키는 공용 상수를 SSoT로 삼는다.

파일명의 숫자는 실행 단계가 아니라 탐색기 정렬용 주소다.

| 문서 | 범위 |
|---|---|
| [`01-core.md`](01-core.md) | 로그인 회원, 팔로우·차단, 커뮤니티와 공통 시스템 |
| [`02-content.md`](02-content.md) | 작품, locale, 회원·인물 감상 관계와 fiction 원전 판본 |
| [`03-celeb.md`](03-celeb.md) | 인물 원본, 분석·대사·안내·연표·관계와 런타임 값 |

도메인 규칙과 작업 절차는 이 폴더에 복제하지 않는다. 인물 데이터의 작성·검수는 [`../celeb/README.md`](../celeb/README.md), 외부 메타 제공자는 [`../platform/external-services.md`](../platform/external-services.md), 화면 동작은 [`../service/README.md`](../service/README.md)가 각각 쥔다. 실측 건수와 마이그레이션 경위는 현행 문서에 쌓지 않는다.
