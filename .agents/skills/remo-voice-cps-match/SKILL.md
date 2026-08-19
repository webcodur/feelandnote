---
name: remo-voice-cps-match
description: BookRecommend 음성 발화속도(자/초)를 목표값으로 통일하는 배속(*PlaybackRate) 자동 산출·반영. 각 책의 요약·맥락·인용·후속 구간 음성을 목표 자/초(기본 6.5)로 들리도록 영상 배속을 계산해 book.ko.json에 기록한다. 렌더 결과에 그대로 반영된다. "배속 맞춰줘", "발화속도 통일", "자초 맞춰", "이 책 6.5자초로", "오디오 속도 일정하게", "이 구간 빠르게/느리게" 등으로 호출. /remo-voice-cps-match <에피소드> [옵션] 로 실행.
---

> **본문은 멀티툴 공용 원본에 있다 → `.agents/skills/remo-voice-cps-match/SKILL.md`**
>
> 이 스킬이 발동되면 **즉시 위 파일을 Read tool로 읽고**, 그 내용을 이 스킬의 전체 지침으로 삼아 그대로 따른다. frontmatter의 description은 트리거용 요약이며, 실제 절차·규칙은 `.agents` 원본이 단일 기준(SSoT)이다.
