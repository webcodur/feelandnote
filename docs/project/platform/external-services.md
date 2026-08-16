# 외부 서비스

> **최종 실측 체크: 26.07.16** — `get_tracker_candidates` RPC 실측 재확인(정상 동작, 후보 225건). 이 RPC 건만 확인했고 문서의 나머지는 실측 대조하지 않았다
>
> **스키마 이름 주의(26.08.10):** 아래 날짜별 장애 기록은 사고 당시의 `profiles`·
> `user_contents` 같은 옛 이름을 그대로 보존한다. 현재 운영 원천은 `celebs`·
> `celeb_contents` 등 물리 도메인이며, 과거 SQL을 현행 절차로 복사하지 않는다.

## Supabase (MCP 서버)
DB 스키마 조회, 마이그레이션, SQL 실행 가능.
- **프로젝트 ID**: `wouqtpvfctednlffross`
- **플랜**: Free (Egress 5.5GB/월, 쿼터 리필 주기: 매월 5일경)

### 웹 캐시 무효화 단일 창구 — DB 트리거 (2026-08-16)

- **원칙**: 무효화를 앱 코드나 스크립트가 부르는 것을 전제하지 않는다. 데이터의 90%가 LLM 세션·스크립트·SQL로 들어오므로, **행이 바뀌면 DB가 스스로 `feelandnote.com/api/revalidate`에 태그를 보낸다**(pg_net, 문장 단위 트리거 + 전이 표 → 한 문장에 HTTP 한 번). 표→태그 대응은 `sw/web/supabase/migrations/20260816052000_web_revalidate_triggers.sql`.
- 그래서 인물·작품 상세의 시간 재검증은 **없다**(`revalidate = false`). 바뀐 항목만 다음 방문 때 다시 만든다. 조회수(`celebs.view_count`)·회원 집계 카운트만 바뀐 문장은 알리지 않는다(방문마다 재생성되는 사고 방지).
- 확인: `select * from net._http_response order by id desc limit 5;` 로 status 200과 태그를 본다. 백오피스의 `revalidateWebCache()` 호출은 그대로 두되(중복 무해) 새 코드에서 필수는 아니다.
- 새 표를 웹이 읽게 되면 `web_revalidate_attach(...)` 한 줄로 붙인다. 비밀키는 Vault `web_revalidate_secret`(=CRON_SECRET) — 키를 돌리면 둘 다 바꾼다.

### 공개 조회 문장 제한·인덱스 (2026-08-16)

- **증상**: 탐색·서가·홈·성향 화면의 조회가 콜드에서 `canceling statement due to statement timeout`(57014)으로 실패해 구획이 통째로 빠졌다(Vercel 로그 24h 40건+).
- **원인(실측)**: anon 역할 `statement_timeout`이 **3초**였고, 하나씩은 0.2~2.2초로 통과하지만 캐시가 한 시각에 같이 식어 조회 15종이 동시에 몰리면 서로 밀려 3초를 넘겼다(3벌 동시 실행으로 재현). DB 유휴 후 첫 조회는 5~11배 느리다(Free 플랜).
- **조치**: ① `alter role anon set statement_timeout='15s'` ② `celeb_contents`(감상문 정렬·필터)·`celeb_influence`(순위)·`content_locales`(제휴)·`celebs`(생년) 부분 인덱스 5개 — `sw/web/supabase/migrations/20260816040000_*.sql` ③ 코드: 기질별 서재 조회를 짝(celeb_id, content_id)만 받고 뽑힌 작품에만 메타를 붙이게(5.4MB·13.5초 → 1.4MB·5.7초 + 0.3MB), 성향 분포·닮은 인물이 같은 명단 캐시(`celeb_metrics`) 공유, `cachedList/cachedDetail` 만료 시각을 키별 ±10%로 어긋나게(`spreadRevalidate`).
- **남은 것**: `get_celebs_sorted`(전 컬럼 2,406행 실체화)·`get_chosen_scriptures`(전량 집계 후 LIMIT 12)·`get_celeb_feed_type_counts` RPC 재작성 — 반환 형태를 건드려 별도 작업.

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

멀티에이전트 코드 전수 점검 2회(점검 시점 프로젝트 정지 상태라 실측 불가, 추정은 코드 구조 기반).

**핵심 정정 2건**:
- 이미지는 Supabase egress와 **무관**(아바타·음성=R2, 표지=외부 URL). Storage 다운로드 호출 0건. egress 본체는 DB REST/RPC 응답이다.
- ~~**프로덕션 `CRON_SECRET` 미설정** 확인. `revalidate-web.ts`가 키 없으면 호출을 스킵하므로 **자동 무효화가 안 돌고 있다** → "저장마다 전역 퍼지로 터진다"는 현재 주범이 아니다.~~ 대신 `/api/revalidate`가 무방비(`undefined===undefined` 통과)라 외부 무단 퍼지가 가능했다.
  > **🔴 2026-07-15 정정 — 이 판정은 폐기됐다.** 유저가 ④를 이행해 프로덕션 web·web-bo 양쪽에 `CRON_SECRET`을 동일 값으로 설정했다(실측: 라이브 `POST /api/revalidate` 401 — 미설정이면 코드상 503). **따라서 "저장마다 전역 퍼지"는 다시 참이 됐고, ⑤ 태그 국소화 전까지 활성 상태였다.** 9차에서 해소.

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

**발견 결함 → 해소(26.07.15)**: RPC `get_tracker_candidates`가 제거된 열 `p.quotes`를 참조해 항상 실패했고, 게임 등용이 폴백 경로로만 동작했다. 당시 `SUPABASE_ACCESS_TOKEN` 만료로 DDL이 막혀 미조치로 남았으나 26.07.15에 RPC를 재정의해 교정했다.

> **26.07.16 실측 재확인**: RPC 정의에 `quotes` 참조 없음, 호출 시 후보 225건 정상 반환. 이 문서가 26.07.16까지 "항상 실패·토큰 갱신 후 교정 필요"로 남아 있어 정정했다.

**잔여 과제**: ~~④ `CRON_SECRET` 설정(유저 액션, Vercel 대시보드) → ⑤ 캐시 태그 국소화~~ → **둘 다 완료(9차 참조).** 일별 egress 관찰은 계속(평시 1GB/일 미만이 수정 효과 판정 기준).

### 사고 후속 9차 — AdSense 색인 교정 + 태그 국소화 (2026-07-15)

상세: **`docs/project/operations/adsense-audit-2026-07-15.md`**(4-1·4-2절). 커밋 `2c1aa1ad`·`2ba74f02` 배포 완료.

**계기**: AdSense 반복 거절의 원인이 색인 붕괴(사이트맵 2,196 URL 제출 대비 3개월 노출 45면, 색인률 2%)로 확정돼 크롤 노출을 크게 늘렸다(사이트맵 → 15,884 URL, robots `/*?` 차단 해제, crawlDelay 10→1, 셀럽 서가 SSR 전환). egress 재폭발 여부를 재감사한 결과:

- **egress는 URL 수에 비례하지 않는다.** 봇 요청도 캐시 히트도 0바이트다. Supabase에 도달하는 건 캐시 미스뿐이고 미스 상한은 `revalidate` 값이 정한다. 셀럽·콘텐츠 상세의 서버 렌더 경로는 캐시 밖 조회 0건(캐시 밖은 로그인 전용이라 봇은 스킵).
- **7차의 두 대책은 방어에 기여한 적이 없었다.** Google은 `crawl-delay`를 공식 무시하며(Search Central 명시), 7차가 지목한 주범 AI 크롤러는 `Disallow: /` 전면 차단 그룹이라 crawlDelay 대상이 아니었다 — 실효는 Bing·네이버 색인 지연뿐. `/*?`의 "캐시 키 폭발"도 다중 필터 조합 링크가 애초에 없어 과잉 방어였다(크롤 도달 조합 ≈ 64 URL, 그마저 7일 캐시). **모델 학습·대량 수집 봇 차단과 공유 단일키 캐시화는 유지.** 26.08.10에는 검색 노출에 직접 쓰이는 OAI·Claude·Perplexity·Amazon 검색/사용자 요청 UA만 별도 허용했다. 현행 세부 명단은 `seo.md`의 Robots 절이 쥔다.

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

## Vercel Fast Origin Transfer (2026-08-04)

- **사고**: Hobby 최근 30일 Fast Origin Transfer 10.12/10GB, Fluid Active CPU 7시간 35분/4시간. Fast Data Transfer는 9.96/100GB라 일반 대역폭 한도 문제가 아니다.
- **뜻**: Fast Origin은 Function·Middleware·ISR 등 compute와 CDN 사이의 입력·출력 바이트다. Supabase PostgREST egress와 별도이며, Supabase 캐시가 적중해도 동적 SSR HTML 응답은 Vercel Origin 사용량이 된다.
- **원인·조치**: `[locale]` root layout의 요청 header 의존 제거(루트 전체 정적 강제 금지), 셀럽·콘텐츠 공개 ISR/개인화 분리, 익명 Middleware auth 생략, web-bo 한도 문구 교정.
- **운영 주의**: 로컬 수정·재배포가 이미 누적된 최근 30일 사용량을 초기화하지 않는다. Hobby 프로젝트 중지 위험은 기간 만료 또는 플랜 전환 전까지 남는다. 배포 후 route별 `X-Vercel-Cache`와 Usage 기울기를 확인해야 해소 판정한다.
- **공식 문서**: [CDN usage](https://vercel.com/docs/manage-cdn-usage), [Fluid compute](https://vercel.com/docs/functions/usage-and-pricing), [ISR usage](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing).

### ISR 쓰기 비용 규칙 (2026-08-16)

- ISR 쓰기는 **8KB당 1단위**로 센다. 상세 한 장은 HTML+RSC 0.5~1.2MB(작품 323+239KB, 인물 804+449KB 실측)라 생성 한 번에 70~156단위다. 사이트맵 15,884장을 크롤러가 한 바퀴 돌면 약 110만 단위 ≈ $6 — 8월 12일 `detail-tags-v2` 키 교체 직후 실측 1,167,485단위와 일치한다.
- **배포 한 번 = ISR 상세 전량 재생성 한 바퀴다.** 새 배포가 나가면 저장된 상세 HTML이 전부 무효가 되고 크롤러가 다시 훑는 만큼 쓰기가 발생한다(배포 직후 응답 크기가 즉시 바뀌는 것으로 확인, 26.08.16). 다이어트 뒤 한 바퀴 ≈ $2.7. **코드 배포는 모아서 하루 1~2회 이하**로 한다. 문서·데이터만 바뀐 커밋은 빌드 게이트가 건너뛴다.
- **상세 캐시 키(`DETAIL_CACHE_KEY_VERSION`·`celebs-public-*` 등)를 바꾸면 전량 재생성 한 바퀴 = 약 $6.** 반환 모양이 정말 바뀌었을 때만 올리고, 문구·필드 추가 수준이면 올리지 않는다.
- 상세 페이지 시간 재검증은 30일(`revalidate = 2592000`)이다. 백오피스 저장이 태그로 그 항목만 즉시 무효화하므로 시간 재검증은 안전망일 뿐이다.
- 명부(`/explore/directory`)·연표(`/explore/timeline`)는 ISR(7일, `generateStaticParams`로 정적 진입)이다. `[locale]` 아래 화면은 `generateStaticParams`가 없으면 동적으로 취급되고, 레이아웃에서 `getMessages`/`getTranslations`를 부르기 전에 `setRequestLocale`을 해야 정적이 깨지지 않는다.
- 크롤러가 하루 1만 장을 연다(작품 5,725·인물 3,710·SEO 이미지 2,759 / 24h 실측). 동적 렌더로 바꾸면 이 트래픽이 Supabase egress로 옮겨가 더 나쁘다. 줄이는 순서는 ① 상세 페이지 바이트 다이어트 ② 학습·대량 수집 크롤러 미들웨어 403(`lib/blocked-crawlers.ts`, robots.txt와 명단 공유) ③ Vercel Firewall의 AI Bots 관리 규칙(대시보드).

### Git 배포 빌드 게이트

- 두 Vercel 프로젝트의 Root Directory는 각각 `sw/web`, `sw/web-bo`다. 각 디렉터리의 `vercel.json`이
  저장소 루트 `scripts/vercel-ignore-build.mjs`를 `ignoreCommand`로 실행한다.
- 판정은 커밋 메시지가 아니라 직전 성공 배포 SHA와 현재 SHA 사이의 변경 파일을 사용한다. Git diff나
  환경변수 확인에 실패하면 종료 코드 1로 빌드를 계속해, 필요한 배포를 잘못 건너뛰지 않는다.
- 사용자 웹은 `sw/web`의 런타임·설정 파일과 `packages/`, 루트 의존성 파일이 바뀔 때만 빌드한다.
  백오피스는 같은 공통 범위에 `sw/web-bo` 런타임·설정과 직접 import하는 `sw/remotion/src`를 더한다.
  문서, 로컬 제작 데이터, 다른 앱, Remotion 대용량 `public` 자산만 바뀐 커밋은 둘 다 건너뛴다.
- 영향도 SSoT와 회귀 검사는 각각 `scripts/lib/vercel-build-impact.mjs`,
  `scripts/vercel-build-impact.test.mjs`다. 새 공유 패키지나 빌드 입력을 추가하면 이 둘을 함께 갱신한다.
- Vercel 규약상 `ignoreCommand` 종료 코드 0은 빌드 취소, 1은 빌드 계속이다. 같은 SHA를 환경변수 변경
  때문에 강제 재배포할 때는 대시보드 Redeploy에서 Ignore Build Step 사용을 해제한다.

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
- **Public URL**: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev`
- **오브젝트 경로**: `celebs/{celebId}/avatar.webp`
- **URL 형식**: `{R2_PUBLIC_URL}/celebs/{celebId}/avatar.webp?v={timestamp}`
- **환경변수**: `sw/web-bo/.env`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- **캐시 정책(26.07.25)**: 전 오브젝트 `Cache-Control: public, max-age=31536000, immutable`. URL의 `?v=` 버전 표식이 캐시를 깨므로 안전하다(이미지는 업로드마다 `Date.now()`, 음성은 `voice_v` 증가). **`no-cache, must-revalidate`로 되돌리지 마라** — 아바타가 접속마다 재검증 왕복을 강제당해 성향 분석 등 대량 노출 화면에서 매번 로딩이 걸리던 원인이었다(기존 2,461건 일괄 교체 완료, 업로드 코드 10곳 수정). `pub-*.r2.dev` 주소는 개발용이라 CDN 캐시 미적용·속도 제한이 있다 — 근본 개선은 커스텀 도메인 연결(DNS가 Vercel이라 Cloudflare 존 이전 필요, 미결정)
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
| `warm-web.yml` | `17 * * * *` (매시) | 허브 화면 6개(`/`, `/explore`, `/explore/spectrum`, `/explore/ranking`, `/explore/figures`, `/library`)를 한 번씩 열어 데이터 캐시를 데운다. 배포로 캐시 키가 바뀐 뒤 최대 1시간 안에 회복. Vercel Hobby 크론이 하루 1회라 여기서 돈다 |

- Supabase REST API에 간단한 SELECT 쿼리를 보내 프로젝트를 깨운 상태로 유지
- GitHub Secrets 필요: `SUPABASE_ANON_KEY`
- 월 소모량: ~4분 (GitHub Actions 무료 한도 2,000분/월)
