# 환경변수 · 비밀값 SSoT

> **최종 실측 체크: 26.07.31** — 저장소 내 `.env` 3종·`sw/web/credentials/ga-service-account.json`·`.mcp.json` 전량 대조, 앱별 `process.env` 참조 실측

**이 저장소는 비밀값을 커밋하지 않는다.** `.gitignore`가 `.env`·`.env.*`·`.mcp.json`·`**/credentials/`를 모두 제외한다.
그래서 `git clone`만으로는 어떤 앱도 뜨지 않는다. **아래 파일 6종을 사람이 직접 옮겨야 한다.**

값 자체는 이 문서에 적지 않는다. 이 문서가 답하는 것은 **"어떤 파일이, 어디에, 무엇을 담고 있어야 하는가"**다.

---

## 1. 옮겨야 할 파일 (한눈에)

| # | 파일 | 위치 | 없으면 |
|---|------|------|--------|
| 1 | `.env` | `sw/web/` | 사용자 웹이 뜨지 않음 (Supabase 연결 실패) |
| 2 | `.env` | `sw/web-bo/` | 백오피스가 뜨지 않음 |
| 3 | `.env` | `sw/remotion/` | 영상 음성 합성·R2 업로드·DB 조회 전부 실패 |
| 4 | `sw/web/credentials/ga-service-account.json` | `sw/web/credentials/` | 유입 통계(GA4) 조회 불가. 웹 구동 자체는 됨 |
| 5 | `.mcp.json` | 저장소 루트 | AI 도구에서 Supabase·검색 콘솔 조회 불가. 서비스 구동과 무관 |
| 6 | `.claude/settings.local.json` | 저장소 루트 | Claude Code 개인 설정만. 서비스와 무관 |

**`.env`가 필요 없는 앱**: `sw/lab`(환경변수 참조 0건), `sw/android`(Gradle 프로젝트), `packages/*`(자체 파일 없이 각 앱의 값을 물려받음).
**`sw/audio-bo`는 `.env`가 없다** — 로컬 작업 폴더 경로를 코드 기본값(`D:\audios\...`·`D:\GPT-SoVITS\...`)으로 박아 뒀다. 다른 컴퓨터에서 폴더 위치가 다르면 §5를 본다.

저장소에는 빈칸 서식지도 두지 않는다. `sw/web/.env.local.example`이 있었으나 프로그램이 읽지 않고 참조하는 곳도 없는 데다 목록이 실물의 5분의 1에서 멈춰 있어 26.07.31에 삭제했다. **세팅의 기준은 실물 `.env` 사본 하나뿐이고, 어떤 값이 필요한지는 이 문서가 답한다.**

---

## 2. 새 컴퓨터에서 개발 시작하기

```bash
git clone <저장소>
pnpm install
```

이후 위 표의 파일을 같은 경로에 놓는다. 옮기는 방법은 두 가지다.

1. **직접 복사** — 기존 컴퓨터에서 파일을 그대로 가져온다. 가장 빠르고, 지금 쓰는 방식이다.
2. **재발급** — 유출이 의심되면 §3~§4의 발급처에서 새로 만든다. 재발급 시 **배포처(Vercel)의 값도 함께 바꿔야** 운영 사이트가 죽지 않는다.

전송 경로 주의: 이 파일들은 서비스 데이터베이스 전권(`SUPABASE_SERVICE_ROLE_KEY`)과 유료 API 결제 권한을 통째로 담고 있다. 메신저·이메일·공개 저장소에 올리지 않는다.

### 확인

```bash
pnpm dev:web     # :3000 — 인물 목록이 뜨면 Supabase 연결 성공
pnpm dev:bo      # :3001 — 로그인 후 대시보드 숫자가 나오면 성공
```

---

## 3. 값 묶음별 설명

같은 값이 여러 앱에 중복으로 들어간다(앱마다 별도 파일을 읽으므로 정상이다). **한 곳을 바꾸면 나머지도 같이 바꿔야 한다.**

### 3-1. Supabase — 데이터베이스·로그인

| 이름 | 들어가는 곳 | 성격 |
|------|------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | web, web-bo | 프로젝트 주소. 공개돼도 무방 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, web-bo | 브라우저용 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | web, web-bo, remotion | 🔴 **전권 키.** 접근 규칙(RLS)을 전부 무시한다. 브라우저로 새면 안 된다 |
| `SUPABASE_URL` | remotion | 위 URL과 같은 값. remotion만 `NEXT_PUBLIC_` 접두어 없이 쓴다 |
| `SUPABASE_ACCESS_TOKEN` | web | 🔴 계정 단위 관리 토큰. CLI·MCP와 `web-bo`의 헤드라인 전량 적용 도구가 Management API의 다건 SQL에 사용한다. 헤드라인 도구는 `sw/web/.env`에서 이 값을 읽으므로 운영 URL·service-role과 같은 프로젝트인지 적용 전에 확인한다 |

발급: Supabase 대시보드 → Project Settings → API.

### 3-2. 사이트 주소

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `NEXT_PUBLIC_SITE_URL` | web, web-bo | 사용자 웹 주소. 사이트맵·공유 링크·인증 되돌아오는 주소의 기준 |
| `NEXT_PUBLIC_WEB_URL` | web-bo | 백오피스에서 사용자 웹을 링크로 열 때 쓴다 |
| `BO_BASE_URL` | remotion | 영상 도구가 백오피스 창구를 호출할 때의 주소(보통 `http://localhost:3001`) |

### 3-3. 외부 콘텐츠 검색 API

책·영화·게임·음악 메타데이터를 가져온다. `packages/content-search`가 쓰고, web·web-bo 양쪽에 같은 값이 들어간다.

| 이름 | 용도 | 발급 |
|------|------|------|
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 책 검색 (현행 주력) | 네이버 개발자센터 |
| `TMDB_API_KEY` | 영화·드라마 | TMDB |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | 게임(IGDB는 트위치 인증을 쓴다) | Twitch 개발자 콘솔 |
| (없음) | 음악(iTunes Search API) | 인증·키 없이 사용. IP 속도 제한을 지킨다 |
| `KOPIS_API_KEY` | 공연 정보 | KOPIS. **현재 소스에서 참조처를 찾지 못했다** — 예비값으로 본다 |
| `GOOGLE_BOOKS_API_KEY`, `..._0` ~ `..._13` | ⚠️ **폐기.** 하루 1,000건 한도 때문에 키 15개를 돌려 써도 부족했다 | 신규 사용 금지 |

> Google Books 키가 15개나 남아 있는 이유는 폐기 전 한도를 늘리려 여러 개를 돌려쓰던 흔적이기 때문이다. 지우지는 않았으나 **되살리지 않는다**(`docs/project/platform/external-services.md` 「외부 콘텐츠 검색 API」).

### 3-4. Cloudflare R2 — 이미지 저장소

| 이름 | 들어가는 곳 |
|------|------------|
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET_NAME` · `R2_PUBLIC_URL` | web, web-bo, remotion (5종 세트, 세 앱 동일) |

인물 사진·책 표지가 여기 있다. 값이 틀리면 화면에 사진만 안 뜨는 게 아니라 **업로드 도구가 조용히 실패**할 수 있다.

### 3-5. 음성 합성

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `ELEVENLABS_API_KEY` | web, web-bo, remotion | 🔴 **유료 종량제.** 인물 목소리 합성 |
| `ELEVENLABS_API_KEY_FEELANDNOTE` | web-bo, remotion | 두 번째 계정 키. 한도 소진 시 갈아탄다 |
| `GOOGLE_CLOUD_TTS_KEY` | web, web-bo, remotion | 구글 음성 합성 |

ElevenLabs 두 값에는 콘솔의 API Key ID가 아니라 키 생성·회전 시 표시되는 실제 `sk_...` 비밀 키를 넣는다. Key ID는 인증 헤더에 사용할 수 없다.

### 3-6. Gemini(Google GenAI) 키 무리

이미지·텍스트 생성에 쓴다. **무료 키의 하루 한도가 낮아 여러 개를 순번대로 돌려쓰는 구조**라 이름이 번호로 끝난다.

| 이름 꼴 | 들어가는 곳 | 개수(실측) |
|---------|------------|-----------|
| `GOOGLE_GENAI_API_KEY0` ~ `20` | web | 21개 |
| `GOOGLE_GENAI_API_KEY_FREE1` ~ `99` | web-bo, remotion | 각 99개 |
| `GOOGLE_GENAI_API_KEY_PAID1` | remotion | 유료 키 1개 |
| `GOOGLE_VERTEX_API_KEY1` | remotion | Vertex AI 경유 |
| `GEMINI_START_KEY` | web-bo | 몇 번 키부터 돌릴지 지정(1부터 셈) |

> **함정**: `web-bo`와 `remotion`의 `.env` 모두에 `GOOGLE_GENAI_API_KEY_FREE20`이 **두 번** 적혀 있다. 파일을 위에서 아래로 읽으므로 뒤쪽 값이 이긴다. 사고는 아니지만 키를 세거나 교체할 때 헷갈린다.

### 3-7. 크론·캐시 갱신

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `CLOUDFLARE_ZONE_ID` · `CLOUDFLARE_API_TOKEN` | web(Vercel), GitHub Secrets, 로컬 `.env` | Cloudflare 앞단 캐시 존과 퍼지 토큰. Vercel·GitHub에는 해당 zone의 **Cache Purge만 허용한 전용 토큰**을 각각 두고, Cache Rules·DNS·WAF까지 가진 운영 토큰은 로컬 규칙 관리에만 쓴다. 앞단 퍼지가 필요한 요청에서 자격증명이 없으면 `/api/revalidate`는 `complete: false`·503, Cloudflare API가 실패하면 `complete: false`·502를 돌려준다. 실제 web 프로덕션 배포 후와 수동 실행 시 전체 퍼지하는 GitHub 워크플로도 비밀값 누락·HTTP 오류·`success: false`를 모두 실패로 처리한다. Zone ID는 같아야 하지만 API token 값은 배치별 최소 권한으로 분리해도 된다 |
| `CRON_SECRET` | web, web-bo, **Supabase Vault(`web_revalidate_secret`)** | 정해진 시각에 도는 작업(오늘의 인물)과 화면 갱신 창구(`/api/revalidate`)의 암호. **비어 있으면 갱신 창구가 스스로 거부한다.** DB 트리거가 같은 값을 Vault에서 읽어 웹에 무효화를 보내므로, 키를 돌릴 때는 Vercel·로컬 `.env`·Vault 세 곳을 함께 바꾼다(`external-services.md`「웹 캐시 무효화 단일 창구」) |

Vercel의 예약 실행 설정은 `sw/web/vercel.json`에 있다(매일 15:05 UTC = 한국시각 0시 5분, `/api/cron/today-figure`).

### 3-8. 유입 통계(GA4)

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `GA_PROPERTY_ID` | web | GA4 속성 번호 |
| `GA_CREDENTIALS_PATH` | web | 아래 인증 파일의 경로 |
| `sw/web/credentials/ga-service-account.json` | `sw/web/credentials/` | 🔴 **구글 서비스 계정 키 파일.** 개인 키가 그대로 들어 있다 (`claude-analytics@feelandnote.iam.gserviceaccount.com`) |

### 3-9. 팩션(세력도감) 로컬 연동

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `FACTION_LOCAL` | web-bo | `1`이면 백오피스가 영상 저장소(`sw/remotion/public/factions/`)의 실제 파일을 읽고 쓴다. **꺼져 있으면 영상 편 사진·음원 작업 화면이 "연결 안 됨"으로 뜬다** |
| `REMOTION_ROOT` | (선택) | 영상 저장소가 다른 위치에 있을 때만 지정. 없으면 `sw/remotion`으로 본다 |

### 3-10. 기타

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `ZAI_API_KEY` | web-bo | 외부 생성 모델 키 |
| `ANDROID_APP_PACKAGE_NAME` · `ANDROID_APP_CERT_FINGERPRINTS` | web (**현재 미설정**) | 안드로이드 앱의 도메인 소유 확인용. 견본 파일에만 있고 실제 `.env`에는 없다. 지문이 없으면 경고를 남기고 빈 값으로 응답하므로 **앱 도메인 검증이 실패한다**. 앱 출시 단계에서 채운다 |

---

## 4. AI 도구용 설정 (`.mcp.json`)

서비스 구동과 무관하다. Claude·Codex 등에서 DB와 검색 콘솔을 직접 조회하려 할 때만 필요하다.

| 서버 | 담고 있는 것 |
|------|-------------|
| `supabase` | 🔴 Supabase 개인 접근 토큰(실행 인자에 평문) |
| `google-search-console` | `GOOGLE_APPLICATION_CREDENTIALS` — 구글 인증 파일 경로 |

> 이 파일이 커밋되면 **깃허브가 토큰을 감지해 자동 폐기**시킨다. `.gitignore`에 이미 들어 있으니 해제하지 않는다.

---

## 5. 다른 컴퓨터에서 달라지는 것 — 로컬 폴더 경로

값이 아니라 **폴더 위치**라서 컴퓨터마다 다르다. 음성 작업실(`sw/audio-bo`)은 `.env` 없이 코드 기본값을 쓰므로, 폴더 구성이 다르면 `sw/audio-bo/.env`를 새로 만들어 덮어쓴다.

| 이름 | 기본값 | 무엇 |
|------|--------|------|
| `AUDIO_BO_ROOT` | `D:\audios\interview-cleaner\projects` | 음원 작업 폴더 |
| `GPT_SOVITS_ROOT` | `D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604` | 음성 합성 도구 설치 위치 |
| `INTERVIEW_CLEANER_ROOT` | `D:\audios\interview-cleaner` | 받아쓰기 도구 위치 |

영상 자료(`sw/remotion/public/episodes`·`factions`·`music`·`covers`)도 통째로 추적 대상이 아니다. **저장소를 복제해도 영상 자료는 따라오지 않는다** — 별도로 옮긴다.

---

## 6. 유출 시 처리 순서

1. Supabase → API 설정에서 `service_role` 키 회전, 세 앱의 `.env`와 Vercel 값을 모두 교체
2. Cloudflare R2 → 액세스 키 삭제 후 재발급
3. ElevenLabs·Gemini·TMDB 등 → 각 콘솔에서 키 폐기 후 재발급
4. 구글 서비스 계정 → 키 삭제 후 새 키 내려받아 `sw/web/credentials/ga-service-account.json` 교체
5. Supabase 개인 접근 토큰 → 폐기 후 `.mcp.json` 갱신

과금이 붙는 것은 ElevenLabs·Gemini 유료 키·구글 TTS다. 유출 시 여기부터 잠근다.
