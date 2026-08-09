# Use-Case Coordinates

Genres are not a fixed list. Every use case sits on two axes, and the axes — not the genre name —
decide the editing rules. Named presets below are landmark points for fast lookup; an unlisted genre
("사보 기고문", "IR 자료", "웨비나 안내"…) is placed on the axes and inherits their rules instead of
being rejected.

## Axis 1 — Reach (누가 보는가)

| Level | Meaning | Editing pressure |
|---|---|---|
| team | own team, chat-like | lowest — keep team voice, minimal edits |
| company | whole company, boards/notices | consistent politeness, clear action items |
| partner | external but named counterpart | formal, low-risk wording, no slang |
| public | anyone can read | highest — objectivity, no internal jargon, reputation-safe |

Wider reach always wins: if a text serves two reach levels, edit for the wider one.

## Axis 2 — Job (글이 하는 일)

| Job | Core demand | Typical failure to fix |
|---|---|---|
| inform (알림) | facts first, scannable | burying the key fact under background |
| persuade (설득) | claim → evidence order | hollow emphasis instead of evidence |
| record (기록) | exactness, stable terms | paraphrasing away precision |
| explain (해설) | reader's pace, one idea per step | expert shortcuts, missing steps |
| connect (교류) | human voice, rhythm | template structure, machine transitions |

## Named Presets (landmarks on the axes)

| Preset | Reach × Job | Default register | Distinct rules |
|---|---|---|---|
| Executive report | company/partner × record+persuade | formal-polite | concrete verbs, conclusions up front |
| Official notice | company × inform | formal-polite | no casual drift, single term per concept |
| Internal board post | company × inform+connect | formal-polite or polite conversational | notice header intact; friendly but not chatty; action item and deadline explicit |
| News article | public × inform | plain analytical | fact-first lead; attribute claims to sources; no first-person opinion; no promotional adjectives |
| Press release | public × inform+persuade | formal-polite | verifiable statements only; quotes kept verbatim; superlatives removed unless sourced |
| Business email | partner × inform | polite conversational | purpose in first sentence, soft but direct ask |
| Blog / SNS | public × connect+explain | casual or polite conversational | personal rhythm allowed; kill template transitions and forced lists; Human Voice pass (playbook 5.5) runs by default — also for 회고/essay in `~습니다` |
| Manual / user guide | any × explain | polite conversational or formal-polite | steps in execution order; one instruction per sentence; imperative endings consistent |
| Interview write-up | public × record | plain analytical | speaker's wording preserved; edits limited to connective tissue between quotes |
| Technical document | company/public × record+explain | plain analytical or formal-polite | domain terms untouched; improve only the Korean around them |
| Presentation script | company/public × persuade+explain | polite conversational or plain analytical | short spoken clauses, no written-only phrasing |
| Security document | company/partner × record | formal-polite or plain analytical | established security vocabulary never replaced |
| Meeting minutes | company × record | formal-polite or plain analytical | decisions vs open items kept distinct — an opinion is never upgraded to a decision; owners, deadlines, and agenda order preserved verbatim |
| Personal / knowledge note | team × record | casual or plain analytical | compression beats sentence completeness; fragments, personal shorthand, checkboxes, and tags stay; no forced politeness or forced complete sentences |
| Agent-status explanation | team/company × explain | agent interpreter | verified vs unverified separated; raw IDs labeled |
| Internal chat | team × connect | casual | minimal edits, keep team voice |

## Placing an Unlisted Genre

1. Ask which reach level and which job(s) the text serves — or infer from the Source Profile.
2. Apply the axis rules directly; borrow distinct rules from the nearest preset.
3. State the placement in the basis line, e.g. `용도: 사보 기고문(공개 × 교류+해설)로 처리`.

## Cross-Preset Rules

- Reach=public plus job=inform means claims need attribution and adjectives need evidence.
- Job=record forbids paraphrasing quoted or measured content at any reach.
- Job=connect is the only place where template-breaking, personal rhythm is a goal in itself.
- When presets conflict with an explicit user instruction, the user instruction wins.
