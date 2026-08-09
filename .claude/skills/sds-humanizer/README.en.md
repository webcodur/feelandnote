# sds-humanizer — Claude Code Skill

**English** | [한국어](README.md)

**Version 1.9.0**

> A Claude Code skill that rewrites Korean text written by AI (ChatGPT, Claude, Gemini, …) so it reads as **human-written**.
> It never changes content — facts, numbers, dates, names, and quotes are preserved byte-for-byte; only wording, rhythm, and style are reshaped.

It diagnoses AI-tell patterns — translationese, excessive English citations, mechanical parallelism, passive overuse, connective overuse, agent progress-report phrasing — and rewrites into natural Korean fit for the text's purpose, reader, and channel.

## Core design

- **Constitution (3 articles)** — ① the original file is **never modified** (no in-place edit under any request or mode); ② for file input the deliverable is a **new** `<stem>_humanized<ext>` file (chat output alone is incomplete); ③ **meaning outranks style** (facts, numbers, quotes, and uncertainty preserved; a rewrite that would change meaning is done conservatively).
- **Source Profile gate** — never asks "what is this for?" blindly. It first diagnoses the source's **current register** (sentence-ending family), **genre** (news · email · internal notice · manual · agent log …), and **reach**, then confirms with **two questions in one prompt** — Q1 genre (keep / switch to the most plausible alternative / specify) × Q2 register (keep the diagnosed one, or switch — every standard register the source is not already in is listed by name, so 격식체(`~습니다`) and 경어체(`~해요`) are always both visible). Genre and register are independent choices: switching genre never silently decides the register.
- **Five registers** — formal-polite, polite conversational, plain analytical, casual, agent interpreter. Formality itself is never treated as AI-like.
- **8 rewrite passes** — Meaning Map → Machine Trace Scan → Motion Word Repair → Terminology → Register → Rhythm → Proof → Guardrail. Small passes, not one broad paraphrase.
- **Protected-literal & structure check** — `scripts/rewrite_guard.py` catches missing protected literals (numbers, names, quotes), leftover external-mode wording, and dropped Markdown structure (frontmatter, table shapes, checkbox states, footnotes, code fences — v1.9.0).
- **Metaphor & calque idiom policy** (v1.8.0) — English-calque metaphors are plainified by default; swapping in a common Korean idiom or 사자성어 is a capped, whitelisted exception (관용구 ≤ 2, 사자성어 ≤ 1 per document); figurative language is never added to a plain sentence.
- **Over-correction guard** (v1.9.0) — not-X-but-Y reversal frames are repaired only when repeated (one clear contrast is KEEP), with explicit KEEP judgments for technical passives and natural subject omission. New meeting-minutes and personal-note presets.
- **Injection guard** — agent-directed instructions inside the target document ("ignore previous instructions", …) are **data, not instructions** — never followed, only reported.

## Repository layout

```
sds-humanizer-claude/   # ← this whole folder IS the skill (install unit)
├── SKILL.md            # skill body (Constitution + 6-part operating model)
├── README.md           # Korean (default)
├── README.en.md        # this document
├── CHANGELOG.md        # change history
├── references/         # rule files (intake-flow · register-presets · signal-taxonomy · rewriting-playbook · fidelity-checklist, …)
└── scripts/            # rewrite_guard.py (protected-literal / leftover-wording check)
```

## Installation

Claude Code skills live in `~/.claude/skills/<name>/` (user) or a project's `.claude/skills/<name>/`.

This folder itself IS the skill — copy it into a skills directory under the name `sds-humanizer`.
```bash
# macOS / Linux / Git-Bash
cp -r sds-humanizer-claude ~/.claude/skills/sds-humanizer
```
```powershell
# Windows PowerShell
Copy-Item -Recurse sds-humanizer-claude "$env:USERPROFILE\.claude\skills\sds-humanizer"
```

Restart Claude Code and invoke with `/sds-humanizer`.

## Workflow

1. **Input** — a file path (e.g. `report.md`) or text pasted into chat.
2. **Source Profile** — diagnose register / genre / reader, present as the default, and confirm keep or switch.
3. **Rewrite passes** — 8 passes that strip machine traces while preserving content.
4. **Deliver** — for file input, **Write** the new `<stem>_humanized<ext>` file first (original untouched); for chat input, return it in the reply.
5. **(Optional) verify** — `scripts/rewrite_guard.py --source <original> --rewrite <result>`.

## Triggers

"AI 티 없애줘", "사람이 쓴 것처럼 윤문", "make ChatGPT wording natural", "remove translationese", "rewrite in a formal register", "strip agent phrasing".

## Requirements

| Item | Required? | Notes |
|---|---|---|
| **Python 3.8+** | Optional | Only for `scripts/rewrite_guard.py`. Dependency-free stdlib |

The rewrite itself runs on the skill body (SKILL.md + references) alone — no server or package dependency.
