# 셀럽 대사 활용 계획

대사 데이터(celeb_dialogues)를 플랫폼 전체에서 활용하기 위한 계획서.

---

## 대사 상황 7종 (참고)

| 코드 | 상황 | 톤 | 글자수 |
|------|------|-----|--------|
| `greeting` | 첫인사, 자기소개 | 본인 정체성 | ≤20자 |
| `answer` | 호명, 대기 | 짧은 수락 | ≤20자 |
| `deploy` | 행동 개시, 출전 | 결단, 실천 | ≤20자 |
| `battle_win` | 성공, 승리 | 통쾌, 여유 | ≤20자 |
| `battle_draw` | 무승부, 미결 | 인내, 재도전 | ≤20자 |
| `battle_lose` | 실패, 패배 | 분함, 책임 | ≤20자 |
| `clash_attack` | 행동 기합 | 짧고 강렬 | ≤15자 |

---

## DB 현황

### 전체

| 구분 | 수 | 비율 |
|------|-----|------|
| 총 셀럽 | 866명 | - |
| 대사 보유 | 751명 | 87% |
| 풀셋 (7종) | 266명 | 31% |
| greeting만 | 479명 | 55% |

### 게임 대상 (1920 이전 사망자)

| 구분 | 수 | 비율 |
|------|-----|------|
| 게임 대상 | 214명 | - |
| **풀셋 보유** | **214명** | **100%** |

게임 대상은 전원 풀셋 보유. 대사 데이터 제약 없음.
greeting만 보유한 479명은 전원 현대 인물(생존 또는 1920 이후 사망).

### 풀셋 예시 — 측천무후 (politician, bold)

```json
{
  "greeting": [
    "[commanding, regal] 황제의 자리, 내가 차지했다.",
    "[proud, imperious] 하늘의 뜻이 나를 택했다.",
    "[dominant, absolute] 어떤 문도 내 앞에 닫히지 않았다."
  ],
  "answer": [
    "[confident, imperial] 내가 나서겠다.",
    "[bold, ready] 맡겨라.",
    "[commanding, decisive] 짐이 결정하겠다."
  ],
  "deploy": [
    "[fierce, advancing] 내가 직접 열겠다.",
    "[bold, sweeping] 길은 내가 만든다.",
    "[dominant, charging] 직접 나아가겠다."
  ],
  "battle_win": [
    "[triumphant, regal] 하늘의 뜻이 맞았다.",
    "[satisfied, imperious] 처음부터 내 것이었다.",
    "[proud, commanding] 의심한 자들을 보았나."
  ],
  "battle_draw": [
    "[firm, unyielding] 아직 끝이 아니다.",
    "[determined, plotting] 다음엔 완전히 내 것으로 하겠다.",
    "[composed, imperial] 짐은 기다릴 수 있다."
  ],
  "battle_lose": [
    "[cold, accepting] 내 판단이 어긋났다.",
    "[bitter, composed] 이번은 졌다, 인정하겠다.",
    "[resolute, plotting] 다시 계획하겠다."
  ],
  "clash_attack": [
    "[fierce, commanding] 내가 간다!",
    "[cold, decisive] 비켜라!",
    "[dominant, striking] 여기서 결판낸다!"
  ]
}
```

### 풀셋 예시 — 오기 (commander, loyal)

```json
{
  "greeting": [
    "[loyal, solemn] 인의가 병법의 근본입니다.",
    "[dutiful, composed] 군사와 함께 먹고 자는 장수입니다.",
    "[respectful, firm] 부국강병, 그것이 내 사명입니다."
  ],
  "answer": [
    "[loyal, ready] 존명, 따르겠습니다.",
    "[dutiful, resolute] 명을 받들겠습니다.",
    "[solemn, awaiting] 언제든 준비되어 있습니다."
  ],
  "deploy": [
    "[determined, commanding] 인의를 앞세워 나아가겠습니다.",
    "[loyal, surging] 병사와 함께라면 두렵지 않습니다.",
    "[firm, resolute] 이 전선, 반드시 지켜내겠습니다."
  ],
  "battle_win": [
    "[composed, reporting] 예상한 승리입니다.",
    "[proud, loyal] 인의가 전략을 이겼습니다.",
    "[solemn, satisfied] 병사들 덕분입니다."
  ],
  "battle_draw": [
    "[steady, resolute] 다음에는 반드시 끝내겠습니다.",
    "[calm, vowing] 이 결과, 뼈에 새기겠습니다.",
    "[dutiful, determined] 물러나되 다음을 기약합니다."
  ],
  "battle_lose": [
    "[bitter, heavy] 내 부덕이 여기까지입니다.",
    "[ashamed, solemn] 면목이 없습니다.",
    "[seething, loyal] 반드시 되갚겠습니다."
  ],
  "clash_attack": [
    "[low, resolute] 뚫겠습니다!",
    "[firm, decisive] 이 한 수다!",
    "[commanding, surging] 앞으로!"
  ]
}
```

### greeting만 보유 예시 — 마돈나 (musician, bold)

```json
{
  "greeting": [
    "[fierce, proud] 나는 규칙을 만들기 위해 태어났다.",
    "[bold, electric] 끊임없이 나를 새로 만들어왔다.",
    "[defiant, raw] 나는 마돈나다. 그게 전부다."
  ]
}
```

### greeting만 보유 예시 — 말콤 글래드웰 (author, free)

```json
{
  "greeting": [
    "[curious, bright] 세상에는 설명되지 않은 패턴이 가득하지요.",
    "[lively, assured] 저는 복잡한 것을 단순하게 이야기하는 사람입니다.",
    "[playful, engaged] 티핑 포인트를 찾는 게 제 일이지요."
  ]
}
```

---

## 1. 미궁 (Tracker/Labyrinth)

### 게임 구조

```
좌측: 단서 (콘텐츠 4개 + 철학)     우측: 용의자 6인 (실명·아바타 공개)
                                    카드 클릭 → O(지목) / X(배제)
```

6명은 이미 **심문 대상으로 선정된 용의자**다. 유저는 단서를 모아 숨어든 인물을 특정한다.

### 세계관 프레이밍: "숨는 자"

> 숨은 인물은 용의자 6인 속에 섞여 있고, 유저가 추적한다.
> 인물의 목표는 "들키지 않는 것". 유저에게 잡히면 패배, 도주하면 승리.
> 배제된 용의자는 혐의가 풀려 용의선상에서 제외된다.

### 인터랙션별 대사 매핑 (2단계 구조)

모든 O/X 인터랙션은 **즉시 반응 → 결과 대사** 2단계로 구성된다.

**O (지목)**

| 단계 | 타이밍 | 화자 | 대사 | 인물 심리 |
|------|--------|------|------|----------|
| O 즉시 | 클릭 직후 | 지목된 인물 | `defaultLines.accused` | "나를 지목하다니" |
| O → 정답 | 1.5초 후 | 숨은 인물 | `dialogueLines.battle_lose` | 들켰다. 발각 |
| O → 오답 | 1.5초 후 | 숨은 인물 | `dialogueLines.battle_win` | 도주 성공 |

**X (배제)**

| 단계 | 타이밍 | 화자 | 대사 | 인물 심리 |
|------|--------|------|------|----------|
| X 즉시 | 클릭 직후 | 배제된 인물 | `defaultLines.accused` | "나를 의심하다니" |
| X → 배제 성공 | 1.5초 후 | 배제된 인물 | `defaultLines.cleared` | 혐의 해제. 풀려남 |
| X → 정답 배제 | 1.5초 후 | 숨은 인물 | `dialogueLines.battle_win` | 완전한 도주 |

### 미사용 대사

| 대사 | 사유 |
|------|------|
| `greeting` | 카드 클릭 시 대사 없음. 비게임 영역(프로필 등)에서 활용 |
| `answer` | 인물이 임무를 수락하는 맥락 없음 |
| `deploy` | 인물이 직접 행동 개시하는 시점 없음 |
| `battle_draw` | defaultLines.cleared로 대체 |
| `clash_attack` | 충돌 없음 |

### 대사 대입 검증 (측천무후 bold / 오기 loyal)

| 단계 | 측천무후 | 오기 |
|------|---------|------|
| O/X 즉시 `accused` | "대담한 선택이군." | "저를 의심하십니까." |
| O→정답 `battle_lose` | "이번은 졌다, 인정하겠다" | "면목이 없습니다" |
| O→오답 `battle_win` | "의심한 자들을 보았나" | "예상한 승리입니다" |
| X→배제 `cleared` | "알아보는 눈이 있군." | "혐의가 풀렸군요." |
| X→정답배제 `battle_win` | "처음부터 내 것이었다" | "인의가 전략을 이겼습니다" |

### 연출 방식

전체 서비스 공통으로 `DialogueSubtitle` (하단 고정 자막 스낵바, 3초 자동 소멸) 사용.

### 필요 작업

- [x] `greeting`을 `DialogueType` 타입에 추가
- [x] `getTrackerRound.ts`: 용의자 6인 전원의 `celeb_dialogues`, `speech_tone` 조회
- [x] `TrackerOption` 타입에 `speechTone`, `dialogueLines` 필드
- [x] `defaultLines.ts` 생성 (accused + cleared 상황, speech_tone 6종)
- [x] `useDialogue`에 `showDefaultLine()` 추가
- [x] O/X 2단계 대사 구조 구현 (즉시 accused → 1.5초 후 결과 대사)

---

## 2. 패권 (Battle/Hegemony)

### 게임 구조

```
로비 → 드래프트 (카드 픽) → 주장 선택 → 배틀 (카드 선택 → 출전 → 충돌 → 결과) × N라운드
```

- 플레이어 vs AI, 각자 카드 드래프트 후 라운드 진행
- 상성 기반 승패 판정

### 세계관 프레이밍

> 인물이 호명되고, 임무를 수락하고, 출전하여 싸운다.

### 인터랙션별 대사 매핑

| # | 단계 | 대사 | 인물 심리 | 비고 |
|---|------|------|----------|------|
| 1 | 드래프트 카드 클릭 | `greeting` | 첫 등장. "나는 이런 사람이다" | 2단계: 클릭=선택+greeting |
| 2 | 드래프트 선택 확정 | `deploy` | 결의. "내가 나서겠다" | 확정 버튼 클릭 시 |
| 3 | 주장 카드 클릭 | `answer` | 호명 수락. "맡겨라" | |
| 4 | 주장 임명 확정 | `deploy` | 결의. "직접 열겠다" | |
| 5 | 배틀-카드 선택 | `answer` | 호명 수락 | |
| 6 | 배틀-출전 (clashing) | `deploy` | 행동 개시 | |
| 7 | 배틀-충돌 클릭 | `clash_attack` | 기합 | |
| 8 | 라운드 승 / 일기토 승 | `battle_win` | 통쾌 | |
| 9 | 라운드 무 / 일기토 무 | `battle_draw` | 인내 | |
| 10 | 라운드 패 / 일기토 패 | `battle_lose` | 분함 | |

### 대사 대입 검증 (측천무후 bold / 오기 loyal)

| # | 측천무후 | 오기 |
|---|---------|------|
| 1 `greeting` | "황제의 자리, 내가 차지했다" | "인의가 병법의 근본입니다" |
| 2 `deploy` | "내가 직접 열겠다" | "인의를 앞세워 나아가겠습니다" |
| 3 `answer` | "내가 나서겠다" | "존명, 따르겠습니다" |
| 4 `deploy` | "길은 내가 만든다" | "병사와 함께라면 두렵지 않습니다" |
| 5 `answer` | "맡겨라" | "명을 받들겠습니다" |
| 6 `deploy` | "직접 나아가겠다" | "이 전선, 반드시 지켜내겠습니다" |
| 7 `clash_attack` | "내가 간다!" | "뚫겠습니다!" |
| 8 `battle_win` | "하늘의 뜻이 맞았다" | "예상한 승리입니다" |
| 9 `battle_draw` | "아직 끝이 아니다" | "다음에는 반드시 끝내겠습니다" |
| 10 `battle_lose` | "내 판단이 어긋났다" | "내 부덕이 여기까지입니다" |

### 필요 작업

- [x] 드래프트: 즉시 픽 → 2단계 (클릭=greeting, 확정 버튼=deploy)
- [x] 주장 선택: 카드 클릭에 `answer` 추가, 임명 확정을 `deploy`로 변경
- [x] 배틀 카드 선택: `answer` 유지
- [x] 배틀 출전(clashing): `deploy` 유지
- [x] 충돌 클릭: `clash_attack` 유지
- [x] 일기토 결과 대사 추가 (dueling→resolving 전환 시 battle_win/draw/lose)

---

## 3. 여명 (Dawn)

### 게임 구조

```
보드: 타임라인 슬롯 (좌→우 시간순)      퀴즈 카드: 1명씩 등장 (실명·아바타 공개)
이미 배치된 인물 카드들                    유저가 올바른 슬롯에 배치
                                          맞으면 보드에 고정, 틀리면 라이프 차감
```

- 퍼블릭 도메인 셀럽 200명 풀에서 출제
- 보드에 이미 배치된 인물 카드 클릭 → 상세 정보 확인 가능
- Eye of Time: 힌트 미니게임 (추가 정보 획득)
- 라이프 소진 시 게임 오버

### 세계관 프레이밍: "자기 자리를 찾아가는 존재"

> 인물들은 시간의 강 위에서 자신의 자리를 찾아가는 존재다.
> 올바른 자리에 놓이면 안착하고, 틀린 자리에 놓이면 아직 때가 아니라 말한다.

### 인터랙션별 대사 매핑

| # | 행동 | 화자 | 대사 | 비고 |
|---|------|------|------|------|
| 1 | 퀴즈 카드 등장 | 퀴즈 인물 | `greeting` (auto) | 새 카드 등장 시 자동 재생 |
| 2 | 퀴즈 카드 클릭 | 퀴즈 인물 | `greeting` | 수동 클릭 시 재소개 |
| 3 | 보드 카드 클릭 | 클릭된 인물 | `defaultLines.dawn_guide` | 게임 안내 팁 ("힌트를 보시오") |
| 4 | 정답 배치 | (없음) | — | 대사 없음. 새 카드 auto-greeting으로 자연 전환 |
| 5 | 오답 배치 | 퀴즈 인물 | `defaultLines.dawn_wrong` | "제 자리가 아닌 듯합니다" |
| 6 | 게임 클리어 | 마지막 배치 인물 | `battle_win` | 완성 |

### 대사 대입 검증 (측천무후 bold / 오기 loyal)

| # | 측천무후 | 오기 |
|---|---------|------|
| 1~2 `greeting` | "황제의 자리, 내가 차지했다" | "인의가 병법의 근본입니다" |
| 3 `dawn_guide` | "모르면 횃불을 써라." | "잘 모르면 힌트를 보시오." |
| 5 `dawn_wrong` | "여기가 아니다." | "아직 때가 아닙니다." |
| 6 `battle_win` | "하늘의 뜻이 맞았다" | "예상한 승리입니다" |

### 미사용 대사

| 대사 | 사유 |
|------|------|
| `answer` | 정답 배치 시 대사 없음 (새 카드 greeting과 겹침 방지) |
| `deploy` | 배치 게임이라 "출전" 맥락 없음 |
| `battle_draw` | `defaultLines.dawn_wrong`으로 대체 |
| `battle_lose` | `defaultLines.dawn_wrong`으로 통합 |
| `clash_attack` | 충돌 없음 |

### 연출 방식

전체 서비스 공통으로 `DialogueSubtitle` (하단 고정 자막 스낵바, 3초 자동 소멸) 사용.

### Eye of Time / 힌트

대사 적용 보류. 힌트 시스템에 대사를 넣으면 과잉 연출이 될 수 있어 게임 전체 대사가 안정된 후 검토.

### 필요 작업

- [x] `getDawnDialogues` 서버 액션: `celeb_dialogues`, `speech_tone` 조회
- [x] 퀴즈 카드 등장 auto-greeting
- [x] 퀴즈 카드 클릭 greeting
- [x] 보드 카드 클릭 `defaultLines.dawn_guide`
- [x] 정답 배치 대사 제거 (겹침 방지)
- [x] 오답 배치 `defaultLines.dawn_wrong`
- [x] 게임 클리어 `battle_win`

---

## 4. 천도 (Suikoden)

### 현황: 독자적 대사 시스템 보유

천도는 `celeb_dialogues`(DB 7종)와 **별개의 자체 대사 시스템**을 이미 갖추고 있다.

| 항목 | 미궁/패권/여명 | 천도 |
|------|---------------|------|
| 대사 데이터 | `celeb_dialogues` (DB) | `suikoden/dialog.ts` (코드 내 템플릿) |
| 말투 체계 | `speech_tone` 6종 (loyal, composed 등) | `SpeechTone` 6종 (commander, scholar, artisan, noble, gentle, free) |
| 대사 유형 | 7종 (greeting~clash_attack) | 11종 (recruit_success, battle_start 등) |
| 연출 컴포넌트 | `DialogueSubtitle` | `DialogSnackbar` (자체) |
| 대사 생성 | DB에서 랜덤 픽 | `generateDialog()` 함수가 톤별 템플릿에서 랜덤 픽 |

### 천도 자체 대사 유형 11종

| 유형 | 화자 | 상황 |
|------|------|------|
| `recruit_ask` | 리더 | 방랑 중 객장 인물에게 등용 제안 |
| `recruit_success` | 상대 | 등용 수락 |
| `recruit_fail` | 상대 | 등용 거절 (조건 미달) |
| `recruit_reject` | 상대 | 유저가 등용 거부 시 상대 반응 |
| `dismiss_farewell` | 상대 | 지나칠 때 작별 인사 |
| `visitor_arrive` | 방문자 | 전략 페이즈에서 자발적 방문 |
| `turn_start` | 리더 | 새 계절(턴) 시작 |
| `battle_start` | 리더 | 전투 개시 |
| `battle_win` | 리더 | 전투 승리 |
| `battle_lose` | 리더 | 전투 패배 |
| `building_complete` | 리더 | 건설 완료 |

### 결론: celeb_dialogues 통합 불필요

천도의 대사 시스템은 게임 고유 맥락(등용, 건설, 턴제 전략)에 밀접하게 결합되어 있다.
`celeb_dialogues`의 7종 대사(greeting, select 등)로는 이 맥락을 커버할 수 없다.

**현행 유지**. `celeb_dialogues` 통합 대상에서 제외한다.

---

## 5. 대결 (Duel)

### 현황: 패권의 하위 미니게임

대결은 독립 게임이 아니라 **패권(Battle) 게임 내 충돌(clash) 시점에 발동하는 미니게임**이다.

```
패권 흐름:  드래프트 → 주장 선택 → [배틀: 카드 선택 → 출전 → 충돌 → 결과] × N라운드
                                                         ↑
                                              여기서 ClashArena 진입
                                              command에 따라 3종 분기:
                                              - assault → RhythmArena
                                              - stratagem → DuelArena (충전-해방 격투)
                                              - govern → SimonArena
```

### 대사 흐름

대결 진입/퇴출 시점의 대사는 **패권 게임이 관리한다**.
- 진입: 패권 #7 `clash_attack` (충돌 클릭 시)
- 퇴출: 일기토 결과 → `battle_win/draw/lose` (dueling→resolving 전환 시 자동 발동)

대결 내부에는 별도 대사 연출이 없다 (미니게임 특성상 빠른 조작에 집중).

### 결론: 별도 대사 매핑 불필요

패권 게임의 `clash_attack`(진입) + `battle_win/draw/lose`(결과) 매핑이 대결을 커버한다.

---

## 6. 비게임 영역

### 후보 영역

| 영역 | 경로 | `greeting` 활용 가능성 | 비고 |
|------|------|----------------------|------|
| **셀럽 프로필 페이지** | `/celeb/[slug]` | 높음 | 프로필 상단에 greeting 대사 표시 |
| **홈 셀럽 카드** | `/` | 중간 | 카드 호버/클릭 시 greeting |
| **탐색 셀럽 목록** | `/explore/celebs` | 낮음 | 목록에서는 과잉 연출 |
| **오늘의 인물** | `/api/cron/today-figure` | 중간 | 오늘의 인물 소개에 greeting 활용 |

### 현재 greeting 보유 현황

- **풀셋 보유 (214명)**: 게임 대상 인물. greeting 3변형 보유
- **greeting만 보유 (479명)**: 현대 인물. greeting 3변형만 보유
- **미보유 (172명)**: 대사 데이터 없음

총 693명(80%)이 greeting을 보유하므로 비게임 영역에서도 활용 가능.

### 설계 방향 (유저 확인 필요)

**A안: 셀럽 프로필 페이지에만 적용**
- `/celeb/[slug]` 페이지 상단에 greeting 대사를 말풍선으로 표시
- 가장 자연스러운 맥락: "이 인물의 자기소개"

**B안: 비게임 영역 전체 보류**
- 게임 내 대사 시스템 안정화 후 검토
- 현재 스코프를 게임에 집중

### 기술 고려사항

비게임 영역에서 대사를 쓰려면:
- 서버 컴포넌트에서 `celeb_dialogues` 조회 필요 (현재 게임 액션에서만 조회)
- `DialogueSubtitle`는 게임 전용 연출이므로, 비게임용 경량 컴포넌트 필요
- `pickDialogueLine()` 유틸로 감정태그 제거 + 랜덤 픽 처리

---

## 기술 공통사항

### DialogueType (7종, 구현 완료)

```typescript
// lib/game/voice/types.ts
type DialogueType = "greeting" | "answer" | "deploy" | "battle_win" | "battle_draw" | "battle_lose" | "clash_attack"
```

### quote (명언)

`profiles.quotes` 필드에 저장된 인물 명언. dialogueLines·defaultLines와 별개의 데이터 소스다.

| 항목 | 내용 |
|------|------|
| **저장소** | `profiles.quotes` (1문장, 50자 이내) |
| **보유율** | 대부분의 셀럽 보유 (기본 정보 생성 시 작성) |
| **성격** | 인물의 실제 발언·저서에서 발췌한 대표 명언 |
| **용도** | 상황에 맞다면 게임·비게임 어디서든 대사로 활용 가능 |
| **확정 사용처** | 없음 (추후 결정) |

- dialogueLines(창작 대사)와 달리 **실제 역사적 발언**이라는 차별점이 있다
- 감정 태그(`[emotion]`)가 없으므로 별도 파싱 불필요

### dialogueLines vs defaultLines

| 구분 | dialogueLines | defaultLines |
|------|--------------|--------------|
| **정의** | DB 개인화 대사 | 톤별 범용 대사 |
| **저장소** | `celeb_dialogues` 테이블 (인물별 고유) | 코드 하드코딩 |
| **기반** | 인물 개별 작성 (7상황 × 3변형) | `speech_tone` 6종 (loyal, composed, bold, humble, gentle, free) |
| **사용 시점** | 게임 핵심 인터랙션, 프로필 등 개인화 필요 상황 | DB 개인화 불필요한 부수적 인터랙션 (천도 등용/건설, UI 피드백 등) |

- dialogueLines가 존재하면 항상 우선 사용한다
- defaultLines는 dialogueLines가 없거나, 게임 고유 맥락(천도 11종 등)처럼 DB 7종으로 커버 불가한 상황에서 사용한다

### 대사 연출 공통

전체 서비스에서 `DialogueSubtitle` (하단 고정 자막 스낵바, 3초 자동 소멸) 단일 컴포넌트 사용.

### 비게임 영역용 경량 유틸

`useDialogue`는 게임 전용(SFX, Map). 비게임에서는 단순 함수가 필요할 수 있음.

```typescript
function pickDialogueLine(lines: DialogueLines, type: DialogueType): string
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-27 | 문서 생성. 미궁 게임 6가지 인터랙션별 대사 매핑 확정 ("숨는 자" 프레이밍) |
| 2026-02-27 | 여명 게임 6가지 인터랙션별 대사 매핑 확정 ("자기 자리를 찾아가는 존재" 프레이밍) |
| 2026-02-27 | 패권 게임 대사 매핑 재설계. greeting 추가로 한 칸씩 밀어 7종 전부 사용 |
| 2026-02-27 | 천도: 독자적 대사 시스템 보유, celeb_dialogues 통합 불필요 확인 |
| 2026-02-27 | 대결: 패권 하위 미니게임, 별도 대사 매핑 불필요 확인 |
| 2026-02-27 | 비게임 영역: 후보 영역 정리, 설계 방향 A/B안 제시 |
| 2026-02-27 | 기술 공통사항: dialogueLines vs defaultLines 용어 정의 추가 |
| 2026-02-27 | 미궁: 대사 매핑 재설계. 카드클릭 greeting 제거, 오답 시 2인 순차 대사, 배제 시 defaultLines.cleared 도입 |
| 2026-02-27 | 미궁: 6명 → "용의자 6인" 프레이밍 보강. 배제 = 혐의 해제 |
| 2026-02-27 | 미궁: 2단계 대사 구조 도입 (O/X 즉시 accused → 결과 대사). defaultLines.accused 추가 |
| 2026-02-27 | 여명: 대사 매핑 재설계. 정답 배치 select 제거, 오답→dawn_wrong, 보드클릭→dawn_guide. defaultLines 2종 추가 |
| 2026-02-28 | 패권: 드래프트 2단계 구현 (클릭=greeting, 확정버튼=deploy). 주장 선택 카드클릭=select, 임명=deploy로 변경 |
| 2026-02-28 | 패권: 일기토 결과 대사 추가 (dueling→resolving 전환 시 battle_win/draw/lose 자동 발동) |
| 2026-02-28 | 기술 공통: quote(명언) 데이터 소스 문서화. 확정 사용처 없이 활용 가능 상태로 기록 |
