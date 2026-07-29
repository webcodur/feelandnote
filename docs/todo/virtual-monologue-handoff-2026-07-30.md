# 가상 독백 전수 정비 인수인계

> 작성: 2026-07-30 KST  
> 작업 단일원천: `docs/todo/virtual-monologue-quality-overhaul.md`  
> 범위: 이번 작업에서 이미 시작한 `VM-KO-02`부터 `VM-KO-06`까지만 안전한 체크포인트로 마감  
> 현재 백그라운드 상태: **가상 독백 생성·검토 프로세스 0개**

## 한 줄 결론

`VM-KO-02`는 25명 전원을 판정해 **15명 게시·10명 보류**로 완전히 마감했다. `VM-KO-03`은 1차 수정 뒤 두 검토까지 원자 저장했고, `VM-KO-04`는 후보 25명을 전부 저장했다. `VM-KO-05`는 dossier 25명을 완성했고, `VM-KO-06`은 9명을 조사·병합한 뒤 멈췄다. 새 배치는 만들지 않았다.

전수 누적 확정치는 다음과 같다.

- 판정 완료: **74명** = `VM-P1` 24 + `VM-KO-01` 25 + `VM-KO-02` 25
- 게시: **48명** = 17 + 16 + 15
- 보류: **26명** = 7 + 9 + 10
- 게시 48명은 SHA-256 조건부 UPDATE와 캐시 갱신을 거쳤다.
- 게시기 재실행은 전원 `SKIP`, 공개 서버 HTML은 전원 승인 문단과 정확히 일치한다.
- 연결 가능한 시각 브라우저가 없었으므로 CSS·탭·스크롤·반응형 육안 검수는 하지 않았다. `liveVerifiedAt`은 의도적으로 비워 두고 `liveHtmlVerification`만 기록했다.

## 현재 배치 체크포인트

| 배치 | 현재 상태 | 다음 진입점 | DB 쓰기 |
|---|---|---|---|
| `VM-KO-02` | **완료: published 15 / hold 10** | 보류자를 새 인간 구조로 재개할 때만 연다 | 게시 15명 완료 |
| `VM-KO-03` | 후보 25, 1차 수정 뒤 evidence·editorial 완료, 동시 통과 2 | 남은 23명에 **두 번째이자 마지막** 모델 수정 1회 | 0 |
| `VM-KO-04` | dossier 25, 후보 25, 검토 0 | 최초 evidence·editorial 검토 | 0 |
| `VM-KO-05` | dossier 25/25, `improve 20 / new 5` | 후보 생성부터 시작 | 0 |
| `VM-KO-06` | `improve 9 / unreviewed 16`, 후보 0 | 남은 16명 dossier 조사 | 0 |

현재 파일 SHA-256은 재개 전 무결성 대조용이다. 정상 재개로 파일이 바뀌면 새 해시가 생기는 것이 맞다.

| 파일 | SHA-256 |
|---|---|
| `2026-07-29-VM-KO-02.json` | `d834c64cdf4df88ad89c9d02363ad8c879d5668e574939846fca24226951543e` |
| `2026-07-30-VM-KO-03.json` | `6349060d6ee667bafb4999f1cfee83a45a962a4c6a6ca8b9ddf11e49de90e10d` |
| `2026-07-30-VM-KO-04.json` | `c6b2419f82775da67914e1f97a73902d8a8904ccc2f94a01f105ffb42801cbb9` |
| `2026-07-30-VM-KO-05.json` | `97dc68539d28e7bd2bf6f3dcff908fce9faa25479c33ca01c8c4ce27d82ee098` |
| `2026-07-30-VM-KO-06.json` | `3e20900a0b70123f602f8d26643973b26721fb7a4bfaaccf5fb607c9b0334bb3` |

## VM-KO-02 마감 상세

배치 파일: `docs/celeb-data/virtual-monologue/2026-07-29-VM-KO-02.json`

### 게시 15명

`richard-nixon`, `thomas-jefferson`, `charles-darwin`, `siddhartha-gautama`, `enrico-fermi`, `isaac-newton`, `russell-kirk`, `thomas-edison`, `yongle-emperor`, `christopher-columbus`, `george-orwell`, `augustine`, `william-shakespeare`, `yi-seong-gye`, `yoshua-bengio`

처리 내역:

1. 각 후보가 evidence와 editorial에서 `pass`, blocking 0, major 0인지 확인했다.
2. 루트 작업자가 15명 본문을 전부 직접 통독했다.
3. 명시 승인 뒤 게시 dry-run에서 `PLAN 15 / FAIL 0`을 확인했다.
4. 조건부 게시에서 `UPDATE 15 / FAIL 0`, `celebs` 캐시 갱신 `HTTP 200`을 확인했다.
5. 같은 게시 명령 재실행에서 `SKIP 15 / FAIL 0`을 확인했다.
6. 공개 한국어 페이지에서 15명 모두 `HTTP 200`, 후보 문단과 서버 렌더링 HTML의 연속 문단이 정확히 일치했다.

조지 오웰은 두 번의 모델 수정 뒤 evidence가 지목한 첫 등장 용어 `전체주의`에만 `전체주의(권력이 언론·기억·말과 개인의 생각까지 전면적으로 통제하려는 체제)`라는 사실 비증가 괄호 안내를 넣었다. 두 렌즈를 다시 실행해 모두 통과한 뒤 게시했다.

### 보류 10명과 재개 조건

보류 병합 시 당시 후보와 검토는 각 인물 `reviewHistory`에 보존했고 DB 원문은 바꾸지 않았다.

| 인물 | 반복 결함 | 재개 조건 |
|---|---|---|
| `laozi` | 1인칭 화자 붕괴, 개념 설명문 지배 | 첫머리에 전승된 문헌 화자라는 장치를 한 번만 정하고 물·빈 그릇·낮은 자리 같은 이미지 중심으로 사람 재구성 |
| `sun-yat-sen` | 1인칭 위키 요약, 편집자식 균형 결말 | “왕조를 무너뜨린 뒤 어떻게 다스릴 것인가” 한 질문에 필요한 사건만 남김 |
| `li-shimin` | 자기비판을 가상 독백으로 이식, 역사가 요약 | 간언·공식 기록을 통치 도구로 삼은 선택을 중심에 두고 현무문과 원정 결과를 사실로 병치 |
| `liu-bang` | 위임으로 이긴 힘과 승리 뒤 권력 회수의 긴장 미해결 | “힘을 빌려 천하를 얻고 그 힘을 회수한 건국자” 한 축으로 재배열 |
| `mehmed-ii` | 학술 요약 목소리 | “빈 도시로는 제국을 다스릴 수 없다”를 중심에 두고 약탈·노예화·강제와 유인을 함께 남김 |
| `friedrich-engels` | 공산주의 범위를 일반 사유재산 전체로 과장, 생애 축 파편화 | 생산수단의 사적 소유라는 범위를 고정하고 맨체스터부터 유고 편집까지 시간순 재구성 |
| `john-calvin` | 통념 교정문이 화자 압도 | 교육·교회 제도라는 적극적 구상을 중심에 두고 권한·처형 책임 교정은 한 번만 정확히 처리 |
| `joseph-stalin` | 자료 밖 자기 책임 인정·인과 해설, 외부 판결의 자기고백화 | 공개 동원 논리와 명령·서명·결과를 분리해 병치하고 가상 참회를 만들지 않는 별도 구조 |
| `pablo-picasso` | 외부 비판을 자기반성으로 이식, 출처 없는 내면, 미술관식 요약 | 제작 행위를 화자 축으로 세우고 식민주의·여성 예술가 비판은 출처가 보이는 외부 맥락으로 분리 |
| `zeng-guofan` | 상군 인맥과 공동 근대화 사업 혼합, 설명문 결말 | 태평천국을 짧게 설명하고 상군의 지방 인맥과 공동 사업을 분리해 사람 재구성 |

노자는 `제 이름`을 1인칭으로 인식하지 못하던 정규식 오탐도 드러냈다. 생성·게시 검증기의 첫 인칭 검사를 `저는/제가/나는/내가`뿐 아니라 공백 뒤 명사를 받는 `제`까지 인식하도록 함께 교정했다.

## VM-KO-03 재개 방법

배치 파일: `docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-03.json`

현재 상태:

- dossier 25/25
- 후보 25/25, 후보 해시 불일치 0
- 최초 검토 뒤 통과자는 `tim-berners-lee` 1명
- 나머지 24명을 한 번 수정했고 evidence·editorial을 다시 원자 반영했다.
- 현재 동시 통과자는 `tim-berners-lee`, `louis-xiv` 2명
- 나머지 23명은 blocking 또는 major가 있어 두 번째 수정 대상이다.
- 모든 인물이 `status=reviewed`, 두 렌즈 25/25를 가진다.

다음 수정은 **두 번째이자 마지막 모델 수정**이다. 아래 세 명령을 한 번씩만 순서대로 실행한다.

```powershell
cd C:\project\feelandnote\sw\web-bo

pnpm.cmd exec tsx scripts/revise-virtual-monologue-batch.ts `
  --file ../../docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-03.json `
  --concurrency 2

pnpm.cmd exec tsx scripts/review-virtual-monologue-batch.ts `
  --file ../../docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-03.json `
  --lens evidence --concurrency 2

pnpm.cmd exec tsx scripts/review-virtual-monologue-batch.ts `
  --file ../../docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-03.json `
  --lens editorial --concurrency 2
```

수정기는 현재 통과한 2명을 자동 `SKIP`한다. 이 세 명령 뒤 모델 수정을 다시 실행하면 세 번째 수정이 되므로 금지한다. 남은 major는 인간의 구조 재작성 또는 `hold`로 판정한다.

첫 수정 검토 중 `galileo-galilei`, `john-f.-kennedy`에서 모델이 유효한 JSON을 남겼는데 CLI exit code가 비정상인 일시 오류가 있었다. 전체 단계를 다시 돌리지 않고 실패한 두 slug만 재실행해 정상 병합했다. 같은 문제가 재발하면 성공분을 덮지 말고 로그가 지정한 `--slugs`만 재실행한다.

당시 로그:

- `sw/web-bo/.tmp-gpt-mono/workbench/VM-KO-03-cycle1-editorial.out.log`
- `sw/web-bo/.tmp-gpt-mono/workbench/VM-KO-03-cycle1-editorial.err.log`
- `sw/web-bo/.tmp-gpt-mono/workbench/VM-KO-03-cycle-resume.err.log`

## VM-KO-04 재개 방법

배치 파일: `docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-04.json`

현재 상태:

- dossier 25/25, `improve 17 / new 8`
- 후보 25/25, 후보 해시 불일치 0
- evidence·editorial 검토 0
- DB 쓰기 0

최초 생성에서 7명이 분량 상한을 넘었다. 실패 slug만 재실행해 6명을 정상 저장했다. `niels-bohr`는 세 번 모두 내용 결함이 아니라 1,350자 상한만 20~72자 초과했다. 마지막 1,422자 후보에서 새 사실을 보태지 않고 중복 표현과 군더더기만 줄인 1,314자 후보를 수동 편집기로 넣었다. 파일은 `sw/web-bo/.tmp-gpt-mono/workbench/VM-KO-04-niels-bohr-manual.txt`이며 아직 어떤 검토도 받지 않았으므로 다른 후보와 동일하게 두 렌즈부터 시작한다.

```powershell
cd C:\project\feelandnote\sw\web-bo

pnpm.cmd exec tsx scripts/review-virtual-monologue-batch.ts `
  --file ../../docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-04.json `
  --lens evidence --concurrency 2

pnpm.cmd exec tsx scripts/review-virtual-monologue-batch.ts `
  --file ../../docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-04.json `
  --lens editorial --concurrency 2
```

그 뒤에만 `revise → evidence → editorial`을 최대 두 번 반복한다. 안전하게 자동 순환하려면 최초 두 검토 결과를 원자 저장한 뒤 남은 횟수를 명시적으로 관리한다. 최초부터 다시 `run-virtual-monologue-batch-cycles.ts --cycles 2`를 호출하면 이미 있는 후보는 건너뛰지만 작업자가 수정 횟수를 잘못 셀 수 있으므로 수동 단계 실행이 더 명확하다.

당시 로그:

- `sw/web-bo/.tmp-gpt-mono/workbench/VM-KO-04-cycle-run.out.log`
- `sw/web-bo/.tmp-gpt-mono/workbench/VM-KO-04-cycle-run.err.log`

## VM-KO-05 재개 방법

배치 파일: `docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-05.json`

현재 dossier 25명은 모두 `validateDossier`를 통과해 병합됐다.

- `new 5`: `yelu-chucai`, `shi-naian`, `zhang-zhongjing`, `zhuangzi`, `an-lushan`
- 나머지 20명: `improve`
- 후보·검토·DB 쓰기: 0

따라서 이 배치는 최초 상태의 순차 러너를 그대로 사용할 수 있다.

```powershell
cd C:\project\feelandnote\sw\web-bo

pnpm.cmd exec tsx scripts/run-virtual-monologue-batch-cycles.ts `
  --file ../../docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-05.json `
  --concurrency 2 --cycles 2
```

러너는 승인·보류·게시를 하지 않는다. 종료 뒤 반드시 사람이 통과자 본문을 직접 읽고, 남은 결함은 dossier에 보류 사유와 재개 조건을 기록한 뒤 별도 승인·게시 절차를 밟는다.

## VM-KO-06 재개 방법

배치 파일: `docs/celeb-data/virtual-monologue/2026-07-30-VM-KO-06.json`

조사·병합 완료 9명은 모두 `improve`다.

`daniel-pink`, `francis-bacon`, `john-mccarthy`, `louis-pasteur`, `sigmund-freud`, `adam-smith`, `akio-morita`, `bill-gates`, `john-schulman`

남은 `unreviewed` 16명:

`benito-mussolini`, `gwanggaeto-the-great`, `lee-kuan-yew`, `leo-tolstoy`, `li-dazhao`, `ptolemy-i`, `qianlong-emperor`, `thomas-paine`, `victor-hugo`, `woodrow-wilson`, `yi-sun-sin`, `yongzheng-emperor`, `cao-cao`, `helmut-kohl`, `john-the-apostle`, `mikhail-gorbachev`

남은 16명의 개별 dossier를 조사·검증하고 한 명씩 직렬 병합한다. 25/25가 되기 전에는 후보 러너를 시작하지 않는다.

## 게시 절차

통과자를 자동 승인하거나 자동 게시하지 않는다. 순서는 항상 다음과 같다.

1. evidence·editorial 각각 `pass`, blocking 0, major 0 확인
2. 루트 작업자가 후보 본문 직접 통독
3. `approve-virtual-monologue-batch.ts` dry-run
4. 같은 명령에 `--apply`
5. `apply-virtual-monologue-batch.ts` dry-run
6. 같은 명령에 `--apply`
7. 같은 게시 명령 재실행에서 전원 `SKIP`
8. `verify-virtual-monologue-live-html.ts` dry-run 뒤 `--apply`
9. 연결 가능한 브라우저가 있을 때 한국어 실제 화면의 탭·문단·스크롤·모바일 레이아웃 육안 검수 후에만 `liveVerifiedAt` 기록

게시기는 DB 현재 본문 SHA-256이 배치의 `currentHash`와 다르면 실패시켜 다른 작업자의 변경을 덮지 않는다.

## 반드시 지킬 실행 경계

- 같은 배치 JSON에 쓰는 CLI 두 개를 동시에 실행하지 않는다.
- 병렬화는 한 CLI 내부 `--concurrency 1~4`로만 한다.
- 여러 배치를 동시에 돌릴 때 전체 모델 호출 수는 4개를 넘기지 않는다.
- 모델 수정은 최초 후보 뒤 최대 2회다. 세 번째 자동 수정으로 숫자를 맞추지 않는다.
- 모델 호출 일부가 실패하면 성공분은 이미 단일 원자 병합돼 있다. 전체 명령을 재실행하지 말고 출력의 `재실행 대상: --slugs ...`만 돌린다.
- 외부 비판을 당사자의 가상 참회로 바꾸지 않는다.
- 어려운 말은 쉬운 말로 바꾸고, 용어를 남겨야 할 때만 첫 등장에 `용어(쉬운 뜻)`을 붙인다.
- 실존 인물과 fiction을 섞지 않는다.
- 한국어를 확정하기 전 `virtual_monologue_en`을 연쇄 수정하지 않는다.

## 이번에 교정·추가한 작업대

- 생성·검토·수정 CLI의 제한 병렬화와 성공분 단일 원자 병합
- 같은 배치의 생성→두 검토→최대 2회 수정 순차 러너
- 기존 배치 인물을 제외하는 다음 배치 선택기
- 직접 통독 뒤 명시 승인을 기록하는 승인기
- SHA-256 조건부 게시기와 재실행 `SKIP`
- 공개 서버 HTML 문단 완전 일치 검증기
- 정당한 1인칭 `제 + 명사`를 허용하는 후보·게시 검증식

관련 파일:

- `sw/web-bo/scripts/lib/virtual-monologue-batch-concurrency.ts`
- `sw/web-bo/scripts/lib/virtual-monologue-workbench.ts`
- `sw/web-bo/scripts/plan-virtual-monologue-next-batch.ts`
- `sw/web-bo/scripts/run-virtual-monologue-batch-cycles.ts`
- `sw/web-bo/scripts/approve-virtual-monologue-batch.ts`
- `sw/web-bo/scripts/apply-virtual-monologue-batch.ts`
- `sw/web-bo/scripts/verify-virtual-monologue-live-html.ts`

## 검증 상태와 알려진 한계

- `VM-KO-02` 게시 15명: DB UPDATE, 캐시 HTTP 200, 재실행 `SKIP`, 공개 HTML 정확 일치 완료
- `VM-KO-02~06` 현재 후보 해시 불일치: 0
- 관련 TypeScript/TSX scoped ESLint: 통과
- `VM-KO-02~06` 배치 JSON 파싱, 현재 원문·후보 SHA-256, 문서에 기록한 파일 SHA-256 대조: 통과
- `git diff --check`: 통과
- 잔류 `virtual-monologue` 생성·검토 프로세스: 0개
- 저장소 전체 `web-bo` TypeScript 검사에는 이번 작업과 무관한 기존 오류가 남아 있었다.
  - `apply-dialogue-en-polish-batch.ts:238`
  - `apply-dialogue-ko-polish-batch.ts:225`
  - `organize-service-materials.ts:527-530`
- 시각 브라우저 연결 0개: HTML 내용 검증은 완료했지만 시각 검수는 미완료
- `.tmp-gpt-mono/workbench`의 로그와 모델 출력은 복구 보조물이다. 판정·후보·검토의 단일원천은 각 배치 JSON과 개별 dossier JSON이다.

## 재개 전 30초 점검

```powershell
cd C:\project\feelandnote

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'virtual-monologue' -and $_.ProcessId -ne $PID } |
  Select-Object ProcessId, ParentProcessId, Name, CommandLine

git status --short
```

가상 독백 프로세스가 이미 있으면 같은 배치 명령을 하나 더 띄우지 않는다. 이 저장소는 dirty worktree이며 다른 작업자의 변경도 있으므로, 가상 독백과 무관한 파일을 되돌리거나 정리하지 않는다.
