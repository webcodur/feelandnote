# 아키텍처

> **최종 실측 체크: 26.07.30** — 안드로이드 앱 셸 신설과 sw/web 신규 경로 반영

`sw/` 아래 6개 앱으로 구성한다.

| 앱 | 스택 | 역할 |
|---|---|---|
| `sw/web` | Next.js App Router | 공개 서비스 |
| `sw/web-bo` | Next.js App Router | 서비스 백오피스 + 영상 제작 관리 (상세: [web-bo.md](./web-bo.md)) |
| `sw/remotion` | Remotion | 영상·카드 컴포지션 |
| `sw/lab` | Vite + React | 그래픽 실험장 |
| `sw/audio-bo` | Next.js App Router | 로컬 GPU 음성 작업실 |
| `sw/android` | Gradle + TWA | 안드로이드 앱 셸 (상세: [안드로이드 앱 SSoT](./android-app-feasibility-review-2026-07-29.md)) |

`sw/android`는 자체 화면이 없다. 사용자의 브라우저가 `feelandnote.com`을 전체 화면으로 그리고, 앱은 그 껍데기만 맡는다. 웹을 배포하면 앱 내용도 함께 바뀌므로 앱을 다시 낼 필요가 없다. Node 패키지가 아니라 `pnpm-workspace.yaml`에 넣지 않으며(워크스페이스는 글롭이 아니라 개별 명시 방식이다), 빌드는 Android Studio가 맡는다.

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
      explore/         # 탐색 (figures, ranking, persona, today, faction/[slug],
                       #       feed, timeline, youtube, directory)
      library/         # 서가 (era, profession, museum, academy/[category]/[course])
      about/           # 서비스 소개 (문의 안내 흡수). 본문(AboutBody)은 홈 첫 방문 환영판과 공유
      notifications/
      rest/            # 쉼터 (게임 허브 단일 페이지)
      page.tsx         # 홈 — 첫 방문에만 환영판(소개 본문) 표시, 닫으면 쿠키(fn_intro_seen) 1년
    (policy)/          # terms, privacy, account-deletion
    (standalone)/      # search
    lab/               # 사내 실험 화면 11종 (+ 허브·상세 = page.tsx 13개). 목록 SSoT는 constants/lab.tsx의 LAB_ITEMS
    reading/           # 독서 워크스페이스 (자체 components, hooks 보유)
    layout.tsx  |  not-found.tsx
  api/                 # avatar, celeb-works, cron/today-figure, revalidate, tts, wiki-summary
  auth/callback/       # OAuth 콜백
  .well-known/         # assetlinks.json — 안드로이드 앱↔도메인 소유 검증. 지문은 환경변수로 읽는다
  feed.xml/            # RSS
  layout.tsx  |  error.tsx  |  manifest.ts  |  robots.ts  |  sitemap.ts
  opengraph-image.tsx  |  globals.css

actions/               # Server Actions
                       # achievements, activity, auth, board, celebs, contents, flows,
                       # game, guestbook, home, moderation, notes, notifications, persona,
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
                       # useRecentContents, useRecentProfiles, useTextToSpeech, useVoiceMuted
i18n/                  # navigation, request, routing
lib/                   # auth, board, cache, config, countries, errors, game, moderation,
                       # persona, r2, seo, supabase(client/server/middleware), url, utils
types/                 # academy, content, database, home, locale, recommendation,
                       # supabase(자동생성)
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

`NAV_ITEMS`는 다음과 같다. `showInHomePage`가 참인 항목만 홈 섹션으로 나온다.

| 키 | 라벨 | 경로 | 헤더 | 바텀탭 | 홈 |
|---|---|---|---|---|---|
| home | 홈 | `/` | | ● | |
| explore | 탐색 | `/explore` | ● | ● | ● |
| scriptures | 서가 | `/library` | ● | ● | ● |
| rest | 쉼터 | `/rest` | ● | ● | |
| archive | 내 기록 | `/{userId}` | | ● | ● |

`scriptures` 키의 경로는 `/library`다. 키 이름과 경로가 어긋나 있으나 코드상 그대로다. `archive`의 `/{userId}`는 렌더 시점에 실제 사용자 ID로 치환한다.

#### 하위 링크 (subLinks)

| 상위 | 하위 링크 |
|---|---|
| explore | `/explore/figures`(인물 목록), `/explore/ranking`(분야별 랭킹), `/explore/persona`(스펙트럼), `/explore/today`(오늘의 인물), `/explore/faction`(세력도감), `/explore/feed`(인물 피드), `/explore/timeline`(국가별 연대기), `/explore/youtube`(영상관), `/explore/directory`(디렉토리) |
| scriptures | `/library/era`(불후의 명작), `/library/profession`(갈림길), `/library/museum`(박물관), `/library/academy`(학당) |
| rest | `/rest#dawn`(여명), `/rest#labyrinth`(미궁), `/rest#hegemony`(패권), `/rest#suikoden`(천도) — 앵커 |

> **rest는 단일 허브 + 앵커다.** `/rest/<게임>` 경로에는 `page.tsx`가 없다. 게임 4종은 `/rest` 한 페이지에 마운트되고 이동은 앵커로 한다.
> 26.07.16 교정 — subLinks가 `/rest/dawn` 등 실재하지 않는 경로를 가리키고 각 디렉토리에 `loading.tsx`만 고아로 남아 있었다. 유일한 소비처인 `Footer.tsx`가 `FOOTER_NAV_ITEMS`에서 `rest`를 제외해 렌더되지 않아 404가 표면화되지 않았을 뿐이다. subLinks를 앵커로 교정하고 고아 `loading.tsx` 4개를 제거했다.

#### 풋터 링크

- `FOOTER_NAV_ITEMS`: `subLinks`를 가진 항목 중 `rest`를 뺀 것 → explore, scriptures.
- `FOOTER_BRAND_LINKS`: `/about`(서비스 소개), `/search`(검색), `/terms`(이용약관), `/privacy`(개인정보처리방침). 문의 안내는 `/about#contact`가 맡는다(2026-08-01 `/contact` 폐기·영구 리다이렉트).
- `FOOTER_MISC_LINKS`: `/rest`(쉼터), `/agora/social`(소셜), `/agora/board/notice`(공지사항), `/agora/board/feedback`(피드백).

#### 홈 섹션

`HOME_SECTIONS`는 explore·scriptures·rest·archive 네 개를 정의하고, `SECTION_ORDER`가 `home-banner → explore-section → scriptures-section → rest-section → archive-section` 순서를 정한다. `rest`는 `showInHomePage`가 거짓이라 `HOME_SECTION_KEYS`에 들어가지 않지만 `HOME_SECTIONS` 항목은 남아 있다.

### 네비게이션에 없는 화면

`/agora`는 `NAV_ITEMS`에 없다. 풋터(`FOOTER_MISC_LINKS`)와 앱 내부 링크로만 들어간다. 그 밖에 `/celeb/[slug]`, `/content/[contentId]`, `/notifications`, `/reading`, `/search`, `(policy)` 화면, `/lab` 도 네비게이션 밖이다.

### 레거시 리다이렉트

아래 페이지는 화면이 아니라 리다이렉트만 한다. 문서·링크에서 정본 경로를 써라.

| 레거시 | 정본 |
|---|---|
| `/explore/celebs` | `/explore/figures` |
| `/explore/celeb-feed` | `/explore/feed` |
| `/explore/figure` | `/explore/today` |
| `/explore/people` | `/agora/social` |
| `/explore/top-by-type` | `/explore/ranking` |
| `/library/figure` | `/explore/today` |
| `/agora/feed` | `/explore/feed` |
| `/agora/celeb-feed` | `/explore/feed` |
| `/agora/friend-feed` | `/agora/social-feed` |

### 콘텐츠 상세 라우팅

`/content/[contentId]` → `getContentDetail(contentId, category)` 호출.

---

## sw/web-bo

서비스 운영과 영상 제작 관리 백오피스다. 구조 개요만 둔다. 상세는 [web-bo.md](./web-bo.md)를 봐라.

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
src/lib/         # supabase, r2, image, countries, indexnow, revalidate-web, voice-path
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

로컬 GPU와 D드라이브 모델을 쓰는 독립 음성 작업실이다. 공개 웹 라우팅·사이트맵과 분리한다. 상세는 [audio-bo.md](./audio-bo.md)를 봐라.

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
