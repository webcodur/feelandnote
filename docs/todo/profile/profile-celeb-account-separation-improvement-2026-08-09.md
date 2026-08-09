# 셀럽·회원 물리 분리 개선안

> **최종 실측 체크: 26.08.10** — 운영 DB에 최종 도메인 테이블·런타임 계약·읽기 RPC·
> 쓰기 트리거를 적용하고 역할별 반증 시험과 어드바이저를 통과했다. 사용자 웹·백오피스·
> Remotion은 새 물리 도메인으로 전환해 빌드 또는 타입 검사를 통과했다.
>
> 상태: **새 구조 운영 적용·앱 전환 검증 완료 · 새 앱 배포와 레거시 제거만 배포 게이트로 대기**

## 26.08.10 실행 상태

### 운영 DB에 적용한 최종 전진 마이그레이션

다음 일곱 파일은 운영 DB에 순서대로 적용했다.

- `20260809173956_add_final_profile_domain_tables.sql`
- `20260809182248_complete_profile_domain_runtime_contract.sql`
- `20260809182612_complete_profile_domain_rpcs.sql`
- `20260809183609_complete_profile_domain_triggers.sql`
- `20260809184230_guard_first_review_legacy_sync.sql`
- `20260809184340_harden_legacy_compatibility_writes.sql`
- `20260809184420_fix_domain_identity_guard.sql`

첫 파일은 변경 포착을 백필보다 먼저 설치한 뒤 최종 도메인 테이블과 비노출 보관 테이블을
채운다. 두 번째 파일은 회원 최초 감상 점수를 DB에서 한 번만 부여하고 콘텐츠 추천 알림을
검증된 RPC 하나로 제한한다. 세 번째 파일은 현역 읽기 RPC 23개를 새 원천으로 교체한다.
네 번째 파일은 삭제·콘텐츠 조사·팩션·담화·fiction·알림 등 현역 쓰기 트리거와 함수를 새
도메인으로 옮긴다. 다섯 번째 파일은 최초 리뷰 이중 지급을 막기 위해 먼저 넣은 좁은 배포
가드다. 여섯 번째 파일이 구·신 앱 모두에서 DB 트리거만 점수·소셜 파생값을 쓰도록 권한을
회수하면서 이 임시 분기를 대체했다. 구버전 앱의 중복 파생값 쓰기는 거부되고 최초 리뷰
5점은 기원 테이블과 무관하게 DB가 정확히 한 번 부여한다. 추천 알림도 실제 추천 참여자와
상태가 일치하는 경우만 호환 입력을 허용한다. 일곱 번째 파일은 방명록·알림 공용 식별자
가드가 서로 다른 행 타입의 필드를 먼저 해석하던 결함을 테이블별 중첩 분기로 고쳤다.

26.08.10 적용 뒤 운영 스냅샷은 회원 17명, 셀럽 2,966명, 회원 감상 34건, 셀럽 감상
12,563건이다. 회원→회원 팔로우 2건, 회원→셀럽 팔로우 13건, 회원 방명록 1건도 전용
테이블로 보존됐다. `contents.member_count`·`celeb_count`·`record_count`의 음수와 전수 집계
불일치는 0건이다. 이 숫자는 규약이 아니라 적용 직후 스냅샷이다.

### 앱 전환과 검증

사용자 웹은 회원·셀럽 프로필, 감상, 팔로우, 방명록, 점수, 알림, 추천, 게시 작성자,
인물·게임·성향·SEO·사이트맵 조회를 전용 테이블로 옮겼다. 백오피스와 Remotion의 현역
런타임 및 운영 스크립트도 같은 구조를 사용한다. 구형 타임라인 DB 직행 도구는 은퇴했고
남은 적재기는 `celebs`를 조회한다. 통합 표시가 필요한
출력 DTO만 저장 열과 무관한 `subject_kind`를 사용한다.

- 사용자 웹: TypeScript 검사와 `pnpm build:web` 통과
- 백오피스: TypeScript 검사와 `pnpm build:bo` 통과
- Remotion: TypeScript 검사 통과
- 로컬 HTTP: `/ko`, 공개 셀럽 상세, 백오피스 로그인 200 응답. 연결 가능한 브라우저가 없어
  데스크톱·모바일 육안 검수는 배포 검증에 남김
- 운영 DB: 새 PostgREST 관계 조회, 회원 최초 감상 점수 1회성, 추천 알림 참여자·멱등성,
  익명 팩션 공개 인물 조회, RLS·함수 권한 반증 시험 통과. 정상 추천 알림 두 경로와 위조
  네 경로, 알림 읽음 동기화, 회원·셀럽 방명록 식별자 불변성도 트랜잭션 롤백으로 재검증
- Supabase DB 어드바이저 error 0건

### 남은 배포 게이트

`20260809184517_retire_legacy_profile_domain.sql`은 마지막 제거 전용 마이그레이션이다. 이
파일은 새 앱을 배포하고 구버전 인스턴스가 모두 종료된 뒤에만 적용한다. 현재 운영 DB에는
적용하지 않았다. 위 일곱 전진 마이그레이션이 적용된 운영 스키마에서 파일 전체를 실행하고
되돌린 최종 시험은 14.3초에 통과했으며, 롤백 뒤 옛 테이블·열과 신구 행 대조도 그대로였다.

공개·등급 필터 뒤 출생 사건 한 건을 DB에 바로 넣던
`sw/web-bo/scripts/auto-seed-birth.mjs`는 전원 모집단과 최소 품질 규칙을 모두 어겨 은퇴했다.
현재 생성 타입 `sw/web/src/types/supabase.ts`에 남은 레거시 선언은 운영 DB에 호환 테이블이
실제로 남아 있기 때문이며, 최종 DROP 뒤 재생성해 제거한다.

게이트를 통과할 때 다음 순서를 지킨다.

1. 사용자 웹·백오피스·관련 런타임을 현재 전환 코드로 배포한다.
2. 구버전 인스턴스가 더는 옛 테이블에 요청하지 않는지 확인한다.
3. 기존·신규 행과 파생 개수를 마지막으로 대조한다.
4. 은퇴한 `auto-seed-birth.mjs`를 호출하는 운영 자동화가 없는지 확인한다.
5. 제거 마이그레이션으로 호환 트리거·옛 FK·옛 혼합 테이블·`profiles_compat`·`profiles`를
   순서대로 제거한다.
6. PostgREST 캐시와 생성 타입을 갱신하고 역할별 실조회와 전체 빌드를 다시 확인한다.

그 전까지 옛 `profiles`·`user_contents`·`follows`·`guestbook_entries`·`user_social`·
`user_scores`·`score_logs`·`notifications`는 **새 앱의 원천이 아니라 구버전 배포를 위한
호환 구조**다. 이를 현재 스키마의 사용법으로 문서화하거나 새 코드에서 다시 참조하지 않는다.

현재 작업 트리에 구조 전환과 무관한 사용자 변경이 함께 있으므로, 그 변경까지 섞은 배포를
자동으로 실행하지 않는다. 안전한 배포 단위를 확정하기 전에는 마지막 DROP도 실행하지 않는다.
타임라인 본문 대량 생성은 별도 작업이지만, 구형 `profiles` 의존 진입점은 이번 구조 전환에서
은퇴하거나 `celebs` 조회로 교정했다.

### 완료 판정

이 TODO는 아직 완료가 아니다. 운영 DB에서 레거시 제거와 배포 후 검증까지 끝난 뒤에만
아카이브로 옮기고 `AGENTS.md` TODO 색인에서 뺀다.

## 최초 요구

셀럽과 일반 회원은 함께 조회하는 경우가 거의 없다. 생성·수정·공개·삭제·권한 규칙도
다르다. 일부 열의 모양이 같다는 이유로 한 `profiles` 테이블에 저장하면서 모든 조회가
`profile_type='CELEB'` 또는 `profile_type='USER'` 조건을 반복할 이유가 없다.

이번 작업은 계정 열만 옮기는 작업이 아니다. 다음 문제를 끝낸다.

1. 셀럽 조회가 회원 행을 훑지 않게 한다.
2. 회원 조회가 셀럽 행을 훑지 않게 한다.
3. DB 외래키가 잘못된 유형의 ID를 구조적으로 거부하게 한다.
4. 서로 다른 규칙을 조건문으로 공유하던 테이블을 도메인별로 나눈다.
5. 실행 코드와 현행 DB 객체에서 저장형 `profile_type` 의존을 제거한다.

## 결론

### 목표 구조

```text
auth.users
└─ user_accounts          로그인·이메일·권한·계정 상태
   └─ member_profiles     회원 공개 프로필

celebs                    셀럽 정보·공개 상태·조사·음성

member_contents           회원 감상 기록
celeb_contents            셀럽 감상경위

member_member_follows     회원이 회원을 팔로우
member_celeb_follows      회원이 셀럽을 팔로우
```

- `profiles`는 최종적으로 제거한다.
- `profile_type`을 다른 이름으로 바꾼 공용 유형 열도 만들지 않는다.
- 회원 목록은 `member_profiles`, 셀럽 목록은 `celebs`에서 시작한다.
- 회원과 셀럽이 함께 보이는 드문 화면은 쓰기 테이블이 아니라 읽기 전용 뷰나 서버 조합을
  사용한다.
- 회원과 셀럽은 서로 다른 UUID 행이다. 회원이 등록 인물을 관리하면 `celebs.claimed_by_member_id`
  같은 명시적 관계로 연결한다.
- PostgreSQL `INHERITS`는 PK·FK·UNIQUE 동작이 요구와 맞지 않아 사용하지 않는다.

`nickname`·`avatar_url`·`bio`처럼 이름이 같은 열은 두 테이블에 각각 둔다. 같은 자료형은
같은 생명주기를 뜻하지 않는다. 화면에서 같은 모양이 필요하면 공유 TypeScript 출력 타입이나
읽기 전용 뷰를 사용하고, 쓰기 원천을 다시 합치지 않는다.

회원 UUID와 셀럽 UUID의 전역 유일성은 스키마 계약으로 삼지 않는다. 통합 읽기에서 대상의
식별자는 `(subject_kind, id)` 쌍이다. ID 하나만 받아 회원·셀럽 양쪽에 쓰는 범용 저장
계약은 만들지 않는다. 교차 관계가 필요하면 `member_id`와 `celeb_id`처럼 양쪽 FK를 이름으로
드러낸 전용 관계 테이블을 만든다.

### 공용 식별자 테이블을 두지 않는 이유

실제 참조를 열 단위로 분류하면 26.08.09 운영 DB 기준 셀럽 전용 17개, 회원 전용 29개,
현재 잘못 섞인 관계 7개다. 양쪽이 같은 쓰기 규칙과 생명주기를 대칭적으로 공유하는
외래키는 찾지 못했다.

잘못 섞인 7개도 감상 기록·팔로우·방명록·소셜·점수처럼 이름만 같고 실제 동작은 다르다.
이를 분리하면 공용 부모가 필요하지 않다. 드문 통합 조회를 위해 모든 쓰기 관계를 공용
부모에 묶지 않는다.

### 검토안 비교

| 안 | 일상 조회 | 외래키 | 변경량 | 판정 |
|---|---|---|---:|---|
| 현재 `profiles` 유지 | 모든 조회에 유형 조건 | 기존 유지 | 작음 | 최초 요구를 해결하지 못함 |
| ID만 가진 공용 부모 + 두 하위 테이블 | 직접 조회 가능 | 공용 관계 유지 가능 | 큼 | 공용 쓰기 관계가 없어 불필요 |
| 회원·셀럽 독립 테이블 + 혼합 관계 분리 | 유형 조건 없음 | 도메인별 FK로 강제 | 가장 큼 | **선택** |

26.08.07 작업은 가짜 셀럽 로그인 계정과 계정 전용 열 혼입을 해결했다. 회원과 셀럽을
같은 테이블에서 매번 좁혀 읽는 최초 문제는 해결하지 않았다.

## 현재 실측

### 기본 분포

| 항목 | 26.08.09 값 |
|---|---:|
| `profiles` | 2,983 |
| CELEB | 2,966 |
| USER | 17 |
| `user_accounts` | 17 |
| 계정과 연결된 프로필 | USER 17, CELEB 0, 고아 0 |
| `profiles(id)` 유입 FK | 53 |

이 수치는 규약이 아니라 스냅샷이다. 실제 이행 대상은 각 단계 직전에 다시 센다.

### 구현 현황

#### 26.08.09 원본 분리

26.08.09에 다음 범위를 운영 DB에 적용했다.

- `delete_auth_user` 공개 권한 회수, 본인·관리자 삭제 창구 분리
- 익명 셀럽 대사·영향력·감상 관계 쓰기 제거
- 정지 계정의 Data API 요청 거부와 활성 관리자 판정 통일
- `user_accounts.id → auth.users.id ON DELETE RESTRICT` 검증
- `member_profiles` 17행, `celebs` 2,966행 생성과 UUID 보존 백필
- `profiles → member_profiles | celebs` 단방향 동기화 트리거 설치
- 셀럽에 Auth·`user_accounts`를 다시 만드는 옛 등록 방식 DB 차단
- 셀럽 전용·회원 전용 열에 새 부모 외래키 47개 추가·검증
- 회원 검색·본인 프로필과 관계 조인이 없는 셀럽 검색·명단·상세 조회 11곳 전환
- 회원가입과 현행 DB 쓰기 함수 10개를 `user_accounts`·`member_profiles`·`celebs` 원천으로 전환
- 회원 프로필과 백오피스 인물 관리의 실행 코드 쓰기를 전용 테이블로 전환
- 구버전과 신버전 요청이 함께 들어오는 배포 구간용 재귀 방지 동기화 설치
- API 역할의 `profiles` 변경 권한과 `user_accounts` 직접 삭제·초기화 권한 회수
- `user_accounts.id → profiles.id` 옛 FK 제거, Auth FK와 전용 회원 생명주기만 유지

적용한 전진 마이그레이션은 다음과 같다.

- `20260809044022_restrict_auth_user_deletion_privileges.sql`
- `20260809065153_harden_profile_domain_permissions.sql`
- `20260809083714_add_member_and_celeb_shadow_tables.sql`
- `20260809084629_enforce_member_account_domain.sql`
- `20260809085119_make_member_deletion_atomic.sql`
- `20260809090020_add_domain_parent_foreign_keys.sql`
- `20260809114834_cutover_profile_writes_to_domains.sql`
- `20260809140835_finalize_profile_domain_writes.sql`
- `20260809144310_fix_delete_auth_user_argument_ambiguity.sql`
- `20260809144537_remove_stale_member_deletion_relations.sql`
- `20260809144916_drop_user_accounts_profile_parent.sql`
- `20260809145217_make_profile_sync_nested_trigger_safe.sql`

이 단계에서 `member_profiles`·`celebs`가 프로필 쓰기 원천이 됐고, 배포 중 구버전 요청을
보존하기 위한 `profiles` 호환 동기화가 남았다. 회원·셀럽 양방향 수정과 신규 셀럽
생성·삭제를 운영 DB 트랜잭션에서 실행한 뒤 되돌리는 시험을 통과했다.

#### 26.08.10 관계·런타임 전환

26.08.10에는 다음 일곱 마이그레이션을 추가 적용했다.

- `20260809173956_add_final_profile_domain_tables.sql`
- `20260809182248_complete_profile_domain_runtime_contract.sql`
- `20260809182612_complete_profile_domain_rpcs.sql`
- `20260809183609_complete_profile_domain_triggers.sql`
- `20260809184230_guard_first_review_legacy_sync.sql`
- `20260809184340_harden_legacy_compatibility_writes.sql`
- `20260809184420_fix_domain_identity_guard.sql`

감상·팔로우·방명록·소셜·점수·알림을 물리 도메인으로 나누고, 읽기 RPC 23개와 현역 쓰기
함수·트리거를 새 원천으로 옮겼다. 앱 코드는 사용자 웹·백오피스·Remotion과 현역 운영
스크립트까지 전환했고 각 앱의 빌드 또는 타입 검사를 통과했다. 생성 타입도 운영 DB 기준으로
갱신했다. 배포 호환 구간에는 DB 트리거만 점수·소셜 파생값을 쓰고 구버전 앱의 중복 쓰기는
권한으로 거부한다. 따라서 구·신 앱 어느 쪽에서 리뷰가 들어와도 최초 감상 점수는 한 번만
지급된다. 추천 알림 호환 입력은 추천 참여자·상태로 제한했고 공용 관계 식별자 가드의 서로
다른 행 타입 접근 결함도 교정했다.

구버전 앱이 살아 있는 배포 구간을 위해 옛 혼합 테이블과 호환 변경 포착은 아직 운영 DB에
남아 있다. 새 앱을 배포하고 구버전 인스턴스 종료를 확인한 뒤
`20260809184517_retire_legacy_profile_domain.sql`을 적용해야 물리 제거가 끝난다. 따라서
현재 완료 판정은 「새 원천 적용과 코드 전환 완료, 레거시 제거 배포 게이트 대기」다.

운영 DB에서 회원 최초 감상 점수 1회성, 추천 알림 참여자·멱등성, 익명 팩션 공개 인물,
PostgREST 새 FK 조인, 역할별 RLS를 반증 시험했다. 최근 점수 불일치는 0건이고, 구버전·
신버전 양방향 DML 시험은 트랜잭션 롤백으로 통과했다. Supabase DB 어드바이저 error는 0건이다.
원격 전체 스키마의 빈 DB 기준선 정리는 별도 미완료다.

### 배포 후 관찰

26.08.09에 커밋 `cb9d5098`의 사용자 웹과 백오피스 Vercel 배포가 모두 성공했다.
공개 인물 목록·인물 상세와 백오피스 비로그인 접근 경계를 운영 주소에서 확인했다.

같은 날 10:13 UTC 운영 DB 대조 결과는 다음과 같다.

- Auth 17행, `user_accounts` 17행, `member_profiles` 17행
- 원본 CELEB 2,966행, `celebs` 2,966행
- 회원·셀럽 누락과 여분 행 0건
- 동기화 대상 필드 불일치 0건
- 셀럽 UUID와 회원 계정 UUID 충돌 0건

백오피스 인물 상세를 점검하던 중 추가형 FK 때문에 PostgREST 관계가 둘로 해석되는
`PGRST201`을 확인했다. `profiles.id`의 본인 계정 관계와 `profiles.claimed_by`의 인수자
계정 관계를 구분하지 않은 조회가 오류를 버리고 404를 반환했다. 기록·신고·활동 등 같은
방식의 조회도 실제 FK 제약명을 명시하도록 교정했다. 목시 말린스파이크 상세 조회와 두 앱의
타입 검사·프로덕션 빌드는 교정 후 통과했다.

### `profile_type` 확산 — 전환 전 기준선

아래 수치는 26.08.09 전환 전 작업본의 역사적 기준선이다. 당시 `profile_type`은 숨김
자동화 폴더를 제외하고 154개 파일에 362회
등장한다. 직접 DB 조건과 코드 분기는 다음과 같다.

| 형태 | 줄 |
|---|---:|
| Supabase `.eq(...profile_type...)` | 128 |
| REST 조건 | 6 |
| SQL 조건 | 49 |
| JS·TS 분기 | 44 |
| 스크립트 내부 SQL 문자열 | 1 |

대부분 인물 목록·검색·상세·게임·SEO·영상·운영 스크립트에서 “인물만 고르기” 위해 쓴다.
회원과 인물을 실제로 함께 보여주는 제품 화면은 콘텐츠 감상문, 팔로잉 목록, 일부 관리자
통합 화면 정도다.

### 혼합 테이블 분포 — 전환 전 기준선

| 옛 테이블 | 26.08.09 실측 | 전환 판정 |
|---|---|---|
| `user_contents` | 셀럽 12,562 · 회원 34 | 쓰기·필드·권한이 달라 분리 |
| `follows` | 회원→셀럽 13 · 회원→회원 2 | 관계 의미가 달라 분리 |
| `guestbook_entries` | 회원 대상 1 | 회원·셀럽 화면 규칙이 달라 분리 |
| `user_social` | 셀럽 2,741 · 회원 16 | 지표 의미가 달라 분리 |
| `user_scores` | 셀럽 2,741 · 회원 17 | 회원 보상 점수만 유지 |
| `score_logs` | 셀럽 13,063 · 회원 217 | 셀럽분은 전부 콘텐츠 추가 부산물 |
| `records` | 0 | 회원 전용으로 재정의 가능 |
| `notifications` | 셀럽 수신 3 · 회원 수신 7 | 로그인 불가 셀럽 알림은 잘못된 데이터 |
| `reports` | 0 | 회원 신고 축으로 좁힘 |
| `blocks` | 0 | 회원 차단 축으로 좁힘 |
| `content_recommendations` | 회원→회원 1 | 회원 전용 |

`user_contents.contributor_id`의 비어 있지 않은 2,045건은 모두 회원 ID다. 셀럽 콘텐츠를
관리자가 등록한 이력을 보존하므로 새 `celeb_contents.contributor_member_id`로 옮긴다.

## 최종 테이블 경계

### `user_accounts`

로그인과 계정 보안만 맡는다.

```text
id                    PK, FK → auth.users.id
email
role
account_status
suspended_at
suspended_reason
last_seen_at
created_at
updated_at
```

- `id`는 Auth UUID와 같다. FK는 `ON DELETE RESTRICT`로 두어 대시보드나 임의 API가 회원
  도메인 정리 없이 Auth 행부터 지우지 못하게 한다.
- 관리자 판정은 `is_admin()` 한 곳에서 `role`과 `account_status='active'`를 함께 읽는다.
- `anon`·일반 `authenticated` 역할에는 이메일·권한·정지 열 읽기 권한을 주지 않는다.
- RLS만으로 열을 숨길 수 없으므로 열 단위 `GRANT`도 함께 검토한다.

### `member_profiles`

회원 공개 프로필만 맡는다.

```text
id                    PK, FK → user_accounts.id
nickname
avatar_url
bio
birth_date
nationality
is_verified
selected_title
showcase_titles
created_at
updated_at
```

- 회원의 생년 입력 규칙과 셀럽의 고대·기원전 생몰년 규칙을 같은 열 제약으로 다루지 않는다.
- 회원 공개 화면과 회원 검색은 이 테이블에서 시작한다.
- 회원 상태는 두지 않는다. 계정 상태는 `user_accounts.account_status`가 맡는다.

### `celebs`

셀럽 데이터의 직접 원천이다.

```text
id                    UUID PK, Auth와 무관
nickname
nickname_en
slug
slug_suffix
avatar_url
bio
bio_en
is_verified
profession
title
title_en
nationality
gender
birth_date
death_date
celeb_tier
publication_status
portrait_url
감상 철학
콘텐츠 조사 상태
말투·음성
위키데이터·유튜브
가상 독백·잠금
view_count
claimed_by_member_id  FK → user_accounts.id, ON DELETE SET NULL
created_at
updated_at
```

- 기존 UUID와 slug 생성 규칙을 그대로 보존한다.
- 구조 이행과 동시에 공개 상태 값의 뜻을 바꾸지 않는다. 기존 값을 먼저 옮기고 상태 체계
  정리는 별도 작업으로 수행한다.
- 셀럽 등록은 Auth를 거치지 않고 한 DB 함수에서 직접 처리한다.
- 셀럽 목록·검색·상세·타임라인·게임·SEO·Remotion은 이 테이블에서 시작한다.

## 외래키 재분류

### 셀럽 전용

다음 관계는 `celebs(id)`를 직접 참조한다.

- `celeb_content_research_runs.celeb_id`
- `celeb_music_candidates.celeb_id`
- `celeb_dialogues.celeb_id`
- `celeb_influence.celeb_id`
- `celeb_persona.celeb_id`
- `celeb_relations.from_id`, `to_id`
- `celeb_relations_external.from_id`
- `celeb_tag_assignments.celeb_id`
- `celeb_task_queue.celeb_id`
- `celeb_timeline_events.celeb_id`
- `celeb_views_daily.celeb_id`
- `daily_figures.celeb_id`
- `discourse_speakers.celeb_id`
- `faction_people.celeb_id`
- `fiction_source_characters.celeb_id`
- `celeb_explanations.profile_id`

26.08.09 운영 DB에서 `celeb_music_candidates`는 216행·셀럽 77명을 참조한다. 이 FK를
빼면 마지막 `profiles` 제거가 실패한다.

팩션과 담화의 삭제 제한처럼 현재 제품 보호 목적이 있는 `ON DELETE` 규칙은 유지한다.
기존 유형 검사 트리거는 새 FK가 같은 일을 맡으면 제거한다.

### 회원 전용

로그인 주체가 수행하는 행위는 `user_accounts(id)`를 참조한다.

- 학당 진행·활동 로그·게임 점수
- 게시글·댓글·노트·플로우·티어 목록
- 알림 수신자·행위자
- 신고자·처리자·회원 신고 대상
- 추천 발신자·수신자
- 차단 주체·대상
- 기록 작성자·댓글·좋아요

공개 이름·사진이 필요하면 같은 ID의 `member_profiles`를 조인한다. 작성자 삭제 후 본문을
보존해야 하는 참조는 `ON DELETE SET NULL`, 소유자 삭제와 함께 의미가 사라지는 행은
`ON DELETE CASCADE`를 사용한다.

### Auth 직접 참조

`profiles` 유입 FK 53개와 별도로 Auth를 직접 가리키는 열도 이행한다.

- `celeb_content_research_runs.researcher_id`는 관리자 회원을 뜻하므로 `user_accounts(id)`로
  좁힌다.
- `saved_flows.user_id`는 회원 전용으로 `user_accounts(id)`를 참조하게 한다.
- 기존 `profiles.claimed_by`는 `celebs.claimed_by_member_id`로 옮긴다.

Auth UUID와 회원 UUID가 같더라도 FK 부모를 명시적으로 바꿔 회원 생명주기와 삭제 규칙을
한 곳에서 강제한다.

## 혼합 테이블 분리

### 감상 관계

```text
member_contents
- 기존 id 보존
- member_id FK → user_accounts
- content_id FK → contents
- 회원 상태·평점·감상문·공개범위·핀·추천·완료 정보
- contributor_member_id FK → user_accounts

celeb_contents
- 기존 id 보존
- celeb_id FK → celebs
- content_id FK → contents
- 평점·감상경위 국문/영문
- source_url
- contributor_member_id FK → user_accounts
```

- `user_contents.id`는 Remotion과 백오피스 자산 연결에 쓰이므로 절대 다시 발급하지 않는다.
- `content_recommendations.user_content_id`는 회원 추천 관계이므로
  `member_contents.id`를 참조하는 `member_content_id`로 바꾼다.
- 처음에는 기존 열을 손실 없이 복사하고, 실제로 한쪽에서 쓰지 않는 열 제거는 이행 완료 뒤
  별도 마이그레이션으로 한다.
- 셀럽 출처 강제, 첫 콘텐츠 등급 승격, 조사 상태 재개 트리거는 `celeb_contents` 전용으로
  옮긴다.
- 콘텐츠 상세의 통합 감상 목록은 두 테이블을 읽어 합친다.
- 운영 DB에서 `user_contents`를 읽는 함수 23개와 트리거 6개를 기준선에서 회수해 각각
  회원·셀럽 규칙으로 분류한다. 테이블 행만 옮기고 함수·트리거를 남기지 않는다.

현재 셀럽 관계에도 `WANT` 3건이 있으므로 `celeb_contents.status`를 이행 단계에서 보존한다.
값의 정당성은 구조 이행 뒤 별도로 판정한다.

### 파생 개수와 부수 효과

복제·백필 과정에서는 점수, 알림, 콘텐츠 수, 팔로워 수를 갱신하지 않는다.

- 새 그림자 테이블에는 이행 중 비즈니스 트리거를 설치하지 않는다.
- 기존 테이블만 기존 부수 효과를 한 번 실행한다.
- 최종 쓰기 중지 구간에서 기존 부수 효과를 끄고 새 트리거를 설치한다.
- 새 원본 행을 기준으로 파생 수치를 전수 재계산한 뒤 쓰기를 연다.

`contents.user_count`는 회원과 셀럽 관계가 섞인 이름이므로 다음 세 값으로 교체한다.

```text
member_count       member_contents 행 수
celeb_count        celeb_contents 행 수
record_count       member_count + celeb_count
```

기존 `user_count` 소비자는 용도별로 다시 연결한다. 일반 회원 수를 표시하는 화면은
`member_count`, 셀럽 연결 수는 `celeb_count`, 전체 기록량·인기 정렬은 `record_count`를
사용한다. `user_social.content_count`와 팔로우 카운트도 같은 방식으로 새 원본에서 재계산한다.

### 팔로우

```text
member_member_follows
- follower_member_id FK → user_accounts
- followed_member_id FK → user_accounts

member_celeb_follows
- member_id FK → user_accounts
- celeb_id FK → celebs
```

- 회원→회원은 맞팔·친구·추천·알림이 성립한다.
- 회원→셀럽은 구독·팔로워 수·셀럽 활동 피드만 성립한다.
- 로그인할 수 없는 셀럽이 회원을 역팔로우하는 현재의 죽은 조회는 제거한다.

### 방명록

```text
member_guestbook_entries
- owner_member_id
- author_member_id
- 비밀글·읽음 상태

celeb_guestbook_entries
- celeb_id
- author_member_id
- 공개·운영 검토 상태
```

셀럽은 로그인 주인이 아니므로 회원 방명록의 비밀글·본인 읽음 규칙을 그대로 적용하지 않는다.
fiction 화면의 감상록도 `celeb_guestbook_entries`를 사용한다.

### 소셜·점수·알림

- `member_social_stats`: 회원 팔로워·팔로잉·친구 수
- `celeb_metrics`: 셀럽 팔로워·콘텐츠 수
- `member_scores`, `member_score_logs`: 회원 업적과 보상 점수
- `member_notifications`: 로그인 회원만 수신·행동 주체가 된다

셀럽 점수 행 2,741건과 로그 13,063건은 회원 점수로 이관하지 않는다. 셀럽 로그는 전부
`activity/content_add/1`이다. 원본 열과 UUID를 FK 없이 비노출 `private` 보관 테이블로
옮기고, 제품 테이블에서는 제거한다. 보관 데이터 삭제는 이번 작업에 포함하지 않는다.

현재 셀럽 수신 알림 3건과 셀럽 행위자 알림 2건은 소비할 계정이 없는 데이터다. 원인을
기록하고 같은 비노출 보관 영역으로 옮긴 뒤 제품 알림에서 제거한다.

관리자 등록자 이력은 계정 삭제와 별개로 보존한다. `contributor_member_id`는
`ON DELETE SET NULL`로 두고, `contributor_id_snapshot`과 `contributor_name_snapshot`을
함께 저장한다. 기존 2,045건은 이행 시점의 UUID와 표시 이름으로 채우며, 당시 이름을
복원한 값이 아니라는 점을 마이그레이션 메모에 남긴다. 신규 행은 등록 시점 값을 저장한다.

### 기록·신고·차단

- `records`는 현재 0건이므로 회원 전용 `member_records`로 다시 정의한다.
- 신고자·처리자는 회원 계정만 허용한다.
- 회원 신고와 셀럽 자료 교정 요청은 같은 제재 동작을 쓰지 않는다.
- 차단은 회원 간 관계로 좁힌다. 셀럽 구독 해제는 팔로우 관계가 맡는다.

## 드문 통합 읽기

원본을 다시 섞지 않고 필요한 화면에만 읽기 모델을 둔다.

### `public_profile_cards`

```text
subject_kind      member | celeb
id
display_name
avatar_url
bio
href
```

`member_profiles`와 `celebs`의 `UNION ALL` 읽기 전용 뷰다. 검색·팔로잉 목록·감상 카드처럼
공통 이름과 사진만 필요한 곳에서 사용한다.

- 모든 소비자는 `id`만이 아니라 `subject_kind + id`를 키로 사용한다.
- 회원 분기는 활성 `user_accounts`와 공개 가능한 회원 프로필만 포함한다.
- 셀럽 분기는 서비스에 표시할 공개 상태만 포함한다.
- 관계 포함 조회에는 사용하지 않는다. 각 원본을 서버에서 따로 조회해 합친다.

### 콘텐츠 감상 읽기

콘텐츠 상세는 `member_contents`와 `celeb_contents`를 서버에서 병렬 조회해 화면용 공통
형태로 합친다. 반복 비용이 확인될 때만 읽기 전용 뷰를 만든다.

### 운영 원칙

- 통합 뷰에는 쓰기 권한을 주지 않는다.
- 공개 뷰는 `security_invoker = true`를 사용한다.
- PostgREST가 `UNION` 뷰의 FK를 추론한다고 가정하지 않는다.
- 일반 셀럽·회원 조회는 통합 뷰를 거치지 않는다.

## 생성·상태·삭제

### 회원

1. Supabase Auth 가입이 `auth.users`를 만든다.
2. 같은 트랜잭션의 DB 트리거가 `user_accounts`와 `member_profiles`를 만든다.
3. 트리거가 실패하면 가입 전체를 실패시켜 반쪽 회원을 남기지 않는다.
4. 계정 정지는 Auth 관리자 차원의 로그인 금지와 `user_accounts.account_status` 변경을 함께
   수행한다. 구현 시 설치된 Supabase SDK의 ban·unban API 서명을 현재 문서로 다시 확인한다.
5. 영구 삭제는 제한된 DB 함수 한 번으로 회원 관계→프로필→계정→Auth 순서로 정리한다.
6. `user_accounts → auth.users`의 `RESTRICT`가 함수 밖 Auth 선삭제를 거부한다.

로그인·세션 처리 규칙:

- 이메일·OAuth·OTP 성공 직후 `account_status='active'`를 확인한다.
- 활성 상태가 아니면 발급된 세션을 즉시 폐기하고 로그인 화면으로 보낸다.
- 미들웨어의 보호 경로도 활성 계정을 확인한다.
- 모든 회원 쓰기 RLS는 `auth.uid()` 일치뿐 아니라 활성 `user_accounts` 행 존재를 검사한다.
- 기존 JWT가 만료 전까지 남아도 활성 계정 행 검사가 쓰기를 즉시 거부한다.

삭제 함수는 공개 구현 하나를 그대로 노출하지 않는다.

- `delete_my_account()`는 인자를 받지 않고 `auth.uid()` 본인만 삭제한다.
- 관리자 삭제 창구는 활성 상태까지 검사하는 `is_admin()` 또는 service role을 직접 확인한다.
- 공통 내부 구현은 비공개 스키마에 두고 `PUBLIC` 실행 권한을 회수한다.
- 공개 래퍼도 필요한 역할에만 `EXECUTE`를 부여한다.
- 회원 계정 행이 사라진 뒤에도 기존 JWT가 남을 수 있으므로 민감한 RLS는 활성 계정 존재를
  확인한다.

### 셀럽

1. 서비스 전용 함수가 UUID를 만든다.
2. `celebs`와 필수 초기 행을 한 트랜잭션에서 만든다.
3. `auth.users`, `user_accounts`, `member_profiles`에는 아무 행도 만들지 않는다.
4. 일반 운영 삭제는 `publication_status` 변경이다.
5. 영구 삭제는 서비스 전용 함수가 FK 정책에 따라 처리한다.

회원을 셀럽으로 바꾸는 `promoteToCeleb`는 폐기한다. 같은 실제 사람이 양쪽 역할을 가져도
회원과 셀럽 행을 따로 두고 인수 관계로 연결한다.

## RLS와 권한

| 테이블 | 공개 읽기 | 본인 쓰기 | 관리자 쓰기 |
|---|---|---|---|
| `user_accounts` | 없음 | 제한된 계정 설정 | 제한 함수 |
| `member_profiles` | 공개 범위에 따른 읽기 | `auth.uid() = id` | 제한 함수 |
| `celebs` | 공개 상태 셀럽 | 없음 | 서비스 전용 |
| 회원 전용 관계 | 공개 설정에 따른 읽기 | `auth.uid() = member_id` | 서비스 전용 |
| 셀럽 전용 관계 | 제품 공개 범위 | 없음 | 서비스 전용 |

- 모든 공개 스키마 테이블에 RLS를 활성화한다.
- 정책은 `TO anon`, `TO authenticated`를 명시한다.
- UPDATE 정책에는 `USING`과 `WITH CHECK`를 함께 둔다.
- 관리자 함수는 비공개 스키마, 고정 `search_path`, 명시적 실행 권한을 사용한다.
- 모든 관리자 RLS와 공개 관리자 래퍼는 역할만 보지 않고 활성 계정까지 확인하는
  `is_admin()`을 사용한다.
- 권한 판단에 회원이 수정할 수 있는 `user_metadata`를 사용하지 않는다.
- 새 테이블의 Data API 노출과 `GRANT`를 RLS와 별도로 확인한다.

### 즉시 보안 선행 조건

26.08.09 운영 DB 감사에서 기존 `public.delete_auth_user(uuid)`는 `SECURITY DEFINER`인데
`anon`·`authenticated` 실행 권한이 있고 함수 안에서 본인·관리자 확인을 하지 않는 것으로
확인됐다. 현재 호출부가 service role을 쓰는 것과 함수 자체의 공개 권한은 별개다.

구조 이행 전에 다음을 먼저 수행한다.

1. 기존 함수의 `PUBLIC`, `anon`, `authenticated` 실행 권한을 회수한다.
2. 현재 서버 호출에 필요한 service role만 임시 허용한다.
3. 위의 본인 삭제·관리자 삭제 래퍼로 교체한다.
4. anon과 다른 회원 UUID로 호출했을 때 거부되는 반증 시험을 남긴다.
5. 정지된 관리자의 기존 JWT로 관리자 함수 호출과 자기 정지 해제가 거부되는지 시험한다.

## 이행 전략

과거 26.08.07 작업을 이전 이름으로 다시 만들지 않는다. 현재 운영 DB에서 최종 구조로
가는 새 전진 마이그레이션만 작성한다. 단, 저장소만으로 빈 DB를 만들 때도 최종 상태에
도달하도록 각 객체 정의를 SQL에 남긴다.

현재 운영 DB에는 저장소에 없는 마이그레이션·함수·RLS가 있다. 과거 중간 상태를 그대로
재연하지는 않지만, 최종 구조에서도 필요한 객체는 운영 정의를 회수해 새 기준선과 전진
마이그레이션에 포함한다. 원격 마이그레이션 이력과 저장소 이력의 차이도 적용 전에 정리한다.

실제 이행은 아래 세로 묶음의 추가→변경 포착→백필→읽기·쓰기 전환→검증까지 마쳤다.
기존 구조 제거만 새 앱 배포 뒤의 마지막 게이트로 남았다.

변경 포착은 반드시 백필 전에 설치한다. 새 테이블을 만든 뒤 기존 쓰기를 새 테이블로
복제하는 단방향 트리거를 같은 확장 단계에 추가하고, 그다음 `ON CONFLICT` 가능한 멱등
백필을 실행한다. 백필 시작과 트리거 설치 사이의 쓰기 유실 구간을 만들지 않는다.

26.08.09 프로필 원본 전환부터 새 테이블을 쓰기 원천으로 삼았다. 배포 시차에는 옛 앱과 새
앱의 요청을 모두 보존하는 재귀 방지 호환 트리거를 사용하되, 비즈니스 효과는 새 원천에서만
한 번 실행되도록 분리했다. 모든 구버전 인스턴스 종료를 확인한 뒤 마지막 차이를 대조하고
호환 트리거와 옛 테이블을 제거한다. 호환 장치를 영구 구조로 남기지 않는다.

### 0. 운영 기준선

1. `pg_constraint`, `pg_trigger`, `pg_policies`, 함수, 뷰, 인덱스, 권한을 추출한다.
2. 53개로 확인된 기존 외래키의 현재 `ON DELETE`와 유형별 행 분포를 다시 센다.
3. 저장소에 없는 현재 RPC·RLS·트리거 정의를 확보한다.
4. 잘못된 유형 행과 고아를 별도 목록으로 만든다.
5. Supabase 타입을 현재 DB 기준으로 다시 생성한다.
6. 원격·저장소 마이그레이션 이력 차이와 빈 DB 재현 절차를 확정한다.

완료 조건:

- 모든 참조 열의 최종 부모와 삭제 규칙이 확정돼 있다.
- 원격에만 있는 DB 객체가 없다.

### 1. 현행 결함 선처리

1. `delete_auth_user` 공개 실행 권한을 회수하고 호출자 검사를 갖춘 창구로 교체한다.
2. 회원가입 보완 경로의 제거된 `profiles.email` 쓰기를 없앤다.
3. 회원 정지 상태를 Auth ban·로그인 콜백·미들웨어·모든 회원 쓰기 RLS·관리자 판정과 연결한다.
4. 인물 화면의 계정 정지 조작을 제거한다.
5. `promoteToCeleb`를 제거한다.
6. 현역 문서의 가짜 셀럽 계정 생성법을 고친다.

완료 조건:

- 신규 회원은 계정과 프로필을 함께 가진다.
- 신규 셀럽은 Auth 계정 없이 등록된다.
- 정지 회원은 새 로그인과 보호 동작이 거부된다.
- anon·일반 회원은 임의 UUID의 계정 삭제 함수를 실행할 수 없다.

### 2. 회원·셀럽 원본 분리

1. `user_accounts.id → auth.users.id` 외래키를 `RESTRICT`로 추가하고 17행을 검증한다.
2. `member_profiles`와 `celebs`를 추가한다.
3. 기존 `profiles` 쓰기를 새 테이블로 보내는 임시 단방향 동기화 장치를 설치한다.
4. 기존 USER 17행과 CELEB 전원을 기존 UUID 그대로 멱등 백필한다.
5. 열별 null·값·해시를 대조한다.
6. 회원·셀럽 목록·검색·상세 읽기를 새 테이블로 전환한다.

완료 조건:

- 이행 시점 대상 수와 새 테이블 수가 같다.
- 필드 불일치가 0건이다.
- 셀럽 조회 실행 계획에 회원 테이블이 없다.
- 회원 조회 실행 계획에 셀럽 테이블이 없다.

### 3. 전용 외래키 전환

1. 셀럽 전용 17개 FK를 `celebs(id)`로 바꾼다.
2. 회원 전용 FK를 `user_accounts(id)`로 바꾼다.
3. 새 제약은 가능한 경우 `NOT VALID`로 추가하고 대조 뒤 `VALIDATE CONSTRAINT`한다.
4. FK 열 인덱스를 함께 확인한다.
5. 기존 유형 검사 트리거를 제거한다.

완료 조건:

- 회원 ID를 셀럽 전용 관계에 넣으면 DB가 거부한다.
- 셀럽 ID를 회원 전용 관계에 넣으면 DB가 거부한다.

### 4. 소규모 혼합 관계 분리

1. 셀럽 점수·로그·잘못된 알림을 FK 없는 비노출 보관 테이블로 복사·대조한다.
2. 회원 점수·로그·소셜·알림을 전용 테이블로 분리한다.
3. 팔로우 15건을 두 관계 테이블로 옮긴다.
4. 방명록 1건을 회원 방명록으로 옮긴다.
5. 0건인 기록·신고·차단은 회원 전용 제약으로 재정의한다.
6. 기존 통합 관리자 화면은 제거하거나 읽기 전용 조합으로 바꾼다.

완료 조건:

- 로그인 불가 셀럽을 수신자로 가진 알림이 없다.
- 회원 점수 테이블에 셀럽 ID가 없다.
- 팔로우 두 종류의 카운트와 화면 결과가 이행 전과 같다.
- 보관 대상 원본·보관 행 수와 해시가 같다.
- 백필과 변경 포착이 점수·알림·카운트를 중복 생성하지 않는다.

### 5. 감상 관계 분리

가장 많은 데이터와 외부 ID 의존이 있어 마지막에 수행한다.

1. `member_contents`, `celeb_contents`를 추가한다.
2. 기존 쓰기를 새 테이블로 복제하는 임시 라우팅 트리거를 먼저 둔다.
3. 기존 ID를 보존해 유형별로 멱등 백필한다.
4. 셀럽 콘텐츠 트리거와 회원 RLS를 각각 옮긴다.
5. `content_recommendations.user_content_id`, 운영 함수 23개, 트리거 6개를 새 원천으로 옮긴다.
6. 콘텐츠 상세·피드·집계 RPC·사이트맵·Remotion 연결 360건을 전환한다.
7. 회원·셀럽별 개수와 모든 외부 참조를 대조한다.
8. 짧은 쓰기 중지 동안 마지막 차이를 반영하고 기존 비즈니스 트리거를 끈다.
9. 새 비즈니스 트리거를 설치하고 파생 개수를 새 원본에서 전수 재계산한다.
10. 새 쓰기 원천으로 전환한 뒤 쓰기를 다시 연다.

완료 조건:

- 전환 직전 원본 수와 새 두 테이블 합계가 같다. 26.08.09 기준선은 12,596건이다.
- 모든 기존 감상 관계 ID가 그대로 보존된다.
- Remotion과 백오피스 자산 연결 누락이 0건이다.
- 회원 쓰기가 셀럽 감상경위를 수정할 수 없고, 관리자 셀럽 쓰기가 회원 기록을 수정할 수 없다.
- `member_count`, `celeb_count`, `record_count`가 새 원본 전수 집계와 일치한다.
- 백필 과정에서 점수·알림·카운트가 추가되지 않았다.

### 6. `profile_type` 소비자 제거

1. 웹·백오피스·게임·SEO·Remotion·운영 스크립트의 조회 시작점을 바꾼다.
2. 인물·회원 주소 분기를 각 전용 라우트로 정리한다.
3. 드문 통합 화면만 읽기 모델의 `subject_kind`를 사용한다.
4. 현행 DB 함수·뷰·트리거·RLS에서 `profile_type` 조건을 제거한다.

완료 조건:

- 실행 코드의 저장형 `profile_type` 조회와 분기가 0건이다.
- 현행 DB 객체 정의의 `profile_type` 참조가 0건이다.
- 과거 마이그레이션과 보관 문서의 이력 문자열은 검사 대상에서 제외한다.

### 7. 기존 구조 제거

1. 모든 배포 인스턴스가 새 테이블을 읽고 쓰는지 확인한다.
2. 임시 동기화 장치를 제거한다.
3. 기존 혼합 테이블과 `profiles_compat`를 제거한다.
4. 마지막으로 `profiles`를 제거한다.
5. PostgREST 스키마 캐시와 Supabase 타입을 갱신한다.
6. 현역 문서와 TODO 색인을 최종 구조로 갱신한다.

완료 조건:

- 운영 DB에 `profiles`와 `profile_type`이 없다.
- 회원·셀럽의 생성·조회·수정·삭제가 서로의 테이블을 읽지 않는다.
- DB·코드·문서가 같은 원천을 가리킨다.

## 배포와 롤백

### 배포

```text
새 테이블 추가
→ 기존 쓰기에서 새 테이블로 단방향 변경 포착
→ 멱등 백필과 대조
→ 새 테이블 읽기 배포
→ 재귀 방지 조건을 둔 배포 호환 동기화 설치
→ 새 테이블 쓰기 배포
→ 구버전 인스턴스 종료와 최종 차이 확인
→ 옛 테이블 변경 권한 회수
→ 관찰 기간
→ 기존 테이블 제거
```

- 양쪽 동기화가 병존하는 배포 구간에는 가장 바깥쪽 쓰기만 처리하는 조건을 반드시 둔다.
- 조건 없는 양방향 트리거를 동시에 두어 순환 갱신을 만들지 않는다.
- 각 세로 묶음은 독립 배포와 검증이 가능해야 한다.
- 구조 추가 단계에서는 기존 데이터를 삭제하지 않는다.
- 쓰기 중지는 전체 서비스가 아니라 해당 세로 묶음의 변경 창구에만 적용한다.

### 롤백

| 시점 | 방법 |
|---|---|
| 읽기 전환 전 | 새 테이블과 임시 동기화 제거 |
| 읽기 전환 후 | 이전 앱 배포로 복귀. 기존 테이블이 계속 정본 |
| 새 쓰기 전환 후 | 해당 쓰기를 중지하고 충돌 기준에 따라 기존 열로 역백필한 뒤 이전 앱 배포 |
| 기존 구조 제거 후 | 새 테이블에서 역마이그레이션. 사전 복제 DB 검증 필수 |

최종 제거 전에는 역백필 SQL과 행·해시 대조를 복제 DB에서 실제로 통과시킨다. PITR은
일반 롤백 대신 값 손실이나 잘못된 삭제가 발생했을 때 사용한다.

역백필 충돌은 `updated_at`이 더 최신인 행을 자동 채택하지 않는다. 양쪽 값이 다르면 쓰기를
중지한 상태에서 변경 로그와 운영 원천을 확인해 한쪽을 명시적으로 선택한다.

## 전체 검증

### DB

- 단계별 원본·대상 행 수와 필드 해시 대조
- 고아와 잘못된 유형 참조 0건
- FK 반증 시험
- RLS 역할별 시험: anon, 정상 회원, 정지 회원, 관리자, service role
- 신규 회원·셀럽 생성과 영구 삭제의 원자성 시험
- 함수별 `EXECUTE` 권한과 anon·타 회원 계정 삭제 반증 시험
- 정지 직후 이메일·OAuth 재로그인, 기존 세션 쓰기 거부 시험
- 정지된 관리자의 기존 JWT로 관리자 RPC·RLS·자기 정지 해제 거부 시험
- 등록자 UUID·이름 스냅샷과 비노출 보관 데이터 대조
- PostgREST FK 조인과 스키마 캐시 갱신 확인
- 보안 어드바이저 점검

### 애플리케이션

- `pnpm build:web`
- `pnpm build:bo`
- 회원가입·로그인·정지·해제·탈퇴
- 회원 프로필·기록·업적·팔로우·추천·알림
- 셀럽 등록·편집·비공개·검색·상세
- 셀럽 감상경위·영향력·성향·대사·행적
- 콘텐츠 상세의 회원 감상과 셀럽 감상경위
- 팩션·담화·게임·SEO·사이트맵·Remotion
- 한국어·영문 화면

### 타임라인 후속

- 대상은 `celebs` 전원이다.
- 공개 상태, 등급, 생년, 사망년을 대상 필터로 사용하지 않는다.
- 생년이 없으면 출생 사건을 강제하지 않는다.
- 사망년이 없으면 사망 사건을 강제하지 않는다.
- 실존·fiction의 연도형·서사 순서형 규칙만 구분한다.

## 관련 문서 처리

| 문서 | 처리 |
|---|---|
| `docs/archive/profile-table-separation-considerations.md` | 공용 부모 권고가 폐기된 선행 메모로 유지 |
| `docs/todo/profile-user-celeb-separation-2026-08-07.md` | 26.08.07 계정 분리 이력으로 `docs/archive/` 이동 |
| `docs/project/db-core.md` | 회원·계정·혼합 관계 최종 스키마 반영 |
| `docs/project/db-celeb.md` | `celebs`와 셀럽 전용 관계 SSoT로 갱신 |
| `docs/project/celeb/celeb-pipeline.md` | 가짜 Auth 계정 생성법 제거, 셀럽 직접 등록 반영 |
| `docs/project/celeb/celeb-gotchas.md` | 폐기된 계정 우회 등록법 제거 |
| `docs/project/web-bo.md` | 회원·셀럽 독립 조회와 권한 출처 반영 |
| `docs/project/service/profile.md` | 회원 전용 UUID 프로필 경로 반영 |
| `docs/project/celeb-journey.md` | `celebs` 전원 대상 규칙 반영 |
| `docs/todo/celeb/celeb-timeline-backfill-handoff-2026-08-08.md` | 구조 이행 후 새 대상 수와 재개 지점 반영 |

## 하지 않는 것

- 공통 열이 있다는 이유만으로 새 공용 부모를 만드는 일
- `(target_type, target_id)`처럼 외래키를 걸 수 없는 다형 참조
- 과거 26.08.07 변경을 이전 이름으로 다시 만드는 일
- 기존 UUID와 감상 관계 ID를 다시 발급하는 일
- 구조 이행과 공개 상태 체계 개편을 한 작업에 섞는 일
- 셀럽 점수·로그·알림을 근거 없이 바로 삭제하는 일
- 전체 외래키와 앱을 한 번에 전환하는 일
- 구조 이행과 타임라인 본문 대량 생성을 동시에 진행하는 일

## 완료 후

1. 최종 스키마 규칙은 `docs/project/` 문서에 남긴다.
2. 이 문서와 26.08.07 진행 문서는 완료 이력으로 `docs/archive/`에 옮긴다.
3. `AGENTS.md` TODO에서 이 작업을 뺀다.
4. 타임라인 결손 전수 감사와 생성 작업을 다시 시작한다.
