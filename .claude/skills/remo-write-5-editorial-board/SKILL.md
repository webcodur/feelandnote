---
name: remo-write-5-editorial-board
description: 5인 편집국(셀럽 직업군 전문가·역사전문가·영상극 전문가·번역가·편집국)이 책 별로 비판하고 재귀적으로 수정한다. 영상극 전문가는 위생(렌즈 1~6)과 도끼(렌즈 7~11)를 모두 다룬다. 번역가는 한국어 번역투(직역체·사물 주어·부자연 어순)를 적발한다. 모든 책이 합격 임계에 도달할 때까지 라운드 반복, 완전체 도달 전에는 종료하지 않는다. /remo-write-5-editorial-board <에피소드명> 으로 실행.
---

# 편집국 사이클

실행 전 반드시 아래 문서를 Read tool로 읽는다:

- `docs/project/remotion/book-recommend/writer/0-draft.md` — 초안 작성 가이드 (작성 기준)
- `docs/project/remotion/book-recommend/writer/5-editorial-board.md` — 편집국 사이클 단일 SSoT (위생·도끼·번역투·사료·직업 분야 전부 흡수)

## 핵심 원리

- 비판 4인(직업군·역사·영상극·번역가)이 각자 다른 렌즈로 책별 점수를 매긴다.
- 편집국이 4인 지적을 합쳐 본문을 수정한다.
- 모든 책의 모든 전문가 점수 ≥ 임계(기본 95) 도달까지 라운드 반복.
- **번역가는 무조건 참여**한다. 클로드 산출물은 번역투가 자주 섞이므로 매 라운드 필수 점검.

## 워크플로 요약

**이 스킬은 텍스트 전용이다.** 음성 합성·후처리는 일절 다루지 않는다. 텍스트 변경에 따른 음성 동기화는 사용자가 별도 도구(`/voice-sync` 등)로 처리한다.

1. 셀럽 직업 추출 → 직업군 전문가 1인 동적 결정. 번역가는 고정 합류.
2. `remo-story-dump` 스킬로 평문 markdown 추출
3. 라운드 N:
   - 비판 4인이 책별 비판서 작성 (점수 + 지적 항목)
   - 편집국이 종합 보고서 작성
   - 미합격 책의 수정안을 표 형식으로 사용자에게 제시
   - 동의 시 ko.json 적용
4. 합격된 책은 재평가 면제, 미합격 책만 라운드 N+1로
5. 완전체·정체·라운드 상한·사용자 중단 중 하나로 종료 → 텍스트 마감

## 인자

```
/remo-write-5-editorial-board <에피소드명> [--strict | --lenient] [--books N1,N2,...]
```

- 기본 임계 95 / `--strict` 99 / `--lenient` 90
- `--books`: 특정 책만 (예: `--books 1,3,5`)

## 직업군 → 전문가 매핑은 [`5-editorial-board.md`](../../../docs/project/remotion/book-recommend/writer/5-editorial-board.md) 표 참조
