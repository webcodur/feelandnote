# 인물 아바타 — 제작 인수인계

아바타가 없는 인물 468명의 정사각 얼굴 사진을 만드는 일의 실행서다. 생성기는 처음에 Grok, 지금은 **Gemini(Aside 브라우저 멀티계정)**가 주력이다. 이 문서는 **한 명을 어떻게 뽑는지와 어디까지 왔는지**를 적는다. 사진이 어떤 모습이어야 하는지(프레임, 머리 설계 원칙)는 룰북 [`brief-rules.md`](../../../data/celeb/hero-photo/brief-rules.md)를 따르고, 아바타 다음 단계인 화보는 [`hero-photo.md`](hero-photo.md)를 따른다.

명령은 모두 `sw/web-bo`에서 실행한다.

## 실행 환경

**로그인된 grok.com을 조작할 수 있는 브라우저 자동화면 무엇이든 된다.** 로그인 대행은 금지 영역이라, 사용자가 로그인해 둔 브라우저에 붙는 도구만 쓴다.

- **Aside** — `mcp__aside__repl`(MCP는 호출 사이에 REPL 스코프가 이어진다) 또는 `aside repl`(한 호출 = 새 세션이라 탭 열기부터 추출까지 한 호출에 넣는다). 제어법은 `aside-browser` 스킬이 쥔다.
- **claude-in-chrome** — 사용자 Chrome에 붙는다.

꾸러미(`.tmp/grok-queue/<slug>.json`)의 `seed`는 원본 얼굴 재료 경로(`hero-batch.json`의 `facePath`, `D:\image\_재료\지정\…`)를 그대로 가리키는 것이 원칙이다.

- **Aside**: repl 샌드박스가 세션 폴더(`pwd`로 확인, `C:\Users\webco\.aside\u\0\sessions\<세션>`) 밖의 파일을 읽지 못한다. 씨앗을 `<세션>/seeds/seed-<slug>.png`로 복사해 그 경로를 `setInputFiles`에 넣는다. 결과 이미지도 `fetch`(쿠키 동봉)로 받아 `<세션>/out/<slug>.jpg`에 쓴 뒤 저장 스크립트에 넘긴다.
- **claude-in-chrome**: `file_upload`가 세션에 공유된 폴더만 받는다 — 씨앗을 그 세션 scratchpad로 복사해 넣는다.
- 이외의 도구는 `seed` 경로를 file input에 그대로 넣는다.

## 지금 어디까지 왔나 (26.09.20)

**26.09.22 갱신 — 3·4차 사용자 검수 라운드 진행 중.** 최신 브리핑은 `D:\image\_avatar-work\avatar-handoff.md`가 쥔다. 요지: 지적 94명 중 복원 29·기하교정 7 해결, 나머지는 재생성 관리. 그록 레인으로 32건을 만들었으나 사용자가 「재편이 아니라 폴리시」로 반려 — 검토 결과(`regen-queue/grok-review-result.json`) 승인 5·반려 27. 스테이징은 그록 이전 상태로 복귀 완료(originals 461·reframe-all 459). 다음 작업은 위임 7건 고증 검증 → 반려건 재편 발주(웹 ChatGPT 우선).

**468/468명 전원 아바타 정규화 완료.** `D:\image\_avatar-work\avatars\`에 1024×1024 jpg로 있다. 남은 일은 **서비스 등록**(celeb-avatar-register 스킬)뿐이다.

- **결함 유니온 245명 전면 재생성·적용** — 금형(AI 디폴트 얼굴 수렴) 147 + 클로즈업 91 + 씨앗 불일치·중복쌍·개별결함 합집합. 원장 `regen-queue/rework-ledger.json` 전원 `applied-r2`.
- **슬롭 원인** — 씨앗 은행의 스튜디오·디폴트 얼굴이 공급원. 69명 씨앗 교체(`newSeed`), 나머지는 동일 씨앗 재부착으로 해소. 생성기는 씨앗을 따르되, 슬롭 씨앗이면 슬롭이 나온다.
- **프롬프트** — 「무엇을 만들지」만 적은 4행 간결판 채택. 약력 통째·금지조항 나열은 문자 아티팩트와 역할 붕괴를 부른다.
- **생성 채널** — Aside u2 계정 Gemini 웹, `tools/gen-u2.js`+`gen-u2.sh` 단일호출 레인(제출·폴링·회수 일체형). Aside repl은 호출마다 새 세션을 만들고 탭이 지속되지 않으므로 회수를 같은 호출 안에서 끝낸다. `setInputFiles`·`fs`는 세션 디렉터리 샌드박스라 고정 스테이징 세션에서 복사해 쓴다.
- **검수** — 육안 합격 + SFace 임베딩(씨앗 대조·쌍별 중복>0.7 경보). 최종 468장 재임베딩 `avatar-emb2.npz`, >0.68 쌍 21건 전수 육안 재심 — 진짜 중복 1건(눌도륙=아스파루흐 파일 동일)만 재생성으로 해소.
- **판정 원칙** — 시드 대조·합격 판정은 **반드시 실제 이미지를 열어 보고** 내린다. 컨텍스트 trailing-image cap으로 이미지가 빠진 채 「보았다」고 보고한 사고가 있었다(전욱·축융 재확인으로 교정). 320px 시트 타일의 민족·성별 판독은 오탐이 많아 의심분은 확대 재심이 필수다.
- **아테나/헤라 기준 2차 재점검·교정 (26.09.20)** — 매끈한 스튜디오 초상·성숙한 연령대(창조신·모친 계열도 임종급 노인 금지)·시멘트 피부 금지가 새 기준. 지적 9명 + 재검 확정 11명 = **20명 재생성 적용**(지타는 사슴 모자 씨앗이 출력을 지배해 씨앗 교체로 해결). 미사용 씨앗은 `harvest/` 136면(Pinterest 수확+YuNet 크롭, `tools/harvest.py`)에서 충당 — **기배정 씨앗 재사용 금지**. 노아처럼 노년이 정체 자체인 인물만 노년 도상 유지.

## 작업 기반의 자리

`.tmp`는 언제든 지워질 수 있다. 살아야 하는 것은 전부 `D:\image\_avatar-work\`에 있다.

| 것 | 자리 |
|---|---|
| 완성 아바타 468장 | `D:\image\_avatar-work\avatars\<국문명>.jpg` |
| ✦ 소거 전 원본 | `D:\image\_avatar-work\avatars-prestar\` |
| 배정 원장(468명) | `D:\image\_avatar-work\hero-batch.json` — `.tmp/hero-batch.json`에 복사해 쓴다 |
| 발주서 데이터 | `D:\image\_avatar-work\brief-targets.json` — `.tmp/brief-targets.json`에 복사해 쓴다 |
| 프롬프트 원문 192건 | `D:\image\_avatar-work\prompts\` — 생성기 출력 예시 |
| 도구 | `D:\image\_avatar-work\tools\` — 검수 시트·표준 크롭·Gemini REPL 코드·원장 재구축 스크립트 |
| 씨앗 원본 | `D:\image\_재료\지정\<버킷>\` — 파일명이 곧 배정이다 |

`hero-batch.json`·`brief-targets.json`이 다시 필요하면 `tools/rebuild-ledgers.mjs`가 씨앗 파일명과 `celebs` 테이블을 이어 재생한다(DB 조회는 페이지를 나눠 전체 행을 가져온다).

## Gemini 레인 운용 (현 주력)

Grok 무료 한도가 소진돼 **로그인된 Gemini를 Aside 브라우저로 돌리는 것이 주 경로**다. 한 브라우저 프로필에 구글 계정 여러 개가 멀티로그인돼 있어 `/u/<번호>` 경로로 계정을 나눠 쓴다 — 26.09.18 시점에 u0 브라우저에서 webcodur5(`/u/2`)·webcodur6(`/u/3`)·webcodur(`/u/5`)가 정상이었고 webcodur3(`/u/0`)은 한도 소진, webcodur4(`/u/1`)는 접근 오류였다. **번호는 로그인 순서라 바뀔 수 있다** — `Google 계정:` aria-label 버튼의 텍스트로 계정을 확인한다.

준비와 발주·회수 코드는 `D:\image\_avatar-work\tools\gemini-lane.js`에 통째로 있다. 요지:

1. **파일은 세션 폴더 안에 있어야 한다.** repl의 `pwd`가 `C:\Users\webco\.aside\u\<프로필>\sessions\<세션>`이고 그 밖의 경로는 `setInputFiles`가 거부한다. 씨앗은 `artifacts/seeds/<slug>.png`, 프롬프트는 `artifacts/<slug>.txt`로 복사해 둔다.
2. **업로드는 「업로드 및 도구 → 파일 업로드」를 눌러 숨은 `input[type=file]`을 만든 뒤 setInputFiles한다.** accept 목록에 이미지가 없어도 프로그래매틱 설정은 통한다. 첫 업로드 계정에서는 「이미지 및 파일에서 콘텐츠 생성」 동의 대화상자가 뜨니 「동의」를 누른다.
3. **프롬프트는 `fill()`로 넣고 Enter로 보낸다.** 채팅 주소가 `/app/<id>`로 바뀌면 발주 성공이다.
4. **결과는 60~90초 뒤 `img.naturalWidth>=1024`로 뜬다.** 회수는 **canvas 추출로 세션 artifacts에 `gen-<slug>.png`로 직접 쓰는 `extractGen(slug)`**(26.09.19부터). 라이트박스 다운로드 버튼 방식은 파일명 랜덤+레인 간 뒤섞임이 재발해 폐기했다. 캔버스 오염 시 같은 탭에서 `fetch(img.src)`→arrayBuffer로 우회한다.
5. **여러 레인을 동시에 돌린다.** `/u/2`·`/u/3`·`/u/5`에 각각 새 탭을 열어 발주하면 3장이 병렬로 나온다.
6. **파일명을 slug로 직접 쓰므로 뒤섞임은 없어졌다** — 그래도 저장 전 씨앗과 얼굴 대조는 그대로 한다. 옛 다운로드 방식에서는 보치카·데게이가 클릭 순서와 뒤바뀌어 내려온 사고가 있었다.
7. **결과 우하단에 별 모양 마크가 자주 박힌다.** 표준 크롭 `extract({left:0,top:60,width:850,height:850}).resize(1024)`으로 우측 열을 잘라 제거한다. 별이 얼굴·세부 위에 걸쳐 크롭으로 못 지우면 같은 채팅에 재요청한다.
8. 계정 한도가 차면 다른 `/u/N`으로 넘긴다 — 멀티로그인 계정 전부를 열거해 정상인 레인만 쓴다.
9. **세션 폴더가 세션마다 바뀐다.** `pwd`를 매번 확인하고 씨앗·프롬프트를 그 세션 artifacts로 다시 복사한다 — 옛 세션 경로를 넣으면 `setInputFiles`가 거부한다.
10. **첫 업로드 때 「권리 확인」 대화상자가 뜬다.** 확인을 누르지 않으면 전송 버튼이 잠긴다. 전송 버튼이 disabled로 남으면 입력창에 input 이벤트를 다시 발생시킨다.
11. **REPL 최상위 스코프가 호출 사이에 이어진다.** 같은 이름 재선언은 오류니 고유 이름이나 top-level await를 쓴다. 무응답이면 스코프가 초기화된 것 — `gemini-lane.js`를 다시 붙여 넣는다. `Aside isn't running`이면 브라우저를 재기동한다.
12. **참조 이미지가 2장이면** `setInputFiles([경로1, 경로2])`로 함께 넣는다(홍길동의 얼굴 씨앗+복식 참조가 이 방식).
13. **반복 아티팩트의 원인은 대개 프롬프트 본문이다.** 「명궁·활의 명수」가 들어가면 무기가 매번 나오고(이봉학 3회), 직함이 「왕」이면 예복이 나온다(홍길동). 본체가 비인간인데 「A man in his…」 절이 있으면 사람이 나온다(파뜨렐겐). **직함·본체 문구를 고친 새 채팅이 같은 채팅 재요청보다 빠르다.**

### 이전 기록 (26.09.17)

**92/468명.** 결과는 `.tmp/hero-out/_avatars/<국문 이름>.jpg`에 있다.

| 묶음 | 수 | 비고 |
|---|---:|---|
| DB에 원래 있던 아바타 | 41 | 사용자가 만들어 둔 것이다. 격자 검수를 통과했다. `acamapichtli`는 새로 만든 판보다 DB 판(아즈텍 깃털 머리장식)이 나아 DB 판을 썼다 |
| 옛 프롬프트로 만든 Grok 판 | 39 | 머리쓰개를 의무로 두고 대안 목록을 주던 시절의 결과다. **참고 자산이며 재생성 대상이 아니다** — 얼굴이 고대인답고 머리띠가 난립하지 않으면 그대로 둔다(26.09.17 지시) |
| 현행 프롬프트로 만든 Grok 판 | 12 | 아야르 카치, 아야르 우추, 바추에, 아야르 아우카, 배돌석, 아리스토데모스, 발람 아캅, 발람 키체, 발라 파세케 쿠야테, 죽왕, 바따라 구루, 바토스 1세 |

옛 프롬프트 39명: `aaron abhiraja abraham acca-larentia achaeus adnan aegyptus aeolus-2 agasu agenor ainurakkur aio aitor aji-saka alan-gua alasha-khan albanactus almos alp-er-tunga alpyeong alulim amamikyo amergin-gluingel amphion amulius an-dương-vương angul aram archias arnold-von-melchtal ashina asterion au-cơ avitohol awang-alak-betatar bayajidda bu-eulla degei fekulen`

### 재개는 이 순서로 (해결됨 09-18)

468명 전원 완성본이 `D:\image\_avatar-work\avatars\`에 들어갔다. 재생성이 필요하면 위 「Gemini 레인 운용」과 `regen-queue/`의 프롬프트를 쓴다.

### 판정 기준 (26.09.17 사용자 정리)

- **단색 배경은 괜찮다.** 중요한 것은 수염·머리 모양이 그 시대·그 문화 사람의 것인가다.
- 피부가 매끈한가가 아니라 **하나의 배역을 맡을 수 있는 특정한 얼굴인가**가 기준이다.
- 옛 실패의 본질은 "시멘트에 얼굴을 갈아버린 듯한" 질감이었다 — 그런 궤로 돌아가면 실패다.
- 바이아메는 만든다 — 이름 제약을 이유로 한 보류를 26.09.17에 해제했다.

### 사용자 결정 대기 (09-18 소멸)

머리 시험 6명(아비토홀·아람·아르놀트·아르키아스·암피온·어우꺼)의 `_ab/`·`_ab2/` 시험판과 비교판은 `.tmp` 삭제로 소멸했다. `_avatars`에는 옛 판이 그대로 들어가 있다. 다시 시험하려면 프롬프트를 고쳐 여섯 명을 다시 뽑으면 된다.

### 현행 프롬프트에서 더 볼 것

머리 시험 11장은 모두 맨머리였다. 그 뒤 잉카 형제(아야르 카치, 아야르 우추)는 굵게 땋은 머리띠 야우투를 썼다. 머리를 가리던 문화에서는 머리쓰개가 나온다는 신호로 보인다. 조선 인물(배돌석)에서는 상투와 망건이 「이마에 얇은 띠를 두르지 않는다」는 문장과 부딪치는지 본다.

## 폴더 (작업 시점의 `.tmp` — 사라지면 `D:\image\_avatar-work\`에서 복원)

| 자리 | 내용 |
|---|---|
| `.tmp/brief-targets.json` | 대상 468명의 DB 정보(이름·직함·한 줄 정의·약력) |
| `.tmp/hero-batch.json` | 성별·나이대·체구·원본 씨앗 경로(`facePath`) |
| `.tmp/grok-queue/<slug>.json` | 꾸러미 `{slug, nickname, seed, prompt}` |
| `.tmp/hero-out/_avatars/` | 완성본. 여기 있으면 `--next`가 완료로 본다 |
| `.tmp/hero-out/_redo/` | 버린 판(세로, 흑백, 옛 판). 사용자가 비교하므로 지우지 않는다 |

파일 이름은 꾸러미의 `nickname`(국문 이름)이다. 사용자가 탐색기에서 이름으로 찾아본다. 대상 468명 안에서 국문 이름이 겹치거나 파일 이름에 못 쓰는 글자가 든 경우는 없다.

## 준비

1. **브라우저** — 로그인된 grok.com을 위 도구로 연다.
2. **DB 대조** — 큰 배치를 돌리기 전에 `node .tmp/check-existing-avatars.mjs`로 DB에 이미 `avatar_url`이 있는 인물을 확인한다. `--next`는 로컬 폴더만 본다.
3. **꾸러미** — `node scripts/photo/grok-avatar-prompt.mjs --next 5`로 만들거나 slug를 직접 준다. 보내 놓고 아직 저장하지 않은 인물도 `--next`에 다시 나오므로, 여러 명을 이어 보낼 때는 slug로 지정한다.

## 한 명을 뽑는 순서

**스크린샷을 찍지 않는다.** 한 장이 토큰을 크게 먹어 수백 명을 돌지 못한다. DOM만 읽는다.

**1. 새 채팅을 연다.** `https://grok.com/`에 간다. 인물마다 새 채팅이다. 한 채팅에서 이어 만들면 앞 인물의 맥락이 섞인다.

**2. 씨앗을 붙인다.** file input을 찾아 꾸러미의 `seed` 경로를 넣는다(Playwright라면 `locator('input[type=file]').setInputFiles(seed)`).

**3. 프롬프트를 넣는다.** 꾸러미의 문자열을 `node -e "console.log(JSON.stringify(require('./.tmp/grok-queue/<slug>.json').prompt))"`로 꺼내 그대로 붙인다. **타이핑하지 않는다.** 입력창이 ProseMirror라 타이핑 액션이 공백을 전부 삼킨다.

```js
const ed = document.querySelector('[contenteditable="true"].ProseMirror')
ed.focus()
document.execCommand('selectAll', false, null)
document.execCommand('delete', false, null)
document.execCommand('insertText', false, PROMPT)
```

**4. 다음 호출에서 보낸다.** 보내기 버튼은 글자가 들어간 뒤에 그려진다. 글자를 넣은 호출 안에서 찾으면 `null`이 나온다.

```js
document.querySelector('[contenteditable="true"].ProseMirror').closest('form').querySelector('button[type="submit"]').click()
```

몇 초 뒤 주소가 `/c/<채팅 id>`로 바뀐다. 그 주소를 적어 둔다.

**5. 150초 기다린다.** 백그라운드 대기를 걸고, 끝나면 이어 간다. 탭을 붙들고 폴링하지 않는다.

**6. 채팅을 다시 불러와서 판정한다.** 자동화 탭은 백그라운드(`document.visibilityState === 'hidden'`)라 브라우저가 화면 갱신을 멈춘다. 서버에서 이미지가 끝났어도 탭에는 설명 문장만 있거나 「작업 중」 시계가 멈춰 있다. 26.09.13에 이것을 「Grok 장애」로 읽고 네 명을 열네 번 다시 보냈는데, 채팅을 다시 불러오니 전부 첫 시도에서 나와 있었다. 적어 둔 주소로 다시 연 뒤 이것을 실행한다.

```js
await new Promise(r => setTimeout(r, 5000))
const busy = [...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === '모델 응답 중지')
const dl = [...document.querySelectorAll('button[aria-label="다운로드"]')]
if (!busy && dl.length) dl[dl.length - 1].click()
JSON.stringify({ busy, dl: dl.length })
```

- `busy`가 `true`면 아직 조사 중이다. 더 기다린다.
- `dl`이 1 이상이면 끝났고 마지막 이미지를 눌렀다. 재요청을 보낸 채팅은 이미지가 여럿이라 마지막 것이 최신이다.
- 둘 다 아니면 실패다. 새 채팅으로 다시 보낸다.

다운로드 아이콘은 첫 클릭이 자주 먹지 않으니 JS로 누른다. 이미지 URL을 인증 없는 `curl`로 받으면 실패하고, base64로 꺼내면 100만 자가 대화에 들어온다 — **도구의 `fetch`(쿠키 동봉)나 페이지 안 fetch로 받아 파일로 쓰는 쪽이 낫다.**

**7. 저장한다.** 받은 파일 경로를 그대로 넘긴다.

```bash
node scripts/photo/grok-avatar-save.mjs <slug> <받은 파일 경로>
```

중복 해시와 가로세로를 재서 `_avatars/`(정사각) 또는 `_redo/`(세로)로 옮긴다. 다운로드 폴더에 떨어지는 흐름이라면 옛 방식 `bash scripts/photo/grok-avatar-save.sh <slug> <기준 파일명>`도 쓸 수 있다 — 그 경우 클릭이 먹지 않아 옛 파일을 집는 사고(아카마피치틀리, 퍼쿨런)가 있었으니 출력의 `DUP`/`NONE`을 꼭 본다.

**8. 한 장 열어 본다.** 결과를 열고 아래 「눈으로 볼 것」을 짚는다.

## 동시에 돌리기

- 탭은 두 개, 생성 중인 채팅은 세 개까지 둔다. 주소를 적어 둔 채팅은 탭을 다른 채팅으로 옮겨도 서버에서 계속 만들어진다.
- **내려받기는 한 번에 한 명씩 한다.** 두 채팅에서 연달아 받으면 어느 파일이 누구 것인지 알 수 없다. 저장 출력을 받은 뒤 다음 채팅으로 간다.
- 시스템 메모리 경고가 뜬 뒤 백그라운드 대기가 죽은 적이 있다. 쓰지 않는 탭은 닫는다.

## 결과별 대응

| 저장 출력·증상 | 대응 |
|---|---|
| `OK … (1408x1408)` | 한 장 보고 다음 인물로 간다 |
| `VERTICAL … (784x1168)` | `_redo/<국문 이름>-세로-<원본>.jpg`로 간다. **같은 채팅에** 아래 재요청 문장을 보내고 판정·저장을 다시 한다 |
| `DUP` | 내려받기가 먹지 않아 옛 파일이 잡혔다. 판정부터 다시 한다 |
| `NONE` | 파일이 없다. 다시 받고, 그래도 없으면 판정 코드부터 다시 한다 |
| 「작업 중」이 10분을 넘긴다 | 그 채팅을 버리고 새 채팅으로 다시 보낸다. 다시내면 대개 20초 안팎에 끝난다. 알프 에르 퉁가는 14분, 어우꺼는 11분에서 버렸다 |
| 흑백으로 나온다 | `_redo/<국문 이름>-흑백-<원본>.jpg`로 옮기고 새 채팅으로 다시 보낸다 |
| 「이미지 생성 한도 도달」이 뜬다 | 무료 이미지 생성 횟수 소진이다. 재시도해도 같은 문구만 나온다. 몇 시간 뒤 회복되니 미결 목록을 적어 두고 멈춘다(26.09.17에 7명 완성 뒤 도달) |

정사각 재요청 문장이다. 아야르 카치가 이것으로 1408×1408로 다시 나왔다.

```
Keep this exact portrait — the same person, face, hair, clothing, lighting and background — and output it again as a square 1:1 image instead of a vertical one. Same framing rule: the bottom edge just above the collarbones, about one head of empty space above the head.
```

### 구도·자세가 어색한 컷의 재요청 기준

얼굴이 한쪽만 보거나 시야 구도가 어색하면 같은 채팅에 아래 기준으로 고쳐 달라 한다(사용자 지시서 `얼굴.txt`에서 옮김).

- 정수리까지 다 보이게 — 머리 위에 머리 하나 분량의 여백
- 정면샷·정면 시선 구도
- 인물이 너무 푸짐하게 나오지 않게
- 원본 얼굴의 골격과 복식은 존중
- 손이 올라가 있으면 내려서 안 보이게
- 1:1, 고해상도 풀칼라
- 얼굴에 자연광과 음영
- 여신은 미모를 살리되, 나이든 여신은 성숙한 얼굴형으로 — 늙게 그리지 않는다

세로 판은 처음 30장 중 5장이었고, 현행 프롬프트로 바꾼 뒤 약 3분의 1로 늘었다. 씨앗은 전부 800×800이라 씨앗 비율 탓이 아니다. 잘라 쓰면 800 규격에 못 미치고 머리나 턱이 잘리므로 재요청한다.

채팅 제목은 판정 근거가 아니다. 베트남 인물 어우꺼의 채팅 제목이 「Korean」으로 붙었지만 이미지는 제대로 나왔다.

## 눈으로 볼 것

- 씨앗의 현대식 머리(가르마, 볼륨, 광택)나 수염 손질이 남았는가
- 머리쓰개가 몇 가지(후드, 잎관, 감싼 천) 안에서 돌려 쓰이는가. 반대로 머리를 가리던 문화에서도 맨머리로 나오는가
- 목걸이가 기본값처럼 붙는가
- **하나의 배역을 맡을 특정한 얼굴인가** — 배경 단색은 상관없고, 누구나 될 수 있는 매끈한 얼굴이면 실패다
- 이마에 얇은 띠를 둘렀는가
- 얼굴이나 머리쓰개가 잘렸는가. **잘림만 실패다.** 머리 위 여백이 인물마다 다른 것은 승인 범위다

세로와 흑백은 바로 다시 뽑는다. 같은 증상이 여러 인물에서 쌓이면 프롬프트 문제다.

## 프롬프트를 고칠 때

- 문구는 `scripts/photo/grok-avatar-prompt.mjs` 한 곳에서 고친다.
- 결과가 한쪽으로 쏠려도 금지문을 더하지 않는다. 목록, 예시, "다수는 이랬다" 같은 기울이는 말을 넣으면 모델이 그 말을 그대로 따라간다. 무엇을 넣어 어떻게 쏠렸는지는 룰북 「두 단계로 만든다」의 마지막 문단에 있다.
- 바꾸면 문화가 서로 다른 인물 여섯 명쯤으로 먼저 시험한다. 결과는 `_ab<n>/`에 두고, 한 장에 붙인 비교판으로 옛 판과 나란히 본다.

## 끝나면

1. 검수와 등록은 [`hero-photo.md`](hero-photo.md)의 2단계를 따른다.
2. Grok 조작 기법(입력, 보내기, 판정, 내려받기)은 [`image-generation.md`](../../project/production/image-generation.md)로 옮기고 이 문서를 지운다.
