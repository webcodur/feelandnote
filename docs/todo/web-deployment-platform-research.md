# Feel&Note 배포 플랫폼·비용 구조 재조사

Vercel 사용료를 줄이기 위해 Cloudflare 이전 가능성을 검토하되, 일반적인 Next.js 이전법을
곧바로 적용하지 않는다. **현재 서비스가 실제로 쓰는 저장소·캐시·인증·관리도구·배포 흐름을
먼저 실측한 뒤** Vercel 유지, Cloudflare Workers, 혼합 배포, 정액 서버 가운데 가장 적합한
구성을 결정한다.

이 문서는 이전 확정안이 아니라 조사와 의사결정의 재개 지점이다. 구현을 시작해 생기는
설정·운영 규칙은 결론이 확정된 뒤 `docs/project/platform/`의 담당 SSoT에 흡수하고 이 문서는
지운다.

## 문제와 목표

- 현재 Vercel Pro 기본료와 종량제 위험을 낮춘다.
- 사용자가 정한 월 비용 상한을 예기치 않은 트래픽·크롤·빌드가 넘기기 어렵게 만든다.
- 검색 색인 회복 중인 사용자 웹에 장기 5xx, canonical 변경, 캐시 오염을 만들지 않는다.
- Supabase egress 절감용 `unstable_cache`·ISR·온디맨드 무효화 계약을 보존한다.
- 이미 운영 중인 Cloudflare R2 자산과 업로드 도구를 중복 구축하거나 불필요하게 이관하지 않는다.
- `sw/web`과 `sw/web-bo`를 한 플랫폼으로 묶는다는 가정 없이 앱별 최적 배치를 판정한다.

## 이미 확인한 현행 사실

아래는 가설이 아니라 저장소에서 확인한 출발점이다. 실제 계정의 버킷 설정·사용량·과금은
Cloudflare와 Vercel 대시보드에서 별도로 실측한다.

### 배포 대상과 서비스 경계

- `sw/web`은 사용자용 Next.js 16 앱이며 SSR, Server Actions, Middleware, Supabase Auth,
  시간 기반 ISR, `unstable_cache`, `revalidateTag`, `revalidatePath`를 함께 쓴다.
- `sw/web-bo`는 저트래픽 관리자·제작 앱이지만 로컬 Remotion 파일, 이미지 처리, 자식
  프로세스 등 사용자 웹과 다른 Node 실행 조건을 가진다. 사용자 웹이 Cloudflare에 적합하다는
  이유만으로 백오피스까지 같은 곳에 옮기지 않는다.
- `sw/remotion`, `sw/audio-bo`는 로컬 제작 책임이 크다. 웹 호스팅 비용 조사에 억지로
  포함하지 않고, 배포된 앱이 이 도구들의 R2 자산·백오피스 창구를 계속 읽을 수 있는지만 본다.
- Android TWA는 `feelandnote.com`을 감싸므로 사용자 웹 도메인·인증·서비스워커 연속성이
  배포 전환의 필수 조건이다.

### 기존 R2는 신규 도입 대상이 아니다

- `R2_ACCOUNT_ID`, 접근 키, 버킷 이름, 공개 URL의 같은 5종 세트를 `web`, `web-bo`,
  `remotion`이 공유한다. 값 자체는 문서나 조사 산출물에 기록하지 않는다.
- 확인된 영구 자산 키 공간에는 최소한 다음이 있다.
  - `celebs/{id}/avatar.webp`, `avatar-sm.webp`, `photo.webp`
  - `celebs/{id}/voice/{locale}/...`
  - `celebs/{id}/deep/{locale}.json`
  - `faction/{tagId}/celeb-{celebId}.webp`와 개인 장면·인용 음성
  - `faction/{tagId}/team/...`, 로고, 테마 음악
- 사용자 웹의 아바타 업로드와 백오피스·제작 스크립트가 S3 호환 API로 같은 R2를 쓴다.
  Cloudflare Workers로 옮기더라도 백오피스와 로컬 스크립트의 S3 접근을 깨지 않는다.
- 사용자 웹 `r2.ts`는 업로드 객체에 `no-cache, must-revalidate`, 백오피스 `r2.ts`는
  `public, max-age=31536000, immutable`을 지정한다. 같은 자산 유형을 덮어쓸 때의 실제
  정책과 `?v=` 캐시 버스터를 키 공간별로 대조해야 한다.
- 게임 음성 URL 일부는 환경변수가 아니라 현재 R2 공개 주소를 코드에 직접 적는다. 배포처
  변경과 R2 공개 도메인 변경을 한 작업으로 묶으면 안 되며, 이 하드코딩의 영향도 조사한다.
- 일반 콘텐츠 표지는 모두 R2라고 가정하지 않는다. DB의 외부 `thumbnail_url`, 기존 R2 자산,
  Supabase와의 관계를 실제 URL 호스트별로 나눠 측정한다.

### R2 영구 자산과 Next.js 증분 캐시는 수명이 다르다

- 기존 R2는 서비스 자산 원본이므로 임의 삭제·전체 purge·짧은 lifecycle을 적용할 수 없다.
- OpenNext의 Incremental Cache는 재생성 가능한 파생 캐시라 전체 폐기와 lifecycle 정책이
  가능해야 한다.
- 따라서 "이미 R2가 있으니 같은 버킷에 ISR 캐시를 넣는다"와 "R2를 새로 도입한다"를 모두
  선결론으로 삼지 않는다. 아래 세 안을 비용·장애 격리·운영 난이도로 비교한다.
  1. 기존 계정·기존 자산 버킷 안에 충돌 없는 전용 prefix 사용
  2. 기존 Cloudflare 계정 안에 증분 캐시 전용 R2 버킷만 분리
  3. R2 증분 캐시를 쓰지 않는 다른 배포·캐시 구조

## 조사 질문

### 1. 실제 비용은 어떤 요청에서 생기는가

- Vercel Usage를 `sw/web`과 `sw/web-bo`로 나눠 ISR Writes, Fast Origin Transfer,
  Build CPU, Observability Events, Fluid CPU·Memory의 발생 비율과 날짜를 추출한다.
- ISR Writes가 어떤 페이지군·무효화 동작·배포 직후 워밍에서 생기는지 코드의 캐시 태그와
  함께 대조한다. 단순 방문 수와 ISR 쓰기를 같은 원인으로 취급하지 않는다.
- Vercel에서 이미 적용한 Standard Build Machine, On-Demand Concurrent Builds 비활성,
  Remote Cache, Spend Management 설정 이후 한 결제 주기의 기준선을 다시 잰다.
- Cloudflare 예상비는 정적 요청, Worker 동적 요청, CPU-ms, R2 Class A/B, R2 저장량,
  Durable Objects, D1/Tag Cache, 원격 빌드로 나눠 계산한다. 포함량 안이면 `$0`으로 보되
  항목 자체를 누락하지 않는다.
- Cloudflare의 Budget Alert는 하드캡이 아니라는 전제에서, 사용자가 요구하는 비용 상한을
  실제로 지킬 수 있는 방식을 플랫폼별로 비교한다.

### 2. 기존 R2를 어떻게 보존·재사용할 것인가

- 비밀값을 출력하지 않고 Cloudflare 대시보드/API로 현재 계정의 버킷 목록, 버킷별 저장량,
  객체 수, Class A/B 작업량, 공개 도메인, CORS, lifecycle, 캐시 규칙을 실측한다.
- 코드와 DB URL을 호스트·prefix별로 집계해 각 R2 키 공간의 생산자, 소비자, 갱신 방식,
  삭제 책임, Cache-Control, `?v=` 정책을 표로 만든다.
- 기존 `r2.dev` 공개 URL을 유지할지, `assets.feelandnote.com` 같은 사용자 도메인을 붙일지
  비교한다. SEO 이미지·DB 저장 URL·음성·Remotion·TWA·브라우저 CORS 영향을 포함한다.
- Workers의 사용자 웹만 R2 binding을 사용하고, `web-bo`·로컬 스크립트는 기존 S3 API를
  계속 쓰는 혼합 접근이 가능한지 검증한다. 가능하더라도 중복 R2 유틸과 권한 범위를 어떻게
  줄일지 제안한다.
- 증분 캐시를 기존 자산 버킷에 넣을 경우 전체 purge·lifecycle·권한 실수가 영구 자산을
  건드릴 수 있는지 검증한다. 장애 반경이 크면 같은 계정의 별도 캐시 버킷을 우선 비교한다.

### 3. 앱별로 어느 배포처가 맞는가

다음 후보를 `sw/web`과 `sw/web-bo`에 각각 판정한다.

| 후보 | 사용자 웹에서 확인할 것 | 백오피스에서 확인할 것 |
|---|---|---|
| Vercel 최적화 유지 | 관리형 ISR·배포 편의와 월 비용 상한 | 저트래픽인데 Pro 팀 비용을 함께 만드는지 |
| Cloudflare Workers + OpenNext | Next 16 기능, CPU·번들, 캐시, SEO | Node·파일시스템·이미지 처리·자식 프로세스 제약 |
| 혼합 배포 | 공개 웹만 Workers로 이동했을 때 이득 | Vercel·로컬·고정 서버 중 가장 작은 운영 부담 |
| 정액 Node 서버 + Cloudflare CDN | 고정비, 장애복구, 보안 업데이트 | 같은 서버 분리 배치와 관리자 접근 통제 |
| 정적화 확대 + 얇은 API | 비용 상한과 캐시 적중 이득 | 기능 재작성량이 이득을 넘는지 |

무료 티어라는 이유만으로 채택하지 않는다. 무료 제한 초과 시 동작, 상업 이용 조건, 지원되는
런타임, 배포 실패 시 복구 가능성을 함께 본다.

### 4. Cloudflare/OpenNext 호환성은 빌드와 실화면으로 증명한다

- `@opennextjs/cloudflare`가 현재 Next.js 16.1과 저장소의 Webpack 전처리 로더,
  `next-intl`, Middleware, Server Actions를 실제로 빌드하는지 확인한다.
- OpenNext 산출물의 압축 크기와 Worker별 모듈 구성을 측정한다. Free 3 MiB·Paid 10 MiB
  제한에 들어간다고 추정하지 않는다.
- 시간 기반 ISR은 R2 Incremental Cache와 Queue, 온디맨드 무효화는 Tag Cache와 cache
  purge를 붙여 실제 `revalidateTag`·`revalidatePath` 반영 시간을 잰다.
- 직접 `sharp`를 쓰는 아바타·SEO 이미지 경로를 실제 Preview에서 검증한다. 실패하면
  Cloudflare Images 가입을 먼저 가정하지 말고 브라우저 전처리, `ImageResponse`, 별도 Node
  함수, 기존 백오피스 처리 중 가장 싼 대안을 비교한다.
- `public` 폴더를 `readdirSync`로 읽는 쉼터·실험 페이지가 Workers의 배포 자산에서 동작하는지
  확인한다. 실패하면 빌드 시 manifest 생성 비용과 기능 제외 가능성을 비교한다.
- `node:crypto`의 익명 게시판 비밀번호 해시, AWS S3 SDK 기반 R2 접근, Supabase SSR 쿠키,
  OAuth callback, 서비스 역할 키 사용 경계를 실제 요청으로 검증한다.
- 현재 Vercel Cron의 `today-figure`를 Cloudflare Cron Trigger, Supabase Cron, 외부 스케줄러
  가운데 어디에 둘지 멱등성·재시도·비용으로 결정한다.

### 5. SEO·인증·운영 연속성을 검증한다

- `/`, `/en`, 셀럽·콘텐츠 상세, 디렉터리, 사이트맵, feed, robots, canonical, hreflang의
  HTML과 헤더를 Vercel 프로덕션과 후보 Preview에서 비교한다.
- 현재 색인 회복 작업 중인 URL에 대량 5xx나 주소 변경을 만들지 않는다. DNS 전환 전에
  Preview 도메인은 검색 색인에서 차단하되 기능 테스트는 가능하게 한다.
- Supabase Auth의 Site URL과 Redirect URLs, 쿠키 domain/secure/sameSite, Google OAuth,
  이메일 로그인·로그아웃·세션 갱신을 새 도메인에서 검증한다.
- `web-bo`의 `revalidateWebCache()`가 새 사용자 웹의 인증된 무효화 API를 정확히 부르는지,
  배포처가 달라도 태그 국소화 계약이 유지되는지 확인한다.
- 관리자·사용자 비밀키는 Cloudflare Secrets 또는 선택한 플랫폼의 비밀 저장소로 옮기며,
  값 자체를 커밋·문서·로그에 남기지 않는다.

## 실험 순서

1. **무변경 인벤토리** — Vercel 사용량, Cloudflare R2 실사용, URL 호스트, 캐시 태그,
   배포·인증 경계를 읽기 전용으로 수집한다.
2. **후보 비용표** — 현재 트래픽의 실측치를 각 후보 가격식에 넣고 평시·크롤 급증·공격
   시나리오의 월 비용과 서비스 중단 방식을 계산한다.
3. **최소 Preview** — 운영 DNS와 DB 데이터를 바꾸지 않고 `sw/web` OpenNext Preview를
   만든다. 기존 R2 영구 자산은 읽기만 하고, 증분 캐시는 격리된 테스트 영역을 쓴다.
4. **호환성 교정안** — 실패한 기능만 목록화하고 코드 수정량·추가 유료상품·운영 부담을
   계산한다. 이 단계 전에는 `sharp`나 R2 배관을 성급히 교체하지 않는다.
5. **실사용 검증** — 핵심 사용자 여정, 관리자 저장→웹 캐시 무효화, Cron, SEO 응답을
   자동·수동으로 검증하고 CPU·R2 작업량을 측정한다.
6. **플랫폼 결정** — 앱별 배치도, 월 비용 범위, 비용 폭주 방어, 장애복구, 이관·복귀 절차를
   한 안으로 제시한 뒤 사용자가 승인해야 DNS나 구독을 변경한다.

## 완료 산출물

조사는 아래가 모두 있어야 끝난다.

- 현행 배치도: 사용자 요청부터 Cloudflare/Vercel, Next 캐시, Supabase, 기존 R2까지의 흐름
- R2 자산 지도: prefix별 생산자·소비자·수명·캐시·삭제 책임과 실제 사용량
- 앱별 후보 비교표: 월 고정비, 예상 종량제, 하드캡 여부, 기능 결손, 운영 부담
- OpenNext Preview 검증표: 핵심 경로별 통과·실패와 CPU·번들·캐시 수치
- 최종 권고안 하나와 기각안의 구체적 기각 근거
- DNS 전환, 비밀값 배치, Supabase Auth 변경, Cron 이전, 캐시 워밍, 모니터링, 롤백 절차
- 전환 뒤 Vercel Pro를 언제 해지·다운그레이드해도 되는지 판정하는 종료 조건

## 합격 기준

- 기존 R2 영구 자산을 재업로드하거나 URL을 일괄 변경하지 않아도 핵심 화면이 정상이다.
- 운영 자산과 증분 캐시의 삭제·lifecycle·권한 경계가 명확하고 영구 자산 전체 삭제 경로가 없다.
- 사용자 웹의 핵심 기능과 SEO 응답이 현행보다 나빠지지 않는다.
- 백오피스 저장 뒤 필요한 캐시만 무효화되고 Supabase egress 방어가 유지된다.
- 평시 예상비뿐 아니라 급증 시 최대 청구·중단 동작을 사용자가 이해하고 선택할 수 있다.
- 후보 플랫폼에서 5xx·로그인 실패·캐시 미반영이 발견되면 해결 전에는 DNS를 전환하지 않는다.
- DNS 전환 뒤에도 검증 기간 동안 Vercel 배포로 되돌릴 수 있다.

## 변경 금지선

- 조사 단계에서는 운영 DNS, Vercel 구독, Cloudflare 플랜, R2 버킷·객체·CORS·lifecycle,
  Supabase Auth 설정을 변경하지 않는다.
- 기존 R2 자산을 복사·이동·삭제하지 않는다. Preview 캐시는 운영 자산과 격리한다.
- 비용 비교를 위해 새 DB 테이블이나 컬럼을 만들지 않는다.
- Cloudflare Images, Argo, Cache Reserve 같은 유료 부가기능을 필요성 검증 전에 켜지 않는다.
- 최종 승인과 복귀 절차 없이 Vercel Production을 내리거나 Pro를 해지하지 않는다.

## 연결 문서와 코드

- 플랫폼 구조: `docs/project/platform/architecture.md`
- 외부 서비스·과거 egress 사고: `docs/project/platform/external-services.md`
- 환경변수 SSoT와 기존 R2 계약: `docs/project/platform/env-vars.md`
- 검색 노출·배포 후 검증: `docs/project/operations/seo.md`
- 사용자 웹 R2 접근: `sw/web/src/lib/r2.ts`
- 백오피스 R2 접근: `sw/web-bo/src/lib/r2.ts`
- Vercel Cron: `sw/web/vercel.json`
- Next 설정: `sw/web/next.config.ts`
- 캐시 태그 SSoT: `packages/shared/src/constants/cache-tags.ts`

## 26.08.15 운영 경과

- Vercel Pro의 포함 크레딧은 월 $20이며 확인 시점 사용량은 $16.03, On-Demand Charges는 $0이다.
  Spend Management는 포함 크레딧 소진 뒤 $1 예산에서 Production 전체를 일시중지하도록 설정했다.
- Build Machine은 Standard, On-Demand Concurrent Builds는 두 프로젝트 모두 Disabled로 바꿨고 Remote
  Cache는 유지했다. 이미 발생한 Build CPU $3.63은 사라지지 않으며 이후 증가분으로 효과를 판정한다.
- 현재 큰 비용은 ISR Writes $6.05와 Fast Origin Transfer $4.03이다. ISR Writes는 8월 12일 약 54만
  Write Units를 정점으로 감소 중이며, 총 1,167,485 Write Units가 확인됐다.
- 현재 빌드의 `prerender-manifest.json`에서 메인·탐색 페이지는 ISR 경로가 아니다. 탐색은 동적 렌더링이고
  내부 `unstable_cache` 데이터만 별도 캐시된다. 따라서 탐색 데이터 캐시 제거를 ISR Writes 대책으로 바로
  실행하지 않는다. 제거 시 Supabase egress와 Vercel Function 비용으로 부하가 이동한다.
- ISR 경로는 주로 인물 상세, 콘텐츠 상세, 사이트맵이다. 8월 12일의 상세 캐시 키 `detail-tags-v2`
  도입과 ISR Writes 정점이 시간상 일치하므로 상세 페이지 재충전 가능성이 높지만 아직 원인으로 확정하지
  않았다. 일별 Write Units가 계속 감소하는지 먼저 측정한 뒤 상세 경로·크롤러 단위로 좁힌다.
- Cloudflare/OpenNext 이전은 즉시 결정하지 않는다. 기존 R2는 영구 자산 저장소라는 제약이지 이전 자체의
  이점은 아니므로, R2 자산과 증분 캐시를 분리한 Preview 및 실측 비용 비교 뒤 플랫폼을 결정한다.
- Vercel MCP 실측에서 결제 주기 시작 뒤 `feelandnote` 30회와 `feelandnote-bo` 30회, 총 60회의
  Production 배포가 확인됐다. 28개 커밋은 두 프로젝트가 함께 빌드됐고 문서 전용 커밋도 포함됐다.
- 완료 배포의 `buildingAt`부터 `ready`까지 합계는 web 66.7분, web-bo 122.6분으로 총 189.3분이다.
  문서 전용 배포 8회만 24.4분을 사용했다. 프로젝트별 `ignoreCommand`를 적용해 해당 앱·공유 패키지가
  바뀌지 않은 커밋은 건너뛰며, 과거 실제 문서·web·web-bo·shared 커밋으로 판정을 검증했다.
- 같은 기간 사용자 웹 런타임 로그는 콘텐츠 상세 9,540건, 인물 상세 3,557건, SEO 이미지 1,966건이며
  캐시 요청 경로는 6,783종이었다. 메인 233건·탐색 209건보다 상세 URL의 광범위한 순회가 압도적이므로
  ISR Writes의 우선 조사 대상은 탐색 페이지가 아니라 상세 경로의 최초 생성·무효화·크롤러 재방문이다.
- 미들웨어는 17,091회 실행됐고 최근 SEO 이미지 요청은 서로 다른 ID에서 `cache=MISS`가 이어졌다.
  SEO 이미지 조회를 항목별 캐시 태그로 바꾸고 OpenLibrary의 Archive 리다이렉트를 교정했으며,
  `seo-image/`와 루트 OG 이미지는 matcher에서 제외했다. 배포 뒤 함수·미들웨어·Fast Origin 기울기를 비교한다.
