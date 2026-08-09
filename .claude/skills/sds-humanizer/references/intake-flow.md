# Intake Flow

Use intake to avoid rewriting into the wrong social situation.

## Step 0 — Source Profile (diagnose before asking)

Read the text and build a profile before any question:

1. **Register census**: tally sentence-ending families across the whole text (not just the opening) —
   `~습니다` / `~해요` / `~다` / colloquial fragments. The dominant family is the current register;
   a near-even split means "mixed" and is itself a finding worth fixing.
2. **Genre evidence**: collect structural signals — lead-paragraph fact density (news/press release),
   greeting + request (email), notice header with dates (internal board), numbered imperative steps
   (manual), run IDs and test names (agent log), first-person narration (blog/essay), quote-heavy
   body (interview write-up).
3. **Reach estimate**: internal jargon, team nicknames, or issue numbers imply team/company;
   honorific distance and disclaimer language imply partner/public.

Then branch:

| Situation | Action |
|---|---|
| User already stated use + register | Skip the gate. Go straight to Brief. |
| Profile is clear | Show the diagnosis and ask the confirm-or-switch gate (below): ONE AskUserQuestion call, TWO questions. |
| Profile is mixed or text too short | Ask the two-question intake (below). |

Confirm-or-switch gate — one AskUserQuestion call carrying two independent questions,
Q1 genre and Q2 register (first option of each = diagnosed profile, recommended):

```text
Q1. 장르 — "원문은 [기술 리서치 보고서]로 보입니다. 장르를 어떻게 할까요?"
  1. 이 장르 유지 + AI 티 제거 (권장) — 표지·평행문·문장 연결까지 자연스럽게 다듬기
  2. [가장 그럴듯한 대안 장르]로 전환
  3. 다른 장르 직접 지정
Q2. 말투 — "원문 말투는 [평서체(~다)]입니다. 말투를 어떻게 할까요?"
  1. [진단된 원문 말투] 유지 (권장)
  2. 격식체(~습니다)로 전환
  3. 경어체(~해요)로 전환
  4. 친근한 구어체로 전환
```

Q2 composition rules:

- The diagnosed source register is absorbed into option 1 ("유지"), so the remaining standard
  registers — 격식체(`~습니다`), 경어체(`~해요`), 평서체(`~다`), 친근한 구어체 minus the source's
  own — always fit in the three switch slots. **격식체 and 경어체 are always both visible** when
  they are not the source register. Never collapse the switch candidates to one mapped option:
  the old (source register × genre) mapping now only decides **ordering** — the most plausible
  switch for the diagnosed genre goes in slot 2.
- Agent-log source (run IDs, test names, tool output): replace the 구어체 slot with
  에이전트 해석체. Non-standard registers (반말 etc.) arrive through the automatic "Other"
  free-input option — no register is unsupported just because it is not listed.
- Do not add a third question for intensity — intensity defaults to Standard (question fatigue).

Genre and register are **independent choices**. If Q1 switches genre, the register still comes
from the Q2 answer — never silently re-derive it from the new genre's default preset. A genre
switch combined with "말투 유지" keeps the source endings even when the target genre usually
uses different ones; state that combination in the basis line.

Default is always option 1 of each question — the skill removes machine traces inside the
source's own voice. A genre or register switch happens only when the user picks it.

Q1 option 1 is NOT "sentence structure frozen": function-marker sentences, parallel short-sentence
rhythm, missing logical connectives, and tense drift are machine traces, so removing them —
including sentence merges and reordering within a paragraph — is part of that option, with meaning
and register invariant (`rewriting-playbook.md` Pass 5.5).

## Minimum Brief

Resolve:

- Use: where the text will appear.
- Register: how close or formal the speaker should sound.
- Reader: who will read it.
- Protected spans: what must remain exact.
- Intensity: how much change is acceptable.

## Ask Only When Needed (fallback when the profile is unclear)

Ask a question when both are true:

- Use or register could not be resolved by the Source Profile.
- A wrong assumption would visibly harm the result.

Use this compact question:

```text
용도와 말투를 먼저 정하겠습니다.
1. 용도는 보고서, 공지, 사내 게시판, 이메일, 블로그, 뉴스 기사, 보도자료, 사용 안내, 발표문,
   기술문서, 에이전트 보고 해석 중 무엇인가요? (목록에 없으면 직접 적어주세요)
2. 말투는 격식체(~습니다), 경어체(~해요), 평서체(~다), 친근한 구어체 중 무엇으로 할까요?
```

An unlisted genre answer is valid — place it on the reach × job axes in `use-case-matrix.md`.

If the text strongly implies the answer, proceed:

```text
용도는 기술 보고서, 말투는 격식체로 보고 다듬었습니다.
```

## Inference Hints

- Headings, metrics, risks, decisions: likely report or technical document.
- Greeting, request, recipient reference: likely email.
- First-person story, public explanation, loose paragraphing: likely blog.
- Run IDs, commits, test names, logs: agent-status explanation.
- Vulnerabilities, injection, RFC-like wording: security document.

## Intensity

- Conservative: remove only disruptive machine traces; preserve structure.
- Standard: improve flow and register while keeping paragraph shape.
- Strong: restructure sentences and order locally, still no new content.

If the user asks for "AI 티 제거" without intensity, use Standard.

For blog / essay / 회고 genres, Standard includes the Human Voice pass
(`rewriting-playbook.md` Pass 5.5 — markers, parallel merges, abstract closes, tense, connectives).
Conservative skips that pass only when the user explicitly asks for minimal edits.

## Protected Spans

Before editing, mark:

- Numbers, units, percentages, dates, versions.
- Product names, people, organizations, project names.
- Direct quotes.
- Code, commands, file paths, config keys.
- IDs, hashes, issue numbers, PR numbers, run IDs.
- Legal, security, and compliance terms.
