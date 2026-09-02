# 환경변수 · 비밀값 SSoT

> **최종 실측 체크: 26.08.27** — 저장소 내 `.env` 3종과 자격증명 파일, 사용자 홈의 Oracle·백업·Cloudflare 키, `.mcp.json`을 전량 대조했다. 세 앱의 self-hosted DB 주소·서버 키·R2 설정 일치도 확인했다

**이 저장소는 비밀값을 커밋하지 않는다.** `.gitignore`가 `.env`·`.env.*`·`.mcp.json`·`**/credentials/`를 모두 제외한다.
그래서 `git clone`만으로는 어떤 앱도 뜨지 않는다. **아래 파일 7종을 사람이 직접 옮겨야 한다.**

값 자체는 이 문서에 적지 않는다. 이 문서가 답하는 것은 **"어떤 파일이, 어디에, 무엇을 담고 있어야 하는가"**다.

---

## 1. 옮겨야 할 파일 (한눈에)

| # | 파일 | 위치 | 없으면 |
|---|------|------|--------|
| 1 | `.env` | `sw/web/` | 사용자 웹이 뜨지 않음 (DB·Auth 연결 실패) |
| 2 | `.env` | `sw/web-bo/` | 백오피스가 뜨지 않음 |
| 3 | `.env` | `sw/remotion/` | 영상 음성 합성·R2 업로드·DB 조회 전부 실패 |
| 4 | `sw/web/credentials/ga-service-account.json` | `sw/web/credentials/` | 유입 통계(GA4) 조회 불가. 웹 구동 자체는 됨 |
| 5 | `client_secret.json`·`youtube_token.json`·`youtube_token_en.json` | `sw/remotion/credentials/` | 🔴 **유튜브 업로드·메타 갱신·삭제 전부 불가** (KO·EN 채널 OAuth. `scripts/youtube/youtube-core.ts`가 읽는다) |
| 6 | `.mcp.json` | 저장소 루트 | AI 도구의 검색 콘솔 등 로컬 MCP 연결 불가. 서비스 구동과 무관 |
| 7 | `.claude/settings.local.json` | 저장소 루트 | Claude Code 개인 설정만. 서비스와 무관 |

루트 `credentials/ga-service-account.json`도 남아 있으나 **참조처가 없는 사본**이다(전부 `sw/web/credentials/` 경로만 읽는다). 옮기지 않아도 된다.

저장소 **밖** 파일도 5종 있다.

| 파일 | 위치 | 용도 |
|------|------|------|
| `ga-credentials.json` | `C:/Users/<사용자>/.claude/` | 검색 콘솔 MCP 인증 |
| `obscura.exe` | `C:\Tools\obscura\<버전>\` | 브라우저 MCP 실행 파일 (비밀값 아님, 재설치로 대체 가능) |
| `rootca.key`·`rootca.crt`·`rootca.srl` | `C:/Users/<사용자>/.feelandnote/cloudflare-aop/` | Cloudflare Authenticated Origin Pulls 갱신용 CA. `rootca.key`는 비밀값이며 Oracle에는 올리지 않는다. 로컬 사본이 없어도 현재 서비스는 계속 뜨지만 인증서 갱신 때 새 CA로 교체해야 한다 |
| `feelandnote_oracle`·`feelandnote_oracle.pub` | `C:/Users/<사용자>/.ssh/` | Oracle 웹·DB VM SSH. 비밀키는 공개 저장소나 서버에 복사하지 않는다 |
| `supabase-backup-age.key` | `C:/Users/<사용자>/.feelandnote/` | R2의 Oracle DB 암호화 백업 복구키. 파일명은 기존 복구 체계의 식별자다. 서버에는 공개 recipient만 둔다 |

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
2. **재발급** — 유출이 의심되면 §3~§4의 발급처에서 새로 만든다. 재발급 시 **Oracle의 `/etc/feelandnote/web.env`도 함께 바꿔야** 운영 사이트가 죽지 않는다.

전송 경로 주의: 이 파일들은 서비스 데이터베이스 전권(`SUPABASE_SERVICE_ROLE_KEY`)과 유료 API 결제 권한을 통째로 담고 있다. 메신저·이메일·공개 저장소에 올리지 않는다.

### 확인

```bash
pnpm dev:web     # :3000 — 인물 목록이 뜨면 DB·Auth 연결 성공
pnpm dev:bo      # :3001 — 로그인 후 대시보드 숫자가 나오면 성공
```

---

## 3. 값 묶음별 설명

같은 값이 여러 앱에 중복으로 들어간다(앱마다 별도 파일을 읽으므로 정상이다). **한 곳을 바꾸면 나머지도 같이 바꿔야 한다.**

### 3-1. Oracle — 데이터베이스·로그인

| 이름 | 들어가는 곳 | 성격 |
|------|------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | web, web-bo | Oracle DB VM의 Auth·PostgREST 공개 주소. 변수명은 과거 호환 식별자이며 공개돼도 무방 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, web-bo | 브라우저용 `sb_publishable_...` 공개 키. 변수명만 과거 호환 이름을 유지한다 |
| `SUPABASE_SERVICE_ROLE_KEY` | web, web-bo, remotion | 🔴 서버용 `sb_secret_...` 전권 키. 접근 규칙(RLS)을 전부 무시하며 브라우저로 새면 안 된다. 변수명만 과거 호환 이름을 유지한다 |
| `SUPABASE_URL` | remotion | 위 Auth·PostgREST 주소와 같은 값. remotion만 `NEXT_PUBLIC_` 접두어 없이 쓴다. 변수명은 과거 호환 식별자다 |

공개·서버 키는 Oracle DB VM의 `/opt/feelandnote/supabase/.env`가 원본이다. 이 경로의 `supabase`는 실제 서버 배포 경로다. 값을 교체하면 세 앱의 로컬 `.env`와 Oracle 웹의 `/etc/feelandnote/web.env`도 함께 바꾼다.

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
| `KAKAO_REST_API_KEY` | 책 검색 (한국어판 현행 주력. 영문 원서는 OpenLibrary — 키 불요) | 카카오 개발자센터 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 블로그·이미지·뉴스 검색. **책 검색에는 더 쓰지 않는다** | 네이버 개발자센터 |
| `LASTFM_API_KEY` | 음악 메타 보강 (web만. 없으면 조용히 건너뜀) | Last.fm API |
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
`R2_PUBLIC_URL`의 현행값은 `https://assets.feelandnote.com`이다. web의 클라이언트 음성 URL도 `next.config.ts`가 이 값을 공개 설정으로 주입하므로 별도 환경변수를 만들지 않는다.

### 3-5. 음성 합성

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `ELEVENLABS_API_KEY` | web, web-bo, remotion | 🔴 **유료 종량제.** 인물 목소리 합성 |
| `ELEVENLABS_API_KEY_FEELANDNOTE` | web-bo, remotion | 두 번째 계정 키. 한도 소진 시 갈아탄다 |

ElevenLabs 두 값에는 콘솔의 API Key ID가 아니라 키 생성·회전 시 표시되는 실제 `sk_...` 비밀 키를 넣는다. Key ID는 인증 헤더에 사용할 수 없다.

### 3-6. Gemini(Google GenAI) 키 무리

이미지·텍스트 생성에 쓴다. **무료 키의 하루 한도가 낮아 여러 개를 순번대로 돌려쓰는 구조**라 이름이 번호로 끝난다.

| 이름 꼴 | 들어가는 곳 | 개수(실측) |
|---------|------------|-----------|
| `GOOGLE_GENAI_API_KEY0` ~ `20` | web | 21개(코드 미사용, `5`번은 폐기) |
| `GOOGLE_GENAI_API_KEY_FREE1` ~ `99` | web-bo, remotion | 각 99개 |
| `GEMINI_START_KEY` | web-bo | 몇 번 키부터 돌릴지 지정(1부터 셈) |

> **Google 유료 키 금지**: 결제 계정이 붙은 GCP 프로젝트의 키는 `.env`에 두지 않는다. 2026-09-02에 `GOOGLE_GENAI_API_KEY_PAID1`을 콘솔에서 삭제하고 프로젝트 결제를 중지했으며, 쓰지 않던 `GOOGLE_VERTEX_API_KEY1`·`GOOGLE_CLOUD_TTS_KEY`도 `.env`에서 지웠다. 이미지·텍스트 생성이 월 1만 원 단위로 조용히 과금됐기 때문이다. Google 음성·이미지·텍스트는 무료 키 로테이션, agy·Gemini CLI 로그인, 또는 ElevenLabs로만 부른다.

> **함정**: `web-bo`와 `remotion`의 `.env` 모두에 `GOOGLE_GENAI_API_KEY_FREE20`이 **두 번** 적혀 있다. 파일을 위에서 아래로 읽으므로 뒤쪽 값이 이긴다. 사고는 아니지만 키를 세거나 교체할 때 헷갈린다.

### 3-7. 크론·캐시 갱신

| 이름 | 들어가는 곳 | 설명 |
|------|------------|------|
| `CLOUDFLARE_ZONE_ID` · `CLOUDFLARE_API_TOKEN` | web(Oracle), GitHub Secrets, 로컬 `.env` | Cloudflare 앞단 캐시 존과 퍼지 토큰. Oracle과 GitHub에는 해당 zone의 **Cache Purge만 허용한 전용 토큰**을 두고, Cache Rules·DNS·WAF까지 가진 운영 토큰은 로컬 규칙 관리에만 쓴다. 앞단 퍼지가 필요한 요청에서 자격증명이 없으면 `/api/revalidate`는 `complete: false`·503, Cloudflare API가 실패하면 `complete: false`·502를 돌려준다. 코드 배포 뒤에는 `cloudflare-purge.yml`을 필요한 범위로 수동 실행한다. 전체 존 퍼지는 `workflow_dispatch`의 `emergency-zone`과 정확한 확인문을 함께 입력한 경우에만 허용한다. Zone ID는 같아야 하지만 API token 값은 배치별 최소 권한으로 분리해도 된다 |
| `CRON_SECRET` | web(Oracle), web-bo, **PostgreSQL Vault(`web_revalidate_secret`)** | 정해진 시각에 도는 작업(오늘의 인물)과 화면 갱신 창구(`/api/revalidate`)의 암호. **비어 있으면 갱신 창구가 스스로 거부한다.** DB 트리거가 같은 값을 Vault에서 읽어 웹에 무효화를 보내므로, 키를 돌릴 때는 Oracle `/etc/feelandnote/web.env`·로컬 `.env`·Vault를 함께 바꾼다(`external-services.md`「웹 캐시 무효화 단일 창구」) |

오늘의 인물은 Oracle의 `feelandnote-today-figure.timer`가 매일 15:05 UTC(한국시각 0시 5분)에 `/api/cron/today-figure`를 호출한다.

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

서비스 구동과 무관하다. Claude·Codex 등에서 검색 콘솔과 로컬 브라우저 도구를 연결할 때만 필요하다.

| 서버 | 담고 있는 것 |
|------|-------------|
| `google-search-console` | `GOOGLE_APPLICATION_CREDENTIALS` — 구글 인증 파일 경로(`C:/Users/<사용자>/.claude/ga-credentials.json`, 저장소 밖) |
| `obscura` | 비밀값 없음. 로컬 실행 파일 경로(`C:\Tools\obscura\`)만 가리킨다 |

> 사용자별 절대 경로가 들어가는 로컬 설정이므로 `.gitignore`에 둔다. 저장소에 올리지 않는다.

---

## 5. 다른 컴퓨터에서 달라지는 것 — 로컬 폴더 경로

값이 아니라 **폴더 위치**라서 컴퓨터마다 다르다. 음성 작업실(`sw/audio-bo`)은 `.env` 없이 코드 기본값을 쓰므로, 폴더 구성이 다르면 `sw/audio-bo/.env`를 새로 만들어 덮어쓴다.

| 이름 | 기본값 | 무엇 |
|------|--------|------|
| `AUDIO_BO_ROOT` | `D:\audios\interview-cleaner\projects` | 음원 작업 폴더 |
| `GPT_SOVITS_ROOT` | `D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604` | 음성 합성 도구 설치 위치 |
| `INTERVIEW_CLEANER_ROOT` | `D:\audios\interview-cleaner` | 받아쓰기 도구 위치 |

영상 자료(`sw/remotion/public/episodes`·`factions`·`music`·`covers`)도 통째로 추적 대상이 아니다. **저장소를 복제해도 영상 자료는 따라오지 않는다** — 별도로 옮긴다. 26.08.22 실측 규모는 episodes 3.7GB(6,628파일)·factions 3.1GB(3,964파일)·music 138MB·covers 32MB로, 합쳐 약 7GB다. 외장 저장소나 로컬 네트워크로 옮긴다.

그 밖에 새 컴퓨터에서 챙길 것:

- **`.claude/skills/` 정션 재생성** — `.agents/skills/`를 가리키는 로컬 정션이라 복제로 따라오지 않는다. `.agents/link-skills.ps1`을 실행해 다시 만든다.
- **안드로이드 서명 키** — `sw/android/keystore.properties`와 `*.jks`는 추적 제외 대상이며 현재 저장소 안에 실물이 없다(예시 파일만 있다). 앱 서명·출시 단계라면 서명 키를 보관처에서 따로 옮긴다.
- **음성 작업 폴더** — 위 표의 `D:\audios\...`·`D:\GPT-SoVITS\...`는 저장소 밖 별도 설치물이다. 음성 학습·합성을 쓸 때만 필요하다.

---

## 6. 유출 시 처리 순서

1. Oracle DB VM의 Auth·PostgREST가 쓰는 `sb_secret_...` 키가 노출되면 회전한 뒤 세 앱의 `.env`와 Oracle `/etc/feelandnote/web.env`를 모두 교체하고 기존 키를 폐기
2. Cloudflare R2 → 액세스 키 삭제 후 재발급
3. ElevenLabs·Gemini·TMDB 등 → 각 콘솔에서 키 폐기 후 재발급
4. 구글 서비스 계정 → 키 삭제 후 새 키 내려받아 `sw/web/credentials/ga-service-account.json` 교체
5. 유튜브 OAuth → 구글 클라우드 콘솔에서 OAuth 클라이언트 비밀 재발급, `sw/remotion/credentials/client_secret.json` 교체 후 KO·EN 채널 토큰 재인증

과금이 붙는 것은 ElevenLabs다. 유출 시 여기부터 잠근다.
