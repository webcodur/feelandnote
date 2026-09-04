# 데이터 문서

현재 DB를 작업할 때 먼저 알아야 할 물리 관계와 불변사항만 설명한다. 전체 컬럼 목록을 복제한 데이터 사전은 아니다.

스키마의 원천은 적용 순서대로 쌓인 [`sw/web/database/migrations/`](../../../sw/web/database/migrations/)다. [`sw/web/src/types/database.generated.ts`](../../../sw/web/src/types/database.generated.ts)는 애플리케이션이 소비하는 생성 타입 스냅샷이며, 마이그레이션보다 늦을 수 있다. 둘이 다르면 최신 마이그레이션과 실제 소비 코드를 확인하고 타입을 갱신한다. 티어·직군·점수처럼 코드가 판정하는 허용값은 각 도메인 문서가 가리키는 공용 상수를 SSoT로 삼는다.

파일명의 숫자는 실행 단계가 아니라 탐색기 정렬용 주소다.

| 문서 | 범위 |
|---|---|
| [`01-core.md`](01-core.md) | 로그인 회원, 팔로우·차단, 커뮤니티와 공통 시스템 |
| [`02-content.md`](02-content.md) | 작품, locale, 회원·인물 감상 관계와 인물 등장·연관 도서 판본 |
| [`03-celeb.md`](03-celeb.md) | 인물 원본, 분석·대사·안내·연표·관계와 런타임 값 |

## 마이그레이션을 쓸 때 걸리는 것

실제로 운영 DB를 깨뜨렸거나 배포를 막았던 것들이다.

- **`CREATE OR REPLACE FUNCTION`은 인자 수가 다르면 교체가 아니라 오버로드를 만든다.** 호출부가 "is not unique"로 죽는다. 시그니처를 바꿀 때는 옛 시그니처를 정확히 적어 `DROP FUNCTION` 한 뒤 만든다.
- **`DROP`하고 다시 만들면 GRANT가 날아간다.** RPC라면 `anon`·`authenticated`·`service_role`에 EXECUTE를 다시 부여한다. 빠뜨리면 화면에서만 권한 오류로 드러난다.
- **트리거의 인자 문자열은 함수 본문 검색에 걸리지 않는다.** 이름을 바꾸면서 `pg_get_functiondef`만 훑으면 `tgargs`에 남은 옛 이름을 놓치고, 해당 테이블 쓰기가 전부 실패한다. `pg_trigger`를 따로 확인한다.
- **`NOT NULL` 컬럼을 기본값 없이 추가하면 그 테이블의 신규 등록이 전부 막힌다.** 화면·스크립트가 그 컬럼을 아직 안 넘기기 때문이다. 기본값을 함께 준다.
- **컬럼을 지우기 전에 트리거·가드 함수가 그 컬럼을 참조하는지 본다.** 없는 컬럼을 읽는 가드는 평소엔 조용하다가 해당 경로가 처음 실행될 때 항상 실패로 나타난다.

접속은 원격의 `supabase-db` 컨테이너다. 시스템 `postgres` 사용자가 없으므로 `docker exec -i supabase-db psql`로 들어간다. **PowerShell 파이프는 한글을 깨뜨리므로** SQL을 파일로 만들어 `scp`한 뒤 파일에서 읽힌다.

도메인 규칙과 작업 절차는 이 폴더에 복제하지 않는다. 인물 데이터의 작성·검수는 [`../celeb/README.md`](../celeb/README.md), 외부 메타 제공자는 [`../platform/external-services.md`](../platform/external-services.md), 화면 동작은 [`../service/README.md`](../service/README.md)가 각각 쥔다. 실측 건수와 마이그레이션 경위는 현행 문서에 쌓지 않는다.
