---
name: remo-write-7-translation
description: 에피소드 ko↔en 번역 시 세 함정을 동시에 차단하고 영미권 출판 게이트를 통과시킨다. (1) 영문 원전(링컨 연설·셰익스피어·성경·영시 등)을 KO에서 다시 번역하지 않고 원전 verbatim으로 가져온다(역번역 차단). (2) KO 문장·문단을 EN으로 1:1 매핑하지 않고 중심축(의미·인과·순서·강조·감정)만 보존한 채 EN 리듬으로 재구성한다(반대 방향도 동일). (3) 한문/한국어 1차 사료(이순신 어록·시조·교지·격언·사극체 발화·서간문 등)는 정보만 옮기면 맛이 빠지므로 같은 무게의 영문 register/style을 찾아 압축·대구·운율·archaic register를 등가로 입힌다. 마지막 단계로 영미권 출판 게이트 12개 체크리스트(quoteSource·한자노출·음역밀도·minimal gloss·lexicon·register tier·KO 1:1 잔존 등)를 통과해야 출판 등급 인증. longform en.json + shorts/en-*.json 동시 처리. /remo-write-7-translation <에피소드명> 으로 실행.
---

> **본문은 멀티툴 공용 원본에 있다 → `.agents/skills/remo-write-7-translation/SKILL.md`**
>
> 이 스킬이 발동되면 **즉시 위 파일을 Read tool로 읽고**, 그 내용을 이 스킬의 전체 지침으로 삼아 그대로 따른다. frontmatter의 description은 트리거용 요약이며, 실제 절차·규칙은 `.agents` 원본이 단일 기준(SSoT)이다.
