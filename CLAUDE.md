# CLAUDE.md

프로젝트 가이드, 아키텍처, 코드 규칙, 디자인 시스템 등 모든 상세 내용은 `AGENTS.md` 참조.

## 텍스트 색상·가독성 규칙 (필수)

`docs/project/code-rules.md` > "텍스트 색상 규칙" 섹션이 단일원천. 핵심만 요약:
- 본문: `text-text-primary`. 보조: `text-text-secondary`. 강조: `text-accent`.
- Tailwind gray 계열·임의 hex/rgb 금지. @theme 토큰만 사용.
- opacity 남용 금지. 읽어야 할 텍스트에 `text-xs` 이하 금지.
