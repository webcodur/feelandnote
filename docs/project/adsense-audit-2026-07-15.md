# AdSense 반복 거절 감사·교정 보고서 (2026-07-15)

AdSense 승인이 1차 신청(26.03.09) 이후 반복 거절된 원인을 전방위 감사로 규명하고 교정한 기록. 수익화 전반은 `monetization.md`, SEO 설정 현황은 `seo.md` 참조.

## 1. 결론

**거절 원인은 정책 페이지·필수 요건이 아니라 색인 붕괴였다.** 그간의 개선(개인정보처리방침 광고 조항, 정책 페이지 noindex 해제 등)은 전부 옳았으나 원인을 빗나갔다. 심사관과 크롤러가 보는 사이트는 사실상 빈 사이트였다.

### 진단 근거 (GSC 실측, 2026-04-14 ~ 07-14)

| 지표 | 실측값 |
|------|--------|
| 사이트맵 제출 URL | 2,196 |
| 3개월간 검색 노출된 고유 페이지 | **45개 (색인률 ~2%)** |
| 3개월 총 클릭 | 11 |
| GSC 사이트맵 `indexed` | 0 |

구글 공식 자격요건은 "high-quality, original, **attract an audience**"이며, 미승인 사유 문서는 thin content를 "자체 제작 콘텐츠가 거의 없는 페이지"로 정의한다. 2024년 3월 도입된 scaled content abuse 정책과, 저품질 페이지 비율이 높으면 사이트 단위로 거절된다는 실측 사례에 현 상태가 정면으로 걸렸다.

## 2. 확정된 근본 원인 (전부 적대적 재검증 통과)

### ① robots 쿼리 전면 차단 × 내부 링크 × 사이트맵 미등재 → 콘텐츠 상세 완전 봉쇄 (critical)

`robots.ts`의 `Disallow: /*?` 가 쿼리스트링 URL을 전 크롤러에 차단했다. 그런데 콘텐츠 상세 내부 링크 16곳이 **전부** `?category=` 를 달고 있었고, 사이트맵에도 `/content/` URL이 0건이었다. 결과: contents 7,568건(셀럽 리뷰 6,665건 보유, 사이트 최대 독창 자산)이 구글에 완전 비가시. Mediapartners-Google(AdSense 크롤러)도 `*` 그룹을 상속해 동일 차단.

### ② 셀럽 페이지 본문 클라이언트 렌더 (critical)

사이트 표면적의 96%인 셀럽 페이지에서 책 목록·리뷰·감상 여정이 `useContentLibrary`의 `isLoading=true` 초기값 + `useEffect` 서버액션 POST로 로드돼 서버 HTML에 부재. 실측: `/celeb/elon-musk` HTML 512KB 중 가시 텍스트 3,309자, **책 58권 중 0권**. 제목은 "추천 책 58권"을 약속하는데 본문 0권. 감상 여정은 `tab==="journey"` 조건부 마운트라 DOM에 없었고, 빈 방명록 문구가 전 셀럽 페이지에 반복 노출됐다. 과거 2회(26.03.13, 03.26) 스켈레톤 색인 사고와 동일 계열의 컴포넌트 레벨 재발.

### ③ canonical 상속 결함 (major)

`[locale]/layout.tsx`가 `getLocalizedAlternates("/")` 로 canonical=홈을 레이아웃 레벨에 선언 → 자체 alternates가 없는 페이지가 전부 "내 정본은 홈"으로 신고. 라이브 실측으로 탐색·서가 허브 10경로 × 2로케일 = 20 URL이 해당(hreflang까지 홈으로 상속). 7/3 커밋 cb79bae6은 en 자기참조만 고쳤고 상속 결함은 남아 있었다.

### ④ AdSense 스크립트 초기 HTML 부재 (major)

`layout.tsx` body에 `next/script` `strategy="afterInteractive"` 로 삽입 → 하이드레이션 후 클라이언트 DOM 주입이라 view-source에 스크립트 태그가 없었다. 초기 HTML에는 preload 힌트와 RSC 페이로드 문자열만 존재. 구글 가이드는 `<head>` 내 배치를 요구하며, "사이트에서 코드를 찾을 수 없음"은 문서화된 실패 패턴이다.

### 부수 원인

- About 페이지가 커밋 a774aad1(26.03.28)로 제거되어 한/영 404. 재신청(3/26) 직후 사라져 이후 거절 기간 내내 부재. 운영 주체·콘텐츠 제작 방식이라는 표준 신뢰 신호가 비어 있었다.
- 사이트맵에 307 리다이렉트 스텁 6종 등재, 전 정적 URL의 `lastmod`가 매 재생성마다 `new Date()`로 갱신.
- 아고라 글 총 7건이 색인 대상이라 "제작 중 사이트" 신호 발신.
- 리뷰 0건 콘텐츠 903건은 출판사 소개문 복제가 전부 → 사이트맵 확장 시 중복 콘텐츠 부채.
- `/archive/lounge` → `/play` 리다이렉트의 목적지 라우트 부재(404).

## 3. 적용한 조치

| # | 영역 | 조치 |
|---|------|------|
| 1 | `robots.ts` | `/*?` 전면 차단 제거 → 무한 조합 파라미터만 차단(`search`·`sortBy`·`sort`·`page`). crawlDelay 10→1. Disallow 항목에 `/en` 접두 변형 추가 |
| 2 | 셀럽 페이지 | 서가 첫 10건을 `page.tsx` 기존 `Promise.all`에 합류시켜 서버 페치 → `initialContents` prop 전달. `useContentLibrary`가 초기 데이터로 `isLoading=false` 시작, `useRef` 가드로 첫 조회만 생략. 감상 기록·감상 여정을 조건부 마운트 → CSS 숨김 전환. 방명록 0건 시 빈 문구 미렌더 |
| 3 | `layout.tsx`(root) | AdSense 로더를 `<head>` 원시 `<script async>` 태그로 이전 + `google-adsense-account` 메타 추가. `next/script` 블록 제거 |
| 4 | `[locale]/layout.tsx` | canonical/languages alternates 선언 제거(RSS `types`만 유지). `/library/era`·`museum`·`academy`·`profession` 4개 page에 자기참조 alternates 부여 |
| 5 | About | `(policy)/about/page.tsx` 복원. **기존 파일이 참조하는 메시지 키가 ko/en 양쪽에 전무해 렌더 시 깨지는 상태였다** → 17개 키 신설. 푸터 `FOOTER_BRAND_LINKS` 최상단 링크, 사이트맵 등재 |
| 6 | `sitemap.ts` | 리뷰 보유 콘텐츠 6,665건 등재(쿼리 없는 정본 `/content/{id}`). 리다이렉트 스텁 6종 제거. `lastmod`는 실제 갱신 시각을 알 때만 기록. `celeb_tier=eq.full` 필터 |
| 7 | noindex | 얇은 티어 셀럽(full 외), 리뷰 0건 콘텐츠, 아고라 전체 → `noindex, follow` |
| 8 | `next.config.ts` | 스텁 6종을 308 영구 리다이렉트로 승격(page.tsx `redirect()`는 307). `/archive/lounge` 목적지 `/play`→`/rest` 교정, `/archive/*` 3종 permanent 전환 |

## 4. 검증 결과 (프로덕션 빌드 + 로컬 서버 실측)

`npx tsc --noEmit` 통과, `pnpm build:web` exit 0. Googlebot UA로 실측:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| `/celeb/elon-musk` 가시 텍스트 | 3,309자 | **10,415자** |
| 서버 HTML 책 제목 노출 | 0권 | 파운데이션·둠의 창조자들·로마제국 쇠망사 등 (제목·저자·감상 배경·출처 전문) |
| 빈 방명록 문구 | 전 페이지 노출 | 0건 |
| `/about` | ko/en 404 | ko/en 200, 가시 1,454자 |
| 허브 canonical | 홈으로 신고 | 자기참조 (`/library/era` → `/library/era` 등) |
| AdSense 코드 초기 HTML | 부재 | `<head>`에 로더 + 계정 메타 |
| 아고라 | 색인 대상 | `noindex, follow` |
| 얇은 티어 셀럽 | 색인 대상 | `noindex, follow` (kim-ok-gyun·marcus-agrippa 실측), full 티어는 색인 유지 |
| 사이트맵 | 2,196 URL, 스텁 6종 포함 | **15,884 URL** (정적 40 + 셀럽 2,514 + 콘텐츠 13,330), 스텁 0 |

## 4-1. egress 영향 검증 (같은 날 추가 감사)

크롤 노출을 크게 늘렸으므로(사이트맵 7.2배, robots 완화, 셀럽 SSR 조회 추가) egress 재폭발 위험을 별도 감사했다. 이 사이트는 Supabase egress 무료 한도 초과로 프로젝트 정지가 반복돼 Pro 결제로 넘어간 이력이 있다(`web-egress-audit-2026-06-29.md`).

### 결론: 재폭발하지 않는다. 단 캐시 수명 3곳을 교정했다.

**핵심 원리**: egress는 **URL 수에 비례하지 않는다.** 봇 요청 자체는 0바이트고 `unstable_cache` 히트도 0바이트다. Supabase에 도달하는 건 오직 **캐시 미스**뿐이므로 실질 egress = `미스 횟수 × 페이로드`이며, 미스 횟수의 상한을 정하는 건 **`revalidate` 값**이다. 사이트맵이 2,196 → 15,884로 늘어도 크롤 예산이 재배분될 뿐 총량은 안 는다.

### 되돌린 두 설정은 egress 방어에 기여한 적이 없었다 (조치 불요)

| 설정 | 원래 사유 | 실측 판정 |
|------|-----------|-----------|
| `crawlDelay 10 → 1` | `b1155cea` egress 대책 | **무해.** Google은 crawl-delay를 **공식 미지원·무시**한다(Search Central 명시). 같은 커밋이 지목한 진짜 주범(AI 크롤러)은 `Disallow: /` 전면 차단 그룹이라 crawlDelay가 걸린 적도 없다. 실제로 늦춘 대상은 Bing·네이버뿐이고 그들의 캐시 히트는 0바이트. 잃은 건 색인 속도뿐이었다 |
| `/*?` 전면 차단 해제 | `cf8c476b` "캐시 키 폭발 완화" | **안전.** 다중 필터 조합을 만드는 **크롤 가능한 href가 애초에 존재하지 않는다**(필터 UI는 `router.push` 방식이라 HTML에 링크 없음). 크롤 도달 가능 조합은 `?profession=`(약 30개)·`?tier=`(2개) × 2 locale ≈ 64 URL뿐이고 `getCelebs`는 이미 7일 캐시. **과잉 방어였고 색인만 깼다** |

**살아 있는 주력 방어는 그대로다**: AI 크롤러 20종 `Disallow: /` 전면 차단(`b1155cea`), 전체 테이블 풀스캔의 공유 단일키 캐시화(`cf8c476b`). 둘 다 손대지 않았다.

### 진짜 레버는 `revalidate` 격차였다 (교정 완료)

셀럽 페이지의 서버 렌더 DB 조회 7건 중 6건이 `STATIC_REVALIDATE`(7일)인데 **오늘 추가한 서가 조회만 3600(1시간)** 이었다. 168배 격차. 이웃과 수명을 맞추는 것만으로 순증이 정리된다.

| 조치 | 파일 | 변경 | 효과(최악 시나리오) |
|------|------|------|---------------------|
| 셀럽 서재 캐시 분리 | `actions/contents/getUserContents.ts` | `getCachedCelebLibraryContents`(키 `celeb-library-contents`, 7일) 신설. 기존 `public-user-contents`(1시간)는 **일반 사용자 서재 열람용으로 유지** — 본인이 책을 추가하면 곧 반영돼야 하므로 7일 부적합. 같은 캐시를 두 용도가 공유하던 것을 키로 분리 | 셀럽 SSR 순증 **717MB/월 → 4MB/월** |
| 콘텐츠 메타 수명 | `actions/contents/getContentDetail.ts` | `content-data-public` 3600 → `STATIC_REVALIDATE`. 제목·저자·소개문은 BO 편집 시에만 변한다(셀럽 프로필과 동일 성격). **감상문 피드(`getReviewFeed`)는 사용자 활동으로 변하므로 3600 유지** | 콘텐츠 상세 **50GB/월 → 0.7GB/월** |
| 사이트맵 주기 | `app/sitemap.ts` | `revalidate` 3600 → 86400(내부 fetch 2곳 포함). 재생성 1회가 약 1MB(셀럽 1,257행 + user_contents 11,230행 스캔) | **750MB/월 → 30MB/월** |

### 실측 페이로드 (Supabase 실 SQL 기준)

- 셀럽 서가 SSR 조회: ko 8,326 B / en 10,688 B (`review` 본문 포함 10행 + 조인)
- 콘텐츠 상세 1면: ko 약 4.5 KB / en 약 6 KB (조회 2건 — 메타 + 리뷰 평균 1.7건)
- 전량 콜드 스윕 1회(15,884 URL): 약 170 MB
- 현실 시나리오(하루 2,000 URL 크롤): 약 660 MB/월 = Pro 250GB의 **0.26%**
- 교정 전 최악 시나리오(시간당 전수 스윕): 약 78 GB/월 → **교정 후 약 1 GB/월**

### 캐시 커버리지 — 구멍 0건

셀럽 상세·콘텐츠 상세 **서버 렌더 경로의 모든 DB 조회가 `unstable_cache` 안에 있고 전부 `createStaticClient`(쿠키 없음)를 쓴다.** 캐시 밖 조회는 로그인 사용자 전용 경로뿐이며(`getCelebBySlug`의 팔로우·차단 3건, `fetchUserRecord`), 봇은 `currentUser === null`이라 통째로 스킵된다. 즉 **봇의 캐시 히트 = 0바이트**가 성립한다. 클라이언트 마운트 후 서버액션(`getUserContentCounts`·`checkContentsSaved`·창작 서가 Wikidata)은 봇이 실행하지 않으므로 egress 무관.

### 전역 퍼지 — 이미 활성이던 지뢰 (발견 → 같은 날 해소)

**egress 감사 문서의 "`CRON_SECRET` 미설정" 기록은 낡은 것이었다. 실측 결과 프로덕션에 설정돼 있었다.**

- 근거: 라이브 `POST /api/revalidate` → **401**. 코드상 키 미설정이면 503(`api/revalidate/route.ts:17-22`, `79ad292b`)이므로 401은 키 존재 확정. 로컬 `sw/web/.env`·`sw/web-bo/.env`의 값 해시도 일치.
- 의미: **BO 저장 1회마다 `revalidateTag('celebs', {expire:0})`가 실제로 실행되고 있었다.** 그런데 egress 감사 ⑤(태그 국소화)가 미착수라 캐시 약 70곳이 전부 단일 태그 `['celebs']`였다 → **저장 1회가 7일 캐시를 포함한 전 캐시를 즉시 전멸**시켰다. 호출부는 `web-bo/src/actions/admin/`(celebs·contents·dialogues)에 **42곳**이라 셀럽 대량 작업 시 저장마다 반복됐다.
- 비용: 퍼지 1회 직후 크롤·방문의 콜드 = 셀럽별 1,257 × 약 31.7KB + 전역 단일키(`all-persona-vectors` 5.32MB + `celebs-with-dates` 530KB) ≈ **약 46MB/퍼지**. BO 저장 20회/일이면 **약 27GB/월**.
- **이것이 egress 재폭발의 활성 경로였다.** 본 문서 4-1절의 캐시 수명 교정(7일)은 BO 저장이 없는 구간에서만 온전히 효과를 내므로, 저장이 잦으면 수명과 무관하게 리셋된다.
- **→ 같은 날 ⑤ 태그 국소화를 완료해 해소했다.** SSoT `packages/shared/src/constants/cache-tags.ts`(`CACHE_TAGS` 5종: CELEBS·CONTENTS·DIALOGUES·PERSONA·TAGS)로 web 캐시 72곳 재태깅(62곳 도메인 배정 + 10곳 태그 제거 — BO가 건드리지 않는 게시판·업적·팔로워 등), web-bo 호출부 34곳을 실제 수정 테이블 기준으로 매핑, `revalidateWebCache` 기본값 제거(인자 누락 시 타입 에러로 전역 퍼지 재발 차단), `/api/revalidate` 배열 수용. 이제 **BO 저장이 해당 도메인만 비운다.** 상세는 `web-egress-audit-2026-06-29.md` 10절.

부수로, 7일 캐시는 BO 수정이 최대 7일간 안 보인다는 뜻이지만 **④가 켜져 있어 저장 시 자동 반영되므로 실질 문제는 없다**(오히려 지금은 너무 잘 비워지는 게 문제다). 수동 무효화 경로(`/api/revalidate`)도 정상 작동한다.

### 추가 발견 (미조치, 권고)

- **`?category=` 무검증 캐스트** (`content/[contentId]/page.tsx`): 런타임 화이트리스트 대조 없이 `as CategoryId`라 임의 문자열이 캐시 키로 들어간다. 게다가 **콘텐츠가 DB에 있으면 `category`는 한 번도 읽히지 않는다**(타입은 `TYPE_TO_CATEGORY[dbContent.type]`로 DB에서 파생). 사이트맵 등재 콘텐츠는 전부 DB에 있으므로 출력에 영향 없이 캐시 키만 쪼갠다. 권고: `CATEGORIES` 화이트리스트 검증 후 미일치 시 `undefined`(참조 구현 `agora/board/feedback/page.tsx`).
- **`CL_SELECT`가 미사용 locale의 `description`까지 수신** (`lib/utils/content-locale.ts`): ko 렌더에서 영문 소개문을 받아 버린다. egress 감사 ⑥의 `review_en` 조치와 동일 유형. 약 0.5~1KB/콜드.
- **`all-persona-vectors` 5.32 MiB/미스** (`actions/persona/getSimilarByCelebId.ts`): persona JSONB 원본 1,577행 전수를 받아 JS에서 16개 점수만 추출. 전역 단일키 7일이라 현재는 25MB/월로 무해하나, 태그 퍼지가 살아나면 퍼지마다 5.32MB. 점수만 반환하는 RPC 전환 시 약 600KB로 축소. egress 감사 ⑥이 분포 쪽만 RPC화했고 이 경로엔 같은 결함이 남아 있다.

## 4-2. 배포 완료·라이브 검증 (2026-07-15)

커밋 `2c1aa1ad` (107 files, +1050/-248) → main 푸시 → Vercel 자동 배포 완료. **전 항목 라이브 실측 통과.**

| 항목 | 수정 전 | 라이브 실측 |
|------|---------|-------------|
| `/celeb/elon-musk` 가시 텍스트 | 3,309자 | **10,457자** |
| 서버 HTML 책 노출 | 0권 | 파운데이션 10회·로마제국 쇠망사 4회·손자병법 4회 (제목·저자·감상 배경·출처 전문) |
| 빈 방명록 문구 | 전 페이지 | 0건 |
| robots | `Disallow: /*?` + `Crawl-delay: 10` | `search=`·`sortBy=`·`sort=`·`page=`만 차단 + `Crawl-delay: 1` |
| `/about` | ko/en 404 | ko/en **200** |
| AdSense 코드 | 초기 HTML 부재 | `<head>`에 로더 + `google-adsense-account` 메타 |
| canonical | 허브 20 URL이 홈 신고 | 자기참조 (`/library/era`·`/library/museum`·`/explore/persona` 확인) |
| 아고라 | 색인 대상 | `noindex, follow` |
| 얇은 티어 셀럽 | 색인 대상 | `noindex, follow` (kim-ok-gyun). full 티어(elon-musk)는 색인 허용 유지 |
| 사이트맵 | 2,196 URL, 스텁 6종 | **15,884 URL** (정적 40 + 셀럽 2,514 + 콘텐츠 13,330), 스텁 0, about 등재 |

**사이트맵 재제출 완료 (유저 수행, 2026-07-15 02:32)**: MCP API는 권한 부족(403)이라 유저가 GSC에서 직접 재제출했고 **구글이 7초 만에 다운로드**했다(`lastSubmitted` 02:32:20 → `lastDownloaded` 02:32:27). **submitted 15,884 URL 인식, 오류·경고 0.** 종전 `lastDownloaded`는 2026-03-26이었다.

`indexed`는 0으로 표시되나 정상이다 — 제출 직후이며 이 필드 자체가 GSC에서 잘 채워지지 않는다. 실제 색인 회복은 **커버리지 보고서와 `index_inspect`의 `lastCrawlTime` 갱신**으로 판정한다. 기준선: 재제출 시점 `/celeb/elon-musk`의 `lastCrawlTime`은 **2026-05-19**(책 0권 시절 버전)였다. 이 값이 07-15 이후로 바뀌면 새 콘텐츠가 구글에 반영된 것이다.

## 5. 재신청 절차

부분 수정 후 즉시 재신청을 반복하면 쿨다운만 길어진다. 순서를 지킬 것.

1. ~~**배포** 후 라이브 재확인~~ → **완료 (4-2절)**
2. ~~**사이트맵 재제출** (GSC)~~ → **완료 (26.07.15 02:32, 15,884 URL 인식·오류 0)**
3. **색인 회복 확인** — 최소 2주. GSC 색인 페이지 수가 유의미하게 오르는지 본다. 색인이 안 풀린 상태의 재신청은 같은 결과만 반복한다.
4. **AdSense 사이트 화면에서 검토 요청** 버튼으로 재신청. **사이트 삭제 후 재추가는 공식 비권장**(지연만 유발). 심사 기간은 전 세계 공통 2~4주.

한국 리전이 더 까다롭다는 설은 공식 근거가 없다(6개월 보유 특칙은 중국·인도 한정, 제한 지역은 OFAC 제재국뿐).

## 6. 남은 과제

| 우선순위 | 과제 | 비고 |
|---|------|------|
| 높음 | **정적 렌더 전환 시 SSR 파손 주의** | `ContentLibrary`가 `useSearchParams()`를 쓴다. 현재는 `getCelebBySlug`의 쿠키 접근 때문에 동적 렌더(ƒ)라 SSR이 정상 동작하나, egress 감사 ③번 과제대로 `[locale]` 트리를 정적 렌더로 전환하면 Suspense 경계에서 이 서브트리가 CSR로 빠져 **책 목록이 다시 HTML에서 사라진다.** 정적화 시 `q` 검색어를 서버 prop으로 내리는 조치가 함께 필요 |
| 중 | 도메인 메일(`contact@feelandnote.com`) 개설 후 Contact·Privacy에 반영 | 현재 gmail 단일. 승인 필수 요건은 아니나 신뢰 신호 |
| 중 | 약관·방침 보강 | 약관 1,317자·방침 1,852자로 템플릿 수준. UGC 플랫폼인데 저작권 침해 신고 절차(notice & takedown), 서비스 변경·중단, 분쟁 해결, 국외 이전(Supabase/Vercel/Google), 만 14세 미만 조항 부재 |
| 중 | 쿠키 동의(CMP) | 영문판 운영으로 EEA/UK 트래픽이 열려 있으나 인증 CMP 부재. 승인 요건은 아니고 승인 후 게재 제한 요인. Google Funding Choices 검토 |
| 낮 | www → apex 리다이렉트 307 → 308 | Vercel 도메인 설정에서 permanent 지정 |
| 낮 | 모바일/PC 이중 마크업 통합 | `SectionWrap`(md:hidden + hidden md:block)으로 전 텍스트가 HTML에 2회 중복 → 텍스트 밀도 왜곡 |
| 낮 | EN 페이지 한국어 잔존 | `/en/celeb/ho-chi-minh` 가시 본문에 국적이 "베트남"으로 노출 |

## 7. 교훈

- **표면 SEO 정상 ≠ 색인 정상.** 메타·canonical·JSON-LD·ads.txt·정책 페이지가 전부 정상이어도, 크롤러가 따라갈 링크가 없고 본문이 JS 뒤에 있으면 사이트는 존재하지 않는 것과 같다.
- **JSON-LD는 가시 콘텐츠와 정합해야 한다.** ItemList가 책 50권을 선언하는데 본문에 0권이면 스팸성 마크업 신호다. (이번에 `visibility='public'` 필터 누락으로 비공개 항목까지 선언하던 것도 함께 교정)
- **사이트맵 등재와 noindex는 같은 기준을 써야 한다.** 등재해놓고 색인 거부하면 모순 신호가 된다. 그래서 사이트맵 `celeb_tier=eq.full` 과 페이지 noindex 기준을 일치시켰다.
- 스켈레톤 색인 사고는 `loading.tsx` 제거만으로 끝나지 않는다. **컴포넌트 레벨의 클라이언트 fetch도 동일한 결과**를 낳으며, 이번이 3번째 재발이었다.
