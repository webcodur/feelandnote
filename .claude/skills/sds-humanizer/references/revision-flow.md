# Revision Flow

Use this when the user responds to a rewrite with a narrower request.

## Common Follow-Ups

| User request | Action |
|---|---|
| "이 문단만 다시" | Re-run the passes only on the named span. Preserve the rest exactly. |
| "더 자연스럽게" | Increase rhythm and register work, but keep meaning guardrails. |
| "덜 고쳐" / "원문 톤 살려" | Lower intensity to conservative and restore source structure. |
| "번역투만" | Touch only translated-frame signals. Do not adjust voice broadly. |
| "박아넣다 같은 것만" | Touch only K agent-motion wording. |
| "격식체로" | Re-run register pass; do not invent formal content. |
| "해요체로" | Re-run register pass; keep facts and terms stable. |
| "용어만 통일" | Use `term-policy.md`; avoid sentence-level rewriting unless needed. |

## Partial Rewrite Rule

When rewriting a span:

1. Copy untouched surrounding text exactly.
2. Rewrite only the requested span.
3. Re-check connectors at the span boundary.
4. Report the changed span, not the whole document, unless the user asks.

## Intensity Ladder

- Conservative: preserve wording unless it directly causes the issue.
- Standard: change phrasing and sentence shape locally.
- Strong: allow local reordering and compression, but no new content.

If a user dislikes a result, move one step down the ladder before trying a new style.

## Redo Safety

Do not stack rewrites indefinitely. After two failed revisions, ask for the user's preferred sample sentence or target voice.

## Response Shape

For a redo, keep the response short:

```markdown
수정한 버전입니다.

[revised span]

기준: [what changed]
```
