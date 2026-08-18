---
name: faction-dialogue-review
description: 팩션(factions/) 인물의 한국어 대사를 새로 작성하거나 수정할 때 적용한다. 한국어 본문과 자막 청크를 한 번에 완성하고 DB에 안전하게 반영·검증한다. "팩션 대사 써줘", "대사 고쳐줘", "인물 대사 만들기" 등에 사용한다.
---

# 팩션 대사 작성

대사는 조사해 한 번 작성하고 끝낸다. 검토 과정 자체를 별도 자산으로 만들지 않는다.

## 금지

- `_docs/dialogue-review/`, `index.md`, 인물별 검토 Markdown을 만들지 않는다.
- `순환`, `판`, `candidate`, `revision`, `approved`, 점수 같은 작업 상태를 기록하지 않는다.
- 같은 문장을 명분 없이 반복 재작성하지 않는다.
- 렌더 산출물 `faction-data.json`을 직접 편집하지 않는다.
- 사용자가 명시하지 않으면 TTS·음성·발화 시각·ELE 지시를 변경하지 않는다.

기존 `dialogue-review` 폴더는 레거시다. 읽거나 갱신하지 않는다.

## 원천과 보호 경계

- DB `faction_*` 테이블이 단일원천이다.
- `sw/remotion/scripts/youtube/faction-lineup.json`에서 업로드 이력이 있는 에피소드는 보호한다.
- 보호편의 본문·영문·청크·음성은 사용자 명시 지시 없이는 바꾸지 않는다.
- 특히 현재 보호편은 `AI-Supremacy`, `Digital-Resistance`, `Gods-Greek`, `Homer-Iliad`, `PayPal-Mafia`, `korea-football-best11`이다.

## 작성

1. 현재 DB 대사와 에피소드 내 역할을 확인한다.
2. 인물의 실제 행동과 에피소드 안의 역할을 필요한 만큼 확인한다.
3. 타인의 비판이나 후대 평가를 화자의 자기고백으로 바꾸지 않는다.
4. 인물의 구체적인 행동·사건·어휘가 드러나는 한국어 대사를 작성한다.
5. `quoteChunks`를 의미 단위로 함께 완성한다.
6. `quoteOrigin`은 자유 메모칸이다. 비어 있어도 결손이 아니며 URL·원문을 강제하지 않는다.
7. `quoteEn`·`quoteEnChunks`는 현재 작업 범위가 아니다. 사용자가 따로 요청할 때만 작성한다.

## 반영

에피소드 폴더에 작업 장부를 남기지 않는다.

1. 조건부 반영기에 필요한 계약은 임시 JSON으로만 만든다.
2. `sw/web-bo/scripts/faction/dialogue-apply.ts`를 dry-run한다.
3. 예상 현재값이 정확히 일치할 때만 `--apply`한다.
4. `faction:export`로 렌더 산출물을 재생성한다.
5. `faction:verify`, `--drift`, `check-dialogue.mjs`를 통과시킨다.
6. 같은 계약을 재실행해 전부 `SKIP`인지 확인한다.
7. 성공한 임시 계약은 제거한다.

구조 검사는 다음을 사용한다.

```bash
node .agents/skills/faction-dialogue-review/scripts/check-dialogue.mjs <episode> [slug]
```

## 보고

- 작성·수정한 인물과 대사 수
- DB 반영, export, drift, 구조 검사 결과
- 음성 변경 여부

검토 회차나 내부 사고 과정은 보고하지 않는다.
