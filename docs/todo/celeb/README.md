# 인물 남은 작업

현재 규격은 [`docs/project/celeb/`](../../project/celeb/README.md), 전체 남은 작업은
[`docs/todo/README.md`](../README.md)를 본다.

| 문서 | 다음 작업 |
|---|---|
| [`session-handoff.md`](session-handoff.md) | 두 세션이 넘긴 DB 반영분과 다시 밟지 말 함정을 먼저 읽는다 |
| [`avatar-backlog.md`](../img/avatar-backlog.md) | 아바타가 없어 공개하지 못하는 인물의 얼굴을 만든다 |
| [`awakened-mode.md`](awakened-mode.md) | 사용자 웹의 화면 전환 방식·적용 범위를 정한다 |
| [`influence-spectrum.md`](influence-spectrum.md) | 영향력·스펙트럼 잔여 검토 — 다른 15축 근거 적정성, 영향력 검사기, 사실성, 검사기 구멍. **Claude·Kimi·SWE-2 안에서 처리한다** |
| [`reading-audit-discard.md`](reading-audit-discard.md) | 이전 감사 후보 76건을 현행 집필 기준으로 다시 읽고, 실제 오류와 부자연스러운 부분을 수정한다 |
| [`out-of-print-editions.md`](out-of-print-editions.md) | 감상·연결 도서 절판 판본 정비 — 자동+건별 검수로 98건 전환 완료, 잔여 170건은 현역 판본 부재 확인. 난중일기류 중복 `contents` 병합 검토 남음 |

문서 없이 남은 판단: **판본 범위가 달라 통합에서 뺀 쌍** — 「정신현상학」(4a56b46b)↔「정신현상학 1」(0c15caff), 안데르센 동화집 세 작품(5d3d4f79·5c7f585a·ca5f07af). 같은 저작인지 판본만 다른지 사람이 본다. 합치면 `merge-works.mjs`가 목록·컬렉션·기록·노트 연결까지 옮긴다.
