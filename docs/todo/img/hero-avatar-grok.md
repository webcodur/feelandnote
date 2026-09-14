# 인물 아바타 — Grok 제작 인수인계

아바타가 없는 인물 468명의 정사각 얼굴 사진을 Grok 웹으로 만드는 일의 실행서다. 이 문서는 **한 명을 어떻게 뽑는지와 어디까지 왔는지**를 적는다. 사진이 어떤 모습이어야 하는지(프레임, 머리 설계 원칙)는 룰북 [`brief-rules.md`](../../../data/celeb/hero-photo/brief-rules.md)를 따르고, 아바타 다음 단계인 화보는 [`hero-photo.md`](hero-photo.md)를 따른다.

명령은 모두 `sw/web-bo`에서 실행한다.

## 실행 환경

브라우저에 AI가 탑재된 에이전트(Aside)가 이 일을 맡으면 grok.com을 **직접** 연다. claude-in-chrome, obscura, 로컬 LLM으로 우회하지 않는다. 씨앗은 세션 scratchpad로 복사하지 않고 꾸러미의 `seed` 경로를 파일 입력에 그대로 넣는다. 채팅을 열고, 이미지를 보내고, 내려받아 저장하는 것까지 그 브라우저에서 끝낸다.

Claude Code + `claude-in-chrome`으로 돌릴 때는 아래 「준비」와 「한 명을 뽑는 순서」를 그대로 쓴다.

## 지금 어디까지 왔나 (26.09.14)

**83/468명.** 결과는 `.tmp/hero-out/_avatars/<국문 이름>.jpg`에 있다.

| 묶음 | 수 | 비고 |
|---|---:|---|
| DB에 원래 있던 아바타 | 41 | 사용자가 만들어 둔 것이다. 격자 검수를 통과했다. `acamapichtli`는 새로 만든 판보다 DB 판(아즈텍 깃털 머리장식)이 나아 DB 판을 썼다 |
| 옛 프롬프트로 만든 Grok 판 | 39 | 머리쓰개를 의무로 두고 대안 목록을 주던 시절의 결과다 |
| 현행 프롬프트로 만든 Grok 판 | 3 | 아야르 카치, 아야르 우추, 바추에 |

옛 프롬프트 39명: `aaron abhiraja abraham acca-larentia achaeus adnan aegyptus aeolus-2 agasu agenor ainurakkur aio aitor aji-saka alan-gua alasha-khan albanactus almos alp-er-tunga alpyeong alulim amamikyo amergin-gluingel amphion amulius an-dương-vương angul aram archias arnold-von-melchtal ashina asterion au-cơ avitohol awang-alak-betatar bayajidda bu-eulla degei fekulen`

### 멈춘 자리 — 재개는 이 순서로

사용자 지시로 전송을 멈췄다.

1. **아야르 아우카** — 세로로 나온 채팅 `https://grok.com/c/89920534-2d56-4dfd-827b-b8f149577c1a`에 정사각 재요청을 보냈고, 결과는 아직 받지 않았다. 그 채팅을 다시 불러와 판정하고 저장한다. 버린 세로 판은 `_redo/아야르 아우카-세로-bG4qv.jpg`다.
2. **배돌석** — 꾸러미(`.tmp/grok-queue/bae-dol-seok.json`)만 만들었고 보내지 않았다.
3. **아리스토데모스** — 세로로 두 번, 흑백으로 한 번 나왔다. 새 채팅으로 다시 보낸다.
4. 그다음은 `--next`로 이어 간다. 다음 순번은 발람 아캅, 발람 키체, 발라 파세케 쿠야테다.

마지막으로 저장한 다운로드 파일은 `DqPiC.jpg`다. 다음 저장의 기준 파일로 쓴다.

### 보류

**바이아메**는 약력에 "성인식을 치른 사람만 그 이름을 입에 올린다"고 적힌 인물이다. 살아 있는 호주 원주민 공동체가 지금도 지키는 이름 제약이라, 사실적인 인물 사진을 만들어 공개할지 프로젝트 차원에서 정해야 한다. `--next`는 이 인물을 건너뛴다.

### 사용자 결정 대기

1. **스튜디오 느낌** — 단색 배경, 매끈한 배우 얼굴, 요즘식 화장이 섞여 나온다(앙굴, 아르놀트, 아람, 어우꺼). 비교판은 `.tmp/hero-out/_review-modern-look-5.jpg`다. 프롬프트 끝의 「editorial cover lighting」 문구가 원인으로 의심되지만 아직 바꾸지 않았다. 아야르 우추도 단색 배경으로 나왔다.
2. **옛 프롬프트 39장** — 현행 프롬프트로 다시 뽑을지 정해야 한다.
3. **머리 시험 6명** — 아비토홀, 아람, 아르놀트, 아르키아스, 암피온, 어우꺼의 시험판(`_ab/`, `_ab2/`)을 `_avatars`의 옛 판과 바꿀지 정해야 한다. 비교판은 `.tmp/hero-out/_review-hair-ab2.jpg`다.
4. **바이아메** — 만들지 정해야 한다.

### 현행 프롬프트에서 더 볼 것

머리 시험 11장은 모두 맨머리였다. 그 뒤 잉카 형제(아야르 카치, 아야르 우추)는 굵게 땋은 머리띠 야우투를 썼다. 머리를 가리던 문화에서는 머리쓰개가 나온다는 신호로 보인다. 조선 인물(배돌석)에서는 상투와 망건이 「이마에 얇은 띠를 두르지 않는다」는 문장과 부딪치는지 본다.

## 폴더

| 자리 | 내용 |
|---|---|
| `.tmp/brief-targets.json` | 대상 468명의 DB 정보(이름·직함·한 줄 정의·약력) |
| `.tmp/hero-batch.json` | 성별·나이대·체구·원본 씨앗 경로(`facePath`) |
| `.tmp/grok-queue/<slug>.json` | 꾸러미 `{slug, nickname, seed, prompt}` |
| `.tmp/hero-out/_avatars/` | 완성본. 여기 있으면 `--next`가 완료로 본다 |
| `.tmp/hero-out/_redo/` | 버린 판(세로, 흑백, 옛 판). 사용자가 비교하므로 지우지 않는다 |
| `.tmp/hero-out/_ab/`, `_ab2/` | 머리 프롬프트 1·2차 시험판 |

파일 이름은 꾸러미의 `nickname`(국문 이름)이다. 사용자가 탐색기에서 이름으로 찾아본다. 대상 468명 안에서 국문 이름이 겹치거나 파일 이름에 못 쓰는 글자가 든 경우는 없다.

## 준비

1. **브라우저** — 사용자 Chrome에 로그인된 grok.com을 `claude-in-chrome`으로 조작한다. 다른 브라우저(obscura MCP)는 Grok에 로그인돼 있지 않고, 로그인 대행은 금지 영역이라 쓸 수 없다.
2. **씨앗 경로** — 첨부 도구 `file_upload`는 세션에 공유된 폴더의 파일만 받는다. 그래서 꾸러미 생성기가 원본 씨앗을 세션 scratchpad로 복사한다. **세션이 바뀌면** `scripts/photo/grok-avatar-prompt.mjs`의 `SEED_DIR`을 새 세션의 scratchpad로 고치고 꾸러미를 다시 만든다.
3. **DB 대조** — 큰 배치를 돌리기 전에 `node .tmp/check-existing-avatars.mjs`로 DB에 이미 `avatar_url`이 있는 인물을 확인한다. `--next`는 로컬 폴더만 본다.
4. **꾸러미** — `node scripts/photo/grok-avatar-prompt.mjs --next 5`로 만들거나 slug를 직접 준다. 보내 놓고 아직 저장하지 않은 인물도 `--next`에 다시 나오므로, 여러 명을 이어 보낼 때는 slug로 지정한다.

## 한 명을 뽑는 순서

**스크린샷을 찍지 않는다.** 한 장이 토큰을 크게 먹어 수백 명을 돌지 못한다. DOM만 읽는다.

**1. 새 채팅을 연다.** `navigate`로 `https://grok.com/`에 간다. 인물마다 새 채팅이다. 한 채팅에서 이어 만들면 앞 인물의 맥락이 섞인다.

**2. 씨앗을 붙인다.** `find`로 file input을 찾아 `file_upload`에 꾸러미의 `seed` 경로를 넘긴다. slug에 라틴 기본 글자가 아닌 문자가 있으면 경로를 `\u` 이스케이프로 쓴다(`seed-au-cơ.png` → `seed-au-c\u01a1.png`).

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

**5. 150초 기다린다.** Bash `sleep 150`을 백그라운드로 걸고, 끝났다는 알림이 오면 이어 간다. 탭을 붙들고 폴링하지 않는다. 예약 깨우기(ScheduleWakeup)는 쓰지 않는다. 지난 지시가 사용자 발화처럼 되돌아와 혼선을 줬다.

**6. 채팅을 다시 불러와서 판정한다.** 자동화 탭은 백그라운드(`document.visibilityState === 'hidden'`)라 브라우저가 화면 갱신을 멈춘다. 서버에서 이미지가 끝났어도 탭에는 설명 문장만 있거나 「작업 중」 시계가 멈춰 있다. 26.09.13에 이것을 「Grok 장애」로 읽고 네 명을 열네 번 다시 보냈는데, 채팅을 다시 불러오니 전부 첫 시도에서 나와 있었다. 적어 둔 주소로 `navigate`한 뒤 이것을 실행한다.

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

다운로드 아이콘을 `find`로 찾아 클릭하면 첫 클릭이 자주 먹지 않는다. JS로 누른다. 이미지 URL을 `curl`로 받으면 인증이 없어 실패하고, base64로 꺼내면 100만 자가 대화에 들어온다.

**7. 저장한다.**

```bash
bash scripts/photo/grok-avatar-save.sh <slug> <기준 파일명> [대기초=20]
```

기준 파일명은 **직전에 저장한 다운로드 파일 이름**이다(`DqPiC.jpg`). 스크립트는 기다린 뒤 `Downloads`에서 가장 새 jpg를 골라 기준보다 새 파일인지 보고, 기존 결과와 해시가 겹치는지 보고, 가로세로를 재서 옮긴다. 출력 한 줄에 새 다운로드 파일 이름이 들어 있고, 그것이 다음 기준이 된다.

파일은 누른 뒤 5~15초 만에 무작위 이름으로 떨어진다. 수정 시각만 보고 고르다가 직전 인물의 파일로 덮어쓴 사고가 두 번 있었다(아카마피치틀리, 퍼쿨런). 그래서 기준 파일 비교와 해시 대조를 둘 다 한다.

**8. 한 장 열어 본다.** `Read`로 결과를 열고 아래 「눈으로 볼 것」을 짚는다.

## 동시에 돌리기

- 탭은 두 개, 생성 중인 채팅은 세 개까지 둔다. 주소를 적어 둔 채팅은 탭을 다른 채팅으로 옮겨도 서버에서 계속 만들어진다.
- **내려받기는 한 번에 한 명씩 한다.** 두 채팅에서 연달아 누르면 어느 파일이 누구 것인지 알 수 없다. 저장 스크립트의 출력을 받은 뒤 다음 채팅으로 간다.
- 마지막 탭을 닫으면 탭 그룹이 통째로 사라진다. 사라지면 `tabs_context_mcp`(`createIfEmpty`)로 다시 연다.
- 시스템 메모리 경고가 뜬 뒤 백그라운드 대기 명령이 죽은 적이 있다. 쓰지 않는 탭은 닫는다.

## 결과별 대응

| 저장 출력·증상 | 대응 |
|---|---|
| `OK … (1408x1408)` | 한 장 보고 다음 인물로 간다 |
| `VERTICAL … (784x1168)` | 스크립트가 `_redo/<국문 이름>-세로-<원본>.jpg`로 옮긴다. **같은 채팅에** 아래 재요청 문장을 보내고 판정·저장을 다시 한다. 기준 파일은 세로 파일이다 |
| `DUP` | 클릭이 먹지 않아 옛 파일이 잡혔다. 판정 코드를 다시 실행하고 저장한다 |
| `NONE` | 새 파일이 없다. 대기초를 늘려 다시 저장하고, 그래도 없으면 판정 코드부터 다시 한다 |
| 「작업 중」이 10분을 넘긴다 | 그 채팅을 버리고 새 채팅으로 다시 보낸다. 다시 보내면 대개 20초 안팎에 끝난다. 알프 에르 퉁가는 14분, 어우꺼는 11분에서 버렸다 |
| 흑백으로 나온다 | `_redo/<국문 이름>-흑백-<원본>.jpg`로 옮기고 새 채팅으로 다시 보낸다 |
| `file_upload`가 「Couldn't determine which page」 | `tabs_context_mcp`를 다시 읽고 `find`부터 다시 한다 |

정사각 재요청 문장이다. 아야르 카치가 이것으로 1408×1408로 다시 나왔다.

```
Keep this exact portrait — the same person, face, hair, clothing, lighting and background — and output it again as a square 1:1 image instead of a vertical one. Same framing rule: the bottom edge just above the collarbones, about one head of empty space above the head.
```

세로 판은 처음 30장 중 5장이었고, 현행 프롬프트로 바꾼 뒤 약 3분의 1로 늘었다. 씨앗은 전부 800×800이라 씨앗 비율 탓이 아니다. 잘라 쓰면 800 규격에 못 미치고 머리나 턱이 잘리므로 재요청한다.

채팅 제목은 판정 근거가 아니다. 베트남 인물 어우꺼의 채팅 제목이 「Korean」으로 붙었지만 이미지는 제대로 나왔다.

## 눈으로 볼 것

- 씨앗의 현대식 머리(가르마, 볼륨, 광택)나 수염 손질이 남았는가
- 머리쓰개가 몇 가지(후드, 잎관, 감싼 천) 안에서 돌려 쓰이는가. 반대로 머리를 가리던 문화에서도 맨머리로 나오는가
- 목걸이가 기본값처럼 붙는가
- 현대 스튜디오나 뷰티 화보처럼 읽히는가. 단색·회색 배경, 날개형 아이라인과 입술 화장, 매끈한 배우 얼굴이 신호다
- 이마에 얇은 띠를 둘렀는가
- 얼굴이나 머리쓰개가 잘렸는가. **잘림만 실패다.** 머리 위 여백이 인물마다 다른 것은 승인 범위다

세로와 흑백은 바로 다시 뽑는다. 나머지는 인물 이름과 증상을 이 문서의 「사용자 결정 대기」에 모은다. 같은 증상이 여러 인물에서 쌓이면 프롬프트 문제다.

## 프롬프트를 고칠 때

- 문구는 `scripts/photo/grok-avatar-prompt.mjs` 한 곳에서 고친다.
- 결과가 한쪽으로 쏠려도 금지문을 더하지 않는다. 목록, 예시, "다수는 이랬다" 같은 기울이는 말을 넣으면 모델이 그 말을 그대로 따라간다. 무엇을 넣어 어떻게 쏠렸는지는 룰북 「두 단계로 만든다」의 마지막 문단에 있다.
- 바꾸면 문화가 서로 다른 인물 여섯 명쯤으로 먼저 시험한다. 결과는 `_ab<n>/`에 두고, 한 장에 붙인 비교판으로 옛 판과 나란히 본다.

## 끝나면

1. 검수와 등록은 [`hero-photo.md`](hero-photo.md)의 2단계를 따른다.
2. Grok 조작 기법(입력, 보내기, 판정, 내려받기)은 [`image-generation.md`](../../project/production/image-generation.md)로 옮기고 이 문서를 지운다.
