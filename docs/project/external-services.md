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

**잔여 작업**:
- [ ] Supabase Storage 구 avatar 파일 852개 정리 (Googlebot 크롤링 중)
- [ ] web-bo mutation 8개 파일에 `revalidateWebCache()` 점진 적용
- [ ] 한도 회복 후 `20260509_egress_optimization.sql` 마이그레이션 적용
- [ ] 위 마이그레이션 적용 후 클라이언트 코드 RPC 교체 (scriptures/index.ts, getCelebBySlug.ts)
- [ ] daily_figures cron 동작 모니터링/실패 알림 (실패하면 `getTodayFigure` seed fallback 풀스캔으로 떨어짐)
- [ ] `HeaderNotifications.tsx` realtime 구독 비용 점검 (지속 egress 가능)
- [ ] web-bo `admin/celebs.ts` 의 3중 `revalidatePath` 통합(tag 기반) — 캐시 hit ratio 보호
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
