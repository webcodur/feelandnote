# 셀럽 서가 한영 판본 표시 잔여 작업

판본·locale 규칙은 [`celeb-02-02-content-registration.md`](../project/celeb/celeb-02-02-content-registration.md) 「BOOK 영문판과 표지」, 감사 절차는 [`celeb-02-04-content-audit.md`](../project/celeb/celeb-02-04-content-audit.md)를 따른다. 요청 언어판이 없을 때 반대 언어 값으로 메우는 폴백은 설계다(`flattenLocales`, `sw/web/src/lib/utils/content-locale.ts`). 없는 언어판의 제목을 번역·음차로 지어내지 않는다.

## 현재 분포 (26.09.29 DB 조회)

BOOK 17,042종 중 한영 행을 둘 다 가진 것 14,493종, KO만 1,958종, EN만 588종이다. 둘 다 있어도 **en 표지가 빈 것 6,046종**, ko 표지가 빈 것 6,275종이다. 26.09.11(en 표지 null 806종)보다 크게 늘었다 — 표시용 제목 행(`sources.primary='none'`)을 대량으로 붙인 결과로 보이며, 원인 구분이 첫 일이다.

## 남은 일

1. **표지 빈 행의 원인 구분과 보완** — en·ko 표지 null을 `sources.primary`(실판본/표시용 행)와 `sources.thumbnail=confirmed_unavailable`로 나눈다. 실판본인데 표지만 없는 것은 논어 절차(OpenLibrary 판본 실측 → 같은 판본 ISBN·표지·출판사 교체)로 메우고, 표시용 행은 [`figure-books-en-editions.md`](figure-books-en-editions.md)의 판본 등록과 겹치므로 그쪽에서 처리한다. KO-only·EN-only는 목록화만 한다.
2. **ReviewLayout 무판본 표지** — 판본 없는 언어(`editionUnavailable`)에서 KO 표지 대신 「No English edition」 생성 표지를 내는 수정이 작업 트리 `ReviewLayout.tsx`에 들어 있다. 운영 배포 여부를 확인하고, 배포됐으면 이 줄을 지운다.
3. **주례 en 표지** — `contents 43fe6305…/en`은 여전히 thumbnail·ISBN 없음, `sources.primary=none`이다(26.09.29 확인). OpenLibrary 영문판 실측 후 같은 판본으로 교체한다.
4. **역경 en 표지 원천 교체** — `contents f0a1a3ca…/en`(I Ching, 9780140194081) 표지가 아직 `books.google.com` URL이다(26.09.29 확인). 신규 BOOK 금지 원천이므로 OpenLibrary ISBN 표지로 바꾼다.
5. **영문판 ISBN 미확인 3건** — en 행에 ISBN이 없고 en 판본도 0건이다(26.09.29 확인). `Liezi`(`4a393786…`, 후보 9788971073322) · `Kŭmo sinhwa`(`7303db43…`, 후보 9788970656021) · `Samguk Yusa`(`d49ff914…`, 후보 9788935656592). 확인해 채우거나 영문판 없음으로 확정한다.
6. **판본 종류 미정 3건** — `figure_book_editions.edition_kind`가 여전히 NULL이다(26.09.29 확인): 판본 38 리비우스 로마사(9791187142348) · 판본 755 삼국사기(9791170292081) · 판본 4997 베갯머리 서책(9791130468709).
