# 아키텍처

> **최종 실측 체크: 26.07.30** — 안드로이드 앱 셸 신설과 sw/web 신규 경로 반영

`sw/` 아래 6개 앱으로 구성한다.

| 앱 | 스택 | 역할 |
|---|---|---|
| `sw/web` | Next.js App Router | 공개 서비스 |
| `sw/web-bo` | Next.js App Router | 서비스 백오피스 + 영상 제작 관리 (상세: [web-bo.md](../apps/web-bo.md)) |
| `sw/remotion` | Remotion | 영상·카드 컴포지션 |
| `sw/lab` | Vite + React | 그래픽 실험장 |
| `sw/audio-bo` | Next.js App Router | 로컬 GPU 음성 작업실 |
| `sw/android` | Gradle + TWA | 안드로이드 앱 셸 (상세: [안드로이드 앱 SSoT](../apps/android-app-feasibility-review-2026-07-29.md)) |

`sw/android`는 자체 화면이 없다. 사용자의 브라우저가 `feelandnote.com`을 전체 화면으로 그리고, 앱은 그 껍데기만 맡는다. 웹을 배포하면 앱 내용도 함께 바뀌므로 앱을 다시 낼 필요가 없다. Node 패키지가 아니라 `pnpm-workspace.yaml`에 넣지 않으며(워크스페이스는 글롭이 아니라 개별 명시 방식이다), 빌드는 Android Studio가 맡는다.

운영 DB와 `sw/web`은 각각 Oracle VM에 배포한다. 공개 요청은 Cloudflare를 거쳐 웹 VM의 Caddy와 Next.js standalone 서비스로 들어간다. `web-bo`·`remotion`·`lab`·`audio-bo`는 로컬 전용이다. 서버 경로와 배포·캐시 운영은 [`external-services.md`](external-services.md)가 쥔다.

---

## sw/web

### 국제화 라우팅

`next-intl`을 쓴다. 로케일은 `ko`(기본)·`en` 두 가지이고, `localePrefix`는 `as-needed`다. 기본 로케일은 접두사가 붙지 않는다. 단일원천은 `src/i18n/routing.ts`이며 `src/middleware.ts`가 이를 적용한다.

따라서 **모든 화면 라우트는 `app/[locale]/` 아래에 있다.** 아래 표기하는 경로는 로케일 접두사를 생략한 것이다. API 라우트(`app/api/`)와 인증 콜백(`app/auth/`)은 `[locale]` 밖에 있다.

### 디렉토리 구조 (sw/web/src)

```text
middleware.ts          # next-intl 로케일 미들웨어
app/
  [locale]/
    (auth)/            # login, signup, reset-password
    (main)/            # 메인 레이아웃
      [userId]/        # 기록관 (프로필, chamber, merits, reading/collections/[id]/tiers)
      agora/           # 광장 (social, social-feed, board/{notice,free,feedback})
      celeb/[slug]/    # 인물 상세
      content/[contentId]/
      explore/         # 인물 그리드 (ranking, spectrum, myth, faction/[slug],
                       #       timeline, youtube, directory/[profession]; figures는 허브로 이동)
      library/         # 작품 (popular, curated, museum, academy/[category]/[course])
      about/           # 서비스 소개 (문의 안내 흡수). 본문(AboutBody)은 홈 첫 방문 환영판과 공유
      notifications/
      rest/            # 쉼터 (게임 허브 단일 페이지)
      page.tsx         # 홈 — 첫 방문에만 환영판(소개 본문) 표시, 닫으면 쿠키(fn_intro_seen) 1년
    (policy)/          # terms, privacy, account-deletion
    (standalone)/      # search
    lab/               # 사내 실험 화면 11종 (+ 허브·상세 = page.tsx 13개). 목록 SSoT는 constants/lab.tsx의 LAB_ITEMS
    layout.tsx  |  not-found.tsx
  api/                 # avatar, celeb-works, cron/today-figure, revalidate, tts, wiki-summary
  auth/callback/       # OAuth 콜백
  .well-known/         # assetlinks.json — 안드로이드 앱↔도메인 소유 검증. 지문은 환경변수로 읽는다
  feed.xml/            # RSS
  layout.tsx  |  error.tsx  |  manifest.ts  |  robots.ts  |  sitemap.ts
  opengraph-image.tsx  |  globals.css

actions/               # Server Actions
                       # achievements, activity, auth, board, celebs, contents, flows,
                       # game, guestbook, home, moderation, notes, notifications, spectrum,
                       # recommendations, scriptures, search, user
components/
  features/            # agora, board, book, celeb, content, figure, game, home,
                       # influence, landing, moderation, profile, quickRecord,
                       # recommendations, rest, scriptures, user, youtube
  layout/              # header, BottomNav, LayoutMain, PageContainer, FloatingMusicPlayer
  pwa/                 # ServiceWorkerRegistrar — 개발 환경에서는 등록하지 않는다
  shared/              # content, filters, search, Hub*, PageBanner, LocaleSwitcher 등
  ui/                  # cards, icons, Layout, Button, Modal, Avatar 등 원자 컴포넌트
  lab/
constants/             # affiliatePlatforms, agora, archive, board, categories,
                       # celebProfessions, filterStyles, image, influence, lab, materials/,
                       # moderation, navigation, platformLinks, professionIcons, review-presets,
                       # scriptures/, scriptures, scripturesMuseum, searchPresets,
                       # statuses, titles, youtube, zIndex
contexts/              # GameAudioContext, QuickRecordContext
fonts/
hooks/                 # useCelebGreeting, useCountries, useDebounce, useDialoguePosition,
                       # useFilterLabels, useHorizontalScroll, usePreloadImages,
                       # useRecentContents, useRecentProfiles, useVoiceMuted
i18n/                  # navigation, request, routing
lib/                   # auth, board, cache, config, countries, db, errors, game, moderation,
                       # spectrum, r2, seo, url, utils
types/                 # academy, content, database, database.generated, home, locale, recommendation
```

### 설치형 앱(PWA) 자산

`sw/web/public` 아래에 둔다. 안드로이드 앱이 이 웹을 그대로 감싸므로 앱 요건과 직결된다.

| 경로 | 내용 |
|---|---|
| `icons/` | `android-192` · `android-512` · `android-maskable-512` · `play-store-512`. 생성기는 `scripts/generate-app-icons.mjs`(웹용)와 `scripts/generate-android-launcher-icons.mjs`(안드로이드 런처용, 산출물은 `sw/android`로 나간다) |
| `sw.js` | 캐시 담당. 화면 이동은 네트워크 우선·실패 시 오프라인 화면, 정적 자산은 캐시 우선, 그림은 개수 상한을 둔 캐시. **로그인·개인 기록·Server Action·API는 캐시하지 않는다** |
| `offline.html` | 연결이 끊겼을 때 뜨는 브랜드 화면. 외부 요청 0, 다시 시도 버튼, 복구 시 원래 화면으로 자동 이동 |

🔴 **`.js`·`.html` 정적 파일은 미들웨어 통과 목록에 있어야 한다.** 로케일 처리가 `/sw.js`를 `/ko/sw.js`로 바꿔 404가 나던 사고가 있었다(26.07.30 해소). 새 정적 파일을 `public`에 둘 때 `src/middleware.ts`를 함께 확인한다.

### 네비게이션

`@/constants/navigation.tsx`가 단일원천이다. PC 헤더·모바일 바텀탭·홈 섹션·풋터가 모두 이 파일을 읽는다.

`NAV_ITEMS`의 표시 플래그가 헤더·바텀탭·홈 노출을 정한다. 화면 라벨은 `messages/<locale>/nav.json`을 읽으며 코드의 참고 라벨과 구분한다. `archive`의 `/{userId}`는 실제 사용자 ID로 치환한다.

탐색의 인물 그리드와 주요·보조 바로가기는 [explore.md](../service/explore.md), 작품 화면은 [library.md](../service/library.md)를 본다. 탐색 주요 카드와 푸터 인물 메뉴는 `EXPLORE_FEATURED_LINKS`를 공유한다. 푸터 전체 구획은 `FOOTER_SECTIONS`, 홈 구획과 순서는 `HOME_SECTIONS`·`SECTION_ORDER`가 쥔다.

쉼터는 `/rest` 한 페이지에 게임을 마운트하며 하위 메뉴는 앵커로 이동한다. `/rest/<게임>`을 화면 주소로 만들지 않는다.

### 네비게이션에 없는 화면

`/agora`는 `NAV_ITEMS`에 없다. 풋터(`FOOTER_MISC_LINKS`)와 앱 내부 링크로만 들어간다. 그 밖에 `/celeb/[slug]`, `/content/[contentId]`, `/notifications`, `/search`, `(policy)` 화면, `/lab` 도 네비게이션 밖이다.

### 레거시 리다이렉트

현재 리다이렉트는 `sw/web/next.config.ts`와 해당 페이지가 쥔다. `/explore/figures`는 조건을 보존해 `/explore`로 영구 이동한다. 문서·메뉴·워밍 점검에는 최종 정본 주소를 쓴다. 오늘의 인물과 인물 피드는 탐색 메뉴에서 빠졌지만 기존 화면 주소는 유지한다.

### 콘텐츠 상세 라우팅

`/content/[contentId]` → `getContentDetail(contentId, category)` 호출.

---

## sw/web-bo

서비스 운영과 영상 제작 관리 백오피스다. 구조 개요만 둔다. 상세는 [web-bo.md](../apps/web-bo.md)를 봐라.

```text
src/app/
  (admin)/     # activity-logs, api-usage, blind-game, book-recommend, celebs, contents, free-board,
               # guestbooks, members, notes, playlists, records, reports, scores,
               # settings, tier-lists, titles, today-figure, users
  api/         # book-recommend 제작 API, celebs/search, contents/search, image-proxy, voice/[...path]
  login/
src/actions/admin/
src/components/  # celeb, content, factions, discourses, layout, ui, ApiKeyManager
src/features/book-recommend/  # scenario·voice·render·youtube·cards 제작 부품과 로컬 I/O
src/constants/  |  src/contexts/  |  src/hooks/  |  src/types/  |  src/utils/
src/lib/         # db, r2, image, countries, indexnow, revalidate-web, voice-path
src/proxy.ts
```

---

## sw/remotion

영상·카드 컴포지션을 담는다. 렌더 산출물은 `out/`으로 나간다.

```text
src/
  Root.tsx             # 컴포지션 등록
  card-entry.tsx       # 카드 스틸 진입점
  compositions/
    BookRecommend/     # 북리커맨드 롱폼·쇼츠·솔로 (현역 렌더는 legacy/)
    BookCard/          # SNS 카드뉴스
    Faction/           # 세력도감 세로 롱폼·쇼츠
    FactionCard/
    OlympusMV/
    Thumbnail/
    ImageSlideshow.tsx  |  KineticType.tsx  |  TextReveal.tsx  |  theme.ts
  components/caption/
  lib/                 # avatar, voice-timing
public/                # common, covers, episodes, factions, fonts, music
scripts/               # render/, voice/, srt/, youtube/, lib/ + 팩션 정렬·감사 스크립트
```

---

## sw/lab

Vite + React 그래픽 실험장이다. `sw/web`의 `/lab` 화면과 별개다.

```text
src/
  main.tsx  |  Dashboard.tsx  |  Layout.tsx  |  style.css
  labs/     # boring-avatars, css-art, dicebear, model-viewer, morphing-blob,
            # nice-avatar, p5-gen, particle, phaser-test, three-test, voxel
```

---

## sw/audio-bo

로컬 GPU와 D드라이브 모델을 쓰는 독립 음성 작업실이다. 공개 웹 라우팅·사이트맵과 분리한다. 상세는 [audio-bo.md](../apps/audio-bo.md)를 봐라.

```text
src/app/
  page.tsx  |  layout.tsx        # 단일 작업실 화면
  api/jobs/                      # 목록·생성
  api/jobs/[id]/                 # 상태, actions, folder, waveform,
                                 # audio/[kind], outputs, outputs/file
src/components/  # NewJobForm, StageRail, Studio, AudioCompare, studio/
src/lib/         # jobs, job-progress, output-files, paths, worker,
                 # voice-directions, types
scripts/audio-worker.ps1         # 단계별 로컬 작업자
scripts/*.py                     # transcribe, train-voice, synthesize, analyze-generated 등
```
