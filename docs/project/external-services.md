# 외부 서비스

## Supabase (MCP 서버)
DB 스키마 조회, 마이그레이션, SQL 실행 가능.
- **프로젝트 ID**: `wouqtpvfctednlffross`
- **플랜**: Free (Egress 5.5GB/월, 쿼터 리필 주기: 매월 5일경)

### Egress 초과 사고 (2026-03-18)

**원인**: SSR 페이지에 캐싱 없이 Supabase API를 과다 호출. 크롤러(Googlebot 등)가 페이지 방문 시마다 전량 재조회.
- Explore Hub: 33건+, Explore Figures 캐러셀: 105건+, Ranking: 12건+ (1회 로드당)
- GA 일일 사용자 2~9명이지만 크롤러 트래픽이 GA에 미집계
- 15.59GB / 5.5GB (283% 초과) → 4/5까지 API 차단

**대처**: `unstable_cache` (1시간 revalidate) 적용.
- Cookie-free 정적 클라이언트: `sw/web/src/lib/supabase/static.ts`
- 캐싱 적용 함수: `getCelebs`, `getFeaturedTags`, `getProfessionCounts`, `getNationalityCounts`, `getGenderCounts`, `getContentTypeCounts`, `getPersonaExtremes`
- 캐시 태그: `celebs` → 데이터 변경 시 `revalidateTag('celebs', { expire: 0 })` 호출로 즉시 무효화
- 캐시 무효화 API: `POST /api/revalidate` (CRON_SECRET 인증)
- web-bo용 유틸: `sw/web-bo/src/lib/revalidate-web.ts` → `revalidateWebCache()`

### Egress 초과 재발 (2026-05-09)

**원인**: 1차 사고 이후 추가된 server action 다수가 캐시 누락 + JSON 컬럼 통째 select + 페이지네이션 풀스캔.
- HTTP 402 `exceed_egress_quota` 응답으로 모든 REST 요청 차단됨 (사이클 시작 4일 만에 한도 소진)
- 24시간 로그 분석으로 Storage(1건)는 무관하고 REST API 응답 페이로드가 주범으로 확인

**핫스팟 4종**:
1. `scriptures/index.ts` 의 `fetchUserContentCounts`/`getTodayFigure` seed fallback/`getScripturesByProfession`이 카운트만 필요한데 user_contents row 풀스캔 후 메모리 집계
2. `getCelebBySlug` 가 24컬럼 풀셀렉트 + `lines`/`lines_en` JSON 통째 + 4 type counts row 풀스캔
3. `lines`/`lines_en` JSONB 통째 fetch 11곳(이미 정의된 `DIALOGUE_BRIEF_SELECT` 미사용)
4. SEO 직격 페이지(`celeb/[slug]/page.tsx`)가 RSC에서 직접 supabase 호출 — 캐시 우회

**대처**: `unstable_cache` 적용 함수 22개로 확대 + JSON path select + 풀스캔 SQL 흡수.
- 신규 캐시 적용: `getCelebBySlug`, `getChosenScriptures`, `getScripturesByProfession`, `getProfessionContentCounts`, `getTodayFigure`, `getScripturesByEra`, `getEraContents`, `getCelebsForContent`, `getTopCelebsAcrossAllEras`, `getContentSamplesForCelebs`, `getContentSamplesByProfession`, `getCelebTimeline`, `getPersonaQuickViewData`, `getPopularBooks`, `getCelebFeed`, `getReviewFeed`, `getCelebReviews`, `getRecentContents`, `getContemporaries`, `getSimilarByCelebId`, `searchCelebs`, `getCelebJsonLdContents`/`getCelebDialogueFull`, `getCelebCards`, `loadCardDialogues`, `loadSuikodenDialogues`, `getDawnDialogues`
- 새 helper: `DIALOGUE_PROFILE_SELECT` (quote/monologue), `DIALOGUE_BRIEF_SELECT_WITH_ID` (greeting/quote)
- 새 캐시 액션 분리: `actions/celebs/getCelebJsonLdData.ts` — `celeb/[slug]/page.tsx`의 JSON-LD용 콘텐츠/대사를 RSC 직접 호출 대신 캐시된 액션으로 분리
- SQL 마이그레이션 `20260509_egress_optimization.sql` 작성: `get_user_content_counts`, `get_seed_eligible_celebs`, `get_celeb_type_counts`, `get_celeb_content_counts` — **한도 회복 후 적용 + 클라이언트 코드 RPC 교체 후속 PR 필요**

**서버 액션 작성 규칙(향후 누락 방지)**:
- 공개 read 액션은 반드시 `unstable_cache` + `createStaticClient` + `tags: ['celebs']` 패턴
- 인증 사용자 의존 부분은 외부에서 처리하고 캐시 inner는 primitive 인자만 받기
- `celeb_dialogues.lines`/`lines_en` 통째 select 금지 — `DIALOGUE_BRIEF_SELECT` 또는 JSON path 사용
- 카운트만 필요한 쿼리는 `head:true count:'exact'` 또는 RPC. row 페이지네이션 금지
- RSC 페이지에서 supabase 직접 호출 금지 — 캐시 안 입혀짐. 액션으로 분리

### 사고 후속 4차 정리 (2026-05-09)

전수 점검 + Vercel React/Next.js 베스트 프랙티스 적용으로 안정 상태 확보. **자동화 안전망 도입**으로 동일 패턴 재발 차단.

**자동화 검사 스크립트** (`sw/web/scripts/check-egress-patterns.mjs`)
- 4가지 위험 패턴 정적 검사: lines 통째 select / RSC 직접 supabase 호출 / 캐시 누락 server action / 페이지네이션 풀스캔
- 실행: `pnpm lint:egress` (sw/web 디렉토리)
- 종료 코드: CRITICAL 적발 시 1, WARN만이면 0
- 의도된 패턴은 `// egress-allow: <이유>` 주석으로 화이트리스트
- **GitHub Actions 통합**: `.github/workflows/lint-egress.yml` — PR/push 시 자동 실행, CRITICAL 적발 시 머지 차단

**옛 avatar 일괄 삭제 스크립트** (`sw/web/scripts/delete-old-avatars.mjs`)
- Supabase Storage `avatars/celebs/{uuid}/avatar.webp` 옛 파일 852개 일괄 삭제
- 안전 점검 완료(2026-05-09): 활성 셀럽 1079명 중 Supabase Storage URL 사용 0명, 모두 R2로 이전됨
- 실행: `node scripts/delete-old-avatars.mjs` (sw/web 디렉토리, `SUPABASE_SERVICE_ROLE_KEY` 필요)
- `--dry-run` 옵션으로 사전 점검 가능
- **한도 차단 상태에서는 Storage API 도 막힘** → Pro 결제 또는 리필(2026-06-05경) 후 실행

**추가 캐시 적용 (Phase 4-8, 8개)**:
- `getContentDetail` 인증 의존 분리 + 콘텐츠 자체 부분 unstable_cache (가장 큰 미처리)
- `getAchievementData`, `getProfileShowcase`(신규), `getPersonaByCelebId`, `getPersonaPeople`
- `getTagSharedLibrary`, `getTagChronologicalLibrary`
- `HeaderNotifications` `select("*")` → 6개 필드만 (인증 사용자 mount fetch 페이로드 절감)

**잔여 WARN (정보성, 다음 사이클 처리)**:
- 인증 의존 server action 다수 — 외부 wrap + 인증 비의존 부분 분리 후 캐시화 (예: `getFeedActivities`, `getMyContents`, `getFlows` 등 약 30개)
- `getCelebForModal` 등 일부 H 우선순위 액션 별도 처리

### 사고 후속 5차 정리 — 전면 리팩토링 Phase 2 (2026-06-12)

check-egress-patterns 적발 41건 → 6건(WARN 1 + INFO 5, exit 0)으로 정리.

**풀스캔 → SQL RPC 교체 (마이그레이션 `20260509_egress_optimization.sql` 적용 완료)**:
- DB에 함수 4종 배포: `get_user_content_counts`, `get_seed_eligible_celebs`, `get_celeb_type_counts`, `get_celeb_content_counts` (원안의 uuid를 실제 스키마에 맞게 text로 교정)
- 클라이언트 교체: `fetchUserContentCounts`, `fetchGlobalCelebCounts`, `getTodayFigure` seed fallback, `getCelebBySlug` 타입 카운트
- `getScripturesByProfession`의 fetchAllUserContents는 행 자체가 필요해 의도적 풀스캔으로 유지

**신규 캐시 적용 (unstable_cache + createStaticClient)**:
- 공개: `getCelebProfiles`, `getCelebCounts`, `getContentUserCounts`, `getMediaEmbed`(외부 API 결과 포함), `getDawnCelebContents`, `getTrackerRound`(무작위 선택은 캐시 밖 분리), `getSharedContents`, `getTagCounts`, `getFollowing`
- 인증 분리(공개 부분만 inner 캐시): `getCelebForModal`, `getMiniProfile`, `getFollowers`, `getDetailedStats`(records는 cookie 유지+head 카운트화), `getContent`, `getContentCounts`(head 카운트화), `getUserContents`(타인 경로만)

**egress-allow 화이트리스트 (RLS 보호·본인 가변 데이터 — 캐시 불가/부적합)**:
- `getProfile`(8컬럼 슬림화), `getFriends`, `getMyFollowing`, `getStats`, `getSimilarUsers`(이상 React.cache dedup 추가), `getMyContents`(16컬럼 슬림화), `getMyContentIds`, `getMyMusicList`, `searchRecords`, `getFeedActivities`(metadata 제거), `getFriendActivityTypeCounts`, `getFriendActivity`, `getUnreadGuestbookCount`, `getReceivedRecommendations`, `getRecommendableFriends`, `getFlow`/`getFlows`/`getFlowsContainingContent`, `getNote`, `getCelebProfile`
- check-egress-patterns.mjs 검사 2(캐시 미적용)가 egress-allow 주석을 인식하도록 보완

**부수 버그 수정**:
- `getReceivedRecommendations`: contents에서 드롭된 title/thumbnail_url/creator 컬럼을 select해 매 호출 400 → content_locales 조회로 교정
- `loadSuikodenCharacters`: 드롭된 profiles.quotes select로 조회 전체 실패 → 제거 (Phase 1에서 수정)

**잔여 (다음 사이클)**:
- [ ] `getFeedActivities` contentType 필터가 해당 타입 contents id 전량 수신 — FK 추가 또는 RPC 이관 필요
- [ ] INFO 5건: 캐시 적용된 lines 통째 select → DIALOGUE_BRIEF_SELECT 계열로 추가 절감 여지

### 사고 후속 6차 정리 — 셀럽 정적 데이터 온디맨드 캐싱 (2026-06-22)

탐색·라이브러리의 셀럽 집계가 1시간 시간만료에만 의존해, 데이터 변경이 없어도 크롤러가 만료 틈마다 재조회하던 구조를 온디맨드 무효화로 전환.

**캐시 만료 7일로 연장 (안전망)**:
- 새 상수 `STATIC_REVALIDATE = 604800`(7일, `sw/web/src/lib/cache.ts`). 셀럽 정적 집계 49곳의 `revalidate: 3600` → `STATIC_REVALIDATE` 교체.
- 대상: persona 계열, influence/influenceDistribution, celebTimeline, 인구통계 counts(nationality/gender/profession/contentType), scriptures 전체, getCelebDirectory/getCelebs/getContemporaries/getFeaturedTags, 태그 라이브러리(getTagSharedLibrary/getTagChronologicalLibrary), getCelebBySlug/getCelebForModal/getCelebJsonLdData, getCelebInfluence, getYoutubeCelebs, getSharedContents, getProfileShowcase, 콘텐츠 메타(getContent 공개·getMediaEmbed·fetchContentMetadata), 게임 풀(getTrackerRound/getCelebCards/getDawn*/suikoden).
- **제외(3600 유지)**: 일반 사용자 활동으로 변하는 데이터 — 유저 프로필·통계·팔로우(getMiniProfile/getDetailedStats/getFollowers), 전체 기록 카운트(getContentUserCounts/getCelebCounts/getContentCounts), 리뷰/최근/방명록/댓글/공지/피드백 피드, 검색. celebs 태그 무효화로 안 비워지고 사용자 새 활동 반영이 늦어지기 때문.

**web-bo 변경 시 즉시 무효화 (3차 잔여작업 해소)**:
- 셀럽/콘텐츠 변경 server action 30개 함수에 `revalidateWebCache()` 호출 추가(DB 변경 성공 경로에만): celebs.ts 12 + contents.ts 3(deleteContent 포함) + external-search.ts 1 + persona.ts 1 + dialogues.ts 3 + voice-gen.ts 4 + voice.ts 2(deleteAllVoiceFiles 포함) + tags.ts 6.
- 운영자가 백오피스에서 데이터를 넣는 즉시 web 앱 `celebs` 태그가 비워져 탐색·라이브러리에 반영된다. 7일 만료는 무효화 누락 대비 백업.

**효과**: 데이터 미변경 기간에는 셀럽 집계 DB 재조회가 사실상 0. 크롤러가 만료 틈을 때려 발생하던 반복 재조회를 제거한다.

### 사고 후속 7차 — 전수 재점검 (2026-06-29)

상세 보고서: **`docs/project/web-egress-audit-2026-06-29.md`**. 멀티에이전트 코드 전수 점검 2회(점검 시점 프로젝트 정지 상태라 실측 불가, 추정은 코드 구조 기반).

**핵심 정정 2건**:
- 이미지는 Supabase egress와 **무관**(아바타·음성=R2, 표지=외부 URL). Storage 다운로드 호출 0건. egress 본체는 DB REST/RPC 응답이다.
- ~~**프로덕션 `CRON_SECRET` 미설정** 확인. `revalidate-web.ts`가 키 없으면 호출을 스킵하므로 **자동 무효화가 안 돌고 있다** → "저장마다 전역 퍼지로 터진다"는 현재 주범이 아니다.~~ 대신 `/api/revalidate`가 무방비(`undefined===undefined` 통과)라 외부 무단 퍼지가 가능했다.
  > **🔴 2026-07-15 정정 — 이 판정은 폐기됐다.** 유저가 ④를 이행해 프로덕션 web·web-bo 양쪽에 `CRON_SECRET`을 동일 값으로 설정했다(실측: 라이브 `POST /api/revalidate` 401 — 미설정이면 코드상 503). **따라서 "저장마다 전역 퍼지"는 다시 참이 됐고, ⑤ 태그 국소화 전까지 활성 상태였다.** 9차에서 해소. 상세는 `web-egress-audit-2026-06-29.md` 3절 발견 2 정정·10절.

**적용 (main)**:
- `robots.ts` AI 크롤러(GPTBot·ClaudeBot·Bytespider 등) 전면 차단 + 검색봇 `crawlDelay 10`; `explore` persona·ranking·timeline `revalidate` 300→3600 (`b1155cea`)
- 보안·데이터 노출 5건: `updateRating` 인증·소유권, `getReviewFeed` `visibility='public'`, 방명록·댓글 삭제 소유권, `HeaderNotifications` Realtime cleanup (`4c745494`)
- `/api/revalidate` `CRON_SECRET` 미설정 시 503 거부 (`79ad292b`)

**브랜치 대기**: `feat/celeb-page-static` (`06a1f602`) — 셀럽 상세 정적/ISR 전환(방명록 로그인 판정 클라이언트 이관). 복구 후 동작·빌드 정적 판정 검증하고 머지.

**복구 후 과제(우선순위)**: ① DB 한도 복구 → ② egress 분해 측정으로 주범 확정 → ③ 정적화 브랜치 검증·머지 → ④ `CRON_SECRET` 설정(web·web-bo 동일) → ⑤ 캐시 태그 셀럽·도메인 단위 국소화 → ⑥ per-miss 페이로드 축소(persona 점수만 RPC·timeline bio 절단·ko에서 review_en 제외). 과거 잔여 중 `HeaderNotifications` Realtime 점검은 이번에 cleanup 버그 수정으로 해소, `CelebPageContent` 슬림화는 정적화 브랜치로 일부 해소.

### 사고 후속 8차 — Pro 결제·복구 후 페이로드 다이어트 (2026-07-03)

**실측 확정 (대시보드)**: 기간 사용 29.40GB 중 **PostgREST 100.0% / Storage 0.0%** — 7차의 "egress 본체는 DB REST 응답" 결론이 실측으로 확정됨. 6/28 하루 4.61GB 스파이크(수정 배포 전날), 평시에도 0.5~1.5GB/일로 기초 대사량 자체가 무료 한도 초과 수준. Pro 결제로 한도 복구(2026-07-03).

**적용 (main)**:
- `getPersonaDistribution` persona JSONB 통째 수신 → JSON path 점수 16개 select. 갱신 1회 **약 7MB → 560KB (92% 절감, 1,494행 실측)** (`48089db0`)
- `getCelebTimeline` locale 인자화 — ko 캐시는 `bio_en` 미수신, en은 폴백 유지 (`48089db0`)
- ko 응답에서 `review_en` 수신 제외(en은 폴백 유지) 7곳: `getCelebFeed`·`getCelebReviews`·`getReviewFeed`·`getTagChronologicalLibrary` (`4afa1f49`) + `getUserContents`·`getMyContents`·`today-figure` (`dcdec0f1`)
- `getTrackerRound` 폴백 후보 목록에서 `cultural_journey`/`bio` 전문 수신 차단 — 선정 1명만 1행 별도 수신, 비어있지 않음 필터는 DB단 `neq`로 이동 (`4464ab07`)
- `feat/celeb-page-static` 머지 완료 — 셀럽 상세 정적/ISR 전환 (`c39465ed`)

**발견 결함**: RPC `get_tracker_candidates`가 제거된 열 `p.quotes`를 참조해 **항상 실패** → 게임 등용은 그간 폴백 경로로만 동작. DB 함수 수정 필요하나 `SUPABASE_ACCESS_TOKEN` 만료로 DDL 불가. **토큰 갱신 후 함수 교정 + 1차 경로도 후보 본문 미수신으로 정리 필요.**

**잔여 과제**: ~~④ `CRON_SECRET` 설정(유저 액션, Vercel 대시보드) → ⑤ 캐시 태그 국소화~~ → **둘 다 완료(9차 참조).** 일별 egress 관찰은 계속(평시 1GB/일 미만이 수정 효과 판정 기준).

### 사고 후속 9차 — AdSense 색인 교정 + 태그 국소화 (2026-07-15)

상세: **`docs/project/adsense-audit-2026-07-15.md`**(4-1·4-2절), `web-egress-audit-2026-06-29.md`(9·10절). 커밋 `2c1aa1ad`·`2ba74f02` 배포 완료.

**계기**: AdSense 반복 거절의 원인이 색인 붕괴(사이트맵 2,196 URL 제출 대비 3개월 노출 45면, 색인률 2%)로 확정돼 크롤 노출을 크게 늘렸다(사이트맵 → 15,884 URL, robots `/*?` 차단 해제, crawlDelay 10→1, 셀럽 서가 SSR 전환). egress 재폭발 여부를 재감사한 결과:

- **egress는 URL 수에 비례하지 않는다.** 봇 요청도 캐시 히트도 0바이트다. Supabase에 도달하는 건 캐시 미스뿐이고 미스 상한은 `revalidate` 값이 정한다. 셀럽·콘텐츠 상세의 서버 렌더 경로는 캐시 밖 조회 0건(캐시 밖은 로그인 전용이라 봇은 스킵).
- **7차의 두 대책은 방어에 기여한 적이 없었다.** Google은 `crawl-delay`를 공식 무시하며(Search Central 명시), 7차가 지목한 주범 AI 크롤러는 `Disallow: /` 전면 차단 그룹이라 crawlDelay 대상이 아니었다 — 실효는 Bing·네이버 색인 지연뿐. `/*?`의 "캐시 키 폭발"도 다중 필터 조합 링크가 애초에 없어 과잉 방어였다(크롤 도달 조합 ≈ 64 URL, 그마저 7일 캐시). **주력 방어(AI 크롤러 차단·공유 단일키 캐시화)는 유지.**

**적용 (main)**:
- **④ `CRON_SECRET` 완료 확인** — 유저가 이미 설정했음이 실측으로 드러남(라이브 401). 7차 기록이 낡아 있었다(위 정정).
- **⑤ 캐시 태그 국소화 완료** — SSoT `packages/shared/src/constants/cache-tags.ts`(`CACHE_TAGS` 5종: CELEBS·CONTENTS·DIALOGUES·PERSONA·TAGS). web 캐시 72곳 재태깅(62곳 도메인 배정, 10곳 태그 제거 — 업적·팔로워·게시판 등 BO 수정 액션 부재 확인), web-bo 호출부 34곳을 실제 수정 테이블 기준 매핑, `revalidateWebCache` 기본값 제거로 인자 누락을 타입 에러로 차단, `/api/revalidate` 배열 수용. **BO 저장 1회 = 캐시 74곳 전멸(약 46MB/퍼지) → 해당 도메인만 무효화.**
- **`revalidate` 격차 교정** — 셀럽 서재 SSR 캐시를 일반 사용자 열람용과 키 분리해 7일로(이웃 6개 조회가 전부 7일인데 이것만 1시간, 순증 717MB/월이었다), 콘텐츠 메타 `content-data-public` 3600→`STATIC_REVALIDATE`(BO 편집 시에만 변경. 감상문 피드는 사용자 활동 반영이라 3600 유지), 사이트맵 재생성 3600→86400.

**결과**: 최악 시나리오(시간당 전수 스윕) 약 78GB/월 → **약 1GB/월**. 현실 시나리오(하루 2,000 URL 크롤) 약 660MB/월 = Pro 250GB의 0.26%.

**잔여**: `all-persona-vectors` 5.32MB/미스(persona JSONB 전수 수신 후 JS에서 16개 점수만 추출 — 8차가 분포 쪽만 RPC화했고 `getSimilarByCelebId`에 같은 결함 잔존), `CL_SELECT`가 미사용 locale `description` 수신, `?category=` 무검증 캐스트로 캐시 키 분화. tracker RPC 교정은 8차 그대로.

### 사고 후속 3차 정리 (2026-05-09)

전수 점검(Vercel 베스트 프랙티스 가이드 적용 포함)으로 추가 누수·waterfall 패턴 15곳 정리.

**추가 캐시 적용 (10개)**:
- `getCelebDirectory` (신규, `explore/directory` 페이지의 RSC 직접 supabase 호출 분리)
- `getCelebInfluence` (waterfall 제거 — 두 count 쿼리 Promise.all 병렬화 + unstable_cache + React.cache 동시 적용)
- `getGuestbookEntries`, `getNotices`, `getFeedbacks`, `getNotice`, `getFeedback`, `getComments`, `getInfluenceDistribution`, `getPantheon`
- `searchUsers` (인증 의존 부분 외부 분리), `searchTags`

**React.cache 적용 (server-cache-react 가이드)**:
- `getCelebBySlug`, `getUserProfile` outer wrapper에 `cache()` 적용 — `generateMetadata`와 default export의 동일 RSC 요청 안 중복 호출 dedup

**조회수 RPC 분리**:
- `getNotice`, `getFeedback` — 조회수 increment RPC를 캐시 외부로 빼고 데이터 조회만 캐시

**잔여 작업**:
- [ ] Supabase Storage 구 avatar 파일 852개 정리 (Googlebot 크롤링 중)
- [x] web-bo mutation에 `revalidateWebCache()` 적용 (2026-06-22, 6차 정리 — 셀럽/콘텐츠 변경 30개 함수)
- [x] `20260509_egress_optimization.sql` 마이그레이션 적용 (2026-06-12, uuid→text 교정본)
- [x] 클라이언트 코드 RPC 교체 (scriptures/index.ts, getCelebBySlug.ts) — 5차 정리 참조
- [ ] daily_figures cron 동작 모니터링/실패 알림 (실패하면 `getTodayFigure` seed fallback 풀스캔으로 떨어짐)
- [ ] `HeaderNotifications.tsx` realtime 구독 + mount fetch 비용 점검 (지속 egress 가능, 인증 사용자 비례)
- [ ] `content/[contentId]/page.tsx` + `getContentDetail` 캐시 분리 — 인증 의존(본인 기록) 부분과 콘텐츠 자체 부분 분리 후 unstable_cache 적용 (코드 재구조화 양 커 별도 사이클)
- [ ] CelebPageContent props 슬림화 (RSC → 클라 serialization 절약, server-serialization 가이드)
- [ ] TimelineSection 등 lucide 아이콘 dynamic import (bundle-dynamic-imports)
- [ ] CelebDetailModal 같은 클라 모달에 SWR 도입 (client-swr-dedup)
- [ ] Pro 업그레이드 검토 ($25/월, 250GB egress)

## Cloudflare R2 (이미지 저장소)
셀럽 아바타 이미지를 Cloudflare R2에 저장한다. S3 호환 API 사용.
- **버킷명**: `feelandnote`
- **Public URL**: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev`
- **오브젝트 경로**: `celebs/{celebId}/avatar.webp`
- **URL 형식**: `{R2_PUBLIC_URL}/celebs/{celebId}/avatar.webp?v={timestamp}`
- **환경변수**: `sw/web-bo/.env`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
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

## Vercel Cron (sw/web/vercel.json)

| 경로 | 스케줄 | 설명 |
|------|--------|------|
| `/api/cron/today-figure` | `5 15 * * *` (매일 00:05 KST) | 오늘의 인물 선정 (뉴스 기반 + seed fallback) |

- Vercel Hobby(무료) 플랜: 크론 **하루 1회** 제한
- 인증: `CRON_SECRET` 환경변수 (Vercel에서 자동 주입)

## GitHub Actions (.github/workflows/)

| 워크플로우 | 스케줄 | 설명 |
|-----------|--------|------|
| `keep-alive.yml` | `0 */6 * * *` (6시간 간격) | Supabase Free 플랜 자동 일시정지 방지 |

- Supabase REST API에 간단한 SELECT 쿼리를 보내 프로젝트를 깨운 상태로 유지
- GitHub Secrets 필요: `SUPABASE_ANON_KEY`
- 월 소모량: ~4분 (GitHub Actions 무료 한도 2,000분/월)
