# 배포비·플랫폼 남은 작업

사용자 웹과 백오피스의 실사용 비용·제약을 비교해 앱별 배포처와 비용 상한을
결정한다. 26.08.23 재측정으로 플랫폼 비교는 끝났고 **정액 서버(VM) 이전**으로
방향을 확정했다. 남은 것은 아래 실행 계획이다.

현재 규칙은 다음 문서가 쥔다.

- 플랫폼 구조: `docs/project/platform/architecture.md`
- 외부 서비스·전송 비용: `docs/project/platform/external-services.md`
- 환경변수·R2: `docs/project/platform/env-vars.md`
- 검색 노출·배포 후 검증: `docs/project/operations/seo.md`
- 캐시 태그: `packages/shared/src/constants/cache-tags.ts`

## 1. 현재 성능·비용 변경 마감

작업 폴더에 남은 사용자 웹 변경을 하나의 검증 단위로 마감한다.

- 캐시 만료 시각 분산과 공용 캐시 병합
- 성향별 공통 작품 조회량 축소
- 화면별 다국어 문구 전송 범위 축소
- 검색 공유용 이미지 용량과 CDN 보관 정책 조정
- 관계도·성향 비교 작은 화면 보정

마감 전에 소스에 들어간 제어 문자를 정상 문자열로 바꿔 Git 텍스트 diff를 복구한다.
TypeScript, 관련 자동 테스트, 전체 프로덕션 빌드, 핵심 화면 육안 검수를 통과한 뒤만
배포한다.

## 2. R2 자산·사용량 인벤토리

비밀값을 출력하지 않고 다음을 읽기 전용으로 실측한다. Phase 2의 DB 백업 보관
설계(버킷·prefix·lifecycle)가 이 인벤토리를 전제한다.

- 버킷별 저장량, 객체 수, Class A/B 작업량, 공개 도메인
- CORS, lifecycle, Cache-Control, `?v=` 캐시 무효화 규칙
- 키 공간별 생성자, 사용자, 갱신·삭제 책임
- DB와 코드의 자산 URL 호스트·prefix 분포

영구 자산과 재생성 가능한 증분 캐시의 버킷·prefix·권한·삭제 경계를 비교한다.
영구 자산을 전체 purge하거나 짧은 lifecycle에 넣을 수 있는 구조는 기각한다.

## 변경 금지선

각 Phase의 최종 안을 승인받기 전에는 다음을 바꾸지 않는다.

- 운영 DNS, Vercel 구독, Cloudflare 플랜
- R2 버킷·객체·CORS·lifecycle·공개 URL
- Supabase Auth 설정과 운영 비밀값
- 영구 자산의 복사·이동·삭제·전체 purge
- 유료 부가 기능과 새 DB 테이블·컬럼

## 26.08.16 결정 — Vercel 유지 + Cloudflare 앞단 캐시

**구성** 브라우저·로봇 → Cloudflare 캐시 → Vercel(캐시·함수) → Supabase. Vercel은 빌드·배포·실행을 그대로 맡고, Cloudflare는 응답 사본을 들고 있다가 같은 요청을 대신 답한다. 앱 이전이 아니다.

**왜** Vercel은 배포 한 번마다 상세 페이지 전부에 "낡음" 딱지를 붙이고, 이후 요청마다 다시 만들며 ISR 쓰기·전송 비용이 난다(딱지는 무료, 재생성은 요청이 닿을 때만). 8/16 배포 12회 중 상세 페이지가 실제로 달라진 건 2회. Cloudflare가 요청을 자기 선에서 끝내면 Vercel에 닿지 않고, 닿지 않으면 다시 만들지도 않는다.

**두 경우**
- 코드·UI 배포: Cloudflare 사본은 그대로. 상세 페이지 모양이 진짜 바뀐 배포(상세 화면·공통 레이아웃·헤더·전역 스타일·번역 파일 변경)만 커밋 변경 파일로 자동 판정해 전체 퍼지 1회. 그 외 배포는 재생성 0.
- 데이터 변경: DB 트리거 → `/api/revalidate` 경로에서 Cloudflare의 해당 URL(`/celeb/<slug>`·`/en/…`·`/seo-image/celeb/<slug>`, 작품도 동형)을 함께 지운다. 그 한 장만 새로 만들어진다.

**캐시 대상** 개인화 없는 화면만 — `/celeb/*`, `/content/*`, `/explore/directory`, `/explore/timeline`, `/seo-image/*`, `/_next/static/*`. 로그인 쿠키(`sb-*`)가 있는 요청은 우회. 홈·회원·광장·검색·API·auth는 제외.

**감수** 관리 화면이 갈린다(봇·전송·캐시=Cloudflare, 실행·오류·배포=Vercel). 퍼지 실패는 로그로 남기고, Cloudflare 보관 기간(7~30일)이 안전망.

**비용** Cloudflare Free. Cache Reserve(롱테일 유지)는 월 $1 안팎, 적중률 보고 결정.

### 26.08.16 실행 결과 — Cloudflare 앞단 가동

> 당시 스냅숏이다. 이후 개정된 **현행 운영 규칙**(ruleset v4, RSC 우회, 배포 후 퍼지의
> diff 분류 재도입)은 `docs/project/platform/external-services.md`「Cloudflare 앞단 캐시」가
> 쥔다. 아래 기록과 어긋나면 그쪽이 맞다.

- Cloudflare 존 `feelandnote.com`(Free, zone id는 `sw/web/.env` `CLOUDFLARE_ZONE_ID`) 생성, 네임서버 `gabriella.ns.cloudflare.com`·`kobe.ns.cloudflare.com`으로 Vercel 등록 도메인의 NS 변경(전파 1분, Universal SSL 발급 ~1분 — 그 사이 HTTPS 30초 안팎 불통).
- DNS: 루트 A `76.76.21.21`(프록시), `www` CNAME `cname.vercel-dns.com`(프록시), `admin` CNAME(백오피스, DNS만 — 캐시 안 탐), 구글 인증 CNAME, CAA 2건(pki.goog·sectigo) — Vercel DNS에 있던 것 전부 복제.
- 존 설정: SSL Full(strict), Always HTTPS, Brotli.
- 캐시 규칙(`http_request_cache_settings`): `/celeb/*` `/en/celeb/*` `/content/*` `/en/content/*` `/seo-image/*` `/explore/directory` `/explore/timeline`(ko·en) → 엣지 30일 보관(원본 max-age=0 무시), 단 `-auth-token` 쿠키(로그인)가 있으면 우회. 홈·탐색·회원·광장 등은 규칙 없음(DYNAMIC).
- 방화벽(`http_request_firewall_custom`): 학습·마케팅 크롤러 22종 UA 차단(`lib/blocked-crawlers.ts`와 같은 명단) — Vercel 도달 전에 403.
- 퍼지 연동: `/api/revalidate`가 태그→URL로 Cloudflare 퍼지(`lib/cloudflarePurge.ts`), Vercel env `CLOUDFLARE_ZONE_ID`·`CLOUDFLARE_API_TOKEN`. 종단 검증: 인물 상세 HIT → DB 행 갱신(트리거) → ko·en 모두 MISS.
- 검증 완료: 상세·이미지 2회차 HIT, 홈·탐색 DYNAMIC, 로그인 쿠키 DYNAMIC, Ahrefs UA 403·Googlebot 200, http→https·www→루트 리다이렉트, 백오피스 정상.
- 배포 후 전체 퍼지 워크플로(`.github/workflows/cloudflare-purge.yml`): GitHub Secrets `CLOUDFLARE_ZONE_ID`·`CLOUDFLARE_API_TOKEN` 등록 완료(26.08.16). 프로덕션 배포가 성공하면 판정 없이 전체 퍼지 1회, 5분 제한.
- 변경 파일로 퍼지 여부를 판정하던 단계는 폐기했다(26.08.19). 배포는 Vercel ISR 사본도 함께 새로 만들어 판정으로 아끼는 것이 Cloudflare HIT 유지뿐인데, 그 단계가 매번 매달려 퍼지가 한 번도 나가지 못했다.
- 되돌리기: Vercel → Domains → feelandnote.com → Nameservers → "Restore Original Nameservers".

## 26.08.23 재측정·결정 — 정액 VM 이전 (Phase 1 Vercel, Phase 2 Supabase)

### 재측정 결과 (`vercel usage`·Supabase 실측, 8/1~8/23)

- Cloudflare 앞단(8/16)이 Vercel 일 사용액을 $4.09 → $1.43으로 **65% 절감**했다. 그러나 남은 순수 종량이 월 환산 ~$23으로 Pro 포함 한도를 넘어, 8/19에 할당량이 소진되고 이후 일 $0.6~0.8 초과 청구가 발생 중이다(월 마감 예상 초과 ~$8). 앞단 캐시로 짜낼 수 있는 몫은 소진됐다.
- 청구 항목의 실체는 **재생성 비용**이다 — ISR Writes·Fast Origin Transfer·Fluid CPU가 대부분이고, 사용자향 전송(Fast Data Transfer)·Edge Requests는 $0. 초과분 전액이 사용자 웹(`feelandnote`)에서 난다. 백오피스는 $0.
- Vercel 유료 기능 실사용: 프리뷰 배포 0건(최근 20건 전부 Production), 이미지 최적화 미사용(`unoptimized: true`), 분석·방화벽·Blob 미사용, 시트 1인. 쓰는 것은 **빌드 자동화와 Node 호스팅+ISR 둘뿐**이다.
- Supabase는 Pro 한도 내(egress 5%, DB 249MB/무제한, 초과 $0)지만, egress 실측 월 ~21GB가 Free 한도(5GB)의 4배라 **무료 다운그레이드는 불가**. 비용을 없애려면 셀프호스팅뿐이다.

### 플랫폼 비교 종결

| 안 | 판정 | 근거 |
|---|---|---|
| Vercel 유지 | 기각 | 고정 $20 + 초과. 유료 기능 실사용이 빌드·호스팅뿐 |
| Cloudflare Workers + OpenNext | 기각 | `runtime='nodejs'` 라우트 2개(seo-image), `node:fs` 사용(`/api/avatar` 등), 서버 액션 170파일, webpack 커스텀 로더, Next 16.1 어댑터 지원 불확실 — 호환성 도박 |
| Cloud Run 등 stateless 컨테이너 | 기각 | ISR 디스크 캐시가 인스턴스 재시작마다 유실 — ISR 중심 사이트에 부적합 |
| **정액 VM + Cloudflare CDN** | **채택** | standalone 빌드·기동 검증 통과(아래). 호환성 리스크 0, 재생성 비용 0 |

### 검증된 사실 (26.08.23 실측)

- `NEXT_DIST_DIR=<별도> NEXT_PRIVATE_STANDALONE=true pnpm build`로 **config 무수정·개발 서버 무간섭** standalone 빌드 성공. 산출물 143MB, 모노레포(`packages/`) 포함, 전 라우트·미들웨어 포함.
- 산출물 기동 검증: Ready 106ms, `robots.txt` 200, 상세 경로 307(next-intl 로케일 리다이렉트 정상 = 미들웨어 작동).
- DB 무효화 사슬은 도메인 기준이다 — `web_revalidate_send()`가 `https://feelandnote.com/api/revalidate`를 pg_net으로 호출. **DNS만 VM으로 바꾸면 무수정 유지**된다.
- Vercel 고유 종속은 둘뿐: 크론 1개(`/api/cron/today-figure`, 매일 15:05 UTC)와 모노레포 빌드 필터(`vercel.json` `ignoreCommand`). 크론은 VM crontab + curl로 대체(함수 시간 한도 `maxDuration=300`은 VM에서 소멸), 빌드 필터는 수동 배포에선 불필요.
- 서버 후보: **Oracle Always Free가 26.06.15부로 2 OCPU/12GB로 감축**(공지 없이, 유휴 회수 정책 존재). Phase 1(웹 2개)은 12GB로 충분하나 확보 경쟁·정책 신뢰가 약점. **Hetzner CAX21(ARM 4vCPU/8GB, ~€6.5/월)을 공동 1순위**로 둔다 — 유럽 리전이지만 Cloudflare 앞단 캐시가 지연을 흡수한다.

### 최종 인프라 개괄 (Phase 2 완료 시점)

Phase 2까지 끝나면 유료 관리형 서비스가 전부 빠지고 아래만 남는다. 이전 완료 후 이
개괄을 `docs/project/platform/architecture.md`로 승격하고 여기서 지운다.

```
사용자·크롤러
  → Cloudflare (Free) — DNS, CDN 캐시(상세·명부·SEO 이미지 30일), 방화벽·봇차단, TLS
    → VM 1대 (Oracle Always Free 2C/12GB, 대안 Hetzner CAX21 ~€6.5)
        ├ Caddy/Nginx — 리버스 프록시, Cloudflare Origin Cert, CF IP 대역만 허용
        ├ web      :3000  Next.js standalone, PM2 fork 단일 (ISR 캐시 = 로컬 디스크)
        ├ web-bo   :3001  Next.js standalone, PM2 fork 단일 (admin.feelandnote.com)
        ├ Supabase 셀프호스팅 (docker-compose)
        │    Postgres·PostgREST·GoTrue·Realtime·Storage·Kong·Studio + pg_net
        └ crontab — today-figure(매일 15:05 UTC), pg_dump→R2 백업(매일), 배포 스크립트
  → Cloudflare R2 — 영구 자산(이미지·음성) + DB 백업 보관 (기존 유지)
```

- **GitHub**: 저장소 + `cloudflare-purge.yml`(배포 스크립트가 workflow_dispatch로 발화).
- **외부 API**(카카오·OpenLibrary·TMDB·IGDB·네이버뉴스·iTunes 등)와 메일용 SMTP는 그대로.
- **무효화 사슬**(무수정 유지): DB 트리거 → pg_net → `feelandnote.com/api/revalidate` → Next 태그 만료 + Cloudflare 퍼지.
- **로컬 전용**(배포 안 함): remotion(3002·8001), lab(3004), audio-bo(3005). android는 web을 감싸는 TWA.
- **소멸**: Vercel 전부(Phase 1), Supabase 클라우드(Phase 2), `keep-alive.yml` 크론.
- **월 비용**: Cloudflare $0 + VM $0(Oracle) 또는 ~€6.5(Hetzner) + R2 무료 한도 내 + 도메인비 = **$0~7**. 관리형이 해주던 일 중 직접 지는 것: 서버 보안 패치, PM2·docker 감시, 백업 성공 확인.

### Phase 1 — Vercel → VM (절감 $20+초과/월)

1. 서버 확보(유저): Oracle 무료 신청을 걸어두되, 확보 지연 시 Hetzner로 간다.
2. VM 구성: Node 24 + pnpm, PM2 **fork 단일 인스턴스**(클러스터 금지 — ISR 인메모리 캐시 정합), Caddy/Nginx 리버스 프록시, Cloudflare Origin Certificate, 방화벽은 Cloudflare IP 대역만 허용. web(3000)·web-bo(3001) 동거, `admin` CNAME도 VM으로.
3. 배포: 서버에서 직접 빌드(`git pull → pnpm build → pm2 reload`). GitHub Actions 불필요(아키텍처 불일치 회피, Build CPU 비용 소멸).
4. 크론: crontab에서 `curl -H "Authorization: Bearer $CRON_SECRET" https://feelandnote.com/api/cron/today-figure`.
5. 전환: Cloudflare DNS A 레코드만 VM IP로 변경. **Vercel 프로젝트는 지우지 않는다** — 문제 시 DNS 원복으로 즉시 복귀.
6. 검증(기존 6절 흡수): `/`·`/en`·인물·콘텐츠 상세·디렉토리·사이트맵·feed·robots, canonical·hreflang, 로그인·OAuth callback·쿠키 보안 속성·세션 갱신, ISR 생성·태그 무효화(`/api/revalidate` 종단), `seo-image`(sharp/ImageResponse), `/api/avatar`(fs), 백오피스 저장→웹 반영, today-figure 크론 실행.
7. 안정 1~2주 후 Vercel Pro 해지.

### Phase 2 — Supabase → 셀프호스팅 (절감 $25/월, Phase 1 안정 후)

1. 공식 docker-compose로 전체 스택 기동(Postgres·PostgREST·GoTrue·Realtime·Storage·Kong). API 경로가 `/rest/v1`·`/auth/v1` 동일 — **앱 코드 무수정**, env의 URL·키만 교체. pg_net 확장 필요(트리거 사슬용).
2. **백업 체계를 먼저 만들고 검증한 뒤** 이전한다: 매일 pg_dump → R2, 성공·실패 알림 포함. Pro의 일일 백업을 대체하는 장치가 없으면 전환하지 않는다.
3. 이전: 스키마·데이터·RLS·트리거(`web_reval_*`)·함수·`auth` 스키마, Storage 객체, Vault 시크릿(`web_revalidate_secret`).
4. 알려진 함정: JWT 시크릿 변경으로 기존 세션 전원 만료, Auth 메일용 외부 SMTP 별도 설정, Storage 공개 URL 도메인 변경에 따른 DB 내 URL 참조 점검, Realtime 설정 난도.
5. 클라우드와 한 달 병행 운영 후 해지.

### 종료 조건

- Phase 1: 위 6번 검증 전 항목 통과, 2주 무사고, Vercel 청구 $0.
- Phase 2: 백업 자동화가 복원 리허설까지 통과, 병행 한 달 무사고, Supabase 청구 $0.
- 전 기간 Vercel Production·Supabase 클라우드로 복귀 경로가 살아 있다.
