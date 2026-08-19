---
name: remo-voice-short-retone
description: 짧은 음성 세그먼트(쇼츠 hook, intro, 짧은 narrator/summary 구간, 롱폼 짧은 임팩트 문장 등)에 사극체·비장체·낮은 톤·속삭임 등 특수 캐릭터 톤을 부여해 재생성한다. 파이프라인 style prefix가 짧은 문장에서 먹히지 않을 때 tail padding 전략 + wav2vec2 forced alignment + 수동 normalize + 후속 파이프라인 동기화를 한 세트로 실행한다. "hook 사극체로 만들어줘", "S02-intro 비장체로", "이 문장 속삭이듯이", "짧은 세그먼트 톤 바꿔줘" 등 호출.
---

> **본문은 멀티툴 공용 원본에 있다 → `.agents/skills/remo-voice-short-retone/SKILL.md`**
>
> 이 스킬이 발동되면 **즉시 위 파일을 Read tool로 읽고**, 그 내용을 이 스킬의 전체 지침으로 삼아 그대로 따른다. frontmatter의 description은 트리거용 요약이며, 실제 절차·규칙은 `.agents` 원본이 단일 기준(SSoT)이다.
