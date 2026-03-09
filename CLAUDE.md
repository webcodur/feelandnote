# CLAUDE.md

프로젝트 가이드, 아키텍처, 코드 규칙, 디자인 시스템 등 모든 상세 내용은 `AGENTS.md` 참조.

## 텍스트 색상 규칙 (필수)

- 본문·제목 텍스트: `text-text-primary` 사용. Tailwind 기본 gray 계열(`text-gray-*`, `text-neutral-*`, `text-zinc-*`, `text-slate-*`) 본문에 사용 금지.
- 보조·부제목 텍스트: `text-text-secondary` 사용.
- 강조 텍스트: `text-accent` 사용.
- 임의 hex/rgb 색상 직접 지정 금지. 반드시 프로젝트 디자인 토큰(`globals.css` @theme 변수)만 사용.
