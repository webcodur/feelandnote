# Metaphor & Idiom Policy (비유·관용 표현 처리)

LLM-written Korean carries figurative language Korean readers do not actually use: English-calque
idioms, decorative object images that close a lesson, and developer jargon used figuratively in
front of a general reader. This file defines how to detect, classify, and repair them.

**Default action is removal (plainification). Replacement with a common Korean expression is a
capped exception, never the rule.**

## 1. Detection

Two layers — run both:

1. **Fixed calque priors** (string-matchable; absorbed from DaleSeo/korean-skills humanizer
   패턴 16 "영어 관용구 직역" plus observed cases in this skill's own sessions):
   - `~의 중심에 (있다/서 있다)`, `A에서 Z까지`, `~의 세계`, `~의 여정`, `퍼즐(을 맞추다/의 조각)`
   - `다른 근육`, `양날의 검`, `동전의 양면`, `북극성`, `유령 ~`(도메인 용어가 아닐 때)
   - `씨앗`(불씨 비유), `주저앉다`(사물·추상 주어), `발자국을 남기다`, `다리를 놓다`(추상 대상),
     `문을 열다`(추상 대상), `~라는 항해/등대/나침반`
2. **Contextual judgment** (no regex can catch these — judge per sentence):
   - A lesson or conclusion is closed with an object image (`한쪽 다리가 짧은 의자였습니다`).
   - Re-translating the phrase into English yields a stock English idiom
     (a chair with one short leg / different muscles / shallow linter).
   - The vehicle (the object in the image) appears once and never again in the text.

## 2. Triage — three types, three repairs

**T1 — Domain-term figurative** (`린터`, `파이프라인`, `Pearl의 인과 사다리`):

- Reader is in that domain (developer, DBA, …) → keep as written.
- Reader is general or mixed → gloss on first use or replace with a plain description:
  `얕은 린터처럼 끝냈습니다` → `기계적인 문법 검사 수준에서 끝냈습니다`.
- Terms anchored to a proper noun (`Pearl의 인과 사다리`) always stay — they are citations,
  not decoration.

**T2 — Calque / decorative metaphor** → **plainify (the default).** Rewrite the sentence as the
fact that remains when the image is removed:

- `한쪽 다리가 짧은 의자였습니다` → `근거의 무게가 한쪽으로 쏠려 있었습니다`
- `깊이와 넓이는 다른 근육입니다` → `깊이와 넓이는 다른 능력입니다`
- `이 기술은 산업의 중심에 있으며` → `이 기술은 산업에서 핵심이며`

The old "author's personal metaphor = human signal" exemption applies **only when the source is
human-written**. When the source is diagnosed AI-generated — this skill's usual input — a one-off
object image is an LLM trace, not a human signal, and gets plainified like any other T2 hit.

**T3 — Replacement candidate** → swap in a common Korean expression **only when both hold**:
plainifying would delete the very point the sentence makes, AND an expression on the whitelist
below matches the meaning exactly (not approximately). Caps: **관용구 교체 ≤ 2 per document,
사자성어 ≤ 1 per document**, and only in genres where it reads naturally (회고·에세이·블로그·격식
보고서). Anything over the cap falls back to T2 plainification.

## 3. Common-expression whitelist (교체 전용 · 이 목록이 전부)

Expressions NOT on this list are never used as replacements. The list is deliberately small:
top-frequency only.

관용구:

| 표현 | 쓰는 상황 |
|---|---|
| 첫 단추를 잘못 끼우다 | 초기 결정이 후속 문제의 원인일 때 |
| 두 마리 토끼(를 잡다/놓치다) | 상충하는 두 목표를 동시에 좇을 때 |
| 밑 빠진 독에 물 붓기 | 구조적 원인을 안 고친 채 자원만 반복 투입 |
| 빙산의 일각 | 드러난 문제가 전체의 일부일 때 |
| 수박 겉핥기 | 표면만 훑는 검토·학습 |
| 나무만 보고 숲을 못 보다 | 세부에 매몰돼 전체 구조를 놓침 |
| 발등에 불이 떨어지다 | 마감·장애가 임박했을 때 |
| 제자리걸음 | 반복해도 진전이 없을 때 |
| 걸림돌 / 디딤돌 | 방해 요인 / 발판이 되는 요인 |
| 악순환 / 선순환 | 되먹임 구조 |
| 물거품이 되다 | 노력·성과가 무효가 될 때 |
| 반쪽짜리 | 절반만 구현·성립된 결과물 |
| 돌다리도 두들겨 보다 | 확실해 보여도 검증할 때 |

사자성어 (문서당 최대 1회, 격식·회고 장르만):

| 표현 | 쓰는 상황 |
|---|---|
| 시행착오 | 반복 실패를 거친 학습 (사실상 일반어 — 캡 계산에서 제외) |
| 설상가상 | 나쁜 상황에 악재가 겹칠 때 |
| 우왕좌왕 | 방향 없이 헤맬 때 |
| 중구난방 | 기준 없이 제각각일 때 |
| 유명무실 | 이름만 있고 실체가 없을 때 |
| 어불성설 | 주장의 논리가 성립하지 않을 때 |
| 자업자득 | 자기 결정이 자기 문제로 돌아올 때 |
| 본말전도 | 목적과 수단이 뒤바뀌었을 때 |
| 유야무야 | 결론 없이 흐지부지 끝날 때 |
| 일석이조 | 한 조치로 두 효과 (남용 주의 — 확신 없으면 평서화) |

**Deliberately excluded** (AI 남용 표지이거나 문어 과잉이라 교체어로 금지): `양날의 검`,
`동전의 양면`, `여정`, `북극성`, `타산지석`, `괄목상대`, 그리고 위 목록에 없는 모든 표현.

## 4. Injection guard (절대 규칙)

Absorbed from a recorded incident in epoko77-ai/im-not-ai (a rewriter injected signature phrases
the source never had; the result was rated ★1 and the project added a "역방향 삽입 금지" rule):

- Replacement happens **only in a metaphor's place**. If the original sentence is plain, never add
  a metaphor, idiom, or 사자성어 to it — not even to "improve flow".
- A whitelist expression already present in the source stays untouched (it is the author's word).
- Rotation applies across documents: do not map one source image to the same replacement every
  time — uniform swaps create a new machine fingerprint (SKILL.md Boundaries).

## 5. Where this runs

- **Pass 4.6** in `rewriting-playbook.md` (all genres) is the primary site.
- **Pass 5.5 step 4** (blog·essay·회고) defers to this file for its metaphor bullet.
- `rewrite_guard.py` cannot verify this policy (it needs contextual judgment); the fixed priors in
  §1 may be spot-checked with Grep on the rewritten file as a manual sanity pass.
