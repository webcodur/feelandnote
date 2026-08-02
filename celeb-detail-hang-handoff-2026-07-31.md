# 인물 상세 페이지 무응답 — 조사 인계 (2026-07-31)

로컬 dev(`localhost:3000`)에서 **인물 상세 `/celeb/[slug]` 라우트만** 응답하지 않는다. 다른 라우트는 정상이다. 아래는 실측으로 확인한 것과 아직 확인하지 않은 것을 갈라 적었다.

---

## 1. 증상 (실측)

`curl.exe -s -o NUL -w "%{http_code}" --max-time N` 으로 측정. `status=000`은 타임아웃(무응답)이다.

| 경로 | 상태 | 소요 |
|---|---|---|
| `/` | 200 | 0.6s |
| `/explore/figures` | 200 | 3.4s |
| `/explore/persona` | 200 | 3.1s |
| `/library` | 200 | 3.5s |
| `/agora` | 307 | 0.7s |
| `/celeb/camilo-jose-cela` | **000** | 180s 초과 |
| `/celeb/achilles` | **000** | 120s 초과 |
| `/celeb/hwang-dong-hyuk` | **000** | 120s 초과 |
| `/celeb/steve-jobs` | **000** | 30s 초과 |

- 재시도해도 동일하다(첫 컴파일 지연이 아니다). 워밍 후 2차 요청도 60초 무응답.
- 등급 무관: `full`(camilo-jose-cela), `fiction`(achilles), `light`(hwang-dong-hyuk) 전부 동일.
- 등록 시점 무관: 2026-06 이전 등록 인물도, 2026-07-31 신규 등록 인물도 동일.

### UUID 주소가 "빙빙 도는" 현상은 별개가 아니다

`http://localhost:3000/78db9737-1f8c-4d45-9c6d-59187d6341ee` (카밀로 호세 셀라)를 열면:

1. `307 → http://localhost:3000/celeb/camilo-jose-cela` — **정상 동작**이다. `[locale]/(main)/[userId]/page.tsx:65`가 `profile_type='CELEB'`이면 slug 주소로 넘긴다.
2. 넘어간 `/celeb/camilo-jose-cela`가 무응답 → 브라우저에서는 로딩만 계속된다.

즉 링크 생성이나 라우팅 버그가 아니라 **도착지 페이지가 멈춘 것**이다. `localePrefix: 'as-needed'` + `defaultLocale: 'ko'`(`src/i18n/routing.ts`)이므로 접두사 없는 `/{uuid}` 자체는 유효한 주소다.

## 2. 배제한 원인 (실측으로 확인)

| 후보 | 확인 방법 | 결과 |
|---|---|---|
| 타입·컴파일 오류 | `npx tsc --noEmit` (sw/web) | exit 0, 오류 없음 |
| DB 성능 | `explain (analyze, buffers)` — `celeb_persona ⋈ profiles` 1,000행 | **265ms**, Merge Join + Index Scan 정상 |
| 인물 상세 코드 변경 | `git status --porcelain -- sw/web/src` | 변경 2건뿐, 둘 다 홈 유튜브 관련(`YoutubeChannelLink.tsx`, `YoutubeHeroOverlay.tsx`) — 인물 상세와 무관 |
| 2026-07-31 신규 등록분 | 기존 인물(steve-jobs)도 동일 무응답 | 무관 |
| 페이징 무한 루프 | `packages/shared/src/lib/paginate.ts` `selectAllPages` 종료 조건 검토 | `data.length === 0` / `data.length < 요청폭` 이중 종료, 논리상 정상 |

## 3. 아직 확인하지 않은 것 (미확인)

**dev 서버 런타임 로그를 보지 못했다.** 사용자가 띄운 프로세스라 임의 재시작·종료를 하지 않았다. 이것이 가장 결정적인 단서이며, 아래 조사는 전부 그 다음이다.

조사 시작점: `sw/web/src/app/[locale]/(main)/celeb/[slug]/page.tsx:107` — `Promise.all`로 **10개 조회를 동시에** 실행한다. 하나라도 resolve되지 않으면 페이지 전체가 멈춘다.

```
getGuestbookEntries        getCelebInfluence          getSimilarByCelebId
getCelebJsonLdContents     getCelebDialogueFull       getContemporaries
getCelebTimelineEvents     getFactionTagPreviews      getPublicUserContents(full만)
getFictionSourcesForCeleb(fiction만)
```

등급이 달라도 전부 멈추므로, 등급 조건부인 마지막 두 개(`getPublicUserContents`, `getFictionSourcesForCeleb`)는 단독 원인이 아니다. 공통 실행되는 8개가 후보다.

### 우선 의심 지점 (추정 — 검증 안 됨)

1. **`getSimilarByCelebId`** (`src/actions/persona/getSimilarByCelebId.ts`)
   - `celeb_persona` 전량을 `selectAllPages`로 페이징 조회한 뒤 `unstable_cache`에 싣는다.
   - 코드 주석이 **2MB 캐시 한도**를 명시한다(`getAllPersonaVectorsCached`). 2026-07-31에 139명이 추가되어 **1,677 → 1,816행**(active 1,475)이 됐다.
   - 한도 초과 시 Next.js 동작(캐시 미저장 + 매 요청 재조회)이 무응답까지 갈 수 있는지는 **확인 안 됨**. 확인하려면 dev 로그에서 캐시 경고를 보거나, 이 조회만 떼어 시간을 재야 한다.
2. **`getContemporaries`** (`src/actions/celebs/getContemporaries.ts:52`)
   - `profiles`에서 `birth_date` 있는 CELEB 전량을 페이징 조회한다. 단 `achilles`처럼 생몰일 없는 인물은 이 조회를 건너뛰는데도 멈추므로 **단독 원인은 아니다**.
3. dev 서버 프로세스 자체의 상태 이상(메모리, 컴파일 캐시). 재시작으로 해소되는지가 판별점이다.

## 4. 다음 사람이 할 일

1. **dev 서버 터미널 로그 확보** — 인물 페이지 요청 시 찍히는 내용. 캐시 한도 경고(`Failed to set Next.js data cache, items over 2MB can not be cached`)가 있는지 특히 본다.
2. **서버 재시작 후 재현 여부** 확인. 풀리면 런타임 상태 문제, 그대로면 3번으로.
3. `Promise.all` 10개를 임시로 하나씩 끊어가며 어느 것이 안 끝나는지 이분 탐색.
4. 캐시 한도가 원인이면: 유사 인물 계산을 전량 로드 대신 DB 함수(RPC)로 옮기거나, 캐시에 싣는 필드를 더 줄이거나, 페이지 단위 캐시를 나눈다.

## 5. 관련 파일

| 경로 | 역할 |
|---|---|
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/page.tsx` | 인물 상세. 107행 `Promise.all` 10개 |
| `sw/web/src/app/[locale]/(main)/[userId]/page.tsx` | UUID 주소 → slug 주소 리다이렉트(65행) |
| `sw/web/src/actions/persona/getSimilarByCelebId.ts` | 전체 페르소나 벡터 캐시. 2MB 한도 주석 |
| `sw/web/src/actions/celebs/getContemporaries.ts` | 생몰일 보유 CELEB 전량 조회 |
| `packages/shared/src/lib/paginate.ts` | `selectAllPages` 페이징 |
| `sw/web/src/i18n/routing.ts` | `localePrefix: 'as-needed'`, `defaultLocale: 'ko'` |

## 6. 참고 — 2026-07-31 데이터 변경 내역

같은 날 아래 작업이 있었다. 무응답과의 인과는 **확인되지 않았다**(기존 인물도 동일 증상이므로 직접 원인일 가능성은 낮다). 행 수 증가가 캐시 한도에 영향을 줬는지만 확인 대상이다.

- `profiles`에 한국 연예계 인물 139명 신규 등록(전원 `celeb_tier='light'`, `status='inactive'`)
- `celeb_influence` 139행 추가
- `celeb_persona` 139행 추가 → 총 1,816행, `persona` jsonb 합계 5,058 kB
- 아바타 26명 등록(R2 업로드 + `profiles.avatar_url` 갱신)
