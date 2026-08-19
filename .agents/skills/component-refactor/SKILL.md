---
name: component-refactor
description: Split large React/TypeScript component files into focused modules with vertical directory structure. Use when a component file exceeds ~400 lines, when the user asks to refactor/split/reorganize a large component, or when a directory has 15+ flat files that need hierarchical grouping. Handles dependency analysis, module extraction, import path migration, and type verification.
---

> **본문은 멀티툴 공용 원본에 있다 → `.agents/skills/component-refactor/SKILL.md`**
>
> 이 스킬이 발동되면 **즉시 위 파일을 Read tool로 읽고**, 그 내용을 이 스킬의 전체 지침으로 삼아 그대로 따른다. frontmatter의 description은 트리거용 요약이며, 실제 절차·규칙은 `.agents` 원본이 단일 기준(SSoT)이다.
