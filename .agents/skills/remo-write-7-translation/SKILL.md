---
name: remo-write-7-translation
description: 에피소드 ko↔en 번역 시 세 함정을 동시에 차단하고 영미권 출판 게이트를 통과시킨다. (1) 영문 원전(링컨 연설·셰익스피어·성경·영시 등)을 KO에서 다시 번역하지 않고 원전 verbatim으로 가져온다(역번역 차단). (2) KO 문장·문단을 EN으로 1:1 매핑하지 않고 중심축(의미·인과·순서·강조·감정)만 보존한 채 EN 리듬으로 재구성한다(반대 방향도 동일). (3) 한문/한국어 1차 사료(이순신 어록·시조·교지·격언·사극체 발화·서간문 등)는 정보만 옮기면 맛이 빠지므로 같은 무게의 영문 register/style을 찾아 압축·대구·운율·archaic register를 등가로 입힌다. 마지막 단계로 영미권 출판 게이트 12개 체크리스트(quoteSource·한자노출·음역밀도·minimal gloss·lexicon·register tier·KO 1:1 잔존 등)를 통과해야 출판 등급 인증. longform en.json + shorts/en-*.json 동시 처리. /remo-write-7-translation <에피소드명> 으로 실행.
---

# 영문본 원전 보존 검증·교정

## 핵심 원리 세 기둥

**기둥 1 — 역번역 차단**: KO에 들어 있는 영문 원전(링컨 연설, 셰익스피어, 성경 등)의 한국어 번역본을 다시 영어로 옮기면 원전과 어긋난다. 원전이 영어로 존재하면 **원전 그대로 가져온다**.

**기둥 2 — 1:1 매핑 금지**: KO와 EN은 문장 호흡과 문단 단위가 다르다. 1:1 매핑하면 끊어지거나 늘어진다. 중심축(의미·인과·순서·강조·감정)만 보존하고 **목표 언어 리듬으로 다시 짠다**. 양방향 동일.

**기둥 3 — 문체 등가성**: 한문/한국어 1차 사료(이순신 어록·시조·교지·격언·사극체)는 영문 원전이 없어 기둥 1로 커버 안 되고, 정보만 평이하게 옮기면 **압축·대구·운율·격조가 모두 증발**한다. 같은 무게의 영문 register(KJV·royal proclamation·classical aphorism 등)를 찾아 형식 자질을 등가로 입힌다.

## 영미권 출판 게이트

세 기둥 위에 R6~R9 규칙(음역 밀도·minimal gloss·lexicon·register tier)을 얹어 12개 체크리스트(자동 7 + 수동 5)로 검증한다. **12/12 ✅ 달성 시 영문 출판물 등급 인증**, ❌ 1건이라도 있으면 정정 후 재검증.

자세한 규칙·의사결정 흐름·Register 매칭 매트릭스·BAD/GOOD 예시·게이트 체크리스트·검증 스크립트는 SSoT 문서 참조.

## 실행 전 필독

- `docs/project/remotion/book-recommend/writer/7-translation.md` — 번역·원전 보존 규칙 (SSoT)
- `docs/project/remotion/book-recommend/rules.md` — 불변 규칙
- `docs/project/remotion/book-recommend/writer/0-draft.md` — 필드별 작성 기준 (참고)
