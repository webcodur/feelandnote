# 외부 서비스

> **최종 실측 체크: 26.08.26** — Oracle DB VM의 Auth·PostgREST, OAuth 시작 경로, 웹 캐시 webhook, 암호화 백업과 격리 복원을 확인했다.

## Oracle DB 운영

- 공개 Auth·REST 주소는 `https://db.feelandnote.com`이다. Cloudflare Tunnel이 Oracle DB VM의 Envoy로 연결하며 PostgreSQL 포트는 외부에 열지 않는다.
- DB VM은 `ubuntu@152.67.216.40`, SSH 키는 로컬 `C:\Users\webco\.ssh\feelandnote_oracle`이다. 배포 루트는 `/opt/feelandnote/supabase`이고 PostgreSQL·Auth·PostgREST·Envoy만 상시 실행한다.
- SQL은 SSH를 거쳐 실제 컨테이너 이름인 `supabase-db`의 PostgreSQL에 실행한다. 헤드라인 일괄 반영 도구도 이 경로를 쓴다.
- **키**: 브라우저·서버는 각각 `sb_publishable_...`·`sb_secret_...` 형식을 쓴다. JWT 기반 구형 API 키는 비활성화했고 Auth는 ECC 서명키로 회전했으며, 구형 Legacy HS256 키는 폐기했다. 코드의 환경변수 이름은 호환을 위해 그대로다.
- **서버 인증 확인**: ECC JWT는 `getClaims()`로 검증한다. 관리자 권한은 별도 `is_admin` RPC와 계정 조회로 확인하며, 요청마다 Auth 서버를 왕복하는 `getUser()`를 백오피스 경로에 다시 넣지 않는다.
- Google·Kakao OAuth의 프로바이더 callback은 `https://db.feelandnote.com/auth/v1/callback`이다. 자체 Auth 설정과 SMTP 값은 서버의 `/opt/feelandnote/supabase/.env`에만 둔다.
- `/usr/local/sbin/feelandnote-db-backup`을 `feelandnote-db-backup.timer`가 매일 실행한다. 논리 덤프를 `age`로 암호화해 R2 `feelandnote-backups/postgres/daily/`에 올리고 업로드 뒤 SHA256을 다시 읽어 대조한다. 설치 원본과 격리 복원 검증기는 `scripts/supabase/`가 쥔다. 복구용 age 비밀키는 로컬 `C:\Users\webco\.feelandnote\supabase-backup-age.key`에만 있으며 서버에는 공개 recipient만 둔다.

### Cloudflare 앞단 캐시 (2026-08-16 가동)

- 요청 경로: 브라우저·로봇 → **Cloudflare**(캐시·방화벽·TLS) → Oracle VM의 Caddy → Next.js `feelandnote-web.service` → Oracle DB VM의 Auth·PostgREST.
- 원본 방화벽은 `/etc/iptables/rules.v4`(netfilter-persistent) 한 곳이다. 80·443은 Cloudflare 공식 IPv4 대역만 ACCEPT하고 나머지는 Oracle 이미지 기본 REJECT에 걸린다. UFW는 쓰지 않는다 — 옛 VM(26.08.24~28)에서는 UFW 규칙을 등록했지만 Oracle 이미지의 `rules.v4`가 INPUT 체인 앞을 차지해 UFW 체인은 패킷 0건이었고 80·443이 전 IP에 열려 있었다(26.08.28 실측). Cloudflare에는 이 존 전용 Authenticated Origin Pulls 인증서를 연결했고 Caddy가 해당 CA의 클라이언트 인증서를 필수 검증하므로, Cloudflare를 거치지 않은 원본 HTTPS 요청은 TLS 단계에서 거부된다.
- 이 이중 검증 뒤에만 Caddy가 `CF-Connecting-IP`를 `X-Forwarded-For`·`X-Real-IP`로 넘겨 익명 게시판의 IP 제한이 엣지 전체를 한 사용자로 묶지 않게 한다. AOP 인증서는 2028-08-23 만료이며 갱신용 CA는 로컬 `C:\Users\webco\.feelandnote\cloudflare-aop\`에만 보관한다.
- 캐시 대상: 인물·작품 상세, 명부·연표, SEO 이미지(30일). 로그인 쿠키 요청은 우회. 홈·탐색·회원·광장·API·auth는 캐시 안 함.
- **현행 운영 규칙(Cloudflare ruleset v4)**: 인물·작품 상세는 익명의 비-RSC HTML만 30일 캐시한다. 이 HTML 캐시 키는 쿼리를 무시하고, `RSC` 헤더가 있거나 `_rsc` 쿼리가 있는 요청은 우회한다. 인증 쿠키 요청도 계속 우회하고, SEO 이미지는 이미지 변형값이 섞이지 않도록 쿼리를 캐시 키에 유지한다.
- 데이터 변경: DB 트리거 → `/api/revalidate` → Next 태그 즉시 만료 + Cloudflare 퍼지(`lib/cloudflarePurge.ts`) → **다음 방문이 ISR 페이지를 한 번만 재생성**. 사용자 방문 때마다 무효화하지 않는다.
- 코드 배포 뒤에는 `pnpm purge:web:cloudflare -- --scope <범위> --execute`로 필요한 범위(`none|celeb|content|seo|cached-html`)를 비운다. 인자 없이 `--scope`만 주면 보낼 URL을 먼저 보여준다. 자격증명은 환경변수를 먼저 보고 없으면 `sw/web/.env`에서 읽는다. GitHub에서 돌릴 때는 `cloudflare-purge.yml`을 같은 범위로 수동 실행한다 — 계획·검증·payload가 같다. `emergency-zone`은 `PURGE-ENTIRE-FEELANDNOTE-ZONE` 확인문을 정확히 입력한 워크플로에서만 전체 존을 비운다. 로컬 CLI는 전체 존 퍼지를 거부한다.
- 학습·대량수집 봇 차단은 Cloudflare 방화벽이 1차(UA 22종), 미들웨어 403이 2차다. IP·ASN 규칙은 방문자 주소를 직접 보는 Cloudflare에서 건다.
- 확인 명령: `curl -sI https://feelandnote.com/celeb/<slug> | grep cf-cache-status` (HIT/MISS/DYNAMIC).
- **이관 직후 DNS 전파 편차(2026-08-17):** 이관 다음날 일부 국내 ISP 리졸버가 구 경로를 캐싱해 접속 실패(PWA 오프라인 화면) 신고 있었음. Cloudflare DNS(1.1.1.1) 직접 조회로 신규 엣지 정상 확인 — 신·구 경로 둘 다 응답 정상이라 서버 장애가 아니라 리졸버별 전파 편차로 판정. 봇 차단 UA(`blocked-crawlers.ts`)는 구체 문자열 매칭이라 오탐 원인 아님.
- **같은 날 재발 확인:** 몇 시간 뒤 같은 사용자가 재차 접속 실패 보고. 재진단 결과 해당 ISP 리졸버가 **조회할 때마다** 구 IP(`216.150.x.x`)와 신규 Cloudflare 엣지 IP(`172.67.x.x`/`104.21.x.x`) 사이를 오락가락(5회 중 2~3회꼴로 뒤바뀜). 두 경로 각각은 10연속 200 OK로 개별 안정 — 신·구 원본 서버와 Cloudflare 장애는 배제, 원인은 ISP 리졸버 클러스터의 캐시 미정렬이며 우리 쪽에서 고칠 수 있는 지점이 아니다. **즉시 우회책**: 기기·공유기 DNS를 `1.1.1.1` 또는 `8.8.8.8`로 수동 지정하면 오락가락 없이 항상 정상 접속됨(모바일 데이터 전환도 우회됨). 언제 완전히 정착될지는 해당 ISP 쪽 일정이라 예측 불가 — 재발 신고가 오면 이 항목부터 참조하고 신규 원인부터 찾지 않는다.

### Oracle 사용자 웹 운영

- 운영 앱은 `sw/web` 하나다. `web-bo`·`remotion`·`lab`·`audio-bo`는 로컬에서만 실행한다.
- Oracle VM은 `ubuntu@158.179.194.105`(`feelandnote-web`, `VM.Standard.E4.Flex` 1 OCPU · burstable 12.5% · 3 GB, 사설 `10.0.0.183`), SSH 키는 로컬 `C:\Users\webco\.ssh\feelandnote_oracle`이다. 크기는 콘솔 Actions → More actions → Edit에서 바꾸며 재부팅이 따르지만 공인 IP는 유지된다(26.08.29 4 GB→3 GB 실측). 웹 프로세스가 실제로 쥐는 메모리(cgroup anon)는 평시 0.67 GB·피크 0.86 GB이고 나머지 cgroup 사용량은 회수 가능한 페이지 캐시다 — 크기를 정할 때 cgroup 총량이 아니라 anon 값을 본다. 26.08.28에 Always Free `E2.1.Micro`(1 GB, `168.107.58.90`)에서 옮겼다 — 1 GB로는 Next.js 서버가 스왑에 잠기고 6시간마다 heap OOM이 났다. 옛 VM은 롤백 자리로 남겨 두되 서비스는 내린다.
- VM을 새로 만들 때는 `scripts/oracle/provision-web-vm.sh`를 VM 안에서 `PUB_IP=<공인IP>`로 실행한다(패키지·Node tarball·스왑·Caddyfile·iptables·systemd 유닛). 비밀(`/etc/feelandnote/web.env`, `/etc/caddy/certs/*`)은 옛 VM에서 로컬 파이프로 옮기고, 첫 슬롯은 옛 VM에서 `rsync`로 채운 뒤 `current` 링크를 건다(배포 스크립트는 활성 서비스를 전제한다). 유닛에 `HOSTNAME=127.0.0.1`을 넣으면 Next가 자기 프록시를 `https://localhost:3000`으로 만들어 500이 난다 — 넣지 않는다.
- Next.js standalone은 `feelandnote-web.service`가 실행하며, 작업 경로는 `/opt/feelandnote/web/current/sw/web`이다.
- 배포본은 `/opt/feelandnote/web/slots/blue`와 `green` 두 고정 슬롯을 번갈아 쓴다. `/opt/feelandnote/web/current` 심볼릭 링크가 활성 슬롯을 가리키며, 반대 슬롯은 다음 배포 대상이자 직전 정상본 롤백 자리다. 첫 슬롯 배포가 공개 검증까지 끝나면 당시 운영 중이던 옛 `releases/<release>`를 반대 슬롯으로 옮기고 나머지 옛 release를 삭제한다.
- 운영 환경변수는 `/etc/feelandnote/web.env`가 쥔다. 값을 저장소나 문서에 복사하지 않는다.
- 운영 서버에서 Next.js 빌드를 돌리지 않는다(빌드는 로컬 격리 worktree 몫이다). `pnpm deploy:web:oracle`이 기본 plan이며, 실제 배포는 커밋을 격리 worktree의 별도 `NEXT_DIST_DIR`에서 빌드한다. `pnpm build:web` 끝의 `check-standalone-runtime.mjs`가 Oracle Linux용 sharp·libvips 포함을 확인해야 한다. canary는 공개 전환 전에 `/explore` 완성 HTML을 두 번 읽어 프로필 목록 캐시를 채우고, 두 번째 응답이 5초 안에 들어오는 슬롯만 통과시킨다. 전환 뒤 활성 서비스도 같은 주소를 다시 읽어 캐시 승계를 확인한다.
- 배포 스크립트는 Windows pnpm junction을 슬롯 내부 상대 심볼릭 링크로 복원하고 `.env*`를 차단한다. 빌드마다 Next.js `deploymentId`를 부여하고, 활성 슬롯의 아직 유효한 정적 자산을 staging에 이어 붙여 이전 HTML·열린 탭도 전환 뒤 청크를 잃지 않게 한다. canary는 배포 ID와 대표 상세 HTML의 모든 JS·CSS, 실제 셀럽 SEO 이미지·fallback을 검증한 슬롯만 전환한다. 에이전트 실행 규칙은 `.agents/skills/oracle-web-deploy/SKILL.md`가 맡는다.
- `feelandnote-web.service`는 `Restart=always`, `RestartSec=5s`, `TimeoutStopSec=15s`, Node heap 1280MB(`--max-old-space-size`), `MemoryHigh=1700M`, `MemoryMax=2000M`이다(3 GB VM 기준, 26.08.29). 같은 값이 `scripts/oracle/provision-web-vm.sh` 기본값이며, VM 크기를 바꾸면 이 셋도 함께 옮긴다. 메모리 압력이 높아 정상 종료가 멈춰도 15초 뒤 프로세스를 정리하고 다시 기동한다. heap이 6시간 주기로 차오르던 누수는 26.08.28 운영 heap 스냅샷 보유자 추적으로 잡았다 — `@supabase/supabase-js`가 브라우저 밖에서 `createClient()` 즉시 시작하는 토큰 자동갱신 `setInterval`이 생성 시점의 비동기 컨텍스트(RSC 요청 객체 + React cache + 그 요청의 fetch 응답 전부)를 붙들었고, `createStaticClient()`가 캐시 조회마다 새 클라이언트를 만들어 타이머가 쌓였다. 서버용 클라이언트는 `auth: { autoRefreshToken: false, persistSession: false }`가 필수다(`sw/web/src/lib/supabase/static.ts` 머리말). 서버 조회는 Next 패치 fetch 대신 원본 fetch를 쓴다(`lib/rawFetch.ts`). 진단 장치는 그대로 둔다: `feelandnote-memlog.timer`가 10분마다 웹 프로세스 RSS를 저널에 남기고(`journalctl -t feelandnote-memlog`), 유닛의 `--heapsnapshot-signal=SIGUSR2`로 `kill -USR2 <MainPID>`하면 `/opt/feelandnote/heap/`에 스냅샷이 떨어진다(`PrivateTmp` 때문에 `/tmp`·`/var/tmp`는 안 된다). 다시 늘면 스냅샷 두 장을 떠서 생성자별 증가분을 대조한다.
- standalone이 절대 redirect를 내부 리슨 주소(`localhost`·`127.0.0.1`·`0.0.0.0`:3000)로 만들면 Caddy가 `Location`을 `https://feelandnote.com`으로 교정한다. Auth 소스도 허용된 forwarded host만 callback origin으로 받는다.
- 실제 배포는 `pnpm deploy:web:oracle -- --execute --confirm DEPLOY-FEELANDNOTE-WEB`로 실행한다. 스크립트가 비활성 Blue/Green 슬롯을 준비하고 `/opt/feelandnote/web/current`를 원자적으로 전환한 뒤 `feelandnote-web.service`, Cloudflare가 반환한 공개 HTML의 정적 자산, 공개 SEO 이미지를 확인한다. 활성화가 실패하면 반대 슬롯으로 되돌린다. Cloudflare 퍼지 범위가 자동 분류되지 않으면 `--purge-scopes` 결정 전에는 실행하지 않는다.
- 서가 주간 베스트셀러는 `pnpm sync:bestsellers`로 갱신하며, `.github/workflows/sync-bestsellers.yml`이 매주 월요일 자동 갱신해 저장소에 반영한다.

### 웹 캐시 무효화 단일 창구 — DB 트리거 (2026-08-16)

- **원칙**: 무효화를 앱 코드나 스크립트가 부르는 것을 전제하지 않는다. 데이터의 90%가 LLM 세션·스크립트·SQL로 들어오므로, **행이 바뀌면 DB가 스스로 `feelandnote.com/api/revalidate`에 태그를 보낸다**(pg_net, 문장 단위 트리거 + 전이 표 → 한 문장에 HTTP 한 번). 운영에 적용한 트리거·태그 매핑의 재현 원천은 `sw/web/supabase/migrations/20260820093729_harden_web_revalidation_triggers.sql`이다. 주석만 남은 `20260816052000_web_revalidate_triggers.sql`을 현행 원본으로 사용하지 않는다.
- 일반 변경은 항목 태그로 Next 캐시와 Cloudflare URL을 같이 비운다. 대량 반영은 `domain:__all__`(예: `celebs:__all__`, `contents:__all__`)로 해당 도메인의 Next 상세 캐시를 전량 만료시키고 Cloudflare `purge_everything`을 딱 한 번 호출한다. 인물·작품 페이지는 `revalidate = false`이므로 변경 후 첫 방문이 한 번 재생성하고 그 다음부터 재사용한다. 조회수(`celebs.view_count`)·시각 갱신만 있는 문장은 리스트를 비우지 않는다.
- `/api/revalidate`는 Next 태그를 먼저 만료시키고 Cloudflare 퍼지를 수행한다. 퍼지 대상이 있는데 자격증명이 없으면 503, Cloudflare HTTP·본문 응답이 실패하면 502이며 둘 다 `revalidated: true`, `complete: false`를 반환한다. 이 응답은 성공이 아니므로 호출자는 재시도·운영 조치를 해야 한다. 앞단 퍼지가 필요 없는 태그만 받으면 `not_needed`로 완료할 수 있다.
- 확인: `select * from net._http_response order by id desc limit 5;`에서 status 200과 응답 본문의 `complete: true`를 같이 본다. 백오피스의 `revalidateWebCache()` 호출은 DB 트리거와 중복되어도 무해하지만, 호출했다면 반드시 `complete: true`까지 검증한다.
- 새 표를 웹이 읽게 되면 주석 파일을 복사하지 말고 새 migration에 태그 매핑과 트리거를 재현 가능하게 추가한다. 비밀키는 Vault `web_revalidate_secret`(=CRON_SECRET) — 키를 돌리면 Oracle `/etc/feelandnote/web.env`·로컬 `.env`·Vault를 함께 바꾼다.

### 공개 조회 문장 제한·인덱스 (2026-08-16)

- anon 역할의 `statement_timeout`은 15초다. 부분 인덱스의 재현 원천은 `sw/web/supabase/migrations/20260816040000_*.sql`이다.
- 기질별 서재 조회는 짝(celeb_id, content_id)만 받은 뒤 뽑힌 작품에만 메타를 붙인다. 성향 분포·닮은 인물은 같은 명단 캐시(`celeb_metrics`)를 공유하고, `cachedList/cachedDetail` 만료 시각은 키별로 어긋나게 둔다(`spreadRevalidate`).
- **남은 것**: `get_celebs_sorted`(전 컬럼 2,406행 실체화)·`get_chosen_scriptures`(전량 집계 후 LIMIT 12)·`get_celeb_feed_type_counts` RPC 재작성 — 반환 형태를 건드려 별도 작업.

## 외부 콘텐츠 검색 API

콘텐츠(도서·영상·게임·음악) 메타 조회에 쓰는 외부 API. 래퍼는 `packages/content-search/`.

| 유형 | 제공처 | 상태 |
|------|--------|------|
| BOOK (한국어판) | **카카오(다음) 도서 검색** | 정상 (`kakao-books.ts`). ~~네이버 도서 검색~~은 26.07.31 종료 |
| BOOK (영문 원서) | OpenLibrary | 정상 |
| VIDEO | TMDB | 정상 |
| GAME | IGDB | 정상 |
| MUSIC | **Apple iTunes Search API / Apple Music** | 정상 (`itunes-music.ts`) |
| 뉴스·블로그·이미지 | 네이버 검색 | 정상 (`naver-news.ts`·`naver-blog.ts`·`naver-image.ts`) |

### Apple 음악 연동

- 신규 검색과 단건 조회는 `packages/content-search/src/itunes-music.ts`만 사용한다.
- `contents.external_source='itunes'`, `external_id='itunes-{trackId}'`만 MUSIC에 허용한다.
- `previewUrl`이 있는 결과만 저장하고 서비스 플레이어가 30초 미리듣기를 직접 재생한다. 상세와 플로팅 플레이어에는 `itunesUrl`을 Apple Music 전곡 링크로 표시한다.
- Search API 제한은 약 분당 20회다. 호출은 순차 처리하고 403/429를 결과 없음이나 기각으로 기록하지 않는다.
- 과거에는 Spotify를 음악 메타와 재생에 사용했으나 현재는 완전히 폐기했다.

### 네이버 도서 검색 API 종료 (2026-07-31)

**네이버가 검색 API 중 「쇼핑·책·전문자료」 세 종을 2026년 7월 31일자로 종료했다.** 공지: [developers.naver.com/notice/article/32564](https://developers.naver.com/notice/article/32564). 문의처는 공지에 `dl_naver_search_api@navercorp.com`으로 안내돼 있다.

**실측(26.08.01)**

- `openapi.naver.com/v1/search/book.json`·`book.xml`·`book_adv.json` 전부 **HTTP 404 + `SE05 Invalid search api`**. 쇼핑·영화도 동일(영화는 이 공지 대상이 아니므로 그 이전에 종료된 것으로 보이나 미확인).
- 같은 키로 뉴스·블로그·이미지·백과·지식iN은 **HTTP 200 정상**. 즉 키·앱 설정 문제가 아니다.
- 개발자센터 앱(`feelandnote`)의 「사용 API」에는 검색이 그대로 남아 있고 서비스 URL도 등록돼 있다. **설정을 고쳐도 복구되지 않는다.** 신규 앱을 만들면 「사용 API」 드롭다운에 검색 자체가 없다(신규 발급 중단).
- **API 문서 페이지는 아직 살아 있고 종료 문구가 없다**(하루 25,000회 한도 안내까지 그대로). 문서를 근거로 "되어야 한다"고 판단하지 마라 — 실제 호출이 진실이다.
- 마지막 정상 동작 시점: **2026-07-30 11:10 KST**(그때 등록된 책들의 표지 URL이 네이버 쇼핑 이미지 서버로 남아 있다).

**영향 범위 (전환 완료 — 26.08.01)**

- 서비스 사용자 기능 3종은 카카오로 옮겨 복구했다: 통합 검색의 책(`sw/web/src/actions/search/searchContents.ts`), 기록 추가 시 책 찾기(`actions/contents/searchBooks.ts`), 콘텐츠 상세·메타 재조회(`getContentById.ts`·`fetchContentMetadata.ts`).
- **네이버 도서 코드는 전량 제거했다**(26.08.01). 되살릴 API가 없어 폴백으로도 남기지 않았다.
  - `packages/content-search/src/naver-books.ts`(래퍼)와 package.json의 `./naver-books` export
  - 표지 정비 스크립트 4종 `scripts/naver-thumb-{verify,refresh,title-search,author-search}.mjs` — 네이버 ISBN 검색 전용이라 통째로 폐기. 표지 정비가 다시 필요하면 카카오 기준으로 새로 만든다
  - fiction 원전 등록 스크립트 2종 `sw/web-bo/scripts/{search-naver-fiction-sources,sync-fiction-source-rosters}.ts` — 26.07.29 완료된 일회성 작업이고 결과는 DB와 `celeb-pipeline.md`「현행 연결 기준선」에 남아 있다. 회수하려면 `git show <삭제 직전 커밋>:<경로>`
- 네이버 **뉴스·블로그·이미지** 래퍼는 그대로 쓴다(같은 키, 정상 동작).
- 셀럽 콘텐츠 수집 파이프라인의 BOOK 트랙(`docs/project/celeb/celeb-2-content-collector.md`)도 카카오 기준으로 갱신했다.

### 카카오(다음) 도서 검색 — 네이버 대체 (26.08.01 전환)

- 래퍼: `packages/content-search/src/kakao-books.ts`. 반환 타입을 네이버와 같은 모양으로 맞춰 호출부는 import 경로만 바꿨다.
- 키: `KAKAO_REST_API_KEY`(`sw/web/.env`·`sw/web-bo/.env`). 카카오 앱 `feelandnote`(ID 1366184)의 REST API 키이며, 책 검색은 별도 제품 설정·심사 없이 이 키만으로 호출된다.
- `contents.external_source`에 **`kakao_book`을 추가**했다(마이그레이션 `add_kakao_book_external_source`). 기존 `naver_book` 4,021건은 그대로 보존한다. 같은 마이그레이션에서 `aladin`도 허용값에 넣었다(API 없이 상품 페이지로 잡은 건을 정직하게 표기하기 위함).

**네이버와 다른 점 (구현 시 주의)**

| 항목 | 카카오의 동작 |
|------|---------------|
| ISBN | `"8954655971 9788954655972"`처럼 10자리·13자리가 한 칸에 온다. `pickIsbn()`이 13자리를 우선 고른다 |
| 표지 | 응답 `thumbnail`은 R120x174로 작고, 크기를 키워 요청하면 403이다. `fname` 파라미터에 담긴 다음 원본 주소(`t1.daumcdn.net`)를 꺼내 https로 승격해 쓴다 |
| 판매 상태 | `status`(정상판매·품절·절판)가 응답에 들어온다 → `metadata.salesStatus`. **서점 상품 페이지 실재 확인을 이걸로 대신할 수 있다** |
| 지정 검색 | `target=title\|isbn\|publisher\|person`. 검색어가 ISBN 하나면 자동으로 `target=isbn`으로 전환한다 |
| 페이지 | `page` 1~50, `size` 1~50. `meta.is_end`로 다음 쪽 유무를 판단한다 |

**실측 검증(26.08.01)**: 제목 검색 63건, ISBN 단건 조회, "제목 - 저자" 형식 383건, 결과 없음 0건 모두 정상. `sw/web`·`sw/web-bo` 타입 검사 통과.

**카카오 커버리지 실측 (26.08.01, ISBN 지정 조회)**

| 표본 | 적중 | 실패 내역 |
|------|-----:|-----------|
| 기존 등록 한국어판 65건(무작위) | **65 / 65 (100%)** | 없음 |
| 기존 등록 원서(해외 ISBN) 55건 | 52 / 55 (94%) | 영문 워크북·강의록·고전 영역본 3건 — OpenLibrary 담당 영역 |
| 26.08.01 서점 페이지로 우회 등록한 11건 | 9 / 11 (81%) | 절판 한국 만화 2건(《괴협전 1》·《아일랜드 1》) |

**판정: 알라딘 API는 붙이지 않는다.** 한국어판을 100% 잡으므로 대체가 완결됐다. 카카오가 놓치는 것은 ① 영문 원서 일부(OpenLibrary가 맡는 몫)와 ② 절판된 한국 구간 도서 소수뿐이고, 후자는 룰북의 예외 경로(서점 상품 상세 페이지를 사람이 직접 확인)로 처리하면 된다. 알라딘 TTB는 키 신청·승인이 필요하고 일 호출 상한도 있어 이만한 이득으로 들일 비용이 아니다.

- **`aladin` 출처값은 코드 연결 없이 표기 전용으로만 존재한다.** 카카오에 없어 사람이 서점 페이지를 열어 ISBN·표지를 확보한 건을 정직하게 적기 위한 값이며, 이를 조회하는 API 래퍼는 없다(의도된 상태). 26.08.01 기준 2건.
- 알라딘을 실제로 붙여야 할 상황: 절판 구간 도서를 대량으로 다뤄야 할 때. 그때 TTB 키를 신청한다.

### 네이버 흔적 완전 제거 (26.08.01 완료)

**도서 관련 네이버 의존은 0이다.** 사용자 지시로 표지가 비는 것을 감수하고 전량 걷어냈다.

| 대상 | 처리 |
|------|------|
| 출처 표기 `naver_book` | 126건 → `NULL`(출처 미상). **허용값 목록에서도 제거**해 다시 들어올 길을 막았다 |
| 네이버 서버 표지 | 97장 → `NULL` + `sources.thumbnail = confirmed_unavailable`. 인물 96명의 기록 106건에서 표지가 빈칸이 됐다 |
| 도서 상세 링크·카탈로그 번호 | 1,059건 제거 |
| 코드 | `naver_book` 분기 전량 제거(로케일 판정·관리자 등록·표지 편집 선택지·감사 스크립트·주석). 표지 감시 도구 `naver-thumb-check.mjs`도 삭제 |
| 백업 | 되돌릴 이유가 없어 삭제했다(네이버 자체를 못 쓰므로) |

남은 네이버 코드는 **뉴스·블로그·이미지 검색**뿐이고 도서와 무관하게 정상 동작한다(블로그는 기록 참고 자료 찾기, 이미지는 인물 사진 찾기에 쓰인다). 검색 API 중 뉴스 모듈은 사용처가 0이다.

**최종 이전 성적**: 네이버 도서 4,019권 → 카카오 3,893권(96.9%). 나머지는 한국 유통 이력이 없는 희귀 판본이라 어느 데이터베이스에도 없다.

### 기존 네이버 자산의 상태 (26.08.01 점검, 제거 전 기록)

검색 API 종료가 **이미 등록된 데이터에 미치는 영향은 없다.** 항목별 실측:

| 자산 | 규모 | 상태 |
|------|-----:|------|
| 표지 이미지 `shopping-phinf.pstatic.net` | ko 3,428 · en 34 | **정상.** 무작위 20건 전부 HTTP 200. 이미지 서버는 검색 API와 별개 인프라다 |
| 표지 이미지 `bookthumb-phinf.pstatic.net` | ko 4 | 옛 네이버 책 서비스 썸네일. 건수가 미미해 방치 |
| `contents.metadata.link`(네이버 도서 상세) | 1,054 | **살아 있다.** 봇 차단(418·405)이라 일반 curl로는 판정이 안 되지만, insane-search 엔진으로 열어보니 정상 페이지였다(제목 "○○ : 네이버 도서", 교보·알라딘·영풍·예스24 판매처 표시). **검색 API만 끊겼고 도서 상세 페이지 서비스는 유지 중이다.** 다만 화면 어디에서도 이 값을 쓰지 않는다(전수 grep 확인) |
| `external_source='naver_book'` | 4,021 | 값으로 계속 유효. 로케일 판정·품질 감사·표지 편집 화면 모두 인식하도록 유지했다 |
| 메타 재조회 | — | 카카오가 같은 ISBN을 잡으므로 기존 건도 정상 갱신된다(한국어판 표본 100% 적중) |

**남은 위험 하나**: 네이버가 검색 API를 걷는 흐름이라면 이미지 서버도 언젠가 정리될 수 있다. 그날이 오면 표지 3,466건이 한꺼번에 깨진다. ⚠️ **감시 수단이 없다.** 이 자리에는 `scripts/naver-thumb-check.mjs`(저장된 표지 URL 전수 생존 검사)를 "이것만은 유지한다"고 적어 뒀으나, 위 정리 표가 같은 문서 안에서 그 파일도 삭제했다고 적고 있고 실제로 저장소에 없다(26.08.06 전수 검색 확인). **표지가 깨져도 자동으로 알 방법이 지금 없다.** 필요해지면 다시 만들어야 한다. 실제로 깨지기 시작하면 카카오 표지로 교체하거나 R2로 옮긴다.

**보류한 후보**

| 후보 | 확인 결과 |
|------|-----------|
| 알라딘 TTB | 응답은 하나 "API출력이 금지된 회원"이라 정식 키 신청 필요. 위 실측으로 **현 시점 불필요 판정** |
| 국립중앙도서관 서지 | HTTP 200. 서지는 정확하나 표지가 약해 단독으로는 부족 |

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
- **클라이언트**: `sw/web-bo/src/lib/r2.ts` — `uploadToR2()`, `deleteFromR2()`
- **업로드 로직**: `sw/web-bo/src/actions/admin/storage.ts`

## Google Analytics

- GA4 Measurement ID: `G-LMVY8KTJ7T` (layout.tsx에 설정)
- GA4 Property ID: `526353156`
- Service Account: `claude-analytics@feelandnote.iam.gserviceaccount.com`
- 크리덴셜 파일: `sw/web/credentials/ga-service-account.json` (.gitignore 등록)
- env: `sw/web/.env` → `GA_PROPERTY_ID`, `GA_CREDENTIALS_PATH`
- 활성화된 API: Google Analytics Data API. Admin API는 미활성화.

## 음성 R2 경로 규칙

- R2 키: `celebs/{id}/voice/{locale}/{prefix}{variant}.mp3` (고정 경로, 덮어쓰기)
- URL 캐시 버스터: `?v={voice_v}` (경로가 아닌 쿼리 파라미터)
- SSoT: `sw/web-bo/src/lib/voice-path.ts` (상수 + 유틸)
- web 클라이언트: `sw/web/src/lib/game/voice/voiceUrl.ts` (동일 패턴)

# 크론잡

## Oracle systemd timer

| 경로 | 스케줄 | 설명 |
|------|--------|------|
| `/api/cron/today-figure` | `5 15 * * *` (매일 00:05 KST) | 오늘의 인물 선정 (뉴스 기반 + seed fallback) |

- `feelandnote-today-figure.timer`가 `feelandnote-today-figure.service`를 실행한다. `Persistent=true`라 예약 시각에 VM이 꺼져 있었으면 복구 뒤 누락 실행을 보완한다.
- 인증: `/etc/feelandnote/web.env`의 `CRON_SECRET`

## GitHub Actions (.github/workflows/)

| 워크플로우 | 스케줄 | 설명 |
|-----------|--------|------|
| `warm-web.yml` | `17 * * * *` (매시) | 공개 허브의 데이터 캐시를 데우면서 핵심 화면·인물·SEO 경로가 모두 2xx인지 확인한다. 하나라도 실패하면 작업 자체를 실패시켜 별도 유료 모니터링 없이 GitHub Actions 알림을 쓸 수 있다 |
