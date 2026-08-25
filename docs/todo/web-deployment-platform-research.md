# 배포·비용 남은 작업

사용자 웹은 Cloudflare를 앞단에 두고 Oracle VM에서 실행한다. 과거에는 Vercel 자동
빌드·호스팅을 사용했으나 비용 때문에 이전했고 프로젝트와 Pro 구독을 폐기했다.

현행 규칙은 다음 문서가 쥔다.

- 운영 서버·캐시·배포: `docs/project/platform/external-services.md`
- 환경변수·비밀값: `docs/project/platform/env-vars.md`
- 검색 노출·배포 후 검증: `docs/project/operations/seo.md`
- 캐시 태그: `packages/shared/src/constants/cache-tags.ts`

## 1. 도메인 이전 마감

`feelandnote.com`은 26.08.25 Cloudflare Registrar로 이전을 요청했다. 현재 상태는
`Pending Transfer`이며, 인증 코드 제출까지 끝나 기존 등록기관의 release를 기다리는 마지막
단계다. Vercel에는 `Transferring out`으로 표시되지만 수동 승인·release 버튼은 없다. 만료일은
2027년 2월 3일이다. 승인 메일이 새로 오지 않으면 기다렸다가 상태만 다시 확인하고, 이전이
끝나면 등록기관과 만료일을 확인한 뒤 기존 계정을 폐기한다.

불필요한 `feelnnote.com`은 자동 갱신을 껐고 서비스용 DNS 레코드도 제거했다. 별도로
이전하지 않고 2027년 1월 9일 만료시킨다.

## 2. Oracle 메모리 재확인

장시간 실행 뒤 메모리와 swap이 늘어난 사례가 있었지만 누수로 확정할 근거는 아직 없다. 새 release
기동 직후 `MemoryCurrent`는 약 `256MiB`, `MemorySwapCurrent`와 재시작은 0이다. 1시간 뒤 같은
값을 다시 비교하고 계속 증가했을 때만 경로별 메모리를 추적한다.

## 3. 사용자 웹 변경 마감

작업 폴더에 남은 사용자 웹 변경을 하나의 검증 단위로 마감한다.

- 캐시 만료 시각 분산과 공용 캐시 병합
- 성향별 공통 작품 조회량 축소
- 화면별 다국어 문구 전송 범위 축소
- 검색 공유용 이미지 용량과 CDN 보관 정책 조정
- 관계도·성향 비교 작은 화면 보정

TypeScript, 관련 자동 테스트, 별도 출력 폴더의 전체 프로덕션 빌드, 핵심 화면 육안 검수를
통과한 뒤만 배포한다.

공개 GitHub 저장소의 홈페이지 메타데이터만 아직 옛 `feelnnote.vercel.app`을 가리킨다. 다음
GitHub 인증 때 `https://feelandnote.com`으로 교정한다. 코드와 웹 README의 운영 Vercel 참조는
현행 Oracle 안내로 정리했다.

## 4. R2 자산·사용량

2026-08-25 전수 실측값은 버킷 1개, 객체 9,609개, `0.934GiB`다. 전부 Standard이며
9,609개 모두 `Cache-Control: public, max-age=31536000, immutable`이다. 가장 큰 키 공간은
`celebs` 8,393개·약 `707MiB`, `faction` 964개·약 `185MiB`다. CORS는 로컬 백오피스의
GET·HEAD만 허용하고, lifecycle은 미완료 multipart upload를 7일 뒤 중단할 뿐 객체를
만료시키지 않는다.

최근 30일 Class A는 18,670회로 무료 100만 회의 `1.87%`, Class B는 157,590회로 무료
1,000만 회의 `1.58%`다. 현재 PostgreSQL 전체 `252.43MiB`를 압축하지 않은 상태로 30일
보관해도 기존 자산과 합쳐 약 `8.4GiB`이므로, 암호화한 일일 DB 백업은 현재 규모에서 저장비와
작업비 모두 `$0` 범위다. 비공개 `feelandnote-backups` 버킷을 만들었고 custom domain,
`r2.dev`, CORS를 모두 붙이지 않았다. `postgres/` 객체는 30일 뒤 만료되고 미완료 multipart는
7일 뒤 중단된다. 현재 R2 키로 업로드·읽기·삭제 시험까지 통과했다.

프로덕션용 `https://assets.feelandnote.com`을 R2 custom domain으로 연결했고 실제 자산이
첫 요청 `MISS`, 두 번째 요청 `HIT`로 캐시되는 것을 확인했다. 세 앱과 Oracle의
`R2_PUBLIC_URL`을 이 주소로 바꾸고, DB 원본 4개 테이블 3,395행을 한 트랜잭션으로 전환했다.
팩션 파생 캐시 갱신 뒤 public 텍스트 필드 306개를 다시 검사한 결과 새 호스트 참조는 7개
필드 5,399건, 옛 `r2.dev` 호스트 참조는 0건이다. 대표 셀럽 페이지도 새 호스트만 포함한다.
웹·음성 코드 배포와 참조 재검사를 마친 뒤 기존 `r2.dev` 공개 URL은 껐다. 프로덕션 공개
경로는 custom domain 하나다.

Supabase Storage의 객체 852개·`13.9MiB`는 R2 이전 뒤 남은 과거 셀럽 아바타다. 현재
서비스의 아바타 URL은 R2를 사용하므로 DB 이전 대상에서는 제외한다. 삭제 전 확인은
`sw/web/scripts/delete-old-avatars.mjs --dry-run`으로 재현할 수 있으며, 실제 삭제는 별도
승인 뒤 실행한다.

### 소규모 운영 플랫폼 판정

- 공개 저장소의 표준 GitHub Actions는 무료이며 시간별 `warm-web.yml`도 현재 계속 성공한다.
  다만 60일 동안 저장소 활동이 없으면 예약 실행이 자동 정지되므로 이것만 장기 감시로 믿지는
  않는다. 작업 폴더의 수정본은 핵심 URL이 2xx가 아니면 실패하도록 검증까지 끝냈지만 아직
  기본 브랜치에는 반영하지 않았다.
- Oracle Cloud Agent의 Compute Instance Monitoring(`gomon`)은 이미 실행 중이다. OCI 무료
  범위는 월 5억 metric ingest, 알림 이메일 1,000통, Synthetic Monitor 시간당 10회다. 콘솔
  로그인 뒤 한 곳의 public vantage point에서 홈 REST 검사를 10분마다 실행하고
  `MemoryUtilization[5m].mean() > 90` 알람을 같은 이메일 topic에 연결한다. 별도 감시 서비스나
  서버 내부 자체 감시는 추가하지 않는다.
- Cloudflare Turnstile Free는 challenge가 무제한이므로 가입·글쓰기 스팸이 생길 때만 붙인다.
  검색 로봇까지 막는 전역 challenge 대용으로는 쓰지 않는다.
- Workers Free는 하루 10만 요청·Cron 5개를 주지만 현재 Oracle timer와 GitHub Actions에서
  비용 발생 근거가 확인되지 않아 지금 옮길 이유가 없다.
- Queues Free는 하루 1만 작업·보관 24시간이지만 현재 비동기 큐가 필요한 운영 흐름이 없다.
  작은 서비스에 새 장애 지점을 만들 이유가 없어 도입하지 않는다.
- Cloudflare Email Routing Free는 수신 전달용이라 Auth 인증 메일 SMTP를 대신하지 못한다.
  셀프호스팅 때의 발신은 Resend Free를 그대로 쓴다.

## 5. Supabase 비용 결정·이전

### 실측과 비용

- Supabase Pro는 월 `$27.50`다. 8월 25일 Management API로 다시 잰 PostgreSQL은
  `252.43MiB`, 인증 사용자는 17명이라 Free의 DB `500MB` 한도 안에는 든다.
- 8월 3일~9월 3일 청구 주기의 egress `14.727GB`와 최근 7일 `2.53GB`에는 Oracle 웹 이전 전
  트래픽과 이전 당일의 배포·검증, 로컬 일괄 작업이 섞였다. Oracle 전환 전 로그에 Oracle IP가
  없는 것은 당연하므로 별도의 장애·누수 근거로 쓰지 않으며, 두 사용량도 전환 뒤 월 사용량으로
  환산하지 않는다. Pro는 유지하고 9월 3일부터 새 주기를 다시 측정한다.
- 최근 23시간 Edge 로그에는 API 요청 약 8만 건이 있었고 REST 약 6.9만 건·Auth 약
  1.4만 건이다. Auth 대부분은 로컬 백오피스가 서버 요청마다 `getUser()`를 호출한 것이었다.
  ECC JWT를 로컬 검증하는 `getClaims()`로 13개 경로를 바꾼 뒤 실제 백오피스 탐색 구간에서
  `/auth/v1/user`는 0건이 됐고 관리자 권한 RPC는 그대로 유지됐다. Edge 로그에는 전체 응답
  byte가 없어 이 절감만으로 egress를 환산할 수 없으므로 Free 가능 여부는 새 청구 주기
  실측으로 판정한다. Management API의 `usage.api-counts`는 일별 REST·Auth 요청 수까지만
  주며 과금 egress byte는 주지 않으므로, 9월 3일 이후 최종 GB 판정은 Usage 대시보드에서 한다.
- 홈 피드의 콘텐츠별 관계 재조회 제거, 오늘의 인물 회원 집계 범위 축소, 전체 성향 벡터의
  1시간→7일 캐시와 변경 태그 무효화를 운영에 반영했다. 성향 벡터 실측 응답은
  `1.525MiB`이며 TTL만으로 계산한 월 상한은 약 `1.151GB`에서 약 `8MB`로 줄어든다. 이는 해당
  경로의 이론값일 뿐이고 홈·오늘의 인물 절감량도 작으므로, 이 변경만으로 Pro가 불필요해졌다고
  판정하지 않는다.
- 작품 원장 `contents`·`content_locales`, 셀럽 감상경위 `celeb_contents`, 회원 감상·리뷰
  `member_contents`는 Supabase에 남긴다. 회원의 작품 생성, FK·RLS·집계 트리거·검색이 이
  관계를 함께 사용하므로 별도 JSON 원장을 만들지 않는다. 새 주기 egress가 5GB를 넘고
  상위 공개 읽기가 확인될 때만 DB에서 만든 익명 공개용 JSON 파생본을 R2에 둔다. 회원 데이터는
  파생본에 넣지 않고 Supabase 원장과 쓰기 경로도 그대로 유지한다.
- 현재 Oracle 서버 메타데이터로 확인한 홈 리전은 South Korea North
  `ap-chuncheon-1`이다. Oracle은 Always Free A1을 춘천에서 제공하지 않고 무료 Compute는
  변경할 수 없는 홈 리전에서만 만들 수 있다. 따라서 이 계정의 A1 `2 OCPU/12GB` 무료안은
  **폐기**한다. 결제 계정으로 전환해도 이 제한은 사라지지 않으며, 같은 A1을 전액 유료로
  쓰면 컴퓨트만 월 약 `$27.74`다.
- 현재 계정은 Always Free E2 Micro를 최대 2대까지 쓸 수 있다. 콘솔에서 두 번째 무료
  E2가 남았는지 확인하고, 남았다면 DB·Auth·REST·Envoy만 둔 1GB 경량 스택을 먼저
  리허설한다. 기존 45GB와 두 번째 기본 50GB 부트 볼륨을 합쳐도 Always Free의 총 200GB
  안이라 디스크 비용도 `$0`다. 현재 VM의 instance principal은 정상 발급되지만 Limits API
  권한은 `NotAuthorizedOrNotFound`라 잔여량은 콘솔에서만 확인할 수 있다. 안정적으로 버티지
  못하면 무료 셀프호스팅안도 폐기한다.
- 유료 최저 대안은 Hetzner의 2026년 6월 신규 가격 기준 CAX11 4GB `€5.99/월`, CAX21
  8GB `€10.49/월`이다(세금·유료 IPv4 제외). 4GB는 공식 최소 사양이라 리허설용이고,
  운영 대안은 8GB CAX21에 web과 DB를 함께 두는 안이다. Cloudflare Tunnel을 쓰면 별도
  공인 IPv4는 필요 없다.
- 이전 검증은 이미 결제 중인 Pro 청구 주기 안에서 끝내고, 확인 뒤 기존 프로젝트를 Free로
  내려 복귀용으로 남긴다. 유료 병행 한 달을 별도 필수 조건으로 두지 않는다.
- DB 약 `252MiB`의 export·restore와 설정 전환에는 별도 이전 수수료가 없다. 현재 Pro의
  포함 egress, Cloudflare Zero Trust Free, Resend Free를 쓰므로 **필수 1회성 현금 비용은
  `$0`**다. 도메인 갱신료는 이전 여부와 무관한 기존 비용이고, R2 백업도 저장량과 최근 30일
  작업량 실측상 무료 범위다.

### 옮길 수 있는지 확인한 결과

- DB에는 public 테이블 67개, RLS 정책 172개, 함수 83개, 사용자 트리거 138개가 있다.
  용량 대부분은 셀럽·콘텐츠·번역·연표·대사 데이터이며 지워서 해결할 일시 데이터가 아니다.
- 현재 관리형 DB와 공식 셀프호스트 DB가 모두 PostgreSQL 17 계열이다. 공식
  `self-hosted/v0.8.0` Compose의 고정 이미지 13개는 amd64와 arm64를 모두 제공한다.
  다만 관리형 Auth가 셀프호스트 고정 버전보다 새로워 실제 데이터 복원 리허설은 필수다.
- 현재 Oracle E2 Micro는 x86_64, RAM `1GB`, 루트 디스크 `45GB` 중 `5.5GB` 사용이라
  웹 전용으로 유지한다. 같은 서버에 DB를 합치지 않는다.
- 앱은 Edge Functions를 호출하지 않고 Supabase Storage는 R2로 옮긴 과거 아바타만 남았다.
  Realtime 구독 코드는 한 곳에 있으나 운영 publication에 등록된 테이블이 0개라 현재도
  실시간 변경을 받지 못한다. 두 번째 1GB E2 시험에서는 DB·Auth·PostgREST·Envoy만 두고
  Storage·imgproxy·Functions·Studio·postgres-meta·Supavisor·Realtime을 제외할 수 있다.
- Auth는 email·Google·Kakao를 쓰며 17명에게 identity 19개가 연결돼 있다. 자체 SMTP는
  아직 없고 Google 11개·Kakao 4개·email 4개다. 새 SMTP는 Resend Free
  `3,000통/월·100통/일`이면 충분하다. 지금까지 하루 신규 가입 최댓값은 2명이다.
- Data API 설정은 노출 스키마 `public,graphql_public`, 추가 search path
  `public,extensions`, 응답 상한 1,000행이다. 현재 Vault 비밀값은
  `web_revalidate_secret` 하나이며 함께 옮겨야 한다.
- Pro에는 완료된 일일 물리 백업 7개가 있고 PITR은 없다. 이 물리 백업은 직접 내려받을 수
  없다. 공식 셀프호스팅 이전 절차는 Supabase CLI로 `roles.sql`·`schema.sql`·`data.sql`을
  만들며 Auth 사용자도 포함한다. raw `pg_dump`는 내부 스키마와 권한 오류 때문에 쓰지 않는다.
  로컬에는 Docker Desktop `28.0.4`만 설치돼 있고 엔진은 꺼져 있으며 Supabase CLI·`psql`은
  없다. 실제 리허설 때 Docker를 켜고 안정판 CLI `2.115.0`을 고정해 사용한다. 플랫폼 DB
  비밀번호를 Dashboard에서 확인하거나 재설정한 뒤, 비공개 R2 버킷에 암호화해 올리고 복원까지
  통과시켜야 한다.
- Firebase·Cloudflare D1은 PostgreSQL·RLS·함수·Auth 계층을 재작성해야 하고, Neon Free는
  DB `0.5GB`·egress `5GB`로 현재 Supabase Free와 병목이 같다. Coolify도 작은 서버에
  관리 시스템을 더 올리는 셈이라 공식 Docker Compose와 systemd보다 이점이 없다.
- 클라우드 Management API에 의존하는 코드는 헤드라인 일괄 반영 도구 하나다. QID 도구의
  고정 클라우드 URL은 환경변수로 교정했다. 헤드라인 도구는 전환 전에 SSH 터널을 통한
  직접 PostgreSQL 실행 경로로 바꿔야 한다.

### 9월 3일까지의 결정과 이후 실행안

1. 9월 3일까지 Pro와 현재 Oracle·Cloudflare·R2·Supabase 구조를 유지한다. JSON 파생본,
   로컬 DB 복제, 커스텀 캐시 계층, Supabase 셀프호스팅은 추가하지 않는다.
2. 9월 3일 사용량 초기화 뒤 다시 논의한다. 당일에는 새 주기의 시작값을 확인하고, 9월 4~5일의
   기울기와 9월 10일 누계로 월말을 예상한다. 예상치가 Free의 `5GB` 아래일 때만 R2 백업을
   마련해 Free로 내리고 셀프호스팅 작업은 하지 않는다.
3. Free 한도를 넘으면 먼저 공개 웹 조회와 로컬 BO·AI·배치 읽기 중 어느 쪽이 주범인지 확정한다.
   공개 조회가 주범일 때만 PostgREST 응답 byte가 큰 공개 캐시 미스 경로를 Supabase 원장에서
   만든 버전 고정 R2 JSON 파생본으로 바꾸고 다시 측정한다. 로컬 작업이 주범이면 그 작업의
   읽기 경로만 별도로 줄이거나 읽기 전용 snapshot을 검토한다. 작품·리뷰·셀럽 관계 전체를
   JSON 원장으로 전환하지 않는다.
4. 제한적 공개 파생본 또는 로컬 읽기 축소 뒤에도 Free 한도를 넘을 때만 Oracle 콘솔에서 두 번째
   E2 Micro의 Always Free 적격 여부를 확인한다. 유료 표시는 만들지 않는다.
5. 두 번째 E2가 있으면 공식 `self-hosted/v0.8.0`에서 필요한 서비스만 남겨 roles·schema·
   data를 복원한다. RLS·함수·트리거·`pg_net`·Vault·Auth 17명과 대표 API를 실측하고,
   1GB에서 안정적으로 운용되지 않으면 중단한다.
6. `cloudflared`의 outbound-only Tunnel로 `db.feelandnote.com`의 Auth·REST 경로만
   공개한다. PostgreSQL 포트는 열지 않고, Studio는 평소 실행하지 않는다. 필요하면 별도
   호스트에 Cloudflare Access Free를 걸어 일시적으로만 실행한다.
7. `mail.feelandnote.com`을 Resend에 검증하고 SMTP를 연결한다. Google·Kakao OAuth
   callback, JWT 변경에 따른 재로그인, 이메일 가입, DB 트리거의 웹 캐시 무효화를
   검증한다.
8. 준비된 `feelandnote-backups` 버킷에 일일 암호화 덤프를 보내고 실제 복원까지 통과시킨다.
   짧은 읽기 전용 전환 시간에 마지막 덤프를 복원하고 환경변수·Tunnel 경로를 바꾼다.
9. 대표 API·로그인·저장·캐시 무효화를 확인한 뒤 기존 Supabase를 Free로 내린다. E2 시험이
   실패하면 CAX21을 별도 승인받아 같은 절차로 옮긴다.

## 핵심 요약

- R2 자산 전환과 비공개 30일 백업 버킷 준비는 끝났고, 첫 논리 덤프만 DB 비밀번호 확인 뒤 실행한다.
- 춘천에서는 무료 A1을 만들 수 없으며 두 번째 무료 E2는 OCI 재로그인 뒤 확인한다.
- 9월 3일까지는 추가 구조 변경 없이 Pro를 유지한다. 9월 3일에 다시 논의하고, 새 주기의
  egress가 Free 범위인지 확인한 뒤에만 다음 작업을 정한다.
- `$0` 1순위는 새 주기 egress로 판정할 Supabase Free, 2순위는 무료 E2 1GB 시험이다.
- 이전 자체의 필수 현금 비용은 `$0`이며, 기존 1GB 웹 서버에 DB를 합치는 안은 사양 부족으로 제외한다.
- 둘 다 안 되면 8GB CAX21 `€10.49/월`이 현재 최저의 무리 없는 유료안이다.
