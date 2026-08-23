---
name: component-refactor
description: Split large React/TypeScript component files into focused modules with vertical directory structure. Use when a component file exceeds ~400 lines, when the user asks to refactor/split/reorganize a large component, or when a directory has 15+ flat files that need hierarchical grouping. Handles dependency analysis, module extraction, import path migration, and type verification.
---

# Component Refactor

Split bloated component files into focused modules organized by vertical directory structure.

## Workflow

### 1. Analyze -- Read the file, map the structure

```
Read target file -> identify sections by line range:
  - Pure logic (calculations, hooks, helpers)
  - Visual sections (large JSX blocks, IIFEs)
  - Dev-only blocks (studio/preview/debug UI)
  - Shared infra (types, constants, utilities)
```

Count lines per section. Identify distinct visual phases and logical blocks.

### 2. Dependency graph -- Trace imports before moving anything

```
Grep all `from './` imports across the directory.
Build a map: { file -> [imports from, imported by] }
```

This determines what stays at root (widely imported) vs what moves into subdirectories.

### 3. Extract -- Create focused modules

**Priority order:**
1. **Duplicated logic** -> consolidate into single module (e.g., `calcTotalFrames` + inline cursor walking -> `buildTimeline()`)
2. **Custom hooks** -> `useXxx.ts` (prefetch, timeline, animation state)
3. **Visual sections** -> standalone component files (size irrelevant — distinct phase = separate file)
4. **Dev-only blocks** -> separate, conditionally rendered

**Rules:**
- Pass data via props/params, not closure capture
- Preserve exact behavior -- no logic changes during extraction
- Early returns in extracted components replace IIFE null-return patterns

### 4. Organize -- Vertical directory structure

```
Component/
  index.ts              -- public API (re-exports only)
  Component.tsx         -- main orchestrator (~300-400 lines max)
  types.ts              -- shared types
  [shared infra]        -- timing, utils, fonts, script, etc.
  [hooks]               -- useTimeline.ts, usePrefetch.ts, etc.

  sections/             -- visual section components
    SectionA.tsx
    SectionB.tsx
    SharedWidget.tsx    -- widgets used by multiple sections

  studio/               -- dev/preview-only (excluded from prod render)
    DevOverlay.tsx
    StudioSubtitles.tsx
```

**Grouping heuristics:**
- Root: files imported by 3+ other files (types, timing, utils, fonts)
- `sections/`: visual components rendered by the main orchestrator
- `studio/`: components guarded by `!isRendering` or `process.env.NODE_ENV`
- Avoid single-file subdirectories -- group by concern, not per-component

### 5. Migrate imports -- Systematic path update

```
Root -> sections/:  './Foo'       -> './sections/Foo'
Root -> studio/:    './Foo'       -> './studio/Foo'
sections/ -> root:  './types'     -> '../types'
sections/ -> same:  './Widget'    -> './Widget'  (no change)
studio/ -> root:    './types'     -> '../types'
studio/ -> same:    './Subtitles' -> './Subtitles' (no change)
```

Use `Grep` to find all imports, `Edit` with `replace_all` per file.

### 6. Verify -- Type check, no new errors

```bash
npx tsc --noEmit --pretty 2>&1 | head -40
```

Only pre-existing errors should remain. Zero new errors from the refactoring.

## Anti-patterns

- Creating `index.ts` barrel files in every subdirectory -- only the root `index.ts` matters
- Moving shared infra (types, timing, utils) into subdirectories -- these stay at root
- Refusing to extract a visual phase just because it's short -- orchestrators split by responsibility, not line count
- Changing any logic during extraction -- refactor != rewrite
- Deeply nested directories (sections/foo/bar/) -- keep one level deep
