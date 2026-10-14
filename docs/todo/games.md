# 트로이·패권·천도 검수

세 게임은 쉼터 개발자 모드(로컬 개발 서버 또는 `?dev=1`)에서만 연다. 공개 설정은 [`rest-games.ts`](../../sw/web/src/constants/rest-games.ts)가 쥔다.

- [ ] **트로이 전쟁** — 한국어·영어·모바일에서 10장을 실제 조작으로 완주하고 난이도별 전투·결과 화면을 검수한다. [게임 문서](../games/myth/README.md)
- [ ] **패권** — 전투·책략·내정 일기토 세 종류와 음소거·볼륨을 한국어·영어·모바일에서 검수한다. [게임 문서](../games/hegemony.md)
- [ ] **천도 v2** — `03ed92145`에는 v2가 요구하는 `types.ts`·`constants.ts`·`i18n.ts`·`save.ts` 수정과 `loadCheondoRoster`·`loadCheondoLines` 서버 함수가 빠져 있다. 누락 코드를 받아 타입 검사를 통과시킨 뒤 `SuikodenSlot`을 `CheondoApp`에 연결한다. 인물 명부·주군 선택·방랑·거병·내정·외교·전투·결말·저장·이어하기를 한국어·영어·모바일로 검수하고 [기존 천도 TODO](suikoden.md)와 규격 문서를 v2 코드에 대조한다.
