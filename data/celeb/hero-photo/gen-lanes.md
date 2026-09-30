# 인물 사진 생성 레인 — Gemini·Grok 웹 조작법

사진 없는 인물의 아바타·화보를 로그인된 웹 생성기(Gemini·Grok)로 한 장씩 뽑는 조작법이다. 아바타 468명은 이 방법으로 만들어 26.09.29 기준 전원 등록됐다. 화보(2단계)도 같은 레인을 쓴다. 사진이 어떤 모습이어야 하는지는 [`brief-rules.md`](brief-rules.md), 화보 남은 일은 [`docs/todo/img/hero-photo.md`](../../../docs/todo/img/hero-photo.md)가 쥔다. 웹 UI는 자주 바뀌므로 안 맞는 절차는 실제 화면으로 확인하고 고친다.

명령은 모두 `sw/web-bo`에서 실행한다.

## 실행 환경

**로그인된 생성기 탭을 조작할 수 있는 브라우저 자동화면 무엇이든 된다.** 로그인 대행은 금지 영역이라, 사용자가 로그인해 둔 브라우저에 붙는 도구만 쓴다.

- **Aside** — `mcp__aside__repl`(호출 사이에 REPL 스코프가 이어진다) 또는 `aside repl`(한 호출 = 새 세션이라 탭 열기부터 추출까지 한 호출에 넣는다). 제어법은 `aside-browser` 스킬이 쥔다.
- **claude-in-chrome** — 사용자 Chrome에 붙는다. `file_upload`는 세션에 공유된 폴더만 받으므로 씨앗을 scratchpad로 복사해 넣는다.

## 작업 기반의 자리

`.tmp`는 언제든 지워질 수 있다. 살아야 하는 것은 전부 `D:\image\_avatar-work\`에 있다.

| 것 | 자리 |
|---|---|
| 완성 아바타 468장 | `D:\image\_avatar-work\avatars\<국문명>.jpg` (소거 전 원본 `avatars-prestar\`) |
| 배정 원장(468명) | `D:\image\_avatar-work\hero-batch.json` — 성별·나이대·체구·원본 씨앗 경로(`facePath`) |
| 발주서 데이터 | `D:\image\_avatar-work\brief-targets.json` — 이름·직함·한 줄 정의·약력 |
| 프롬프트 원문 | `D:\image\_avatar-work\prompts\` |
| 도구 | `D:\image\_avatar-work\tools\` — 검수 시트·표준 크롭·`gemini-lane.js`·`rebuild-ledgers.mjs` |
| 씨앗 원본 | `D:\image\_재료\지정\<버킷>\` — 파일명이 곧 배정이다. 기배정 씨앗을 다른 인물에 다시 쓰지 않는다 |

원장이 다시 필요하면 `tools/rebuild-ledgers.mjs`가 씨앗 파일명과 `celebs` 테이블을 이어 재생한다(DB 조회는 페이지를 나눠 전체 행을 가져온다).

## 제작에서 굳은 판단

- **판정은 반드시 실제 이미지를 열어 보고 내린다.** 컨텍스트에서 이미지가 빠진 채 「보았다」고 보고한 사고가 있었다. 320px 시트 타일의 민족·성별 판독은 오탐이 많아 의심분은 확대해서 다시 본다.
- **프롬프트는 「무엇을 만들지」만 적은 짧은 판이 낫다.** 약력 통째·금지조항 나열은 문자 아티팩트와 역할 붕괴를 부른다. 결과가 한쪽으로 쏠려도 금지문을 더하지 않는다 — 목록·예시·「다수는 이랬다」 같은 기울이는 말을 모델이 그대로 따른다.
- **슬롭의 공급원은 씨앗이다.** 스튜디오·디폴트 얼굴 씨앗이면 슬롭이 나온다. 씨앗을 바꾸면 풀린다.
- **판정 기준(사용자 정리)** — 단색 배경은 괜찮다. 수염·머리 모양이 그 시대·그 문화 사람의 것인가, **하나의 배역을 맡을 수 있는 특정한 얼굴인가**가 기준이다. 「시멘트에 얼굴을 갈아버린 듯한」 질감으로 돌아가면 실패다. 창조신·모친 계열도 임종급 노인으로 그리지 않는다(노년이 정체 자체인 인물만 예외).
- **검수 보조** — 육안 합격 뒤 SFace 임베딩으로 씨앗 대조·쌍별 중복(>0.7 경보)을 본다. 경보 쌍은 전부 육안으로 다시 본다.
- **반복 아티팩트의 원인은 대개 프롬프트 본문이다.** 「명궁」이 들어가면 무기가 매번 나오고, 직함이 「왕」이면 예복이 나온다. 본체가 비인간인데 「A man in his…」 절이 있으면 사람이 나온다. 직함·본체 문구를 고친 새 채팅이 같은 채팅 재요청보다 빠르다.

## Gemini 레인 (Aside 멀티계정)

한 브라우저 프로필에 구글 계정 여러 개가 멀티로그인돼 있어 `gemini.google.com/u/<번호>/app`으로 계정을 나눠 쓴다. **번호는 로그인 순서라 바뀔 수 있다** — `Google 계정:` aria-label 버튼의 텍스트로 계정을 확인한다. 발주·회수 코드는 `D:\image\_avatar-work\tools\gemini-lane.js`에 통째로 있다.

1. **파일은 세션 폴더 안에 있어야 한다.** repl의 `pwd`(`C:\Users\webco\.aside\u\<프로필>\sessions\<세션>`) 밖의 경로는 `setInputFiles`가 거부한다. 씨앗은 `artifacts/seeds/<slug>.png`, 프롬프트는 `artifacts/<slug>.txt`로 복사해 둔다. 세션 폴더는 세션마다 바뀌니 매번 `pwd`를 확인한다.
2. **업로드는 「업로드 및 도구 → 파일 업로드」를 눌러 숨은 `input[type=file]`을 만든 뒤 넣는다.** accept 목록에 이미지가 없어도 프로그래매틱 설정은 통한다. 참조가 2장이면 `setInputFiles([경로1, 경로2])`. 첫 업로드 계정에는 「이미지 및 파일에서 콘텐츠 생성」 동의와 「권리 확인」 대화상자가 뜬다 — 누르지 않으면 전송 버튼이 잠긴다.
3. **프롬프트는 `fill()`로 넣고 Enter로 보낸다.** 채팅 주소가 `/app/<id>`로 바뀌면 발주 성공이다. 전송 버튼이 disabled로 남으면 입력창에 input 이벤트를 다시 발생시킨다.
4. **결과는 60~90초 뒤 `img.naturalWidth>=1024`로 뜬다.** canvas 추출로 세션 artifacts에 `gen-<slug>.png`로 직접 쓴다(`extractGen(slug)`). 캔버스가 오염되면 같은 탭에서 `fetch(img.src)`→arrayBuffer로 우회한다. 라이트박스 다운로드 버튼 방식은 파일명이 무작위라 레인끼리 뒤섞여 폐기했다.
5. **여러 레인을 동시에 돌린다.** 정상 계정마다 새 탭을 열어 발주하면 병렬로 나온다. 한도가 찬 계정은 다른 `/u/N`으로 넘긴다.
6. **파일명을 slug로 직접 써도 저장 전 씨앗과 얼굴을 대조한다.** 옛 다운로드 방식에서 두 인물이 뒤바뀌어 내려온 사고가 있었다.
7. **우하단 별 모양 마크**는 표준 크롭 `extract({left:0,top:60,width:850,height:850}).resize(1024)`로 제거한다. 별이 얼굴·세부 위에 걸쳐 크롭으로 못 지우면 같은 채팅에 재요청한다.
8. **REPL 최상위 스코프가 호출 사이에 이어진다.** 같은 이름 재선언은 오류니 고유 이름이나 top-level await를 쓴다. 무응답이면 스코프가 초기화된 것 — `gemini-lane.js`를 다시 붙여 넣는다. `Aside isn't running`이면 브라우저를 재기동한다.

## Grok 레인

무료 이미지 한도가 작아 보조 레인이다. 꾸러미는 `node scripts/photo/grok-avatar-prompt.mjs --next 5`(또는 slug 지정)로 `.tmp/grok-queue/<slug>.json`(`{slug, nickname, seed, prompt}`)에 만든다. `--next`는 로컬 폴더만 보므로 큰 배치 전에 DB에 이미 이미지가 있는지 확인한다. **스크린샷을 찍지 않고 DOM만 읽는다.**

1. **인물마다 새 채팅**(`https://grok.com/`). 한 채팅에서 이어 만들면 앞 인물의 맥락이 섞인다.
2. **씨앗을 붙인다** — file input에 꾸러미의 `seed` 경로.
3. **프롬프트는 타이핑하지 않는다.** 입력창이 ProseMirror라 타이핑이 공백을 삼킨다.

   ```js
   const ed = document.querySelector('[contenteditable="true"].ProseMirror')
   ed.focus()
   document.execCommand('selectAll', false, null)
   document.execCommand('delete', false, null)
   document.execCommand('insertText', false, PROMPT)
   ```

4. **다음 호출에서 보낸다.** 보내기 버튼은 글자가 들어간 뒤에 그려진다. 주소가 `/c/<채팅 id>`로 바뀌면 적어 둔다.

   ```js
   document.querySelector('[contenteditable="true"].ProseMirror').closest('form').querySelector('button[type="submit"]').click()
   ```

5. **150초 기다린 뒤 채팅을 다시 불러와서 판정한다.** 자동화 탭은 백그라운드라 화면 갱신이 멈춰, 서버에서 이미지가 끝났어도 탭에는 안 보인다(이것을 장애로 읽고 네 명을 열네 번 다시 보낸 적이 있다).

   ```js
   await new Promise(r => setTimeout(r, 5000))
   const busy = [...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === '모델 응답 중지')
   const dl = [...document.querySelectorAll('button[aria-label="다운로드"]')]
   if (!busy && dl.length) dl[dl.length - 1].click()
   JSON.stringify({ busy, dl: dl.length })
   ```

   `busy`면 더 기다리고, `dl`이 있으면 마지막(최신) 이미지를 누른 것이며, 둘 다 아니면 새 채팅으로 다시 보낸다. 이미지는 인증 없는 `curl`로 받으면 실패한다 — 도구의 `fetch`(쿠키 동봉)로 받아 파일로 쓴다.
6. **저장** — `node scripts/photo/grok-avatar-save.mjs <slug> <받은 파일 경로>`가 중복 해시와 가로세로를 재서 정사각은 `_avatars/`, 세로는 `_redo/`로 옮긴다. 옛 방식 `grok-avatar-save.sh`를 쓰면 출력의 `DUP`/`NONE`을 꼭 본다.
7. **한 장 열어 본다** — 아래 「눈으로 볼 것」.

**Gemini가 거부·무시하는 신체 특징은 Grok으로 넘긴다.** 창힐의 「눈 넷」을 Gemini는 초상 발주 세 번·편집 한 번 모두 두 눈으로 돌려놨고, Grok은 같은 씨앗에 영문 발주 한 번으로 그렸다(26.09.30). 회수는 `assets.grok.com`의 생성 이미지만 골라야 한다 — 쿠키 배너(cdn.cookielaw.org)·가로 띠 이미지가 같은 크기 필터에 걸린다. 발주·회수 코드는 `D:\image\_avatar-work\myth-todo-0929\gen\grok-send.js`·`grok-fetch.js`, 새 채팅 주소는 사이드바 `a[href*="/c/"]` 첫 항목에서 읽는다.

동시에 돌릴 때는 탭 둘, 생성 중인 채팅 셋까지. **내려받기는 한 번에 한 명씩** — 연달아 받으면 누구 파일인지 알 수 없다.

| 저장 출력·증상 | 대응 |
|---|---|
| `OK … (1408x1408)` | 한 장 보고 다음 인물로 |
| `VERTICAL …` | 같은 채팅에 아래 정사각 재요청 문장을 보내고 다시 판정·저장 |
| `DUP` / `NONE` | 내려받기가 먹지 않았다. 판정부터 다시 |
| 「작업 중」이 10분을 넘긴다 | 그 채팅을 버리고 새 채팅으로 다시 보낸다 |
| 흑백 | `_redo/`로 옮기고 새 채팅으로 다시 |
| 「이미지 생성 한도 도달」 | 무료 횟수 소진. 몇 시간 뒤 회복되니 미결 목록을 적고 멈춘다 |

정사각 재요청 문장:

```
Keep this exact portrait — the same person, face, hair, clothing, lighting and background — and output it again as a square 1:1 image instead of a vertical one. Same framing rule: the bottom edge just above the collarbones, about one head of empty space above the head.
```

## 구도·자세가 어색할 때의 재요청 기준

- 정수리까지 다 보이게 — 머리 위에 머리 하나 분량의 여백
- 정면샷·정면 시선 구도, 인물이 너무 푸짐하지 않게
- 원본 얼굴의 골격과 복식은 존중, 손이 올라가 있으면 내려서 안 보이게
- 1:1, 고해상도 풀컬러, 얼굴에 자연광과 음영
- 여신은 미모를 살리되 나이든 여신은 성숙한 얼굴형으로 — 늙게 그리지 않는다

## 눈으로 볼 것

- 씨앗의 현대식 머리(가르마·볼륨·광택)나 수염 손질이 남았는가
- 머리쓰개가 몇 가지(후드·잎관·감싼 천) 안에서 돌려 쓰이는가. 반대로 머리를 가리던 문화에서도 맨머리로 나오는가
- 목걸이가 기본값처럼 붙는가, 이마에 얇은 띠를 둘렀는가
- **하나의 배역을 맡을 특정한 얼굴인가** — 누구나 될 수 있는 매끈한 얼굴이면 실패다
- 얼굴이나 머리쓰개가 잘렸는가. **잘림만 실패다.** 머리 위 여백이 인물마다 다른 것은 승인 범위다

같은 증상이 여러 인물에서 쌓이면 프롬프트 문제다. 문구는 `scripts/photo/grok-avatar-prompt.mjs` 한 곳에서 고치고, 바꾸면 문화가 서로 다른 인물 여섯 명쯤으로 먼저 시험해 옛 판과 나란히 비교한다.
