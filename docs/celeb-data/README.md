# 셀럽 데이터 생성 디렉토리

> **최종 실측 체크: 26.07.16** — 실제 파일 목록·실 DB 대조. `persona/` 디렉토리 **부재** 확인(서술 삭제), 상황 키 `answer`→`roll_call` 교정(DB 실측: `roll_call` 1,571행 / `answer` 2행), `quote`·`lines_en` 서술 추가, 작업 단위 표(1,071명 기준)를 현황으로 대체. **`dialogue/` 11종은 인물별 대사 원고(창작물)라 점검 대상이 아니다** — 내용은 열람만 했고 손대지 않았다.

고유 대사(dialogue) 원고와 미등록 초안을 관리한다. 에이전트가 작성하고, 검수 후 일괄 DB 등록한다. `celeb-speech.md` 트랙의 산출물 보관소이며, **DB가 정본이다.**

---

## 디렉토리 구조 (실측)

```
docs/celeb-data/
├── README.md
└── dialogue/
    ├── 01-괴테.md … 11-카라바조.md   ← 등록 완료 원고 11종 (markdown)
    └── _unregistered/{nickname}.json  ← 미등록 초안 29종 (JSON, 대사 빈칸 다수)
```

- **`persona/` 디렉토리는 존재하지 않는다.** 페르소나는 이 디렉토리를 거치지 않고 DB(`celeb_persona`)에 직접 등록한다. 룰북은 `docs/project/celeb/celeb-5-persona.md`.
- 직군별 하위 폴더(`{profession}/`)도 없다. 원고는 번호-닉네임 평면 배치, 초안은 `{한글 닉네임}.json` 평면 배치(공백은 `_`).

---

## 파일 형식

### dialogue/{NN}-{nickname}.md — 등록 완료 원고

인물 1명당 markdown 1장. 헤더에 `# {정식 이름} ({profession})`, 이어서 `quote` 블록과 `dialogueLines` 블록을 둔다. 상황별로 `1. [감정1, 감정2] 대사` 3줄씩.

### dialogue/_unregistered/{nickname}.json — 미등록 초안

```json
{
  "celeb_id": "uuid",
  "nickname": "한글 닉네임",
  "profession": "직군 코드",
  "speech_tone": "톤 코드",
  "lines": {
    "greeting": ["[e1, e2] 대사1", "[e1, e2] 대사2", "[e1, e2] 대사3"],
    "roll_call": ["...", "...", "..."],
    "deploy": ["...", "...", "..."],
    "battle_win": ["...", "...", "..."],
    "battle_draw": ["...", "...", "..."],
    "battle_lose": ["...", "...", "..."],
    "clash_attack": ["...", "...", "..."],
    "quote": "대표 명언 (한국어)"
  }
}
```

- 룰북: `docs/project/celeb/celeb-speech.md` §6.3
- **7상황 × 3변형 = 21개 대사** + `quote` 1개. 상황 키는 `greeting`·`roll_call`·`deploy`·`battle_win`·`battle_draw`·`battle_lose`·`clash_attack`이다(`answer`가 아니다).
- **명언 SSoT는 `celeb_dialogues.lines.quote`(한국어) / `lines_en.quote`(영문)** 두 곳뿐이다. `profiles.quotes`·`quotes_en`은 존재하지 않는다.
- 영문 대사는 별도 컬럼 `lines_en`에 같은 구조로 들어간다(이 디렉토리 파일들은 한국어만 담는다).

---

## 진행 현황 (2026-07-16 실측)

작성 당시의 직군별 작업 배분표(합계 1,071명)는 기준이 낡아 삭제했다. 현재 실측치는 아래와 같다.

| 항목 | 수치 |
|------|:----:|
| 셀럽(`profiles`, CELEB) | 1,674 |
| 대사 보유(`celeb_dialogues`) | 1,577 |
| 영문 대사 보유(`lines_en`) | 1,576 |
| 한국어 명언 보유(`lines.quote`) | 1,411 |
| 영문 명언 보유(`lines_en.quote`) | 1,411 |
| 페르소나 보유(`celeb_persona`) | 1,577 |

> 명언 수치는 **NULL과 빈 문자열을 모두 제외**한 값이다(`lines->>'quote' IS NOT NULL AND <> ''`).

- 대사·페르소나 미보유 셀럽이 97명 남아 있다(1,674 − 1,577).
- **한국어 명언 1,411/1,577 = 89%** 보유. 남은 공란은 대부분 파라오·고대 군주 등 근거 없는 인물이다(원칙: 근거 없으면 공란).
- **한국어·영문 명언이 1,411쌍으로 완전 일치한다**(한쪽만 존재 0건). 과거의 영문>한국어 역전은 26.07.16 세션2에서 해소됐다.
- **영문 대사(`lines_en`)는 1,576명 완비**(26.07.16 세션2 전량 번역). 한국어 대사 21개 완비 인물의 영문도 1,547명 완비. 이 과정에서 옛 키 `answer`가 `roll_call` 자리를 차지하던 데이터 결함 91명분을 정리했다.
- 이 디렉토리의 원고 11종·초안 29종은 전체 작업량의 일부만 담는다. 대량 등록은 이 디렉토리를 거치지 않고 진행됐다.

---

## DB 일괄 등록 (검수 완료 후)

### dialogue 등록

```sql
INSERT INTO celeb_dialogues (celeb_id, lines)
VALUES
  ('{celeb_id}', '{lines JSON}'),
  ...
ON CONFLICT (celeb_id) DO UPDATE SET lines = EXCLUDED.lines, updated_at = now();
```

---

## 주의사항

- Supabase 프로젝트 ID: `wouqtpvfctednlffross` (2026-07-16 실측 확인)
- 기존 DB 데이터와 충돌 시 ON CONFLICT로 덮어쓴다
- **파일 생성만으로 DB에 반영되지 않는다. 반드시 별도 등록 작업이 필요하다.** 이 디렉토리는 보관소이고 정본은 DB다. 원고와 DB가 다르면 DB가 맞다.
- `dialogue/` 원고 11종은 **창작물**이다. 문서 점검·교정 대상이 아니며 내용을 고치지 않는다. 대사 품질 작업은 `celeb-6a-dialogue`·`celeb-6b-quotes` 트랙 소관이다.
