---
name: faction-voice-sync
description: 팩션(세력도, factions/) 음성 후처리 — 받아쓰기(WhisperX --faction)와 발화 시각 산출(voice:faction-align)로 인물 대사의 의미 덩어리별 발화 시각(data.timing.<locale>.json)을 만들어 자막 페이지 전환·글자 점등을 음원에 맞춘다. 팩션 음성 합성(pnpm voice:faction) 이후, 또는 대사·quoteChunks(의미 덩어리)를 바꾼 뒤 호출. "팩션 음성 동기화", "팩션 파이프라인", "팩션 발화 시각", "팩션 sync", "팩션 자막 타이밍", "팩션 점등 맞춰줘" 등으로 호출. 북리커맨드 remo-voice-sync와 별개다(factions/ 구조·2단계·의미분할 없음). /faction-voice-sync <에피소드> 로 실행.
---

> **본문은 멀티툴 공용 원본에 있다 → `.agents/skills/faction-voice-sync/SKILL.md`**
>
> 이 스킬이 발동되면 **즉시 위 파일을 Read tool로 읽고**, 그 내용을 이 스킬의 전체 지침으로 삼아 그대로 따른다. frontmatter의 description은 트리거용 요약이며, 실제 절차·규칙은 `.agents` 원본이 단일 기준(SSoT)이다.
