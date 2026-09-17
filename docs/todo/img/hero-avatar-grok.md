# 인물 아바타 — Grok 제작 인수인계

아바타가 없는 인물 468명의 정사각 얼굴 사진을 Grok 웹으로 만드는 일의 실행서다. 이 문서는 **한 명을 어떻게 뽑는지와 어디까지 왔는지**를 적는다. 사진이 어떤 모습이어야 하는지(프레임, 머리 설계 원칙)는 룰북 [`brief-rules.md`](../../../data/celeb/hero-photo/brief-rules.md)를 따르고, 아바타 다음 단계인 화보는 [`hero-photo.md`](hero-photo.md)를 따른다.

명령은 모두 `sw/web-bo`에서 실행한다.

## 실행 환경

**로그인된 grok.com을 조작할 수 있는 브라우저 자동화면 무엇이든 된다.** 로그인 대행은 금지 영역이라, 사용자가 로그인해 둔 브라우저에 붙는 도구만 쓴다.

- **Aside** — `mcp__aside__repl`(MCP는 호출 사이에 REPL 스코프가 이어진다) 또는 `aside repl`(한 호출 = 새 세션이라 탭 열기부터 추출까지 한 호출에 넣는다). 제어법은 `aside-browser` 스킬이 쥔다.
- **claude-in-chrome** — 사용자 Chrome에 붙는다.

꾸러미(`.tmp/grok-queue/<slug>.json`)의 `seed`는 원본 얼굴 재료 경로(`hero-batch.json`의 `facePath`, `D:\image\_재료\지정\…`)를 그대로 가리키는 것이 원칙이다.

- **Aside**: repl 샌드박스가 세션 폴더(`pwd`로 확인, `C:\Users\webco\.aside\u\0\sessions\<세션>`) 밖의 파일을 읽지 못한다. 씨앗을 `<세션>/seeds/seed-<slug>.png`로 복사해 그 경로를 `setInputFiles`에 넣는다. 결과 이미지도 `fetch`(쿠키 동봉)로 받아 `<세션>/out/<slug>.jpg`에 쓴 뒤 저장 스크립트에 넘긴다.
- **claude-in-chrome**: `file_upload`가 세션에 공유된 폴더만 받는다 — 씨앗을 그 세션 scratchpad로 복사해 넣는다.
- 이외의 도구는 `seed` 경로를 file input에 그대로 넣는다.

## 지금 어디까지 왔나 (26.09.17)

**92/468명.** 결과는 `.tmp/hero-out/_avatars/<국문 이름>.jpg`에 있다.

| 묶음 | 수 | 비고 |
|---|---:|---|
| DB에 원래 있던 아바타 | 41 | 사용자가 만들어 둔 것이다. 격자 검수를 통과했다. `acamapichtli`는 새로 만든 판보다 DB 판(아즈텍 깃털 머리장식)이 나아 DB 판을 썼다 |
| 옛 프롬프트로 만든 Grok 판 | 39 | 머리쓰개를 의무로 두고 대안 목록을 주던 시절의 결과다. **참고 자산이며 재생성 대상이 아니다** — 얼굴이 고대인답고 머리띠가 난립하지 않으면 그대로 둔다(26.09.17 지시) |
| 현행 프롬프트로 만든 Grok 판 | 12 | 아야르 카치, 아야르 우추, 바추에, 아야르 아우카, 배돌석, 아리스토데모스, 발람 아캅, 발람 키체, 발라 파세케 쿠야테, 죽왕, 바따라 구루, 바토스 1세 |

옛 프롬프트 39명: `aaron abhiraja abraham acca-larentia achaeus adnan aegyptus aeolus-2 agasu agenor ainurakkur aio aitor aji-saka alan-gua alasha-khan albanactus almos alp-er-tunga alpyeong alulim amamikyo amergin-gluingel amphion amulius an-dương-vương angul aram archias arnold-von-melchtal ashina asterion au-cơ avitohol awang-alak-betatar bayajidda bu-eulla degei fekulen`

### 재개는 이 순서로

26.09.17에 Grok 이미지 생성 한도(「이미지 생성 횟수를 모두 사용하셨습니다」)에 도달해 멈췄다. 한도가 풀리면 아래 미결 4건부터 처리하고, 그다음 `--next`로 이어 간다.

1. **밧세바** — 세로(784×1168)로 나와 `_redo/밧세바-세로-bathsheba.jpg`에 있다. 같은 채팅에 정사각 재요청 문장을 보낸 상태에서 한도에 막혔으므로, 한도 회복 뒤 그 채팅에 재요청 문장을 다시 보낸다.
2. **베리그·바라타** — 꾸러미(`berig.json`, `bharata-2.json`)는 보냈으나 한도에 걸려 이미지가 안 나왔다. 채팅을 새로 열어 다시 보낸다.
3. **별령·비류** — 꾸러미(`bieling.json`, `biryu.json`)는 만들어 두었고 아직 보내지 않았다.

### 판정 기준 (26.09.17 사용자 정리)

- **단색 배경은 괜찮다.** 중요한 것은 수염·머리 모양이 그 시대·그 문화 사람의 것인가다.
- 피부가 매끈한가가 아니라 **하나의 배역을 맡을 수 있는 특정한 얼굴인가**가 기준이다.
- 옛 실패의 본질은 "시멘트에 얼굴을 갈아버린 듯한" 질감이었다 — 그런 궤로 돌아가면 실패다.
- 바이아메는 만든다 — 이름 제약을 이유로 한 보류를 26.09.17에 해제했다.

### 사용자 결정 대기

1. **머리 시험 6명** — 아비토홀, 아람, 아르놀트, 아르키아스, 암피온, 어우꺼의 시험판(`_ab/`, `_ab2/`)을 `_avatars`의 옛 판과 바꿀지 정해야 한다. 비교판은 `.tmp/hero-out/_review-hair-ab2.jpg`다. 기준은 같다 — 더 고대인다운 쪽을 남긴다.

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
