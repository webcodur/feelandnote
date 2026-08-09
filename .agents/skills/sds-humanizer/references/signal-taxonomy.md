# SDS Signal Taxonomy

This is an original SDS taxonomy for practical rewriting. It groups machine-like Korean by editing action, not by source model.

Severity:

- **Blocker**: fix unless the user explicitly wants the original style.
- **Strong**: fix in external or polished writing; allow in some internal contexts.
- **Contextual**: fix only when repeated or mismatched with the use case.

## T. Translated Frame

Imported sentence frames that make Korean read like translated English.

Signals:

- Repeated `~를 통해`, `~에 대해`, `~에 있어서`, `~에 의해`.
- Inflated possibility forms where direct action is meant.
- Have/make/take style light-verb phrasing.
- Nominalized actions where one verb is meant: `실행을 진행하다`, `검토를 수행하다`,
  `개선을 도모하다`, `적용이 가능하다`.
- Passive verbs chained across one sentence (`~에 의해 …되고 …됩니다`) when the actor is known.

Repair:

- Restore natural Korean particles and verbs.
- Prefer concrete actor-action phrasing.
- Collapse the nominalization to its verb (`검토를 수행하다` → `검토하다`, `적용이 가능하다` →
  `적용할 수 있다`) — but keep the noun form where official-document register genuinely calls for it.
- Keep hedging if the source is genuinely uncertain.

## L. Labelled Thinking

The text announces its structure instead of simply saying the point.

Signals:

- "결론적으로", "요약하면", "중요한 점은" repeated.
- Meta openings such as "이 관점에서", "이 말은" without a real need.
- Headings or colon phrases that make every paragraph look generated.

Repair:

- Remove the label if the sentence already functions as conclusion or transition.
- Use one direct sentence instead of a signpost plus sentence.

## M. Machine Motion

Agent-like verbs that describe writing or tool work as rough physical action.

Signals:

- "박아넣다", "주입하다" outside security context, "긁어오다", "갈아엎다".
- Tool-chain phrases that sound like internal agent narration.

Repair:

- Use neutral operational verbs: add, record, reflect, specify, read, retrieve, replace, revise.
- See `agent-lexicon.md`.

## O. Over-Organized Surface

The shape looks generated even when sentences are grammatical.

Signals:

- Rigid three-part lists.
- Too many bullets for prose.
- Repeated bold emphasis, quotation emphasis, or decorative punctuation.
- Two same-length, same-ending short sentences split only to state one contrast (`A입니다. B입니다.`).

Repair:

- Keep structure where the reader scans for decisions.
- Convert decorative lists into paragraphs for essays/blogs.

## R. Rhythm Flatness

The text has no human variation in sentence weight.

Signals:

- Similar sentence length across a paragraph.
- Same ending pattern in many consecutive sentences.
- Every sentence starts with a transition.

Repair:

- Combine or split locally.
- Vary endings within the selected register.
- Do not add literary flourish.

## H. Hollow Emphasis

The text sounds confident but gives little substance.

Signals:

- "혁신적", "핵심적", "강력한", "효과적", "중요하다" without evidence.
- Big adjectives near weak claims.

Repair:

- Replace with the concrete reason already present.
- If no reason is present, make the sentence plainer rather than inventing support.

## W. Overused Word Clusters

The text relies on words that are common in LLM-polished writing, marketing copy, or academic filler.

Signals:

- Repeated conclusion labels, transition labels, and importance labels.
- English-like cliches translated into Korean.
- Big adjectives that do not connect to evidence.
- Generic tech or report phrases that could fit almost any topic.

Repair:

- Use `ai-word-bank.md` as a candidate list.
- Treat each hit as contextual, not as proof.
- Replace only when repetition, weak evidence, or register mismatch makes the word stand out.

## S. Safety Fog

The text overbalances every claim until the author's stance disappears.

Signals:

- Repeated "양쪽 모두", "신중하게", "균형 있게", "가능성이 있다" in non-risk contexts.
- Hedging stacked with future tense and vague subjects.

Repair:

- Keep uncertainty that matters.
- Remove duplicate caution.
- State the writer's actual position when the source supports it.

## C. Abstract Close

The paragraph closes on a process noun instead of the thing the text is about.

Signals:

- Closing sentences such as `~흐름이 나옵니다`, `~구조가 됩니다`, `~체계가 형성됩니다`,
  `~시사점을 준다`.

Repair:

- Close on a concrete noun already present in the text (the tool, criterion, decision), or shorten
  the closing sentence. Never map one abstract noun to one fixed substitute.
- Procedure: Pass 5.5 step 3 in `rewriting-playbook.md`.

## F. Flow Break

Adjacent sentences have a clear logical relation but no connective or referring word — the opposite
defect of W-1 marker overuse, and often introduced by marker deletion itself.

Signals:

- Contrast, cause→result, or list→wrap-up sentence pairs placed side by side with nothing linking them.
- The first sentence after a diagram, code fence, or quote block ignoring the block entirely.

Repair:

- Add `그래서` / `그러나` / `그런데` / `그리고` / `결국` only where the relation is otherwise
  invisible — procedure and anti-overuse rules: Pass 5.5 step 6 in `rewriting-playbook.md`.
- Needed logical connectives are human signals to keep; only decorative repeated markers (W-1)
  are machine signals to delete.

## V. Formulaic Reversal

The text leans on the not-X-but-Y reversal frame until contrast becomes a tic.

Signals:

- Repeated `단순히 X가 아니라 Y`, `X를 넘어 Y로`, `중요한 것은 X가 아니라 Y`,
  `더 이상 X가 아닌 Y`.
- Consecutive paragraphs each closing on a reversal.
- Reversals whose denied X is a claim nobody made.

Repair:

- **One clear, load-bearing contrast is normal rhetoric — KEEP it.** Only repetition is the
  machine trace.
- For repeated hits, state Y directly and drop the denied X unless the denial adds information.
- Vary the remaining contrast forms; do not rewrite every reversal into one flat template.

## P. Proofing Noise

Small language errors that make the result feel machine-edited.

Signals:

- Awkward particles.
- Unnatural spacing around dependent nouns or units.
- Commas following English-like clause boundaries.

Repair:

- Correct locally.
- Avoid rewriting a whole sentence for a small punctuation issue.

## Over-Correction Guard (KEEP judgments)

Every signal above is a prior, not proof. Concrete KEEP calls that beat the pattern match:

- A technical passive that names no actor because none matters (`설정 파일이 로드됩니다`)
  stays — forcing an actor adds wrong information.
- Natural Korean subject omission stays; restoring an English-style subject in every
  sentence is itself a T signal.
- One clear not-X-but-Y contrast stays (see V) — only repetition is the trace.
- An already-polite request is not escalated to stiffer honorifics; raising politeness is a
  register change, not a repair.
- A word the source deliberately leaves vague (`적절히`, `상황에 따라`) is not made
  specific — specifying it invents information the source never committed to.
