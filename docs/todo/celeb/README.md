# 인물 남은 작업

현재 규격은 [`docs/project/celeb/`](../../project/celeb/README.md), 전체 남은 작업은
[`docs/todo/README.md`](../README.md)를 본다.

| 문서 | 다음 작업 |
|---|---|
| [`influence-spectrum.md`](influence-spectrum.md) | 영향력·스펙트럼 잔여 검토 — 다른 15축 근거 적정성, 영향력 검사기, 사실성, 검사기 구멍. **Claude·Kimi·SWE-2 안에서 처리한다** |

신규 인물 등록 원장과 미등록 후보는 데이터 폴더 [`data/celeb/new-figures/`](../../../data/celeb/new-figures/README.md), 인물 1명 등록 절차는 [`celeb-00-03-new-figure-checklist.md`](../../project/celeb/celeb-00-03-new-figure-checklist.md)가 쥔다.

## 문서 없이 남은 판단

- **판본 범위가 달라 통합에서 뺀 쌍** — 「정신현상학」(4a56b46b)↔「정신현상학 1」(0c15caff), 안데르센 동화집 세 작품(5d3d4f79·5c7f585a·ca5f07af), 『난중일기』 `contents` 세 행(ef63a031·7112ed58·fbbfd924). 같은 저작인지 판본만 다른지 사람이 본다. 합치면 `merge-works.mjs`가 목록·컬렉션·기록·노트 연결까지 옮긴다.
- **각성모드 사용자 웹 도입** — 각성 이미지(저장 규격은 [`celeb-08-00-image-map.md`](../../project/celeb/celeb-08-00-image-map.md))를 사용자 웹에서 호버·탭·스크롤 중 무엇으로 바꿔 보일지(모바일 포함), 이집트 21인만인지 `celeb_reality=FICTION` 전체인지 사용자가 정한다. 비교 화면은 대표 사진과 각성 이미지를 인물 단위로 붙여 보인다.
- **감상 도서 절판 잔여 170건** — 같은 작품의 판매 판본이 없음을 확인한 상태다. 신판이 나오면 다시 잡는다. 처리 규칙은 [콘텐츠 등록](../../project/celeb/celeb-02-02-content-registration.md) 「절판」 절이 쥔다.
