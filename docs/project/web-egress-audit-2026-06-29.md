# web Egress 전수 재점검 보고서 (2026-06-29)

`sw/web`의 Supabase egress 매월 초과(프로젝트 `restricted: exceed_egress_quota`) 재발에 대한 코드 전수 점검 기록. 누적 사고 이력은 `external-services.md`의 "Egress 초과" 절을 참조한다.

## 1. 배경·증상

- 활성 사용자 3명 미만인데 **매월** Supabase 무료 egress 한도(약 5.5GB)를 초과해 프로젝트가 정지된다. 캐싱 작업을 여러 차례 했는데도 재발했다.
- 점검 시점 프로젝트는 정지 상태였다. 모든 REST/RPC가 `exceed_egress_quota`로 차단되어 **실측(egress 분해·행 수·RLS 정책)은 불가**했다. 본 보고서의 정량 추정은 전부 코드 구조 + 명시한 가정 기반이다.

## 2. 점검 방법

멀티에이전트 코드 전수 점검 2회(1차 6차원, 2차 7차원). 각 발견을 적대적으로 재검증한 뒤 종합. 조사 차원: 이미지/Storage, 봇 크롤 노출, 캐시 커버리지·무효화, 쿼리 페이로드, 요청 생명주기, API 라우트·크론, 보안·데이터 노출, 기능 정합성.

## 3. 핵심 발견 (정정 포함)

기존 조사의 두 가지 통념이 **코드로 반증**됐다.

1. **이미지가 Supabase에서 샌다 → 거짓.** 셀럽 얼굴(`avatar_url`)·음성은 Cloudflare R2, 책 표지(`thumbnail_url`)는 외부 URL(네이버·OpenLibrary)이다. `sw/web` 전체에서 Storage 다운로드 호출(`getPublicUrl`/`createSignedUrl`/`download`)은 0건이고, 유일한 Storage SDK 호출은 정리 스크립트의 `.remove()`뿐이다. `next.config.ts`의 `images.unoptimized=true` + `*.supabase.co` remotePattern은 과거 잔재다. **Supabase egress의 본체는 이미지가 아니라 DB REST/RPC 응답 바이트다.**

2. ~~**저장마다 전역 캐시 퍼지로 터진다 → 현재는 거짓.**~~ 자동 무효화(`revalidateWebCache`)는 `CRON_SECRET`이 있어야만 호출되는데(`sw/web-bo/src/lib/revalidate-web.ts:9` 미설정 시 early return), 조사 시점(26.06.29) 프로덕션에 `CRON_SECRET`이 미설정임이 확인됐다.

   > **🔴 2026-07-15 정정 — 이 판정은 더 이상 유효하지 않다. 다시 참이 됐다.**
   > 유저가 잔여 과제 ④를 이행해 **프로덕션 web·web-bo 양쪽에 `CRON_SECRET`을 동일 값으로 설정했다**(실측: 라이브 `POST /api/revalidate`가 401 반환 — 키 미설정이면 코드상 503이므로 설정 확정. 로컬 `.env` 양쪽 값 해시 일치).
   > 따라서 **지금은 BO 저장 1회마다 `revalidateTag('celebs', {expire:0})`가 실제로 실행된다.** 그런데 잔여 과제 ⑤(태그 국소화)가 미착수라 캐시 약 70곳이 전부 단일 태그 `['celebs']`를 공유한다 → **저장 1회가 7일 캐시를 포함한 전 캐시를 즉시 전멸시킨다.** 호출부는 `sw/web-bo/src/actions/admin/`의 celebs·contents·dialogues 등 **42곳**이라 셀럽 대량 작업 시 저장마다 반복된다.
   > 퍼지 1회 직후 크롤·방문의 콜드 비용: 셀럽별 캐시 1,257 × 약 31.7KB + 전역 단일키(`all-persona-vectors` 5.32MB + `celebs-with-dates` 530KB) ≈ **약 46MB/퍼지**.
   > **④를 ⑤ 없이 켠 상태가 현재 구성이며, 이것이 egress 재폭발의 활성 경로다.** ⑤가 최우선 과제다.

3. **그 대신 `/api/revalidate`가 무방비였다.** `secret !== process.env.CRON_SECRET` 단일 비교는 키 미설정 시 `undefined === undefined`로 통과되어, 외부 누구나 `{tag:'celebs'}`(secret 생략) POST로 전체 캐시를 하드 퍼지할 수 있었다. **egress의 인위적 방아쇠 후보**다.

### 진짜 주범

코드만으로는 단정할 수 없다. 유력 후보 셋:
- 외부에서 `/api/revalidate`를 반복 호출해 캐시를 비워 콜드 재조회 유발 (→ 본 점검에서 차단)
- 봇이 사이트맵의 셀럽 상세 URL(약 1,071명 × ko/en = 2,142)을 반복 크롤, 셀럽 상세가 동적 SSR이라 페이지당 6개 fan-out 조회를 콜드 재실행
- 일부 대용량 쿼리(성향 분포·타임라인)의 per-miss 페이로드

**확정은 복구 후 Supabase 대시보드의 egress 분해(Database/Storage/Auth/Realtime) 측정이 결정적이다.**

## 4. 적용 조치

### main 반영 (배포됨)

| 커밋 | 내용 |
|------|------|
| `b1155cea` | `robots.ts` AI 크롤러(GPTBot·ClaudeBot·Bytespider·CCBot·Amazonbot·Google-Extended 등) 전면 차단 + 검색봇 `crawlDelay 10`. `explore` 집계 페이지(persona·ranking·timeline) `revalidate` 300→3600 |
| `4c745494` | 보안·데이터 노출 5건 수정 (아래 5절) |
| `79ad292b` | `/api/revalidate` 무인증 노출 차단 — `CRON_SECRET` 미설정 시 503 거부 |

### 브랜치 대기 (검증 후 머지)

| 브랜치/커밋 | 내용 |
|------|------|
| `feat/celeb-page-static` (`06a1f602`) | 셀럽 상세 페이지 정적/ISR 전환. `page.tsx`의 `auth.getUser()` 제거 + `setRequestLocale`/`params.locale` + `revalidate 3600`. 방명록 로그인 본인 판정을 클라이언트 자체 조회로 이관(닉네임·아바타는 방명록 미사용, id만 필요) |

## 5. 확정 결함 목록

적대 검증을 통과한 결함. 분류 × 심각도.

### 보안 / 데이터 노출 (사용자 수 무관, 수정 완료 `4c745494`)
- **별점 수정(`updateRating.ts`)에 인증·소유권 검증 누락** — 형제 액션 4종과 달리 `auth.getUser()`도 `.eq('user_id', user.id)`도 없어 임의 로그인 사용자가 타인 별점을 덮어쓸 수 있었다. → 추가.
- **리뷰 피드(`getReviewFeed.ts`)에 `visibility='public'` 필터 부재** — 타인의 비공개 감상문 전문이 콘텐츠 상세에 캐시로 노출. → 필터 추가.
- **방명록·댓글 삭제(`deleteGuestbookEntry.ts`/`deleteComment.ts`) 서버 소유권 검증 누락** — RLS 단독 의존. → 방명록은 작성자/주인, 댓글은 작성자/관리자 검증 추가.
- **헤더 알림 Realtime 구독 cleanup 미등록(`HeaderNotifications.tsx`)** — `useEffect` 반환값이 아니라 내부 async의 반환값이라 언마운트 시 채널 누수. → cleanup 정상 등록 + 레이스 가드 + 채널명에 user id.

### 미수정 (복구 후 검증 필요, fix-after-verify)
- **`getPersonaDistribution`** — 성향 데이터(persona JSONB) 전수(`limit 3000`) + influence 전 테이블 수신 후 JS 필터. 16개 점수만 쓰면서 행마다 6~15KB짜리 설명문(reason/rationale)을 통째로 받아 99% 폐기. (점수만 반환하는 집계 RPC 필요)
- **`getCelebTimeline`** — 활성 셀럽 전수를 `bio`·`bio_en`(본문급) 포함 무제한 조회. (미리보기 길이 절단 + 펼침 시 지연 로드)
- **목록·피드 액션의 `review`·`review_en` 동시 조회** — ko 응답에서 영어 감상문은 미사용. (ko에서 `review_en` 제외, en은 폴백 때문에 유지)
- **전역 `celebs` 단일 태그** — 캐시 약 70곳이 모두 `tags:['celebs']`. 게시판·방명록·검색·유저까지 묶여 있어 키 설정 후엔 한 도메인 저장이 전체를 퍼지한다. (도메인·셀럽 단위 태그 분리 + web-bo 호출부 매핑)
- **`getInfluenceDistribution`/`getCelebs`** — 영향력 전 테이블을 무제한/중복 수신 후 JS 필터. (DB단 `.eq` 필터 / 랭킹 조회 단일키 분리)
- **`.or()` 검색어 인젝션** — `searchCelebs`/`getUserContents`/`getMyContents`가 사용자 입력을 PostgREST 필터 문자열에 직접 보간. (대상이 공개 테이블이라 노출은 제한적이나 표준 결함)
- **`/api/celeb-works`** — 무인증 공개 엔드포인트가 임의 qid로 외부 SPARQL 다단 대행. 인메모리 캐시가 서버리스에서 무효. (영속 캐시 + qid 화이트리스트)

### 정합성 / 기능
- **`/api/cron/today-figure` 시각·시간대 어긋남** — 크론이 15:05 UTC(00:05 KST)라 daily_figures가 한국 주간 내내 부재, 읽기는 seed 폴백으로만 동작 → 생일 기반 선정이 사실상 노출 안 됨. (`CRON_SECRET` 미설정으로 크론 자체도 매일 401 실패 중일 가능성. 읽기 seed 폴백이 기능은 유지)
- **다국어 canonical 고정(`seo.ts`)** — `getAlternates`가 항상 ko URL을 canonical로 선언 → 영어판 색인 손실. (현재 locale 받아 self-canonical)
- **빈 서재 노출** — 콘텐츠 0개 셀럽이 "오늘의 인물"에 선정되면 책 없는 프로필 + 빈 자리 표시. (크론 후보를 콘텐츠 보유 기준으로 필터)

## 6. 복구 후 작업 (우선순위)

1. **DB 한도 복구** — Supabase 결제/한도 조정, 또는 월별 리필(매월 5일경) 대기.
2. **egress 분해 측정** — 대시보드에서 Database/Storage/Auth/Realtime 비중 확인. 진짜 주범 확정.
3. **`feat/celeb-page-static` 검증·머지** — (a) 로그인→방명록 작성/수정/삭제 동작 (b) Vercel 빌드의 셀럽 페이지 정적(ISR) 판정.
4. **`CRON_SECRET` 설정** — Vercel의 web·web-bo **양쪽에 동일 값**. 자동 무효화 복구 + `/api/revalidate` 잠금 정상 작동 + today-figure 크론 401 해소. 이후에야 태그 국소화가 의미를 가진다.
5. **캐시 태그 국소화** — 셀럽 단위(`celeb:{id}`) + 도메인별 분리 + web-bo 호출부가 "바뀐 그 셀럽만" 비우게. web+web-bo 동시 변경, 저장→반영 확인 필요.
6. **per-miss 페이로드 축소** — 성향 분포 점수만 RPC, 타임라인 bio 절단, ko 응답 review_en 제외.

## 7. 확인된 비핵심 (추가 작업 불필요)

- 이미지·Storage egress는 사실상 0(외부 R2·네이버, next/image 최적화 비활성).
- 미들웨어 `auth.getUser()`는 쿠키 없는 봇에 네트워크 호출 없이 즉시 반환 → 봇 크롤이 Auth egress를 만들지 않는다.
- 주기적 폴링(setInterval/refetchInterval) 없음. Realtime 구독은 로그인 세션 한정(비로그인·봇 무영향).
- 셀럽 상세를 ISR로 되돌려도 Supabase egress 순절감은 제한적(데이터가 이미 `unstable_cache`로 게이트). 정적화의 주 이득은 Vercel 컴퓨트 절감 + robots 무시 봇 방어 + 키 설정 후 무효화 결합.

## 8. 복구 후 적용 결과 (2026-07-03)

Pro 결제로 한도 복구. 대시보드 실측으로 **PostgREST 100.0% / Storage 0.0%** 확정(3절 정정 1 입증). 6/28 스파이크 4.61GB는 수정 배포 전날 발생. 적용 내역·잔여 과제는 `external-services.md`의 "사고 후속 8차" 절이 정본.

| 과제(6절) | 상태 |
|------|------|
| ① DB 한도 복구 | 완료 (Pro 결제) |
| ② egress 분해 측정 | 완료 — PostgREST 100% |
| ③ `feat/celeb-page-static` 머지 | 머지 완료(`c39465ed`). 단 빌드 판정은 여전히 동적(ƒ) — `[locale]` 트리 전체가 동적이며 next-intl 정적 렌더 요건(레이아웃 generateMetadata의 요청 컨텍스트 의존 등) 후속 필요. per-request `auth.getUser()` 제거 효과는 유효. **⚠️ 이 정적화를 재개하기 전에 반드시 `docs/project/adsense-audit-2026-07-15.md` 6절을 읽을 것** — 26.07.15에 셀럽 서가·리뷰·감상 여정을 SSR로 전환해 AdSense 색인 문제를 해결했는데, `ContentLibrary`가 `useSearchParams()`를 쓰므로 정적 렌더로 넘어가면 Suspense 경계에서 이 서브트리가 CSR로 빠져 **책 목록이 HTML에서 다시 사라진다**(색인·AdSense 재파손). 정적화 시 `q` 검색어를 서버 prop으로 내리는 조치가 선행돼야 한다 |
| ④ `CRON_SECRET` 설정 | **완료 (유저 이행, 시점 미상 — 26.07.15 실측 확인)**. 라이브 `POST /api/revalidate` → 401(키 미설정이면 503). web·web-bo 값 일치. 자동 무효화·`/api/revalidate` 인증·today-figure 크론이 정상화됐다 |
| ⑤ 캐시 태그 국소화 | **완료 (2026-07-15)** — 10절 참조. SSoT `packages/shared/src/constants/cache-tags.ts`(`CACHE_TAGS` 5종). web 캐시 72곳 재태깅(62곳 도메인 배정 + 10곳 태그 제거), web-bo 호출부 34곳 도메인 매핑, `/api/revalidate` 배열 수용. 양쪽 타입체크·빌드·런타임 검증 통과 |
| ⑥ per-miss 페이로드 축소 | 완료 — persona 점수만(7MB→560KB 실측), timeline bio locale 분리, ko에서 review_en 제외 7곳, 게임 후보 목록 본문 차단 |

추가 발견: RPC `get_tracker_candidates`가 제거된 열(`p.quotes`) 참조로 항상 실패 — 게임 등용은 폴백 경로로만 동작 중. `SUPABASE_ACCESS_TOKEN` 만료로 DDL 불가, 토큰 갱신 후 교정 필요.

## 9. AdSense 색인 교정에 따른 egress 재검증 (2026-07-15)

**상세: `docs/project/adsense-audit-2026-07-15.md` 4-1절**

AdSense 반복 거절의 원인이 색인 붕괴(제출 2,196 URL 대비 노출 45면)로 확정돼 크롤 노출을 크게 늘렸다(사이트맵 2,196 → 15,884, robots `/*?` 차단 해제, crawlDelay 10→1, 셀럽 서가 SSR 전환). 본 문서의 대책과 충돌하는지 전수 재감사한 결과:

- **egress는 URL 수에 비례하지 않는다.** 봇 요청도 캐시 히트도 0바이트다. Supabase에 도달하는 건 캐시 미스뿐이고, 미스 상한을 정하는 건 `revalidate` 값이다. 셀럽·콘텐츠 상세의 서버 렌더 경로는 **캐시 밖 조회 0건**(캐시 밖은 전부 로그인 전용 경로라 봇은 스킵)이라 이 전제가 성립한다.
- **되돌린 두 설정은 방어에 기여한 적이 없었다.** Google은 crawl-delay를 공식 무시하며, 4절이 지목한 진짜 주범(AI 크롤러)은 `Disallow: /` 전면 차단 그룹이라 crawlDelay 대상이 아니었다. `/*?`의 "캐시 키 폭발"도 다중 필터 조합 링크가 애초에 없어 과잉 방어였다(크롤 도달 조합 ≈ 64 URL, 그마저 7일 캐시). **주력 방어인 AI 크롤러 차단과 공유 단일키 캐시화는 그대로 유지했다.**
- **진짜 문제는 `revalidate` 격차였고 교정했다**: 셀럽 서재 SSR 캐시를 일반 사용자 서재 열람용과 키 분리해 7일로(이웃 6개 조회가 전부 7일인데 이것만 1시간이었다), 콘텐츠 메타 `content-data-public`을 7일로(BO 편집 시에만 변함, 감상문 피드는 사용자 활동 반영이라 3600 유지), 사이트맵 재생성을 1일로.
- 결과: 최악 시나리오(시간당 전수 스윕) 약 78GB/월 → **약 1GB/월**. 현실 시나리오(하루 2,000 URL) 약 660MB/월 = Pro 250GB의 0.26%.

## 10. 캐시 태그 국소화 완료 (2026-07-15) — 잔여과제 ⑤

9절 재검증 중에 **④가 이미 켜져 있다**는 사실이 드러나면서(3절 발견 2의 정정 참조) ⑤가 최우선이 됐고, 같은 날 완료했다.

### 문제

web 캐시 72곳이 전부 `tags: ['celebs']` 단일 태그였다. ④가 켜진 상태이므로 BO에서 **무엇을 저장하든** `revalidateTag('celebs', {expire:0})`가 실행돼 게시판·게임·검색·업적·홈까지 전 캐시가 즉시 전멸했다. 퍼지 1회당 콜드 재조회 약 46MB(전역 단일키 `all-persona-vectors` 5.32MB 포함).

### 설계

**SSoT**: `packages/shared/src/constants/cache-tags.ts` — 양쪽 앱이 `@feelandnote/shared/constants/cache-tags`로 import한다(두 앱 모두 transpilePackages에 이미 등록). 문자열 리터럴 사용 금지.

| 태그 | 도메인 | BO 트리거 |
|------|--------|-----------|
| `CELEBS` | profiles 기반(프로필·목록·서고·타임라인·랭킹·영향력·daily_figures) | `admin/celebs.ts`, `influence.ts`, `members.ts`, `today-figure.ts`, `voice*.ts` |
| `CONTENTS` | contents·content_locales·user_contents(콘텐츠 메타·상세·감상문·셀럽 서고) | `admin/contents.ts`, `external-search.ts`, `celebs.ts`의 서고 저장 |
| `DIALOGUES` | celeb_dialogues | `admin/dialogues.ts`, `celebs.ts`의 명언 저장, `voice-gen.ts` |
| `PERSONA` | celeb_persona | `admin/persona.ts` |
| `TAGS` | celeb_tags·celeb_tag_assignments | `admin/tags.ts` |

### 적용

- **web 캐시 72곳**: 62곳을 실제 읽는 테이블 기준으로 재태깅(조인·RPC로 여러 테이블을 읽으면 복수 태그 배열 — 누락은 "저장해도 반영 안 됨" 버그가 되므로 과다 쪽으로 배정), **10곳은 태그 제거**(업적·칭호 진열·팔로워·게시판 공지/피드백/댓글·게시글 태그 검색·방명록 — `web-bo/src/actions/admin/` 전수 grep 결과 해당 테이블 수정 액션 없음. 시간 만료만 사용).
- **web-bo 호출부 34곳**: 각 액션이 실제 수정하는 테이블을 확인해 도메인 매핑. `revalidateWebCache(tag: CacheTag | CacheTag[])`로 시그니처 변경, **기본값 제거**(인자 누락이 타입 에러로 잡혀 전역 퍼지 재발 차단).
- **`/api/revalidate`**: `ALLOWED_TAGS`를 `ALL_CACHE_TAGS`로 교체, `tag`를 문자열·배열 모두 수용(중복 제거). 응답이 `{revalidated, tags: [...]}`로 변경.

### 검증

양쪽 앱 `tsc --noEmit` 통과, `build:web`·`build:bo` exit 0. 프로덕션 서버 런타임 실측: 단일 태그(하위호환) `{"revalidated":true,"tags":["contents"]}`, 배열 `["celebs","dialogues"]`, 신규 도메인 `["persona"]` 전부 정상. 거부 경로도 정상(미허용 태그·빈 배열 400, 잘못된 secret 401). `revalidateWebCache()` 인자 없는 호출 0건, `'celebs'` 문자열 리터럴 태그 0건.

### 주의·후속

- **셀럽 서고·감상문(`celeb-library-contents`·`celeb-jsonld-contents`·`celeb-reviews`)은 `user_contents`만 읽으므로 `CONTENTS`다.** BO `admin/celebs.ts`의 서고 저장은 `[CELEBS, CONTENTS]` 둘 다 보내도록 매핑했다. 여기가 누락되면 가장 눈에 띄는 반영 누락이 된다.
- **`admin/tags.ts`가 `[TAGS, CELEBS]`를 보낸다.** web 재분류 결과 태그 관련 캐시(`getCelebs`·`getFeaturedTags`·`getTagChronologicalLibrary`·`getTagSharedLibrary`·`getCelebForModal`)에 전부 `TAGS`가 포함됐으므로 `CELEBS`는 잉여일 수 있다. 태그 편집은 드물어 당장 손해가 작지만, 잦아지면 `CELEBS`를 걷어낼 것.
- **방명록**: BO에 신고 삭제 화면이 있으나 `CACHE_TAGS`에 도메인이 없어 태그를 뺐다. 삭제 반영이 최대 1시간 지연된다. 문제가 되면 `GUESTBOOK` 태그를 추가할 것.
- `updateCeleb`은 명언 전달 여부와 무관하게 `DIALOGUES`를 항상 퍼지한다(조건 분기 대신 누락 위험 회피).
- 새 태그 추가 시 `CACHE_TAGS`에만 넣으면 `/api/revalidate` 허용 목록에 자동 반영된다.
