# Model Lexicon Hints

Use this file only as a prioritization hint. Do not accuse a model. Do not overfit when the source model is unknown.

## Claude / Claude Code

Likely areas to scan first:

- Agent motion words: K-1, K-2, K-4, K-5.
- Polished formal paragraphs mixed with rough tool-work verbs.
- Long progress summaries that imply success before evidence.

Repair stance:

- Make operational verbs neutral.
- Separate confirmed actions from pending checks.

## Codex / Coding Agent Output

Likely areas to scan first:

- Patch/diff narration.
- Tool-result summaries.
- Internal identifiers without labels.
- K-1/K-4 in final progress messages.

Repair stance:

- Keep file names, commands, paths, and hashes.
- Translate the operational point into human-scale Korean.

## ChatGPT / General Assistant Draft

Likely areas to scan first:

- Empty emphasis.
- Repeated transitions.
- Polished but low-specificity claims.
- English metaphors translated too directly.
- Overused AI word clusters in `ai-word-bank.md`.

Repair stance:

- Remove label sentences.
- Replace grand claims with available concrete content.

## Gemini-like Draft

Likely areas to scan first:

- Heavy tables or bullet structures.
- Headings that over-segment simple content.
- Tone shifts across sections.

Repair stance:

- Preserve tables only when useful.
- Smooth the register across sections.

## Unknown Model

Scan all SDS signal families at normal priority. Use the selected use case and register as the main decision point.
