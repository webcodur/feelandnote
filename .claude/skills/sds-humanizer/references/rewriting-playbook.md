# Rewriting Playbook

Use this playbook after intake and signal scan.

## Pass 1: Protect Meaning

Make a short mental list:

- What must stay exactly?
- What is the main claim?
- What is uncertain?
- Which terms are domain terms?

Do not start rewriting before this list is clear.

## Pass 2: Remove Labels, Keep Logic

When a sentence only labels the function of the next sentence, delete or absorb it.

Before:

```text
결론적으로, 이 변경은 매우 중요합니다.
```

After:

```text
이 변경은 배포 전 확인해야 할 항목입니다.
```

Only use a concrete replacement if the source already contains the reason.

## Pass 3: Restore Korean Verb Flow

Prefer actor-action wording:

- `X를 통해 Y할 수 있습니다` -> `X로 Y합니다` when the source is certain.
- `X에 의해 생성됨` -> `X가 생성함` when the actor is known.
- `회의를 가지다` -> `회의하다`.

Keep uncertainty:

- `Y할 수 있습니다` stays if the source is a possibility, not a claim.

## Pass 4: Neutralize Agent Motion

For K words, choose the verb by object:

- rule, policy, exception -> record, reflect, define.
- setting, path, option -> specify, set.
- context, prompt, note -> include, pass along.
- file or data -> read, retrieve, add, update.
- implementation -> revise, replace, restructure.

Then rewrite the whole sentence.

## Pass 4.5 (Opt-In): Unpack Difficult Sino-Korean (한자어 풀어쓰기)

Run this pass only when the user explicitly asks for plain language
("어려운 한자어는 쉬운 말로", "쉬운 한국어로 풀어서"). It is never part of the default pipeline:
formal Sino-Korean vocabulary is not a machine trace, and the default job is to stay inside
the source's own voice.

Replace stiff or archaic Sino-Korean with everyday Korean only when an equally precise plain
equivalent exists:

- `상기` -> `위`, `금번` -> `이번`, `익일` -> `다음 날`, `필히` -> `반드시`
- `소요되다` -> `걸리다`, `상이하다` -> `다르다`, `용이하다` -> `쉽다`, `잔존하다` -> `남아 있다`
- `명기하다` -> `분명히 적다`, `도래하다` -> `다가오다`, `구비하다` -> `갖추다`

Hard limits — these stay as written even in plain-language mode:

1. **Domain and technical terms the target reader needs** stay: `수렴`, `절제 실험`, `가설`,
   `취약점`, `무결성` and similar. Test before replacing: does the plain paraphrase lose
   precision, searchability, or the term the reader would actually use? If yes, keep it.
2. **Proper nouns and product names are never translated or unpacked**, even when they contain
   ordinary words: `Oracle Database`, `SQL Server`, `Windows`, `Flash Attention`. A product
   name is one noun unit — keep the whole unit intact, English spelling included.
3. Legal/security terms, direct quotes, code, commands, numbers, and units follow the normal
   protection rules in `fidelity-checklist.md`.

Rotation still applies: do not swap every hit of one word to the same substitute, and keep the
original word where it already reads naturally.

## Pass 4.6 (All Genres): Metaphor and Calque Idiom Repair

Run when the signal scan finds figurative language: English-calque idioms (`~의 중심에`,
`A에서 Z까지`, `~의 세계`), object metaphors closing a lesson (`한쪽 다리가 짧은 의자`), or
domain jargon used figuratively in front of a general reader (`얕은 린터처럼`).

Full procedure lives in `references/metaphor-policy.md`: detection priors, the three-way triage
(domain term / calque metaphor / replacement candidate), the common-expression whitelist with
caps (관용구 ≤ 2, 사자성어 ≤ 1 per document), and the injection guard. Default repair is
plainification — rewrite the sentence as the fact that remains when the image is removed.
Swapping in a common Korean expression is the capped exception; adding figurative language to a
plain sentence is forbidden.

## Pass 5: Align Register

Formal-polite:

- Prefer complete sentences.
- Keep endings consistent.
- Avoid chatty verbs.

Polite conversational:

- Shorten setup.
- Use natural requests.
- Avoid stacked honorific padding.

Plain analytical:

- Keep terms.
- Avoid unnecessary politeness.
- Use direct conclusions.

Casual:

- Let sentence length vary.
- Keep the writer's stance.
- Do not add slang that was not implied.

Agent interpreter:

- Say what happened, what is confirmed, what remains unknown.
- Label IDs rather than removing them.

## Pass 5.5 (Genre-Conditional): Human Voice (blog · essay · 회고)

Run this pass when the genre is blog, essay, retrospective (회고), or any connect-job writing —
**including under option 1 "AI 티만 제거"**: every pattern below IS a machine trace, so fixing it
never requires a register or genre switch. Meaning, facts, and the writer's own idiom stay invariant.

Ordered steps — the connective check comes LAST, because deleting markers can also delete flow:

1. **Function markers**: delete or absorb sentences that only announce the next sentence's role
   (`정리하면 이렇습니다`, `여기서부터 솔직한 고백이 필요합니다`, `배운 건 분명합니다`,
   `결론은 이렇게 갈랐습니다`). Keep the content, drop the announcement. Numbered retrospective
   lists (`하나, … 둘, …`) lose the numbers and become paragraphs.
2. **Parallel short sentences**: when 2-3 same-shaped short `~습니다` sentences state one contrast,
   merge into one sentence (`~은 쉽지만, ~은 어렵습니다`).
3. **Abstract close**: a paragraph closing on a process noun (`~흐름이 나옵니다`, `~구조가 됩니다`,
   `~체계가 형성됩니다`) closes instead on a concrete noun this text is actually about
   (`스킬의 방향`, `검토 기준`) — chosen from THIS text, never from a fixed substitution list.
4. **Emotional openers and decorative rhetoric**:
   - Exaggerated or confessional openers (`가장 뼈아픈 건`, `부끄러운 이야기입니다`) → name the
     event or the content's nature instead (`제일 크게 놓친 건`, `시행착오에 대한 이야기입니다`).
   - Decorative metaphors closing a lesson (`다른 근육입니다`, `여정`, `퍼즐`) → plain nouns
     (`다른 영역입니다`) per `references/metaphor-policy.md`. The exemptions are narrow: the
     domain-vocabulary exemption is reader-conditional (jargon like `린터` is glossed for a
     general reader), and the personal-image exemption applies only to human-written sources —
     in an AI-generated source a one-off object image (`한쪽 다리가 짧은 의자`) is a machine
     trace to plainify, not a human signal to keep.
   - Rare literary word choices used once for flavor (`미지근하다`, `비로소`, `씨앗`, `짓궂은`) →
     everyday wording (`그저 그렇다`, `그제야`, `핑계가 된다`, `장난삼아`). Genuine personal
     colloquialisms (`헛돈다`, `들킨`) are human signals — keep them.
5. **Tense (회고)**: a paragraph narrating finished events ends in past tense too — the closing
   record verb (`적어둡니다` → `적어두었습니다`) and the follow-up actions of a stated decision
   (`나누었습니다. 먼저 훑습니다` → `훑었습니다`). Present tense stays only for norms and
   still-true generalities (`구별해야 합니다`).
6. **Connective check (run last)**: after marker removal and merging, scan adjacent sentence pairs.
   Where the relation — result, contrast, addition, rephrase, list→wrap-up — is not already shown
   by particles or endings, add the matching connective: `그래서`, `그러나`/`그런데`, `그리고`,
   `그러니까`, `결국`. The first sentence after a diagram, code fence, or quote block loses its
   link most often — check it. Do NOT prefix every sentence, do not repeat one connective across
   consecutive paragraphs (that is a new machine fingerprint), and never confuse a needed logical
   connective (keep) with the decorative W-1 markers this pass deletes (remove).

Hard limits: no fixed substitution dictionary (`검토 흐름` → always `스킬의 방향` is wrong — the
concrete noun comes from each text), no added literariness, no meaning change; quotes, code,
numbers, and diagrams stay untouched.

## Pass 6: Reduce Surface Machinery

Check:

- Too many bullets for the genre.
- Repeated transitions at sentence start.
- Overused AI word clusters from `ai-word-bank.md`.
- Overused bold/quote emphasis.
- Same ending across several sentences.

Only change what harms the target use case.

## Pass 7: Final Micro-Edit

Correct:

- particles
- spacing
- punctuation
- repeated words
- mismatched endings

Do not change code blocks, commands, raw logs, or direct quotes unless asked.
