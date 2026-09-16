# 셀럽 서가 한영 판본 표시 잔여 작업

판본·locale 규칙은 [`celeb-02-02-content-registration.md`](../project/celeb/celeb-02-02-content-registration.md) 「BOOK 영문판과 표지」, 감사 절차는 [`celeb-02-04-content-audit.md`](../project/celeb/celeb-02-04-content-audit.md)를 따른다. 값은 코드·DB가 쥐고 이 문서는 경로와 할 일만 적는다.

## 개요

정현 EN 페이지에서 제보 2건이 들어왔다. ① 논어가 한국 포스터로 노출되는 건과 ② 감상 목록에 「예학 강의 의례편」이 한국어로 뜨는 건이다. ①은 데이터 결손이었다. en행 표지가 null이고 기존 Dover ISBN에는 OpenLibrary 표지 자체가 없어 `confirmed_unavailable`이 찍혀 있던 상태라, 검증된 펭귄판(D.C. Lau 영역)으로 판본을 교체하고 운영 반영까지 마쳤다. ②는 결손이 아니다. 검증 가능한 영문판이 존재하지 않는 KO-only 정상이므로 EN 제목을 지어낼 수 없어 데이터를 손대지 않았다.

정현 8권만 보고 닫을 문제는 아니다. BOOK 12,059종 실측에서 한영 판본을 둘 다 갖춘 것은 4,817종뿐이고, KO-only 3,256종은 EN에서 한국어로, EN-only 3,986종은 KO에서 영어로 나간다. 판본 둘 다 있어도 en 표지 null 806종·ko 표지 null 171종이 남는다. 제보 2건은 이 분포의 일부다. 없는 언어판을 날조하지 않는 선은 지키되, 있는 판본의 표지가 비어 있는 것은 논어와 같은 절차로 메우고, 언어가 없어도 화면이 깨져 보이지 않게 표시를 고친다.

## 완료 (2026-09-11)

- 논어 en행(`contents 32838ac4…/en`)을 펭귄판(Dover→Penguin 9780140443486, OL ISBN 표지)으로 교체하고 `/api/revalidate` 표적 무효화+Cloudflare purge까지 마쳤다. 운영 EN 페이지에 영문 표지 노출 확인.

## 남은 일

1. **전수 조사와 대량 보완** — BOOK 12,059종 실측 기준(KO-only 3,256·EN-only 3,986·en 표지 null 806·ko 표지 null 171). 표지 null 중 `sources.thumbnail=confirmed_unavailable`이 아닌 것, ISBN 교체로 해결 가능한 것을 골라 논어 절차(OpenLibrary 판본 실측→동일 판본 ISBN·표지·출판사 교체)로 메운다. KO-only·EN-only는 목록화만 하고 언어판을 지어내지 않는다. 아래 3·4번은 이 조사에 흡수될 수 있다.
2. **ReviewLayout 무판본 생성표지 배포** — `sw/web/src/components/ui/cards/ContentCard/sections/ReviewLayout.tsx` 로컬 수정, 미커밋. 판본 없는 언어(`editionUnavailable`)에서 KO 표지를 조용히 내보내지 않고 포스터 모드와 같은 「No English edition」 생성 표지를 낸다. tsc·eslint·관련 테스트 27건 통과. 배포 지시 대기.
3. **주례 en 표지 보완** — `contents 43fe6305…/en`은 thumbnail null·isbn null·미검증행(`sources.primary=none`). OpenLibrary 영문판 실측 후 같은 판본으로 교체한다.
4. **역경 en 표지 원천 교체** — `contents f0a1a3ca…/en` 표지가 Google Books URL이라 신규 BOOK 금지 원천에 걸린다. OpenLibrary ISBN 표지로 교체한다.

5. **정비 원장에서 넘어온 잔여 7건(26.09.16)** — 09-10~15 locale 정비·표시 제목·판본 검토 원장을 DB와 대조해 반영 완료분을 지우며 남긴 것이다. 각 건을 확인해 채우거나, 해당 판본이 없으면 없음으로 확정한다.
   - 영문판 ISBN 미확인(en 행에 ISBN 없음): `Liezi`(`4a393786…`, 한국 출판 영역본 후보 9788971073322) · `Kŭmo sinhwa`(`7303db43…`, 9788970656021) · `Samguk Yusa`(`d49ff914…`, 연세대 영역본 후보 9788935656592)
   - 판본 종류(`figure_book_editions.edition_kind`) 미정: 판본 38 리비우스 로마사(9791187142348) · 판본 755 삼국사기(9791170292081) · 판본 4997 베갯머리 서책(9791130468709)
   - 표시용 한국어 행 누락: `순열 도시`(`2d6909b1…`, 계획은 translated 표식)

## 정책 확인

- 요청 언어판이 없을 때 반대 언어 값으로 메우는 폴백은 설계다. `flattenLocales`(`sw/web/src/lib/utils/content-locale.ts`)가 해당 언어 우선·반대 언어 대체로 제목·표지를 뽑고, [`02-content.md`](../project/data/02-content.md)도 목록은 LEFT JOIN 후 명시적 fallback을 고르게 한다.
- 그래서 KO-only 책은 EN에서 한국어로, EN-only 책은 KO에서 영어로 뜨는 것이 맞다. 없는 언어판의 제목을 번역·음차로 지어내지 않는 것은 등록 룰북이 금지한다.
- 예학 강의 의례편(`contents f1f089f6…`)은 검증 가능한 영문판이 없어(OpenLibrary 제목 검색 0건) KO-only가 정상이다. 손대지 않는다.
