---
name: remo-image-anchor-sync
description: 에피소드 이미지 폴더를 전수 분석하여 품질 기준을 통과하는 이미지에 ko 앵커(file+field+text)를 자동 부착하고, 이어서 en 에피소드에 대응 앵커를 동기화한다. SUMMARY/CONTEXT 시작 이미지 1장 이상 보장. /image-anchor-sync <에피소드명> 으로 실행.
---

# 이미지 앵커 동기화 (이미지 폴더 → ko → en)

**상세 가이드**: `docs/project/remotion/book-recommend/image-anchor-sync.md`

실행 전 반드시 위 문서를 Read tool로 먼저 읽는다. 품질 기준, 데이터 구조, 앵커 규칙, 검증 포맷, 주의사항이 모두 그 문서에 있다.

## 실행

```
/image-anchor-sync <에피소드명>
```

예: `/image-anchor-sync alexander-the-great`

## 파이프라인 요약

| Phase | 작업 |
|-------|------|
| A-1 | `ko.json` 전문 + `images/` 폴더 Glob 스캔 |
| A-2 | 이미지 시각 분석 + 품질 평가 (8개 기준, PASS/REJECT) |
| A-3 | PASS 이미지 → `(bookIndex, field, 앵커)` 매칭 (롱폼 + 쇼츠) |
| A-4 | SUMMARY·CONTEXT 시작 이미지 최소 1장 보장 |
| A-5 | `ko.json` 저장 (기존 앵커 보존, 전면 재작성은 승인 필요) |
| B-1 | 롱폼 `books[].images[]` 복사 + en 앵커 생성 |
| B-2 | 쇼츠 `shorts.segments[].imageChangeAt[]` 복사 + en 앵커 생성 |
| B-3 | en 앵커 `includes()` 검증, 실패 시 최대 2회 재시도 |
| B-4 | `en.json` 저장 |

## 전제 조건

- `images/` 폴더에 이미지 파일이 존재한다.
- `ko.json` 본문이 확정되어 있다.
- `en.json`이 존재한다 (번역 완료).

## 파일 경로

```
sw/remotion/public/episodes/{done|live|todo|pre-todo}/{name}/
  ko.json
  en.json
  images/
```

에피소드 위치는 `done → live → todo → pre-todo` 순서로 탐색.

## 실행 시 주의

- **기존 앵커는 기본 보존**. 전면 재작성이 필요하면 사용자에게 명시적 승인을 받는다.
- **50장 이상**은 sub-agent 스워밍(10~15장 단위 병렬 분석)으로 context 압박 완화.
- **SUMMARY/CONTEXT 시작 이미지 규칙이 품질 기준보다 우선**. 필수 슬롯이 비면 REJECT 이미지 중 경미한 결함만 있는 것을 승격.
- 이미지 파일 **이동/삭제 금지**. REJECT 파일도 `images/`에 그대로 둔다.
- 방향은 **이미지 폴더 → ko → en** 단방향. en → ko 없음.

## 출력

검증 보고서를 터미널에 출력한다 (포맷은 상세 가이드 § "검증 출력 포맷" 참조).
