---
name: remo-write-philosophy
description: 에피소드 host.philosophy 1인칭 감상철학 독백을 작성·개선한다. 책을 모르는 사람도 이해하면서 인물 고유의 사상과 말투가 드러나게 한다. /remo-write-philosophy 에피소드명으로 실행.
---

# 감상철학 작성

실행 전 반드시 아래 문서를 Read tool로 읽는다:

- `docs/project/remotion/book-recommend/writer/philosophy.md` — 감상철학 작성 SSoT (성공 구조·5대 원칙·체크리스트·사례)
- `docs/project/remotion/book-recommend/writer/0-draft.md` — 전체 필드 작성 가이드

## 실행

```
/remo-write-philosophy <에피소드명>
```

대상 파일:
```
sw/remotion/public/episodes/{done|live|todo|pre-todo}/{name}/ko.json    (1부 host.philosophy)
sw/remotion/public/episodes/{done|live|todo|pre-todo}/{name}/ko-2.json  (2부가 있으면)
```

## 핵심 체크

작성·개선 후 반드시 7개 체크리스트 전부 통과 확인:

1. 본인 사상·미학 선언이 1문장 이상 있는가
2. 무엇에 반박하는지 명시되어 있는가
3. 당시 평가의 구체 힌트(사실 1~2개) 있는가
4. 특정 작품 디테일 대신 작가명+보편 감각으로 book 미독자 호환되는가
5. 결정적 마지막 한 줄이 outro 도끼와 동어 반복 아닌가
6. 인물 이름을 다른 인물로 바꿔 성립하지 않는가 (고유성)
7. DB `celeb_persona.speech_tone` 반영된 1인칭인가

2부 구조 에피소드는 1부·2부 philosophy가 **서로 다른 주제**로 쓰여야 한다. 동일 텍스트 금지.
