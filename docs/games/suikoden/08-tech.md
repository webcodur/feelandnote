# 08. 기술 구조

`RestGameGrid`에서 천도를 열 때 `SuikodenSlot`이 `CheondoApp`을 동적으로 불러온다. 쉼터를 읽는 단계에서는 천도 명부를 조회하지 않는다. 게임은 브라우저 전체 화면 층에 렌더링하며 제목·주군 선택·방랑·전략·합전·결과를 연결한다.

## 코드 진입점

경로의 기준은 `sw/web/src/`다.

| 경로 | 책임 |
|---|---|
| `lib/game/suikoden/types.ts` | 명부·판·세력·인재·전투·사건의 계약 |
| `lib/game/suikoden/constants.ts` | 실행 수치·허용값·비용·보정 |
| `lib/game/suikoden/map.ts` | 세계 지도와 고향·경로 |
| `lib/game/suikoden/roster-data.ts` | 공개 DB 명부 조회와 브라우저 전송 자료 |
| `lib/game/suikoden/roster.ts` | 명부 복원·능력·등급·병력 산출 |
| `lib/game/suikoden/world.ts` | 새 세계·AI 세력·플레이어 거병 |
| `lib/game/suikoden/query.ts`, `mutate.ts` | 상태 조회·공통 변경·결말 |
| `lib/game/suikoden/wander.ts` | 방랑과 조우 |
| `lib/game/suikoden/commands.ts`, `economy.ts` | 명령·위임·수지 |
| `lib/game/suikoden/ai.ts`, `turn.ts` | AI·월 진행 |
| `lib/game/suikoden/battle.ts`, `power.ts`, `war.ts` | 합전·전력·전후 처리 |
| `lib/game/suikoden/diplomacy.ts`, `events.ts` | 외교와 사건 선택 |
| `lib/game/suikoden/save.ts`, `codex.ts`, `stars.ts` | 저장·인물 기록·성호 |
| `actions/game/suikoden/index.ts` | locale에 맞춘 명부 캐시와 필요한 인물의 대사 조회 |
| `components/features/game/suikoden/` | 게임 화면·패널·지도·공용 UI·번역 |

## 상태와 저장

명부는 `Roster`의 목록과 ID·고향별 색인으로 읽는다. 바뀌는 판은 `GameState` 하나에 담고, 화면 명령은 복제한 판을 엔진에 넘긴다. 난수 상태도 판에 포함해 저장과 이어하기가 같은 흐름을 잇는다.

`save.ts`가 브라우저 단일 자동 저장을 담당한다. 버전과 자료 구조, 현재 명부의 인물을 확인한 뒤 읽고, 손상된 저장은 이어하지 않는다. 저장 실패는 플레이를 중단하지 않고 경고한다. 나가기·제목 복귀·페이지 종료 때도 마지막 상태를 저장한다.

판의 저장과 판을 넘어가는 성도 기록은 서로 다른 키를 사용한다. 키의 정본은 `constants.ts`다. 게임 상태를 DB나 별도 파일에 보관하지 않는다.

## 번역

게임 문구는 `i18n.ts`의 한영 사전과 로그 포맷터가 쥔다. 엔진은 문장 대신 코드와 인물·영토 ID·수치를 남기고, 화면이 현재 locale의 이름과 문구로 조립한다. 새 사건·명령·전투 로그를 추가하면 해당 포맷터도 함께 고친다.
