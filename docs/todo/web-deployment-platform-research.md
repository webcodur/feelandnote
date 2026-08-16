# 배포비·플랫폼 남은 작업

사용자 웹과 백오피스의 실사용 비용·제약을 비교해 앱별 배포처와 비용 상한을
결정한다. Vercel 유지, Cloudflare Workers, 혼합 배포, 정액 Node 서버 중 어느 안도
선결론으로 두지 않는다.

현재 규칙은 다음 문서가 쥐다.

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

## 2. 배포 후 비용 기준선 재측정

Vercel Usage를 사용자 웹과 백오피스로 나눠 적용 전·후 기울기를 비교한다.

- ISR Writes
- Fast Origin Transfer
- Build CPU·배포 횟수
- Function CPU·Memory
- Observability Events
- 상세 주소·검색 공유용 이미지·크롤러별 요청량

단순 방문 수와 캐시 쓰기를 같은 원인으로 취급하지 않는다. 상세 화면의 최초 생성,
명시적 무효화, 캐시 만료, 크롤러 재방문을 나눠 원인을 확정한다.

## 3. R2 자산·사용량 인벤토리

비밀값을 출력하지 않고 다음을 읽기 전용으로 실측한다.

- 버킷별 저장량, 객체 수, Class A/B 작업량, 공개 도메인
- CORS, lifecycle, Cache-Control, `?v=` 캐시 무효화 규칙
- 키 공간별 생성자, 사용자, 갱신·삭제 책임
- DB와 코드의 자산 URL 호스트·prefix 분포

영구 자산과 재생성 가능한 증분 캐시의 버킷·prefix·권한·삭제 경계를 비교한다.
영구 자산을 전체 purge하거나 짧은 lifecycle에 넣을 수 있는 구조는 기각한다.

## 4. 앱별 비용·제약 비교

`sw/web`과 `sw/web-bo`를 별도로 판정한다.

| 후보 | 사용자 웹 | 백오피스 |
|---|---|---|
| Vercel 유지 | 관리형 ISR·배포 편의와 최대 청구 | 저트래픽 앱의 팀·빌드 비용 |
| Cloudflare Workers + OpenNext | Next 16 기능, CPU, 번들, 캐시, SEO | Node·파일시스템·이미지·자식 프로세스 제약 |
| 혼합 배포 | 공개 웹만 이전했을 때의 이득 | Vercel·로컬·고정 서버 중 운영 부담 |
| 정액 Node + Cloudflare CDN | 고정비, 복구, 보안 업데이트 | 관리자 접근 통제와 앱 분리 |
| 정적화 확대 + 얇은 API | 비용 상한과 캐시 적중 | 재작성 범위가 이득을 넘는지 |

각 안에 평시·크롤 급증·공격 시나리오의 월 비용, 하드캡 여부, 한도 초과 때의
중단 동작, 추가 유료 상품, 운영 부담을 포함한다.

## 5. Cloudflare/OpenNext 격리 미리보기

운영 DNS·DB·R2 자산을 바꾸지 않고 `sw/web`을 실제로 빌드·배포한다. 증분 캐시는
영구 자산과 격리된 시험 영역만 쓴다.

- Next.js 16.1, Webpack 전처리기, `next-intl`, Middleware, Server Actions
- Worker 압축 크기, 모듈 구성, CPU-ms, R2 Class A/B
- 시간 기반 ISR, `revalidateTag`, `revalidatePath`, 지역 캐시 무효화
- `sharp`, `ImageResponse`, `public` 폴더 탐색, `node:crypto`, AWS S3 SDK
- Supabase SSR 쿠키, Google OAuth, 이메일 로그인·로그아웃·세션 갱신
- 백오피스 저장 후 사용자 웹 캐시 무효화
- `today-figure` 예약 실행과 실패 재시도

## 6. SEO·인증·운영 연속성 비교

현행 Vercel 배포와 미리보기를 같은 조건에서 비교한다.

- `/`, `/en`, 인물·콘텐츠 상세, 디렉토리, 사이트맵, feed, robots
- canonical, hreflang, 색인 차단, HTML·응답 헤더
- 로그인, OAuth callback, 쿠키 보안 속성, 세션 갱신
- 사용자 핵심 여정과 백오피스 저장 → 웹 반영 소요 시간

미리보기 도메인은 검색 색인에서 차단하되 기능 테스트는 가능해야 한다.

## 7. 최종 결정과 승인 뒤 전환

다음 산출물을 한 안으로 묶어 사용자 승인을 받는다.

- 앱별 배치도와 최종 권고안 하나
- 평시·급증 시 월 비용 범위와 최대 청구·중단 동작
- R2 영구 자산과 증분 캐시의 권한·삭제·lifecycle 경계
- 기각안의 기능 결손·비용·운영 부담
- DNS, 비밀값, Supabase Auth, Cron, 캐시 데우기, 모니터링, 롤백 절차
- Vercel Production으로 복귀할 수 있는 검증 기간과 구독 해지·다운그레이드 조건

## 변경 금지선

최종 안을 승인받기 전에는 다음을 바꾸지 않는다.

- 운영 DNS, Vercel 구독, Cloudflare 플랜
- R2 버킷·객체·CORS·lifecycle·공개 URL
- Supabase Auth 설정과 운영 비밀값
- 영구 자산의 복사·이동·삭제·전체 purge
- 유료 부가 기능과 새 DB 테이블·컬럼

## 종료 조건

- 현재 배치와 자산 흐름, R2 사용량, 앱별 비용이 실측되었다.
- 후보별 최대 비용, 기능 결손, 운영 부담이 같은 기준으로 비교되었다.
- 선택한 후보의 핵심 기능·SEO·인증·캐시·Cron이 미리보기에서 통과했다.
- 사용자가 최종 안과 예상 비용, 중단 동작, 롤백 절차를 승인했다.
- 전환하는 경우 검증 기간 동안 Vercel Production으로 복귀할 수 있다.

## 26.08.16 결정 — Vercel 유지 + Cloudflare 앞단 캐시

**구성** 브라우저·로봇 → Cloudflare 캐시 → Vercel(캐시·함수) → Supabase. Vercel은 빌드·배포·실행을 그대로 맡고, Cloudflare는 응답 사본을 들고 있다가 같은 요청을 대신 답한다. 앱 이전이 아니다.

**왜** Vercel은 배포 한 번마다 상세 페이지 전부에 "낡음" 딱지를 붙이고, 이후 요청마다 다시 만들며 ISR 쓰기·전송 비용이 난다(딱지는 무료, 재생성은 요청이 닿을 때만). 8/16 배포 12회 중 상세 페이지가 실제로 달라진 건 2회. Cloudflare가 요청을 자기 선에서 끝내면 Vercel에 닿지 않고, 닿지 않으면 다시 만들지도 않는다.

**두 경우**
- 코드·UI 배포: Cloudflare 사본은 그대로. 상세 페이지 모양이 진짜 바뀐 배포(상세 화면·공통 레이아웃·헤더·전역 스타일·번역 파일 변경)만 커밋 변경 파일로 자동 판정해 전체 퍼지 1회. 그 외 배포는 재생성 0.
- 데이터 변경: DB 트리거 → `/api/revalidate` 경로에서 Cloudflare의 해당 URL(`/celeb/<slug>`·`/en/…`·`/seo-image/celeb/<slug>`, 작품도 동형)을 함께 지운다. 그 한 장만 새로 만들어진다.

**캐시 대상** 개인화 없는 화면만 — `/celeb/*`, `/content/*`, `/explore/directory`, `/explore/timeline`, `/seo-image/*`, `/_next/static/*`. 로그인 쿠키(`sb-*`)가 있는 요청은 우회. 홈·회원·광장·검색·API·auth는 제외.

**감수** 관리 화면이 갈린다(봇·전송·캐시=Cloudflare, 실행·오류·배포=Vercel). 퍼지 실패는 로그로 남기고, Cloudflare 보관 기간(7~30일)이 안전망.

**비용** Cloudflare Free. Cache Reserve(롱테일 유지)는 월 $1 안팎, 적중률 보고 결정.

**작업 순서** ① 도메인 추가·네임서버 변경(유저) ② SSL Full(strict)·캐시 규칙·봇 규칙 이관·`/api/revalidate` 퍼지 연결·배포 후 퍼지 판정 워크플로 ③ 검증(배포 뒤 상세가 Cloudflare에서 나오는지, 인물 수정 뒤 그 페이지만 갱신되는지, 로그인·OAuth·이미지 정상) ④ 되돌리기: 네임서버 원위치.

### 26.08.16 실행 결과 — Cloudflare 앞단 가동

- Cloudflare 존 `feelandnote.com`(Free, zone id는 `sw/web/.env` `CLOUDFLARE_ZONE_ID`) 생성, 네임서버 `gabriella.ns.cloudflare.com`·`kobe.ns.cloudflare.com`으로 Vercel 등록 도메인의 NS 변경(전파 1분, Universal SSL 발급 ~1분 — 그 사이 HTTPS 30초 안팎 불통).
- DNS: 루트 A `76.76.21.21`(프록시), `www` CNAME `cname.vercel-dns.com`(프록시), `admin` CNAME(백오피스, DNS만 — 캐시 안 탐), 구글 인증 CNAME, CAA 2건(pki.goog·sectigo) — Vercel DNS에 있던 것 전부 복제.
- 존 설정: SSL Full(strict), Always HTTPS, Brotli.
- 캐시 규칙(`http_request_cache_settings`): `/celeb/*` `/en/celeb/*` `/content/*` `/en/content/*` `/seo-image/*` `/explore/directory` `/explore/timeline`(ko·en) → 엣지 30일 보관(원본 max-age=0 무시), 단 `-auth-token` 쿠키(로그인)가 있으면 우회. 홈·탐색·회원·광장 등은 규칙 없음(DYNAMIC).
- 방화벽(`http_request_firewall_custom`): 학습·마케팅 크롤러 22종 UA 차단(`lib/blocked-crawlers.ts`와 같은 명단) — Vercel 도달 전에 403.
- 퍼지 연동: `/api/revalidate`가 태그→URL로 Cloudflare 퍼지(`lib/cloudflarePurge.ts`), Vercel env `CLOUDFLARE_ZONE_ID`·`CLOUDFLARE_API_TOKEN`. 종단 검증: 인물 상세 HIT → DB 행 갱신(트리거) → ko·en 모두 MISS.
- 검증 완료: 상세·이미지 2회차 HIT, 홈·탐색 DYNAMIC, 로그인 쿠키 DYNAMIC, Ahrefs UA 403·Googlebot 200, http→https·www→루트 리다이렉트, 백오피스 정상.
- **미완**: 배포 후 전체 퍼지 워크플로(`.github/workflows/cloudflare-purge.yml`)는 GitHub Secrets `CLOUDFLARE_ZONE_ID`·`CLOUDFLARE_API_TOKEN`이 아직 없어 건너뛴다. UI가 바뀐 배포 뒤 상세 화면은 30일까지 옛 모양이 남을 수 있다 → secret 넣기 전에는 대시보드 "Purge Everything"으로 수동.
- 되돌리기: Vercel → Domains → feelandnote.com → Nameservers → "Restore Original Nameservers".

