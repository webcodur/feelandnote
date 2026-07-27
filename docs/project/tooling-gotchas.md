# 개발 환경·도구 함정 모음

이 저장소에서 작업할 때 반복해서 사고를 냈던 인증·캐시·설정·에이전트 실행 환경의 함정과 그 진단·복구 절차를 모은 문서다. Supabase 인증이 401로 막힐 때, server action을 새로 만들거나 고칠 때, 권한 승인 팝업이 쏟아질 때, "변경이 화면에 반영 안 된다"는 보고를 받았을 때, 다른 CLI에서 알림이 쏟아질 때, 그리고 큰 작업을 발주하기 전 모델 상태를 점검할 때 읽는다. 외부 서비스 설정 자체는 `docs/project/external-services.md`가 SSoT이고 이 문서는 그 위의 사고 이력이다.

---

## 1. Supabase access token이 반복해서 죽는 원인 — git 유출

Supabase MCP·관리 API가 401 Unauthorized(`SUPABASE_ACCESS_TOKEN` 무효)로 막히는 일이 반복됐다.

**근본 원인**: 루트 `.mcp.json`이 git 추적 대상인데 그 안에 supabase `--access-token sbp_...`가 평문으로 박혀 커밋된다. 노출된 토큰은 Supabase가 자동 폐기하므로 "손대지 않았는데 토큰이 죽음"이 계속 재발한다. 게다가 죽은 토큰이 `.env`와 `.mcp.json` **두 곳에 각각** 박혀 있어 MCP 작업과 앱 관리 작업이 동시에 막힌다.

**해결(재발 방지)**
1. `.mcp.json`을 `.gitignore`에 등록하고 `git rm --cached .mcp.json`을 실행한다(로컬 파일은 남는다). 이후 새 토큰이 노출·폐기되지 않는다.
2. 대시보드(Account > Access Tokens, never expires)에서 살아 있는 토큰을 확인하고, 새 값을 `.env`와 `.mcp.json` **둘 다** 교체한다. MCP는 Claude를 재시작해야 재로드된다.

**진단**: 토큰 유효성은 `GET https://api.supabase.com/v1/projects`로 본다. python urllib으로 호출할 때 **User-Agent 헤더가 필수**다(없으면 Cloudflare error 1010으로 차단된다). 401이면 토큰 자체가 무효로 확정된다. 토큰 값은 python으로 `.env`를 파싱해 확인한다(git bash 인용 꼬임을 피한다).

**MCP가 죽어도 DDL 우회**: access token으로 `POST /v1/projects/{ref}/database/query`에 body `{"query": "<SQL>"}`, header에 Bearer + User-Agent를 넣어 보낸다. 성공 시 STATUS 201이다. 마이그레이션 SQL 파일도 이 방식으로 적용할 수 있다. `project_id = wouqtpvfctednlffross`.

데이터 CRUD 우회(셀럽 등록 등)는 `docs/project/celeb/celeb-gotchas.md` 9절에 있다.

---

## 2. Supabase server action 캐시·페이로드 규칙

신규 server action을 만들거나 기존 action을 수정할 때 아래 규칙을 모두 지킨다.

**왜**: Supabase Free 플랜의 5.5GB egress 한도가 매우 작아 한도 초과 차단 사고가 2026-03-18, 2026-05-09 두 번 재발했다. 두 번 모두 새로 추가된 action이 캐시·JSON path·페이지네이션 규칙을 무시한 게 원인이었다. 일반 코드 리뷰로는 매번 같은 함정에 빠진다.

1. 공개 read action은 반드시 `unstable_cache(fn, ['key'], { revalidate: 3600, tags: ['celebs'] })` + `createStaticClient()`(`sw/web/src/lib/supabase/static.ts`) 패턴을 쓴다. cookie 기반 `createClient()`는 인증 의존 부분에만 쓴다.
2. 인증 사용자 의존 데이터(현재 user.id 기반 follow/block/private)는 캐시 inner 밖으로 분리한다. inner는 primitive 인자만 받아 캐시 키를 안정화한다. locale은 항상 외부에서 `getLocale()`로 받아 인자로 넘긴다.
3. `celeb_dialogues.lines`/`lines_en` 통째 select 금지. greeting/quote만 필요하면 `DIALOGUE_BRIEF_SELECT` 또는 `DIALOGUE_BRIEF_SELECT_WITH_ID`, quote/monologue가 필요하면 `DIALOGUE_PROFILE_SELECT`를 쓴다. JSON path는 `celeb-dialogues.ts`에 정의돼 있다.
4. 카운트만 필요하면 `select('*', { count: 'exact', head: true })` 또는 SQL RPC를 쓴다. row를 페이지네이션으로 끝까지 받는 패턴(`while hasMore` + `range(from, from+PAGE_SIZE-1)` + `chunkArray` BATCH_SIZE 50)은 금지다.
5. RSC 페이지(`app/**/page.tsx`)에서 `supabase.from(...)`을 직접 호출하지 않는다. 캐시가 우회돼 SEO 크롤러에 직격당한다. 캐시된 action으로 분리한다.
6. JSON 컬럼(`cultural_journey`·`bio`·`youtube_videos` 등)을 결과셋과 함께 풀 셀렉트할 때는 캐시를 적용하고 슬러그·ID 단위로 키를 분리해 hit ratio를 확보한다.
7. 변경 시 `docs/project/external-services.md`의 캐싱 적용 함수 목록과 잔여 작업을 갱신한다. 그 문서가 SSoT다.
8. mutation의 `revalidatePath`/`revalidateTag` 호출 빈도를 점검한다. 한 mutation이 3중 path를 무효화하면 캐시 hit ratio가 무력화된다. tag 단위 통합을 권장한다.
9. **전체 테이블 풀스캔 + 행별 캐시 키 = egress 폭탄.** `unstable_cache` 키에 `celebId`/`page`/`slug` 같은 행별 식별자를 넣으면서 내부에서 전체 테이블을 풀스캔하면(예: `.neq('celeb_id', id)`로 전체 persona, page별 전체 user_contents) 식별자 수만큼 캐시가 갈라져 각 키의 첫 미스가 전체 테이블을 통째로 전송한다. 크롤러가 셀럽 ko/en 페이지를 순회하면 수천 회 × 전체 테이블 = 수 GB다. **해법: 전체 조회는 인자 없는(또는 locale만 받는) 단일 캐시 키로 1회만 받고, 행별 필터·계산·페이지 분할은 그 공유 캐시 위에서 JS로 한다.** 2026-06-22 셀럽 페이지(`getSimilarByCelebId` 전체 persona 4.25MB, `getContemporaries` 전체 profiles)와 라이브러리(`getScripturesByProfession` page별 전체 user_contents)가 이 패턴으로 5.5GB 초과의 주범이었다. 캐시 원본 mutate를 막기 위해 slice 후 `.map(c => ({...c}))` 얕은 복사가 필수다.
10. **봇 트래픽이 egress 증폭원이다.** 실사용자가 적어도 검색엔진 봇이 sitemap에 등록된 동적 경로(셀럽 slug × ko/en)를 순회하며 캐시 미스를 유발한다. `robots.ts`에 `/*?`(필터·검색 쿼리스트링)를 차단해 캐시 키 폭발(`getCelebs` 12인자 등)을 줄인다. 이미지는 R2(`pub-*.r2.dev`) 서빙이라 Supabase egress와 무관하다. egress는 거의 전부 DB 행 전송이다.

**검증 체크**: 신규 action은 위 항목으로 자가 점검한다. `unstable_cache` import 유무, `createStaticClient` 사용 유무, `lines, lines_en` 문자열 grep, `range(.+PAGE_SIZE` 패턴 grep — 이 4개 grep만으로 80%를 잡는다.

---

## 3. 조용한 폴백 금지

폴백 로직 없이 돌아가게 만든다. 조용한 폴백은 완충이 아니라 문제 해결을 불가능하게 만든다.

**왜**: `ShortVisual`과 `KoreanTypewriter`의 regex 불일치로 timings 매칭이 실패했는데, `KoreanTypewriter`의 `hasTimings=false` 폴백(비례 배분)이 조용히 동작하면서 4초 드리프트를 만들었다. 에러가 나야 할 지점에서 "대충 돌아가는" 폴백이 있었기 때문에 원인을 찾는 데 극도로 오래 걸렸다. 같은 성질의 사고가 셀럽 목록에서도 났다(rpc error를 검사하지 않아 빈 목록이 캐시에 박힘 — `docs/project/celeb/celeb-gotchas.md` 1절).

**적용**
- 데이터가 없거나 불일치하면 **에러를 던지거나 경고를 표시**한다. 조용히 대체 로직으로 넘어가지 않는다.
- "timings가 없으면 균등 배분" 같은 graceful degradation은 개발 중 버그를 숨긴다.
- 같은 텍스트를 여러 곳에서 split할 때 regex를 공유 상수로 추출한다.
- 런타임 경로(어떤 분기를 탔는지)를 코드 분석보다 먼저 확인한다.

---

## 4. 권한 승인 팝업 최소화 — 툴별 전역 와일드카드

프로젝트 `settings.local.json`의 `permissions.allow`에는 `Bash(*)`, `PowerShell(*)`, `Read(*)`, `Write(*)`, `Edit(*)`, `Task(*)`, `Agent(*)`, `ToolSearch(*)` 같은 **툴별 전역 와일드카드**를 유지한다. 개별 명령 문자열 단위로 권한을 축적하지 않는다.

**왜**: 서브에이전트(celeb-*, remo-* 등)가 Naver/OpenLibrary curl, Invoke-RestMethod, jq 파이프, 이미지 다운로드, SQL 실행 등을 수십 회 호출한다. 와일드카드가 없으면 매 명령마다 승인 팝업이 떠 유저가 수십 번 눌러야 한다. 유저가 이를 명시적으로 불편하게 여겼다.

**적용**: 새 프로젝트 초기 설정 때 툴별 `(*)` 권한을 한 번에 등록한다. 명령 하나 때문에 새 entry를 추가하지 말고 해당 툴 전체를 `(*)`로 허용한다. 서브에이전트 발주 직전에 `settings.local.json`을 점검해 필요한 툴이 모두 허용됐는지 확인한다.

---

## 5. "변경이 반영 안 된다" — 환경 탓 금지

코드·데이터 변경이 화면에 반영되지 않을 때 **사용자 환경(서버·브라우저·캐시)을 원인으로 추정하지 않는다.** 이 추정 자체가 금지다.

- "재시작 필요" 안내 금지
- "브라우저 새로고침"·"Ctrl+Shift+R"·"하드 리프레시" 안내 금지
- "캐시 때문"·"옛 빌드 때문" 가설을 떠올리는 것 자체를 차단
- "환경 종류를 알려달라"고 되묻기 금지(회피의 변형이다 — 답을 받기 전에 코드부터 본다)
- dev 프로세스를 직접 kill 하는 것 금지

**유일한 예외**: 파일 시스템 작업(폴더 rename·삭제 등)에서 dev 서버가 파일 핸들을 잡아 EPERM/EBUSY가 날 때. 이건 실제로 켜져 있음이 원인이다(2026-05-11 마이그레이션에서 발생). 이 경우에만 유저에게 잠시 멈춰달라 안내한다.

**왜(사고 이력)**
- 2026-05-11 BO 탭/Studio 폴더 개편 때 "변경이 안 보인다"는 보고에 두 번 "서버 재시작"으로 진단하고 한 번은 직접 Studio 프로세스를 죽였다. 유저 지적: "꺼야 하는 경우는 지금까지 없었다 — 파일 이전 말고는."
- 2026-05-17 슈퍼인텔리전스 쇼츠 작업 때 "이미지 안 나옴"에 "dev 서버 캐시·브라우저 캐시 가능성, 하드 새로고침해보라"고 안내했다. 진짜 원인은 `SegmentRow`의 `withImage = seg.visual === 'book' || seg.role === 'celeb'` 분기를 읽지 않은 채 narrator + visual:intro로 만든 데이터 결함이었다. 유저: "재시작 언급하지 말라고 했잖아. 항상 니 잘못임을 명심."

실제 원인은 거의 항상 (1) 내가 잘못된 파일·필드를 수정, (2) 코드 로직이 그 결과를 내지 않음, (3) 유저가 보는 화면의 진짜 source가 다른 곳, (4) 내가 만든 데이터가 렌더링 분기 조건과 안 맞음, 이 넷 중 하나다.

**적용**
- "변경 반영 안 됨"·"이미지 없음"·"동작 안 함" 류 보고가 오면 첫 행동은 **렌더링·조회 코드를 끝까지 추적**하는 것이다.
- 점검 순서: ① 내가 수정한 파일·필드가 유저가 보는 화면의 진짜 source인지(URL·라우트·import·조건 분기 추적) ② 그 데이터가 렌더링 분기를 통과하는지(visual·role·flags 같은 게이트 필드 확인) ③ 코드 로직 결함.
- 환경 의심은 점검 후보에서 영구 제외한다. "재시작"·"새로고침"·"캐시"·"새로 로드"라는 단어가 답변에 나오려 하면 송출을 중단하고 코드 추적으로 돌아간다.

---

## 6. 그록 빌드 CLI가 클로드 훅을 상속 실행하는 문제

그록 빌드(Grok Build CLI, `~/.grok/`, 모델 grok-build)는 Claude Code 호환이라 `~/.claude/settings.json`의 hooks를 **실시간으로 읽어 자기 이벤트마다 실행**한다. 그래서 클로드용 완료 알람(PowerShell SystemSounds + MessageBox)이 그록 세션에서도 울렸다. 그록은 멀티에이전트라 `Notification` 이벤트가 잦아 한 작업에 열댓 번 발동했다.

**해결 3종(적용 완료)**
1. `~/.claude/settings.json`의 알람 훅 이벤트를 `Notification` → `Stop`으로 바꾸고 `async:true`를 준다. Notification은 알림마다, Stop은 턴 종료 1회다. 클로드·그록 양쪽에서 남발이 1회로 줄었다.
2. 훅 명령 맨 앞에 가드 `if ($env:GROK_HOOK_EVENT) { exit };`를 넣는다. 그록은 훅 실행 시 자식 프로세스에 `GROK_HOOK_EVENT`를 넘기지만 클로드는 안 넘긴다. → **그록에선 즉시 종료(무음), 클로드에선 정상 알람.** 이게 핵심 방어선이다.
3. `~/.grok/config.toml`에 `[compat.claude] hooks = false`(보조). **주의: 이 설정은 실제로 반영되지 않는다.** `grok inspect`는 "hooks OFF (config)"로 표시하지만 `grok inspect --json`의 로드된 hooks에는 여전히 `source:{type:user, path:~/.claude}` command 훅이 살아 있다. 그록 쪽 버그·불일치다. config만 믿지 말고 실제 차단은 2번 env 가드로 한다.

**실측 확인(중요)**: 그록은 훅 실행 시 자식 프로세스에 `GROK_HOOK_EVENT`(예 session_start/stop), `GROK_HOOK_NAME`, `GROK_SESSION_ID`, `GROK_WORKSPACE_ROOT`를 실제로 넘긴다. 다만 **그록은 세션을 열 때 훅을 1회만 읽고 도중에 재읽기하지 않는다.** 그래서 훅을 고쳐도 "이미 켜둔 그록 창"은 옛 훅을 계속 문다. **그록 세션을 완전히 닫고 새로 열어야 반영된다.** "아직도 뜬다"의 진범은 대부분 이 세션 미재시작이다.

**실측 방법**: `~/.grok/hooks/ztest.json`(포맷 `{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"..."}]}]}}`)에 env 덤프 스크립트(`-File ps1`)를 걸고 `grok -p "ok"`를 헤드리스로 실행해 덤프를 확인한다. 끝나면 훅 파일을 삭제한다(SessionStart마다 실행된다). 주의: 클로드 Bash로 grok을 부르면 그록 env에 `CLAUDECODE`·`CLAUDE_CODE_SESSION_ID` 등이 섞여 오염된다(그록이 클로드 자식이라). 실사용 터미널엔 없다.

**진단 도구**: `grok inspect --json`이 로드된 hooks의 event·target·source.path를 모두 보여준다(사람용 `grok inspect`는 목록만). 상주 프로세스는 `grok leader list`(보통 없다). 그록은 `~/.claude/settings.json`뿐 아니라 `~/.cursor/hooks.json`, `~/.grok/hooks/*.json`, 클로드 플러그인 hooks까지 스캔한다.

**부수 정보**: 슈퍼그록($30)만으로 grok-build가 정상 동작한다(헤비 불필요). 구버전(0.2.32)은 로그인 인식 실패로 free 티어를 오표시하니 `grok update`로 최신화한다.

---

## 7. 작업 발주 전 모델 상태 점검

유저는 일을 맡기기 전에 모델이 평소 성능을 낼 상태인지 파악하려 한다(2026-07-20 명시 요구). 착수 전 점검 순서다.

1. `/effort` — **실제 성능 레버**다. low/medium/high/xhigh/max. 세션 기본값은 `~/.claude/settings.json`의 `effortLevel`, 환경변수는 `CLAUDE_CODE_EFFORT_LEVEL`. 어려운 작업 전에 high 이상인지 확인한다.
2. `/context` — 점유율과 항목별 토큰 분해. 대화가 찰수록 정확도·회상이 떨어진다(context rot).
3. `/status` · `/model` — 실제 구동 모델. fallback은 `--fallback-model`/`fallbackModel`이 설정된 경우에만 발생하고 **발생한 뒤에야 표시**된다(사전 예고 없음).
4. `/usage` — 한도 진행률. 초과하면 전 모델이 차단된다.
5. `/fast` — 켜면 최대 2.5배 빠르고 **품질은 동일**하다(모델 불변). Opus 전용이며 성능 저하 원인이 아니다.

**자동 압축은 끌 수 없다.** 임계값만 조절한다 — `CLAUDE_CODE_AUTO_COMPACT_WINDOW`(토큰), `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`(1~100%). 사실상 비활성화하려면 window를 매우 크게 잡는다. 기본은 최대 컨텍스트의 80%다.

기타 진단: `/doctor`(설정 검증), `/debug`, `claude --safe-mode`(CLAUDE.md·스킬·MCP를 제외한 최소 모드로 원인 격리).

서비스 장애는 status.claude.com에서 확인한다(구 status.anthropic.com에서 리다이렉트). 단 **품질 저하는 공지 항목에 없다** — 오류율만 공지된다.

체감 성능 저하의 원인은 대개 서비스가 아니라 effort 설정·컨텍스트 상태·근거 미확인 습관이다.

---

## 8. CLI 대량 배치(claude·codex) 함정 (2026-07-22)

**codex가 프로젝트 스킬을 못 읽으면 exec 전체가 죽는다.** `.agents/skills/*/SKILL.md` 맨 앞에 BOM(U+FEFF)이 있으면 `failed to load skill` → exit 1. 스킬과 무관한 배치 작업까지 전부 실패한다. 파일 저장 도구에 따라 BOM이 끼어들 수 있으니, codex 배치가 이유 없이 죽으면 스킬 파일들의 첫 바이트부터 본다.

**claude -p 헤드리스 대량 배치는 동시 실행 수가 수명이다.** 동시 5~8로 수백 건을 돌리면 어느 순간 `exit 1`(stderr 빈 문자열)이 수십 건 연쇄한다. 처리 완료 로그(done.log)를 남겨 `--resume`으로 이어붙이는 구조를 반드시 갖추고, 연쇄 실패가 시작되면 동시 수를 3까지 낮춰 재개한다. 실측: 1,692건 배치에서 conc 5 → 354건 연쇄 실패, conc 3 재개 → 무실패 완주.

**WDQS(위키데이터 질의 서비스)는 산발적으로 502를 뱉는다.** 대량 배치 중 한 번은 맞는다고 보고 3회 백오프 재시도를 기본으로 깐다. 요청 간 1.1초 간격 + User-Agent 명시는 예의이자 차단 방지다.

---

## 9. RPC가 에러 없이 0행을 준다 — RLS × SECURITY INVOKER (2026-07-27)

**증상**: 서비스에서 어떤 구획이 아예 그려지지 않는다. 에러 로그도 없고, MCP·SQL 편집기에서 같은 RPC를 돌리면 정상 개수가 나온다.

**원인**: RPC가 `SECURITY INVOKER`(Postgres 기본값)면 함수 본문이 **호출자 권한으로** 테이블을 읽는다. 그 안에서 참조하는 테이블이 **RLS 켜짐 + 정책 0건**이면 anon은 한 행도 못 읽고, `join`이 걸려 있으니 결과가 조용히 0행이 된다. **권한 오류가 아니라 빈 결과**라 `const { data } = await supabase.rpc(...)`의 에러 검사로도 절대 안 잡힌다. MCP·SQL 편집기는 RLS를 우회하는 역할로 붙기 때문에 "DB에는 데이터가 있다"는 확인이 아무 의미가 없다.

**실측 사례**: `get_celebs_trending`(탐색 허브 「요즘 많이 본 인물」)이 `celeb_views_daily`를 읽는데 그 테이블은 RLS 켜짐·정책 0건이었다. 형제 함수 `increment_celeb_view`·`get_trending_celebs`는 이미 `SECURITY DEFINER`인데 이 함수만 빠져 있었다. anon 0행 → 구획 미출력 → 목차 항목만 남아 눌러도 반응 없음.

**진단 절차** (추정 말고 이걸 돌린다)
```sql
-- ① 호출자 역할로 재현
set local role anon;  select count(*) from <rpc>(...);
-- ② 함수의 보안 모드
select proname, prosecdef from pg_proc where proname = '<rpc>';
-- ③ 본문이 읽는 테이블의 RLS·정책 수
select c.relname, c.relrowsecurity,
  (select count(*) from pg_policies p where p.tablename = c.relname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in (...);
```

**해법**: 집계·공개 목적의 읽기 전용 함수는 `SECURITY DEFINER` + `SET search_path TO 'public'`으로 통일한다. 원시 테이블에 anon 읽기 정책을 여는 쪽보다 노출면이 좁다. 같은 테이블을 읽는 형제 함수들의 보안 모드를 먼저 확인하고 규격을 맞춘다.

**고친 뒤 서비스에 안 보이면 캐시다**: `unstable_cache`가 0행 결과를 이미 물고 있다. `/api/revalidate`에 해당 태그(`celebs` 등)를 던져 비운다.

**따라오는 UI 규칙**: 데이터가 비면 접히는 구획이 있는 화면에서, 목차와 구획 번호는 **실제로 그려진 구획**에서만 유도한다. 정적 목록에서 뽑으면 접힌 구획이 목차에 남아 눌러도 아무 일이 없고 번호도 어긋난다(`sw/web/src/components/shared/hubSectionUtils.tsx`의 `hubSection`·`hubNavItems`가 이 계약을 쥔다).
