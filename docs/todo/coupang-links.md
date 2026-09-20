# 수거한 쿠팡 링크 정리

엉뚱한 책에 연결된 사례가 많아 2026-09-16 전량 수거한 쿠팡 링크의 후속 처리다.
수거 원본: `data/coupang/removed-links-2026-09-16.json` — `figure_book_products` 437건(인물 도서), `content_locales` 343건(일반 콘텐츠 판매 링크).

## 방향

책 쪽과 일반 상품을 나눠 다룬다. 당장 폐기하지 않는다.

- **책(도서)**: 링크프라이스 `coupang` 머천트가 정착되면 폐기한다. 저장 상품 주소 없이 ISBN 검색 딥링크(`coupang.com/np/search?q=<ISBN>`)가 그 자리를 대신하므로, 잘못 연결됐던 상품 주소를 다시 검증해 되살릴 이유가 없다.
- **일반 상품(음반·게임·기기 등)**: ISBN이 없어 검색 딥링크로 자동 생성되지 않는다. 링크프라이스 딥링크는 개별 상품 페이지도 지원하므로, 상품별 정합성을 검증해 살릴 만한 것만 `tu` 딥링크로 감싸 되살리는 경로를 연다.

## 순서

1. 링크프라이스 AC에서 `coupang` 승인완료 확인(2026-09-20 신청, 수동승인 최대 2주 — 거절되면 이 계획 전체를 재검토)
2. `sw/web/src/lib/books/bookPurchaseRedirect.ts`의 `LINKPRICE_COUPANG_APPROVED`를 `true`로 — 플래그 하나로 경유·구매 단추가 전부 켜진다(상세는 `docs/project/operations/affiliate-commerce.md` 쿠팡 절)
3. 백업 JSON을 도서/비도서로 분류해 `data/coupang/`에 나눠 둔다
4. 도서분 폐기 확정 — ISBN 딥링크가 커버함을 확인 후 백업만 남긴다
5. 비도서분은 상품 주소 검증 → 개별 상품 페이지 딥링크로 감싸는 작업 설계(대가성 문구·`sponsored` 처리는 도서와 같은 규칙)
