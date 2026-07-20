---
name: remo-write-1-fact-check
description: 에피소드 텍스트의 사료(역사적 사실, 인용문, 일화)를 웹 검색으로 교차 검증한다. /remo-write-1-fact-check 에피소드명으로 실행.
---

# 사료 검증

실행 전 반드시 아래 문서를 Read tool로 읽는다:

- `docs/project/remotion/book-recommend/writer/0-draft.md` — 초안 작성 가이드 (작성 기준)
- `docs/project/remotion/book-recommend/writer/1-fact-check.md` — 사료 검증 규칙 (SSoT)
- `docs/project/remotion/book-recommend/rules.md` — 불변 규칙

검증 전에 `remo-write-story-dump`로 Markdown 원고를 뽑아 인명·연도·인용·일화를 표시한다. 검증 결과와 수정안을 원고에서 먼저 확정하고, JSON 반영은 마지막에 한다. 자료가 약하면 문장을 약하게 쓰거나 삭제하며, 서사를 살리려고 인과관계를 추정하지 않는다.
