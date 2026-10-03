# 외부 서비스

> **최종 실측 체크: 26.09.11** — Oracle DB VM의 Auth·PostgREST·Envoy 지표, 앱의 DB 경로·환경변수, 웹 캐시 webhook, 암호화 백업과 격리 복원을 확인했다. 9월 10일 REST 장애에서 확정한 규칙은 아래 「PostgREST 장애 대응 규칙」이 쥔다.

## Oracle DB 운영

Oracle 이전은 Supabase Cloud를 떠나 Oracle VM에서 PostgreSQL·Auth·PostgREST를 직접 운영하는 인프라 이전이다. 현재 서버의 컨테이너 이미지·역할·확장에는 upstream 기술 이름이 남아 있으므로 아래 실제 이름은 바꾸어 적지 않는다.

- 공개 Auth·REST 주소는 `https://db.feelandnote.com`이다. Cloudflare Tunnel이 Oracle DB VM의 Envoy로 연결하며 PostgreSQL 포트는 외부에 열지 않는다.
- DB VM은 `ubuntu@152.67.198.197`(`feelandnote-db-a1`, `VM.Standard.A1.Flex` 2 OCPU·12 GB, Always Free 한도 전부, aarch64, 사설 `10.0.0.178`)이다. SSH 키는 로컬 `C:\Users\webco\.ssh\feelandnote_oracle`, 배포 루트는 `/opt/feelandnote/supabase`이며 `docker compose up -d --no-deps db auth rest api-gw`로 PostgreSQL·Auth·PostgREST·Envoy만 띄운다(`--no-deps`가 없으면 studio·meta·imgproxy까지 딸려 온다). 26.09.11에 `VM.Standard.E2.1.Micro`(1 OCPU·1 GB, `152.67.216.40`)에서 옮겼다. 옛 VM은 전환 당일 부트 볼륨까지 삭제했다. 되돌릴 일이 생기면 R2 백업을 `restore-db-fresh`로 복원한다.
- 새 VM 설정: 도커 로그 회전(`/etc/docker/daemon.json`, 50 MB×3), 스왑 2 GB, PostgREST 관리 서버 `0.0.0.0:3001`(컨테이너 네트워크 안에서만). PostgREST 풀은 부팅 훅 `feelandnote-db-pool.service`가 코어 수로 정한다(1코어 15, 2코어 25). PostgreSQL 메모리는 `feelandnote-db-tune`이 VM 메모리로 계산해 ALTER SYSTEM으로 넣는다(12 GB 기준 shared_buffers 3 GB·effective_cache_size 7.6 GB·work_mem 32 MB). 이 값은 PGDATA에 남으므로 데이터 디렉터리를 새로 만든 복원 뒤에는 다시 실행해야 하며, `restore-db-fresh`가 마지막 단계에서 호출한다.
- **A1 크기 변경**: 춘천 리전 A1 용량은 수시로 열렸다 닫힌다. 26.09.11 생성 때와 콘솔 Edit shape 때는 2 OCPU가 용량 부족이었고, 웹 VM에 건 자동 시도(`scripts/oracle-db/db-resize-try`, 인스턴스 프린시펄 인증)가 첫 호출에서 잡아 2 OCPU·12 GB가 됐다. 인증은 Dynamic Group `feelandnote-web-dg`(웹 VM OCID 매칭)와 정책 `feelandnote-web-db-resize`(`use instances in tenancy`)다. 타이머 `feelandnote-db-resize.timer`는 성공 뒤 비활성이며, 다시 키울 일이 있으면 스크립트의 목표값을 바꾸고 타이머를 켠다. 성공 순간 DB VM이 재부팅돼 1~2분 끊기고 컨테이너·터널은 자동으로 올라온다.
- **Oracle CLI**: 웹 VM(`ubuntu@158.179.194.105`)에 `oci`(pipx, `/usr/local/bin/oci`)가 있고 인스턴스 프린시펄로 인증한다. 키 파일·config가 없으며 `/etc/profile.d/oci-cli.sh`가 `OCI_CLI_AUTH=instance_principal`을, `~/.oci/oci_cli_rc`가 기본 구획(테넌시 루트)을 준다. 권한은 Dynamic Group `feelandnote-web-dg` → 정책 `feelandnote-web-db-resize`: `manage instance-family`·`manage volume-family`·`use virtual-network-family`·`read all-resources`(모두 tenancy). IAM(사용자·그룹·정책·도메인)은 콘솔에서만 바꾼다. 로컬 PC에는 CLI를 두지 않는다. 필요하면 SSH로 웹 VM에 들어가 실행한다.
  - 인스턴스: `oci compute instance list --output table --query 'data[].{name:"display-name",state:"lifecycle-state",shape:shape}'`, 크기 변경 `oci compute instance update --instance-id <OCID> --shape-config '{"ocpus":2,"memoryInGBs":12}' --force`(재부팅), 정지·기동 `oci compute instance action --instance-id <OCID> --action STOP|START`, 삭제 `oci compute instance terminate --instance-id <OCID> --preserve-boot-volume false --force`.
  - 볼륨·IP: `oci bv boot-volume list --availability-domain <AD>`, `oci bv volume list`, `oci network public-ip list --scope REGION`, 고아 자원은 이 세 목록에서 attached 대상이 없는 것을 지운다.
  - 실패 문구: `Out of host capacity`는 리전 용량 부족, `NotAuthorizedOrNotFound`는 정책 범위 밖이거나 OCID 오타다.
- **VM 이전 절차**(26.09.11 실행, 읽기 유지·전체 끊김 8초): 새 VM에 스택·비밀·유닛을 복사하고 R2 백업으로 리허설 복원 → `scripts/oracle-db/db-cutover`가 옛 VM 쓰기 동결(`authenticator`·`supabase_auth_admin`의 `default_transaction_read_only`) → `dump-db-plain`(옛 VM) → 전송 → `restore-db-fresh`(새 VM, 초기화·복원·행수 검증) → 역할 읽기 전용 해제 → 터널 전환 → 백업 타이머 이관 순으로 실행한다. 실패하면 `db-cutover rollback`. 세 스크립트의 설치 원본은 `scripts/oracle-db/`에 있고 VM에는 `/usr/local/sbin/feelandnote-db-*`로 둔다.
- **복원 뒤 함수 권한 재확인**: public 스키마의 함수 기본 권한(`pg_default_acl`)은 새로 만든 함수마다 `anon`·`authenticated`·`service_role`에 EXECUTE를 붙인다. dump→restore로 재생성된 함수는 앞선 마이그레이션이 회수한 권한을 되찾는다. 26.09.11 이전 뒤 익명 사용자가 공개 키만으로 운영 캐시 퍼지 `web_revalidate_send`를 호출할 수 있었다(26.09.16 확인). 되돌리는 원본은 `sw/web/database/migrations/20260916120100_restore_function_revokes_after_db_move.sql`이다. RLS 정책이 호출하는 함수(`is_current_account_active`)는 회수하면 익명 공개 조회가 깨지므로 대상에서 뺀다.
- SQL은 SSH를 거쳐 운영 PostgreSQL 컨테이너에 실행한다. 인물 도서 등록의 접속 대상과 실행 가드는 `sw/web-bo/scripts/figure-books/source-book-batch.ts`가 쥔다. 실행 전 서버의 실제 컨테이너 이름과 대조한다.
- **키**: 브라우저·서버는 각각 `sb_publishable_...`·`sb_secret_...` 형식을 쓴다. JWT 기반 구형 API 키는 비활성화했고 Auth는 ECC 서명키로 회전했으며, 구형 Legacy HS256 키는 폐기했다. 앱 환경변수는 `NEXT_PUBLIC_DB_API_URL`·`NEXT_PUBLIC_DB_PUBLISHABLE_KEY`·`DB_SECRET_KEY`를 쓴다.
- **서버 인증 확인**: ECC JWT는 `getClaims()`로 검증한다. 관리자 권한은 별도 `is_admin` RPC와 계정 조회로 확인하며, 요청마다 Auth 서버를 왕복하는 `getUser()`를 백오피스 경로에 다시 넣지 않는다.
- Google·Kakao OAuth의 프로바이더 callback은 `https://db.feelandnote.com/auth/v1/callback`이다. 자체 Auth 설정과 SMTP 값은 서버의 `/opt/feelandnote/supabase/.env`에만 둔다.
- `/usr/local/sbin/feelandnote-db-backup`을 `feelandnote-db-backup.timer`가 매일 실행한다. 논리 덤프를 `age`로 암호화해 R2 `feelandnote-backups/postgres/daily/`에 올리고 업로드 뒤 SHA256을 다시 읽어 대조한다. 설치 원본과 격리 복원 검증기는 `scripts/oracle-db/`가 쥔다. 복구용 age 비밀키는 로컬 `C:\Users\webco\.feelandnote\oracle-db-backup-age.key`에만 있으며 서버에는 공개 recipient만 둔다.

### PostgREST 장애 대응 규칙

- **원인 구조(장애 당시)**: DB VM이 `VM.Standard.E2.1.Micro`(1 OCPU·1 GB, Always Free)에 PostgreSQL·PostgREST·Envoy·Auth·cloudflared를 다 올린 것이었다. PostgREST 풀은 기본 10이었고 anon `statement_timeout`은 15초라, 인물 상세 한 페이지가 동시에 던지는 10여 개 조회에 평균 1.4~3초짜리 RPC(`get_celebs_sorted`·`get_content_celeb_user_counts`·`get_persona_extremes`)가 섞이면 저녁 트래픽만으로 풀이 막힌다. 9월 10일에는 21~22시(KST) 두 시간에 풀 대기 초과(`PGRST003`, HTTP 504)가 1,018건 쌓인 끝에 22:57 PostgREST 프로세스가 굳어 4시간 무응답했다. 데이터·PostgreSQL 손상은 없었고 `docker restart supabase-rest`로 복구했다. 26.09.11 A1.Flex(2 OCPU·12 GB, 전용 코어)로 옮기고 풀을 25로 올렸다.
- **진단 순서**: ① `docker inspect supabase-rest --format '{{.State.Health.Status}}'`, ② PostgREST 관리 서버 지표 `sudo nsenter -t <rest PID> -n curl 'http://[::1]:3001/metrics'`의 `pgrst_db_pool_waiting`·`pgrst_db_pool_available`·`pgrst_db_pool_timeouts_total`, ③ `docker logs --tail 200 supabase-rest`의 `PGRST003`·`PGRST002`·`57014`(로그는 5xx만 남는다), ④ Envoy 통계 `sudo nsenter -t <envoy PID> -n curl -s 127.0.0.1:9901/stats | grep cluster.rest`, ⑤ `pg_stat_activity`의 `authenticator` 세션 상태. PostgreSQL이 정상이고 REST만 무응답이면 `supabase-rest`만 재시작하고 스키마 캐시 로드·health·대표 조회·대표 페이지를 확인한다. PostgreSQL과 `feelandnote-web.service`는 재시작하지 않는다.
- **REST 503(`upstream connect error ... connection termination`)**: 웹 저널에 하루 100~400건 남는 이 오류는 Envoy가 PostgREST로 보낸 요청의 연결이 응답 헤더 전에 끊긴 것이다. 26.09.16 Envoy 통계 5일 누적은 `upstream_cx_destroy_remote_with_active_rq`와 `upstream_rq_503`이 각각 1,622건(전체 요청의 0.14%)으로 같았고 `upstream_rq_retry`는 0건이었다. 웹 조회 재시도가 전부 복구해 최종 실패는 없었다. 유휴 연결 경합은 원인이 아니다 — PostgREST는 유휴 연결을 53~60초 유지해(서버가 30초 주기로 정리) Envoy `rest` 클러스터의 `idle_timeout: 20s`보다 길다. 원인을 확정하지 못했으므로 `idle_timeout`을 줄이는 식의 추측 변경을 하지 않는다. 서버 정적 조회의 `restFetch.ts`는 이 응답 문구가 확인된 GET만 제한적으로 복구하며, 같은 요청 제한 시간을 공유한다. 쓰기·POST RPC·풀 포화·일반 503은 복구 대상이 아니다.
- **VM에서 하지 말 것**: `docker logs`는 반드시 `--tail`을 쓴다. 옛 Micro VM에서는 회전 없는 1.1 GB Envoy 로그를 한 번 읽는 것만으로 풀 대기 초과 270건과 웹 오류 700건이 났다(26.09.11 12:32). 새 VM은 50 MB×3으로 회전하지만 습관은 같다. 행마다 SSH·`docker exec`를 여는 배치도 같은 VM을 눌러 낮 시간 풀 고갈을 만든다(26.09.10 낮 시간당 SSH 로그인 1,300~1,900회). 전량 처리 배치는 SQL을 묶어 한 세션으로 보낸다.
- **Envoy 헬스체크**: `rest` 클러스터는 PostgREST 관리 서버 `/ready`(3001)를 본다(`volumes/api/envoy/cds.yaml`). STRICT_DNS 클러스터라 포트는 `health_checks.alt_port`가 아니라 엔드포인트의 `health_check_config.port_value`에 적는다. `alt_port`는 무시되고 3000번으로 가서 404가 난다. 이전의 `GET /`는 PostgREST OpenAPI 생성이라 5초마다 카탈로그 쿼리 3개를 실행해 전체 요청의 16%·DB 실행 시간 1위였고 부하 때 같이 시간 초과됐다. 되돌리지 않는다. `rest` 클러스터에는 업스트림 유휴 연결 20초 종료(`common_http_protocol_options.idle_timeout`)를 둔다. PostgREST(Warp)가 30초에 먼저 닫으면 닫힌 연결에 요청이 실려 `connection termination`이 하루 3건꼴로 났다. **cds.yaml은 파일 단위 바인드 마운트라 `mv`로 바꿔도 컨테이너는 옛 inode를 본다.** 고친 뒤에는 `docker compose restart api-gw`(2~3초 끊김)로 적용하고 admin `config_dump`로 확인한다.
- **앱 규칙**: 서버 REST 클라이언트(`lib/db/static.ts`·`admin.ts`)는 `lib/db/restFetch.ts`로 응답 대기 30초 상한을 걸고 postgrest-js 자동 재시도(503·네트워크 오류에 1·2·4초 백오프)를 끈다. 포화된 풀에 재시도는 부하를 4배로 만들 뿐이다. 조회는 `error`를 행 없음과 분리해 캐시 함수 안에서 `throwOnQueryError`로 던지고, 공개 함수는 `withQueryFallback`으로 이번 요청만 대체한다(`lib/cache.ts`). 실패를 「자료 없음」으로 캐시하면 API가 복구되어도 404·빈 화면이 7일 남는다. 회귀 검사는 `actions/library/curated.cache.test.ts`·`lib/db/restFetch.test.ts`다.
- **남은 것**: RPC 재작성, SSH 배치 세션 재사용, 클라이언트 재시도 UI는 `docs/todo/web.md`「실화면·운영」이 쥔다.

### Cloudflare 앞단 캐시

- 요청 경로: 브라우저·로봇 → **Cloudflare**(캐시·방화벽·TLS) → 웹 전용 Cloudflare Tunnel → Oracle VM의 Caddy(`127.0.0.1:8080`) → Next.js `feelandnote-web.service` → Oracle DB VM의 Auth·PostgREST.
- 원본 방화벽은 `/etc/iptables/rules.v4`(netfilter-persistent) 한 곳이다. 80·443은 Cloudflare 공식 IPv4 대역만 ACCEPT하고 나머지는 Oracle 이미지 기본 REJECT에 걸린다. UFW는 쓰지 않는다 — 옛 VM(26.08.24~28)에서는 UFW 규칙을 등록했지만 Oracle 이미지의 `rules.v4`가 INPUT 체인 앞을 차지해 UFW 체인은 패킷 0건이었고 80·443이 전 IP에 열려 있었다(26.08.28 실측). Cloudflare에는 이 존 전용 Authenticated Origin Pulls 인증서를 연결했고 Caddy가 해당 CA의 클라이언트 인증서를 필수 검증하므로, Cloudflare를 거치지 않은 원본 HTTPS 요청은 TLS 단계에서 거부된다.
- 공개 HTTPS 예비 경로는 위 이중 검증을 유지하고, 운영 터널 경로는 로컬 전용 리스너로만 받는다. 두 경로 모두 Caddy가 `CF-Connecting-IP`를 `X-Forwarded-For`·`X-Real-IP`로 넘겨 익명 게시판의 IP 제한이 엣지 전체를 한 사용자로 묶지 않게 한다. AOP 인증서는 2028-08-23 만료이며 갱신용 CA는 로컬 `C:\Users\webco\.feelandnote\cloudflare-aop\`에만 보관한다.
- 캐시 대상: 인물·작품 상세, 명부·연표, SEO 이미지(30일). 로그인 쿠키 요청은 우회. 홈·탐색·회원·광장·API·auth는 캐시 안 함.
- **현행 운영 규칙(Cloudflare ruleset v5)**: 인물·작품 상세는 익명의 비-RSC HTML만 30일 캐시한다. 인물 감상 기록의 `/records/` 경로는 앞단 캐시에서 제외하고 Next ISR과 개별 인물 데이터 태그로 갱신한다. 이 HTML 캐시 키는 쿼리를 무시하고, `RSC` 헤더가 있거나 `_rsc` 쿼리가 있는 요청은 우회한다. 인증 쿠키 요청도 계속 우회하고, SEO 이미지는 이미지 변형값이 섞이지 않도록 쿼리를 캐시 키에 유지한다.
- 데이터 변경: DB 트리거 → `/api/revalidate` → Next 태그 즉시 만료 + Cloudflare 퍼지(`lib/cloudflarePurge.ts`) → **다음 방문이 ISR 페이지를 한 번만 재생성**. 사용자 방문 때마다 무효화하지 않는다.
- 코드 배포 뒤에는 `pnpm purge:web:cloudflare -- --scope <범위> --execute`로 필요한 범위(`none|celeb|content|seo|cached-html`)를 비운다. 인자 없이 `--scope`만 주면 보낼 URL을 먼저 보여준다. 자격증명은 환경변수를 먼저 보고 없으면 `sw/web/.env`에서 읽는다. GitHub에서 돌릴 때는 `cloudflare-purge.yml`을 같은 범위로 수동 실행한다 — 계획·검증·payload가 같다. `emergency-zone`은 `PURGE-ENTIRE-FEELANDNOTE-ZONE` 확인문을 정확히 입력한 워크플로에서만 전체 존을 비운다. 로컬 CLI는 전체 존 퍼지를 거부한다.
- 학습·대량수집 봇 차단은 Cloudflare 방화벽이 1차(UA 20종, `sw/web/src/lib/blocked-crawlers.ts`와 동일), 미들웨어 403이 2차다. IP·ASN 규칙은 방문자 주소를 직접 보는 Cloudflare에서 건다.
- 호스팅 ASN 챌린지 규칙(인물·작품 상세, 미검증 봇 대상)에는 Perplexity 예외가 있다(2026-09-11). Perplexity는 2025-08 Cloudflare 검증 봇에서 제명돼 `cf.client.bot`이 거짓이고 공개 IP 대역이 전부 Amazon AS14618이라 예외 없이는 상세에서 챌린지에 막힌다. 예외는 UA(`PerplexityBot`·`Perplexity-User`)와 Perplexity가 공개한 IP 대역(`perplexity.com/perplexitybot.json`·`perplexity-user.json`)을 함께 요구한다. 대역이 바뀌면 규칙의 IP 목록을 갱신한다. 초당 요청 제한은 그대로 받는다.
- Cloudflare AI 봇 정책(Security › Settings › Configure AI bot policies)은 **Search 허용·Agent 허용·Training 허용**으로 명시해 둔다(2026-09-11). Training을 「Block」으로 두면 Cloudflare가 검색·학습 겸용으로 분류하는 Googlebot·BingBot·Applebot까지 **즉시** 차단된다 — 26.09.11 13:15~13:58 실측: AI Crawl Control › Security의 「Block Crawler」 토글이 이 셋에서 켜졌고 Allow로 되돌리자 꺼졌다. 「겸용 크롤러 계속 허용」 라디오는 9월 15일 이후 레거시 규칙에만 걸리는 선택이라 이 즉시 차단을 막지 못한다. 학습 봇 차단은 Cloudflare 정책이 아니라 우리 WAF UA 규칙(1차)과 미들웨어(2차)가 맡고, Google·Apple의 학습 사용은 robots의 Google-Extended·Applebot-Extended가 막는다. 2026-09-15부터의 기본값 「광고 페이지에서 Training·Agent 차단」은 AdSense 스크립트가 전 페이지에 실려 사용자 요청 봇(ChatGPT-User·Claude-User 등)까지 막으므로 Agent 허용을 명시로 유지한다. 이 설정은 API 토큰 권한 밖이라 대시보드에서만 바꾼다.
- Cloudflare 관리 규칙 「Manage AI bots」는 검증되지 않은 IP가 AI 봇 UA를 달고 오면 정책과 무관하게 403(본문 `Your request was blocked.`)을 준다. 따라서 로컬 curl로 OAI-SearchBot·Claude-SearchBot UA를 흉내 낸 시험은 정책이 켜진 동안 403이 나와도 진짜 봇의 처리와 다르다. 진짜 봇의 허용·차단 집계는 AI Crawl Control › Security(봇별 Allowed·Unsuccessful)로 본다.
- 확인 명령: `curl -sI https://feelandnote.com/celeb/<slug> | grep cf-cache-status` (HIT/MISS/DYNAMIC).

### Oracle 사용자 웹 운영

- 운영 앱은 `sw/web` 하나다. `web-bo`·`remotion`·`lab`·`audio-bo`는 로컬에서만 실행한다.
- 웹 터널은 `feelandnote-web`(`30b5e5bd-2fe8-4752-8751-6f837b2395a7`)이며 DB 터널과 분리한다. 루트 DNS는 해당 ID의 `.cfargotunnel.com`을 가리키는 proxied CNAME, `www`는 루트를 가리키는 proxied CNAME이다. 두 hostname의 published application은 `http://127.0.0.1:8080`으로 연결하고 Host 헤더를 덮어쓰지 않는다. Caddy가 `www`를 루트 HTTPS로 돌린다. 웹 VM의 `feelandnote-web-tunnel.service`는 QUIC으로 연결하며 부팅 시 자동 시작한다. 진단은 터널 Healthy·연결 수, 서비스 저널, 로컬 8080 응답, 공개 HTML과 JS·CSS 전체 수신을 함께 확인한다. 공인 443 경로로 되돌려야 하면 루트 DNS를 proxied A `158.179.194.105`로 복원한다.
- Oracle VM은 `ubuntu@158.179.194.105`(`feelandnote-web`, `VM.Standard.E4.Flex` 1 OCPU · burstable 12.5% · 3 GB, 사설 `10.0.0.183`), SSH 키는 로컬 `C:\Users\webco\.ssh\feelandnote_oracle`이다. 크기는 콘솔 Actions → More actions → Edit에서 바꾸며 재부팅이 따르지만 공인 IP는 유지된다(26.08.29 4 GB→3 GB 실측). 웹 프로세스가 실제로 쥐는 메모리(cgroup anon)는 평시 0.67 GB·피크 0.86 GB이고 나머지 cgroup 사용량은 회수 가능한 페이지 캐시다 — 크기를 정할 때 cgroup 총량이 아니라 anon 값을 본다. 26.08.28에 Always Free `E2.1.Micro`(1 GB, `168.107.58.90`)에서 옮겼다 — 1 GB로는 Next.js 서버가 스왑에 잠기고 6시간마다 heap OOM이 났다. 옛 VM(`feelandnote-web-canary`, 168.107.58.90)은 26.09.11 부트 볼륨까지 삭제했다.
- VM을 새로 만들 때는 `scripts/oracle/provision-web-vm.sh`를 VM 안에서 `PUB_IP=<공인IP>`로 실행한다(패키지·Node tarball·스왑·Caddyfile·iptables·systemd 유닛). 비밀(`/etc/feelandnote/web.env`, `/etc/caddy/certs/*`)은 옛 VM에서 로컬 파이프로 옮기고, 첫 슬롯은 옛 VM에서 `rsync`로 채운 뒤 `current` 링크를 건다(배포 스크립트는 활성 서비스를 전제한다). 웹 터널은 별도로 공식 cloudflared 패키지를 설치하고 기존 `/etc/systemd/system/feelandnote-web-tunnel.service`와 전용 토큰을 옮긴 뒤 enable·start한다. 토큰 배치는 `platform-04-env-vars.md`가 쥔다. 유닛에 `HOSTNAME=127.0.0.1`을 넣으면 Next가 자기 프록시를 `https://localhost:3000`으로 만들어 500이 난다 — 넣지 않는다.
- Next.js standalone은 `feelandnote-web.service`가 실행하며, 작업 경로는 `/opt/feelandnote/web/current/sw/web`이다.
- `scripts/oracle/provision-web-vm.sh`를 옮길 때 같은 디렉터리의 `web-runtime-metrics.cjs`와 `prune-render-cache.py`도 함께 옮긴다. 전자는 `/opt/feelandnote/observability/`에 설치해 Node의 `--require`로 먼저 실행한다. `journalctl -u feelandnote-web`의 `feelandnote-runtime` 기록은 heap·RSS·외부 메모리와 처리 중 요청 수, 고정된 경로 종류별 지연·실패 수를 남긴다. URL 인자와 인증 정보는 수집하지 않는다. Caddy의 `/var/log/caddy/web-access.jsonl`은 쿼리·헤더·IP를 제거하며 용량과 보존 기간을 제한한다.
- 렌더 캐시 정리는 `feelandnote-rendercache-clean.timer`가 작은 배치로 실행한다. 보존 기간·디스크 여유·캐시 크기·회당 삭제 상한은 `scripts/oracle/prune-render-cache.py`가 쥔다. 활성 슬롯의 런타임 HTML·RSC·메타를 페이지 단위로 묶고 최근 갱신된 묶음과 실행 코드는 보존한다. canary가 실행 중이면 청소를 건너뛴다. 점검은 VM에서 `python3 /usr/local/sbin/feelandnote-prune-render-cache.py`로 하며 `--execute`가 없으면 삭제하지 않는다. 캐시 디렉터리를 통째로 지우거나 서버의 페이지 캐시를 강제로 비우지 않는다.
- 배포 전 변경한 기능의 실제 동작을 검수한다. `scripts/lib/oracle-web-remote.mjs`는 canary를 띄울 RAM 여유를 먼저 확인하고, 주요 한영 경로를 데운 뒤 새 배포 ID와 재요청 응답 시간을 다시 검사한다. 웜업 도중 canary가 재시작되면 전환하지 않는다. 전환 직후 `scripts/lib/oracle-web-verify.mjs`가 웹·터널 상태와 캐시를 우회한 공개 HTML의 배포 ID, JS·CSS 전체 수신을 한 번 검증하며 실패하면 자동 롤백한다. 검증·canary 정리·필요한 캐시 퍼지가 끝나면 배포를 마친다. 고정 시간 동안 반복 관찰하며 완료를 늦추지 않는다.
- 간헐적 heap 급증은 `scripts/oracle/observe-web-memory.mjs`로 제한된 시간 동안 할당 표본을 수집한다. 백엔드 Node의 inspector는 루프백에서만 열고 수집 후 닫는다. 운영 프로세스의 전체 heap 스냅샷은 추가 메모리와 정지 시간을 요구하므로 RAM 여유를 확인하지 않고 실행하지 않는다.
- 배포본은 `/opt/feelandnote/web/slots/blue`와 `green` 두 고정 슬롯을 번갈아 쓴다. `/opt/feelandnote/web/current` 심볼릭 링크가 활성 슬롯을 가리키며, 반대 슬롯은 다음 배포 대상이자 직전 정상본 롤백 자리다. 첫 슬롯 배포가 공개 검증까지 끝나면 당시 운영 중이던 옛 `releases/<release>`를 반대 슬롯으로 옮기고 나머지 옛 release를 삭제한다.
- 운영 환경변수는 `/etc/feelandnote/web.env`가 쥔다. 값을 저장소나 문서에 복사하지 않는다.
- 운영 서버에서 Next.js 빌드를 돌리지 않는다(빌드는 로컬 격리 worktree 몫이다). `pnpm deploy:web:oracle`이 기본 plan이며, 실제 배포는 커밋을 격리 worktree의 별도 `NEXT_DIST_DIR`에서 빌드한다. `pnpm build:web` 끝의 `check-standalone-runtime.mjs`가 Oracle Linux용 sharp·libvips 포함을 확인해야 한다. canary는 공개 전환 전에 `/explore` 완성 HTML을 두 번 읽어 프로필 목록 캐시를 채우고, 통과하면 전환이 끝날 때까지 살아서 traffic bridge를 맡는다. Caddy가 canary로 운영 요청을 넘긴 사이 기본 웹 프로세스를 새 슬롯으로 교체·검증하고, 준비된 기본 포트로 다시 넘긴 뒤 canary를 내린다.
- 배포 스크립트는 Windows pnpm junction을 슬롯 내부 상대 심볼릭 링크로 복원하고 `.env*`를 차단한다. 빌드마다 Next.js `deploymentId`를 부여하고, 활성 슬롯의 아직 유효한 정적 자산을 staging에 이어 붙여 이전 HTML·열린 탭도 전환 뒤 청크를 잃지 않게 한다. canary는 배포 ID와 대표 상세 HTML의 모든 JS·CSS, 실제 셀럽 SEO 이미지·fallback을 검증한 슬롯만 전환한다. 에이전트 실행 규칙은 `.agents/skills/oracle-web-deploy/SKILL.md`가 맡는다.
- `feelandnote-web.service`는 `Restart=always`, `RestartSec=5s`, `TimeoutStopSec=15s`, Node heap 1280MB(`--max-old-space-size`), `MemoryHigh=1700M`, `MemoryMax=2000M`이다(3 GB VM 기준, 26.08.29). 같은 값이 `scripts/oracle/provision-web-vm.sh` 기본값이며, VM 크기를 바꾸면 이 셋도 함께 옮긴다. 메모리 압력이 높아 정상 종료가 멈춰도 15초 뒤 프로세스를 정리하고 다시 기동한다. heap이 6시간 주기로 차오르던 누수는 26.08.28 운영 heap 스냅샷 보유자 추적으로 잡았다 — `@supabase/supabase-js`가 브라우저 밖에서 `createClient()` 즉시 시작하는 토큰 자동갱신 `setInterval`이 생성 시점의 비동기 컨텍스트(RSC 요청 객체 + React cache + 그 요청의 fetch 응답 전부)를 붙들었고, `createStaticClient()`가 캐시 조회마다 새 클라이언트를 만들어 타이머가 쌓였다. 서버용 클라이언트는 `auth: { autoRefreshToken: false, persistSession: false }`가 필수다(`sw/web/src/lib/db/static.ts` 머리말). `lib/rawFetch.ts`는 호출 시 `globalThis.fetch._nextOriginalFetch`를 찾고 명시적 signal을 전달해 Next의 fetch 캐시와 그 아래 dedupe·응답 복제를 함께 우회한다. 기존 Request의 취소와 명시적 signal·POST 본문·이미지 다운로드 timeout은 유지한다. 26.09.09 실제 Next 16.1.1·PostgREST 테스트로 기존 우회 실패와 수정 후 통과를 확인했고, `8dd8f2b6` 운영 반영과 Cloudflare HTML 캐시 퍼지를 완료했다. 진단 장치는 그대로 둔다: `feelandnote-memlog.timer`가 10분마다 웹 프로세스 RSS를 저널에 남기고(`journalctl -t feelandnote-memlog`), 유닛의 `--heapsnapshot-signal=SIGUSR2`로 `kill -USR2 <MainPID>`하면 `/opt/feelandnote/heap/`에 스냅샷이 떨어진다(`PrivateTmp` 때문에 `/tmp`·`/var/tmp`는 안 된다). 다시 늘면 스냅샷 두 장을 떠서 생성자별 증가분을 대조한다.
- standalone이 절대 redirect를 내부 리슨 주소(`localhost`·`127.0.0.1`·`0.0.0.0`:3000)로 만들면 Caddy가 `Location`을 `https://feelandnote.com`으로 교정한다. Auth 소스도 허용된 forwarded host만 callback origin으로 받는다.
- 실제 배포는 `pnpm deploy:web:oracle -- --execute --confirm DEPLOY-FEELANDNOTE-WEB`로 실행한다. 스크립트가 비활성 Blue/Green 슬롯을 준비하고, Caddy의 실행 중 설정에서 공개 HTTPS와 로컬 터널 리스너의 upstream을 함께 canary로 원자 전환한다. 기존 요청을 비운 뒤 `/opt/feelandnote/web/current`와 `feelandnote-web.service`를 교체·검증하고 Caddy를 기본 포트로 돌려놓으므로 정상 전환에는 웹 재시작 공백이 없다. 활성화나 공개 검증이 실패하면 같은 bridge 위에서 반대 슬롯을 먼저 복구한다. Caddy가 canary를 가리키는 동안에는 정리 단계가 canary 종료를 거부한다. Cloudflare 퍼지 범위가 자동 분류되지 않으면 `--purge-scopes` 결정 전에는 실행하지 않는다.
- 서가 도서 순위는 [예스24 일별 베스트셀러 API](https://developers.yes24.com/api-doc/category-bestseller-daily)와 [미국 Apple Books 유료 차트](https://rss.marketingtools.apple.com/)를 서버에서 읽는다. 예스24는 [공식 FAQ](https://developers.yes24.com/support/faq)에 따라 광고·유료 서비스에서도 사전 승인 없이 이용할 수 있고 서비스에 필요한 캐시도 허용한다. 출처와 상품 링크를 표시하며 전체 카탈로그 축적·데이터 재배포·재판매는 하지 않는다. Apple 차트는 원본 작품 링크를 유지하며 미국 전체 판매순위로 표현하지 않는다. 조회·검증은 `src/lib/library/bestsellerFeed.ts`, 캐시는 `src/actions/library/bestsellers.ts`, 키와 활성화 설정은 [환경변수](platform-04-env-vars.md)가 담당한다. 외부 페이지를 긁어 공개 JSON을 커밋하던 주간 수집 작업은 폐기했다.

### 웹 캐시 무효화 단일 창구 — DB 트리거

- **원칙**: 무효화를 앱 코드나 스크립트가 부르는 것을 전제하지 않는다. 데이터의 90%가 LLM 세션·스크립트·SQL로 들어오므로, **행이 바뀌면 DB가 스스로 `feelandnote.com/api/revalidate`에 태그를 보낸다**(pg_net, 문장 단위 트리거 + 전이 표 → 한 문장에 HTTP 한 번). 운영에 적용한 트리거·태그 매핑의 재현 원천은 `sw/web/database/migrations/20260820093729_harden_web_revalidation_triggers.sql`이다. 주석만 남은 `20260816052000_web_revalidate_triggers.sql`을 현행 원본으로 사용하지 않는다.
- 일반 변경은 항목 태그로 Next 캐시와 Cloudflare URL을 같이 비운다. 대량 반영은 `domain:__all__`(예: `celebs:__all__`, `contents:__all__`)로 해당 도메인의 Next 상세 캐시를 전량 만료시키고 Cloudflare `purge_everything`을 딱 한 번 호출한다. 인물·작품 페이지는 `revalidate = false`이므로 변경 후 첫 방문이 한 번 재생성하고 그 다음부터 재사용한다. 조회수(`celebs.view_count`)·시각 갱신만 있는 문장은 리스트를 비우지 않는다.
- `/api/revalidate`는 도메인만 있는 목록 태그를 `revalidateTag(tag, 'max')`로 갱신한다. 기존 정상 목록을 먼저 제공하고 새 데이터는 백그라운드에서 조회하므로 연속된 인물 수정이 방문자를 매번 DB 재조회에 묶지 않는다. `domain:id` 개별 태그와 `/api/revalidate/v2`의 명시적 대량 요청은 `{ expire: 0 }`으로 즉시 만료한다. 정책 선택은 `sw/web/src/app/api/revalidate/handler.ts`가 쥐며, 이어서 기존 범위대로 Cloudflare 퍼지를 수행한다. 퍼지 대상이 있는데 자격증명이 없으면 503, Cloudflare HTTP·본문 응답이 실패하면 502이며 둘 다 `revalidated: true`, `complete: false`를 반환한다. 이 응답은 성공이 아니므로 호출자는 재시도·운영 조치를 해야 한다. 앞단 퍼지가 필요 없는 태그만 받으면 `not_needed`로 완료할 수 있다.
- 확인: `select * from net._http_response order by id desc limit 5;`에서 status 200과 응답 본문의 `complete: true`를 같이 본다. 백오피스의 `revalidateWebCache()` 호출은 DB 트리거와 중복되어도 무해하지만, 호출했다면 반드시 `complete: true`까지 검증한다.
- **로컬 개발 서버의 `/api/revalidate`도 운영 Cloudflare를 비운다.** 로컬 `sw/web/.env`에 `CLOUDFLARE_ZONE_ID`·`CLOUDFLARE_API_TOKEN`이 있으면 같은 핸들러가 태그에 딸린 `feelandnote.com` URL을 그대로 퍼지한다(26.09.12 실측 — 로컬 화면 확인용으로 `tags`·`celebs`를 던졌는데 응답이 운영 URL 퍼지와 `complete: true`를 돌려줬다). 데이터는 바뀌지 않아 해가 없지만 운영 앞단 캐시를 비우는 행동이다. 로컬 확인만 필요하면 태그를 가장 좁게 던지고, 운영 퍼지가 일어났다는 사실을 보고에 적는다.
- 새 표를 웹이 읽게 되면 주석 파일을 복사하지 말고 새 migration에 태그 매핑과 트리거를 재현 가능하게 추가한다. 비밀키는 Vault `web_revalidate_secret`(=CRON_SECRET) — 키를 돌리면 Oracle `/etc/feelandnote/web.env`·로컬 `.env`·Vault를 함께 바꾼다.
- **도메인 허용 목록**: 원천은 `packages/shared/src/constants/cache-tags.ts`의 `CACHE_TAGS` 하나다. DB 트리거가 쓰는 사본은 `web_revalidate_allowed_domains()` 한 곳에만 두고 `web_revalidate_send`가 이를 호출한다. 사본에 없는 도메인의 태그는 경고(`discarded % structurally unsafe cache tag(s)`)만 남기고 버려지므로, 원천을 바꾸면 사본 마이그레이션을 함께 쓴다. `pnpm check:cache-tags`가 대조하고 붙여 넣을 SQL을 출력하며, `pnpm deploy:web:oracle`이 격리 빌드 전에 같은 검사를 강제한다. 26.09.04 `fiction-sources`→`figure-books` 이름 변경 때 사본만 옛 이름에 남아 26.09.14~16 태그 1,608건이 버려졌다.

### 공개 조회 문장 제한·인덱스

- anon 역할의 `statement_timeout`은 15초다. 부분 인덱스의 재현 원천은 `sw/web/database/migrations/20260816040000_*.sql`이다.
- 기질별 서재 조회는 짝(celeb_id, content_id)만 받은 뒤 뽑힌 작품에만 메타를 붙인다. 성향 분포·닮은 인물은 같은 명단 캐시(`celeb_metrics`)를 공유하고, `cachedList/cachedDetail` 만료 시각은 키별로 어긋나게 둔다(`spreadRevalidate`).
- **남은 것**: `get_celebs_sorted`(전 컬럼 2,406행 실체화)·`get_chosen_scriptures`(전량 집계 후 LIMIT 12)·`get_celeb_feed_type_counts` RPC 재작성 — 반환 형태를 건드려 별도 작업.

## 외부 콘텐츠 검색 API

콘텐츠(도서·영상·게임·음악) 메타 조회에 쓰는 외부 API. 래퍼는 `packages/content-search/`.

| 유형 | 제공처 | 상태 |
|------|--------|------|
| BOOK (한국어판) | **카카오(다음) 도서 검색** | 정상 (`kakao-books.ts`). ~~네이버 도서 검색~~은 26.07.31 종료 |
| BOOK (영문 원서) | OpenLibrary | 정상 |
| BOOK 소개문 | Google Books | 소개문(`description`) 수집에만 예외로 허용한다. 무료 키의 일일 한도 안에서만 부른다. 대량 수집 배치는 사용자가 승인한 예외로 키 풀(`sw/web-bo/scripts/contents/gbooks-keypool.ts`, 키당 일일 상한과 사용량 기록)을 돈다. 메타·표지 원천으로는 계속 금지한다 |
| VIDEO | TMDB | 메타 검색 연동. 상업 라이선스는 별도 확인 필요 |
| GAME | IGDB | 메타 검색 연동. 상업 파트너 등록은 별도 확인 필요 |
| MUSIC | **Apple iTunes Search API / Apple Music** | 정상 (`itunes-music.ts`) |
| 뉴스·블로그·이미지 | 네이버 검색 | 정상 (`naver-news.ts`·`naver-blog.ts`·`naver-image.ts`) |

TMDB·IGDB의 API 키 발급과 상업 이용 절차는 별개다. Feel&Note의 문의 진행 상태는 [사용자 웹 남은 작업](../../todo/web.md#구현)이 쥔다.

- **TMDB**: [공식 FAQ](https://developer.themoviedb.org/docs/faq)는 계정 설정에서 API 키를 발급하고, 상업용 데이터·이미지 라이선스는 운영 국가를 포함해 `sales@themoviedb.org`로 문의하도록 안내한다. 키가 발급됐다는 사실만으로 상업 이용 허가를 받은 것으로 판단하지 않는다.
- **IGDB**: [공식 Partnership 안내](https://api-docs.igdb.com/#partnership)는 상업 계약 등록을 `partner@igdb.com`으로 요청하도록 안내한다. [Business FAQ](https://api-docs.igdb.com/#business-related-faq)는 상업용 API도 무료이며 사용자에게 보이는 고정 위치에 출처를 표시하도록 한다. Twitch 개발자 포털의 앱 등록·자격증명 발급은 이 파트너 등록과 별개다.

**Apple 공개 차트와 수익 제휴도 구분한다.** [공식 도구 안내](https://performance-partners.apple.com/tools)는 음악·앱·도서 등의 RSS 목록을 웹사이트에 넣는 용도를 제공한다. 베스트셀러는 이 공개 피드의 정보·이미지와 원본 작품 링크를 사용하며 Apple 제휴 추적 토큰을 붙이지 않는다. 음악·영화 카드에는 공식 배지를 표시한다. 국가·매체별 제공 범위는 [작품 화면](../service/service-02-library.md#인기-작품-갱신)을 따른다. 수수료를 받는 Performance Partner Program은 별도 신청이며, [현재 신청 안내](https://performance-partners.apple.com/partners)는 Apple 스토어에 콘텐츠를 가진 권리자와 초대받은 일부 파트너를 대상으로 한다. Feel&Note는 현재 해당 권리자 자격이나 초대를 확인하지 못했으므로 Apple 수익 제휴 신청을 진행하지 않는다. 공개 차트는 일반 링크로 제공하며, 출처 안내에 이 링크를 통한 구매·구독 수수료 수익이 없음을 표시한다.

**Steam 게임 차트**는 공개 호스트 `api.steampowered.com`의 `ISteamChartsService/GetGamesByConcurrentPlayers/v1`와 `IStoreBrowseService/GetItems/v1`를 인증 키 없이 읽는다. [Web API 안내](https://partner.steamgames.com/doc/webapi_overview)는 공개 HTTP 메서드를 설명하고, [이용 약관](https://steamcommunity.com/dev/apiterms)은 앱을 통한 Steam 데이터 표시와 원본 링크 사용 조건을 정한다. 출처·집계 시각·원본 게임 링크를 표시하고 제휴 관계로 표현하지 않는다. [Steam 공식 안내](https://partner.steamgames.com/doc/marketing/utm_analytics?l=english)는 Steam 자체의 판매 제휴 프로그램이 없다고 명시한다. 따라서 Steam 수익 제휴 신청은 진행하지 않으며, 출처 안내에 해당 링크의 수수료 수익이 없음을 표시한다. 개별 차트 메서드는 현재 공식 레퍼런스에 상세 규격이 없어 응답 변경·중단 가능성을 고려해 검증과 캐시 만료를 적용한다. 조회·검증은 `src/lib/library/steamChart.ts`, 캐시는 `src/actions/library/steamChart.ts`, 화면은 [작품 화면](../service/service-02-library.md#인기-작품-갱신)이 쥔다.

### Apple 음악 연동

- 신규 검색과 단건 조회는 `packages/content-search/src/itunes-music.ts`만 사용한다.
- `contents.external_source='itunes'`를 사용한다. 곡은 `external_id='itunes-{trackId}'`, 앨범은 `external_id='itunes-{collectionId}'`로 저장하고 `metadata.albumType`으로 구분한다. 앨범 후보는 `searchMusicAlbums`로 찾은 뒤 단건 조회에서 해당 앨범 수록곡의 `previewUrl`까지 확인한다.
- `previewUrl`이 있는 결과만 저장하고 서비스 플레이어가 30초 미리듣기를 직접 재생한다. 상세와 플로팅 플레이어에는 `itunesUrl`을 Apple Music 전곡 링크로 표시한다.
- Search API 제한은 약 분당 20회다. 호출은 순차 처리하고 403/429를 결과 없음이나 기각으로 기록하지 않는다.
- 과거에는 Spotify를 음악 메타와 재생에 사용했으나 현재는 완전히 폐기했다.

### 카카오(다음) 도서 검색

- 래퍼: `packages/content-search/src/kakao-books.ts`. 반환 타입을 네이버와 같은 모양으로 맞춰 호출부는 import 경로만 바꿨다.
- 키: `KAKAO_REST_API_KEY`(`sw/web/.env`·`sw/web-bo/.env`). 카카오 앱 `feelandnote`(ID 1366184)의 REST API 키이며, 책 검색은 별도 제품 설정·심사 없이 이 키만으로 호출된다.
- `contents.external_source` 허용값은 `kakao_book`과 표기 전용 `aladin`(API 없이 사람이 서점 상품 페이지로 ISBN·표지를 확보한 건)이다. `naver_book`은 허용값에서 빠졌다.
- 네이버 검색 API의 「쇼핑·책·전문자료」는 2026-07-31에 종료됐고(HTTP 404 `SE05`), API 문서 페이지는 종료 문구 없이 남아 있다. 문서가 아니라 실제 호출을 믿는다. 도서 관련 네이버 코드는 전량 제거했으며 되살리지 않는다. 같은 키의 **뉴스·블로그·이미지 검색**은 정상이라 계속 쓴다(블로그는 기록 참고 자료, 이미지는 인물 사진 찾기, 뉴스는 오늘의 인물).

**네이버와 다른 점 (구현 시 주의)**

| 항목 | 카카오의 동작 |
|------|---------------|
| ISBN | `"8954655971 9788954655972"`처럼 10자리·13자리가 한 칸에 온다. `pickIsbn()`이 13자리를 우선 고른다 |
| 표지 | 응답 `thumbnail`은 R120x174로 작고, 크기를 키워 요청하면 403이다. `fname` 파라미터에 담긴 다음 원본 주소(`t1.daumcdn.net`)를 꺼내 https로 승격해 쓴다 |
| 판매 상태 | `status`(정상판매·품절·절판)가 응답에 들어온다 → `metadata.salesStatus`. **서점 상품 페이지 실재 확인을 이걸로 대신할 수 있다** |
| 지정 검색 | `target=title\|isbn\|publisher\|person`. 검색어가 ISBN 하나면 자동으로 `target=isbn`으로 전환한다 |
| 페이지 | `page` 1~50, `size` 1~50. `meta.is_end`로 다음 쪽 유무를 판단한다 |

**알라딘 API는 붙이지 않는다.** 카카오는 기존 한국어판 표본을 100% 잡았고(26.08.01 ISBN 지정 조회 65/65), 놓치는 것은 영문 원서 일부(OpenLibrary 몫)와 절판된 한국 구간 도서 소수뿐이다. 후자는 사람이 서점 상품 상세 페이지를 확인하는 예외 경로로 처리한다. 알라딘 TTB는 키 승인과 일 호출 상한이 있어 이 이득으로 들일 비용이 아니다. 국립중앙도서관 서지는 서지는 정확하나 표지가 약해 단독으로 부족하다.

- **`aladin` 출처값은 표기 전용이다.** 이를 조회하는 API 래퍼는 없다(의도된 상태).
- 알라딘을 실제로 붙여야 할 상황: 절판 구간 도서를 대량으로 다뤄야 할 때. 그때 TTB 키를 신청한다.

## Cloudflare R2 (이미지 저장소)
셀럽 아바타 이미지를 Cloudflare R2에 저장한다. S3 호환 API 사용.
- **버킷명**: `feelandnote`
- **Public URL**: `https://assets.feelandnote.com`. 26.08.25 custom domain 연결과 실제 `MISS → HIT` 캐시를 확인했다. 웹 배포와 참조 전환 뒤 R2 개발용 `r2.dev` 공개 URL은 껐다.
- **오브젝트 경로**: `celebs/{celebId}/avatar.webp`
- **URL 형식**: `{R2_PUBLIC_URL}/celebs/{celebId}/avatar.webp?v={timestamp}`
- **환경변수**: 세 앱의 `.env`와 Oracle `/etc/feelandnote/web.env`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- **캐시 정책(26.08.25 전수 확인)**: 9,609개 전 오브젝트가 `Cache-Control: public, max-age=31536000, immutable`이다. URL의 `?v=` 버전 표식이 캐시를 깨므로 안전하다(이미지는 업로드마다 `Date.now()`, 음성은 `voice_v` 증가). 해시·timestamp가 들어간 새 키를 쓰는 로고와 회원 아바타도 같은 원칙이다. **`no-cache, must-revalidate`로 되돌리지 마라** — 아바타가 접속마다 재검증 왕복을 강제당해 대량 노출 화면에서 매번 로딩이 걸리던 원인이었다.
- **호스트 전환(26.08.25)**: DB 원본 4개 테이블을 custom domain으로 바꿨고 public 텍스트 필드 306개의 옛 호스트 참조가 0건임을 확인했다. 클라이언트 음성 URL과 SEO 이미지 허용 호스트도 custom domain으로 배포했고, SEO 이미지 캐시를 경로 단위로 비운 뒤 실제 이미지의 `MISS → HIT`를 확인했다.
- **DB 백업 버킷**: `feelandnote-backups`. 외부 공개 경로와 CORS가 없고 `postgres/`은 30일 뒤 만료된다. `postgres/daily/`에는 위 self-hosted 백업 서비스가 만든 age 암호문만 둔다.
- 같은 비공개 버킷의 `research/celebs/`는 인물 조사 자료의 서버 정본이다. 경로와 처리 규칙은 [`data/celeb/README.md`](../../../data/celeb/README.md#서버-조사-자료)가 쥐며 `postgres/` 백업·만료 범위와 분리한다.
- **클라이언트**: `sw/web-bo/src/lib/r2.ts` — `uploadToR2()`, `deleteFromR2()`
- **업로드 로직**: `sw/web-bo/src/actions/admin/storage.ts`

## Google Analytics

- GA4 Measurement ID: `G-LMVY8KTJ7T` (layout.tsx에 설정)
- GA4 Property ID: `526353156`
- Service Account: `claude-analytics@feelandnote.iam.gserviceaccount.com`
- 크리덴셜 파일: `sw/web/credentials/ga-service-account.json` (.gitignore 등록)
- env: `sw/web/.env` → `GA_PROPERTY_ID`, `GA_CREDENTIALS_PATH`
- 활성화된 API: Google Analytics Data API. Admin API는 미활성화라 맞춤 측정기준 등록 같은 설정 변경은 관리 화면에서 사람이 한다.
- 조회: 전용 MCP가 없다. `sw/web/scripts/ga4-celeb-views.mjs`가 서비스계정 JWT로 `runReport`를 직접 부른다(의존성 없음). 예: `node scripts/ga4-celeb-views.mjs <시작일> <종료일>` → 인물별 페이지뷰·순 방문자·접속 수.
- 행동 이벤트 정의의 원천은 `sw/web/src/lib/analytics/track.ts`다. 이벤트 매개변수(`section`·`source`·`to`·`from`·`kind`)는 맞춤 측정기준으로 등록돼 있다. **맞춤 측정기준은 등록 이전 데이터에 소급되지 않으므로** 새 매개변수는 배포보다 등록을 먼저 한다.
- 데이터 보관은 14개월(무료 등급 최대치)이다.
- 인물 조회수는 GA4와 DB(`celebs.view_count`)가 사실상 일치한다. DB가 조금 큰 것은 광고 차단 접속까지 세기 때문이라 DB 값을 보정 없이 쓴다. 중복 제거 창은 30분이다.
- 인물 상세처럼 한 장에 여러 칸을 담은 화면은 페이지/세션으로 참여도를 재지 않는다. 겹창(`CelebDetailModal`)은 화면 전환을 의도적으로 줄이므로 그 지표가 낮아지는 것이 설계대로다. 체류·칸 도달(`celeb_section_view`)·겹창 열림(`celeb_person_open`)으로 잰다.
- 네이버는 GA에 검색어를 넘기지 않는다. 네이버 유입의 검색어는 서치어드바이저 화면에서만 본다.

## 음성 R2 경로 규칙

- R2 키: `celebs/{id}/voice/{locale}/{prefix}{variant}.mp3` (고정 경로, 덮어쓰기)
- URL 캐시 버스터: `?v={voice_v}` (경로가 아닌 쿼리 파라미터)
- SSoT: `sw/web-bo/src/lib/voice-path.ts` (상수 + 유틸)
- web 클라이언트: `sw/web/src/lib/game/voice/voiceUrl.ts` (동일 패턴)

# 크론잡

## Oracle systemd timer

| 경로 | 스케줄 | 설명 |
|------|--------|------|
| `/api/cron/today-figure` | `5 15 * * *` (매일 00:05 KST) | 오늘의 인물 선정 (뉴스 → 생일 → seed). 순위와 임계값은 라우트 머리 주석이 쥔다 |

- `feelandnote-today-figure.timer`가 `feelandnote-today-figure.service`를 실행한다. `Persistent=true`라 예약 시각에 VM이 꺼져 있었으면 복구 뒤 누락 실행을 보완한다.
- 인증: `/etc/feelandnote/web.env`의 `CRON_SECRET`
- 추천 노출 제외 인물(학살 책임자·독재자)은 `packages/shared/src/constants/celeb-feature-exclusion.ts` 명단이 쥔다. 크론과 화면의 되짚기(생일·seed)가 같은 명단을 본다. 이미 저장된 `daily_figures` 행은 명단을 거치지 않으므로, 당일 교체는 그 행을 직접 고치고 `celebs` 태그를 무효화한다.

## GitHub Actions (.github/workflows/)

| 워크플로우 | 스케줄 | 설명 |
|-----------|--------|------|
| `warm-web.yml` | `17 * * * *` (매시) | 공개 허브의 데이터 캐시를 데우면서 핵심 화면·인물·SEO 경로가 모두 2xx인지 확인한다. 하나라도 실패하면 작업 자체를 실패시켜 별도 유료 모니터링 없이 GitHub Actions 알림을 쓸 수 있다 |

배포 시 웜업 대상은 `scripts/lib/oracle-web-remote.mjs`의 `MAIN_WARMUP_ROUTES`, 매시 점검 대상은 `.github/workflows/warm-web.yml`이 쥔다. 주소를 개편하면 둘 다 정본 경로로 바꾼다. 작품은 베스트셀러와 `?mode=classics`를 한영 각각 점검한다. 예약 워크플로우는 GitHub 기본 브랜치의 파일을 사용하므로 릴리스 브랜치 배포만으로 갱신되지 않는다. 웜업 성공은 캐시·응답 검증이며 검색엔진의 수집·색인 완료를 뜻하지 않는다.
