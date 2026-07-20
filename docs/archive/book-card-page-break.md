# BookCardVisual 페이지 전환 버그 — 2026-03-23 수정 완료

> 이력 문서. 현행 규칙 아님. 작성 시점: 26.03.
> 여기 적힌 `needsQuoteCtxAfterBreak` 플래그와 `sections/BookCardVisual.tsx` 경로는 현재 코드에 없다. 롱폼 현역 컴포넌트는 `legacy/BookCardVisualLegacy.tsx`다.

## 현상

EN 이순신 롱폼 BOOK 1/5 (손자병법) QUOTE 구간에서:
- quote + contextAfter 텍스트가 화면(648px)을 넘침
- 텍스트가 하단에서 잘림

## 원인

`needsCtxPageBreak`가 context→quote 전환은 처리했지만, quote(444px)+contextAfter(640px)=1084px가 VISIBLE_H(648px)를 초과하는 2차 넘침에 대한 처리가 없었음.

## 수정 내용

`needsQuoteCtxAfterBreak` 플래그 추가:
- quote+contextAfter 합산 > VISIBLE_H일 때 활성화
- `sContextAfter` 프레임에서 quote fadeOut/slideOut + contextAfter slideIn 애니메이션
- 3페이지 전환 흐름: context → quote → contextAfter

## 관련 파일

- `sw/remotion/src/compositions/BookRecommend/sections/BookCardVisual.tsx` (168~176행)
