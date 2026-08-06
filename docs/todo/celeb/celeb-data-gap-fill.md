# 셀럽 데이터 결손 전수 정비 — 진행·재개 문서

> 시작: 2026-07-31 · 상태: **진행 중.** 결손 인물 727명 → 587명 (2026-08-01 02:5x 실측)

## 무엇을 하는 작업인가

`profiles`(CELEB) 2,426명의 **텍스트 데이터 빈칸**을 룰북 규격에 맞게 채운다. 대상 트랙은
basic(이름·수식어·소개·직군·국적·생몰) · 감상철학 · 영향력 7축 · 페르소나 16항목+종합해설 ·
speech(톤·명언·대사 21개) · 영문(i18n)이다.

**범위 밖**: 가상독백(`virtual_monologue`). 전용 트랙이 따로 있고 한국어 전수는 이미 완료됐다
(`docs/archive/virtual-monologue-quality-overhaul-2026-07.md`).

**결손으로 세지 않는 것**: `fiction` 티어의 생몰·국적(특정 불가가 정상), `fiction`·`relation`
티어의 영문 필드(번역 대상 아님), `death_date`(생존자는 비어 있는 게 정상).

## 구조 — 조사와 반영을 분리했다

에이전트는 **조사만** 하고 로컬 JSON을 남긴다. DB 반영은 스크립트가 결정론적으로 한다.
이렇게 하면 에이전트가 중간에 죽어도 작업물이 남고, 에이전트 정원을 전부 조사에 쓸 수 있다.

```
선점 → 조사 → research/<slug>.json  (에이전트, 여러 대)
                    ↓
        celeb-fill.ts apply-dir --apply  (오케스트레이터, 1회)
```

### 도구 (모두 `sw/web-bo`에서 실행)

| 스크립트 | 역할 |
|---|---|
| `scripts/audit-celeb-track-gaps.ts` | **결손 전수 감사.** 진행 상황의 단일 원천. `--json` 지원 |
| `scripts/audit-celeb-basic-gaps.ts` | basic 필드만 보는 축약 감사 |
| `scripts/claim-celeb-work.ts` | `--worker <레인> --count N` — 레인별 독립 선점. 중복 선점 차단, lease 30분, 보류 항목 제외 |
| `scripts/celeb-fill.ts` | `dump` / `apply --file` / `apply-dir --dir` — **빈칸만 채우는** 조건부 반영. 기본 dry-run, `--apply`로 저장 |
| `scripts/defer-celeb-gap.ts` | 근거 부재 항목 보류 기록. 기록분은 선점 대상에서 빠져 큐 앞단을 막지 않는다 |
| `scripts/build-celeb-wave.ts` | (구) 파도 단위 묶음 생성기. 선점 방식으로 대체됐다 |

### 작업 폴더 `sw/web-bo/.tmp-celeb-fill/`

| 경로 | 내용 |
|---|---|
| `INSTRUCTIONS.md` | **조사 에이전트 지시서.** 절차·필드 규격·절대 규칙·자체 검수 항목 |
| `research/` | 조사 결과 대기분 |
| `research-applied/` | 반영 완료분 (이력) |
| `claims/` | 선점 잠금. 반영 성공 시 자동 반납 |
| `deferred.json` | 보류 장부 (근거 부재 사유 포함) |

## 반영 도구의 안전 규칙

- **빈칸만 채운다.** 기존값이 있는 필드·대사 슬롯은 무조건 보존한다.
- 신규 셀럽 생성 경로가 없다. 기존 인물의 빈칸 채우기 전용.
- `celeb_influence`·`celeb_persona`·`celeb_dialogues` 행이 없으면 만든다.
- `celeb_persona`는 `persona` jsonb만 쓴다(평면 점수 컬럼은 DB 트리거가 동기화).
- 점수 범위 검사: 영향력 0~10 정수, 페르소나 0~100(dispositions는 -100~100).
- 반영 후 DB를 다시 읽어 **왕복 검증**한다. jsonb 키 순서는 무시하고 비교한다.
- 작성자 실수 흡수: 영향력 필드를 `profiles` 아래에 넣으면 제 위치로 옮긴다.
  `speech_tone`·`profession`이 규정 코드가 아니면 그 필드만 빼고 나머지는 반영한다.

## 운영 방법 — 동시 실행 대수가 제약이다

🔴 **서브에이전트 동시 실행을 늘리면 처리량이 늘지 않고 서비스 처리량 제한으로 즉시 실패한다.**
실측(2026-07-31~08-01):

| 동시 대수 | 결과 |
|---|---|
| 40 / 14 / 12 | 시작 직후 차단, 산출 0~9건 |
| 10 / 6 / 4 | 조기 차단, 산출 9~22건 |
| 3 | 완주하기도 하고 차단되기도 함 |
| **1 (레인 1개 × 12단계 순차)** | **매번 완주. 회차당 15~36건 산출** |

그래서 현재 운용은 **레인 1개 × 순차 12단계**다. 각 단계가 새 세션이라 컨텍스트가 초기화되고,
스스로 3명을 선점해 처리한 뒤 끝난다. 단계 사이에 다른 레인을 기다리지 않는다.

한 회차 절차:

```bash
cd sw/web-bo
# 1) 레인 1개 × 12단계로 조사 (subagent, model=claude-opus-5)
#    각 단계 프롬프트: "LANE=lane-a. .tmp-celeb-fill/INSTRUCTIONS.md 절차대로 조사만 하라"
# 2) 반영
pnpm exec tsx scripts/celeb-fill.ts apply-dir --dir .tmp-celeb-fill/research          # dry-run
pnpm exec tsx scripts/celeb-fill.ts apply-dir --dir .tmp-celeb-fill/research --apply
# 3) 진행 확인
pnpm exec tsx scripts/audit-celeb-track-gaps.ts
```

중단으로 선점이 남았으면 `rm -rf .tmp-celeb-fill/claims`로 회수한다(lease 30분이면 자동 만료).
장시간 돌릴 때는 `caffeinate -dimsu -t 10800 &`로 절전을 막는다.

## 우선순위

선점기는 `status='active'` 먼저, 그다음 결손 개수 많은 순으로 준다. 공개 노출 중인 인물이
먼저 정비된다.

## 남은 규모 (2026-08-01 실측)

결손 587명. 트랙별로는 i18n·감상철학·speech가 가장 크고, 영향력·페르소나는 **행 자체가 없는**
인물이 300명대다(한 명당 7축 + 16항목 + 해설이라 작업량이 크다).

```bash
pnpm exec tsx scripts/audit-celeb-track-gaps.ts   # 최신 수치는 항상 이 명령이 정본
```

## 알게 된 함정

- **근거 부재 항목이 큐 앞단을 막는다.** 활성 인물의 생년 미상 같은 항목은 매번 먼저 뽑혀
  작업자가 같은 헛수고를 반복한다. `defer-celeb-gap.ts`로 반드시 기록해야 큐가 전진한다.
- **`celeb_persona.persona`에는 `rationale_ko`·`rationale_en`(종합 해설)이 있다.** 그룹 4종만
  있는 줄 알고 만들면 반영이 거부된다.
- **jsonb는 키 순서를 보존하지 않는다.** 왕복 검증을 문자열 비교로 하면 정상 반영이 실패로 찍힌다.
- **조사 에이전트에게 룰북 전체를 읽히지 마라.** 룰북 합계 114KB라 여러 대가 동시에 읽으면
  처리량 한도를 밀어올린다. 규격 요약을 지시서에 넣고 룰북은 예외 상황에만 열게 했다.
- **26.07.31 22:13~22:23(UTC 13:13~13:23)에 CELEB 157명이 신규 생성됐다.** 아이돌·배우
  묶음이며 이 정비 작업과 무관한 별도 등록 경로다(같은 날 19:46에도 같은 형태가 있었다).
  이 인물들은 basic은 갖췄으나 영향력·페르소나·대사 행이 없어 이번 정비 대상에 들어간다.
