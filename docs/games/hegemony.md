# 패권(Hegemony)

역사적 인물의 실제 영향력·능력치를 사용하는 AI 대전 카드 전략 게임이다. 일반 쉼터에서 공개한다. 공개 설정은 [`rest-games.ts`](../../sw/web/src/constants/rest-games.ts)가 쥔다.

## 진행

타이틀 → 인재 선발 → 주장 임명 → 대전 → 결과로 이어진다. 후보를 세 명씩 보여 주고 양측이 한 명씩 선발하며, 남은 인물은 제외한다. 선발을 마치면 자신의 명단에서 주장을 임명한다.

라운드마다 인물과 명령을 고른 뒤 양측 출전을 동시에 공개한다. 전투는 내정, 내정은 책략, 책략은 전투를 이긴다. 같은 명령이면 적성을 비교하며, 플레이어가 밀리거나 같으면 남은 일기토 기회를 사용할 수 있다.

전투·책략에 출전한 인물은 쉬러 간다. 내정에 출전한 인물은 손패에 남으며 쉬는 인물 하나를 복귀시킨다. 손패가 비면 다음 라운드에 복귀 후보 중 하나를 고른다. 주장이 손패에 있는 동안 동료 적성을 보정하며, 주장이 직접 출전하면 본인 보정이 적용된다. 천명에 맞는 명령에도 보정이 붙는다.

국력이 무너지면 즉시 끝난다. 마지막 라운드까지 양측이 살아 있으면 국력, 민심 순으로 비교한다. 공격은 후반에 격화되며 회복은 격화되지 않는다. 민심이 바닥나면 초과 피해와 반란 피해가 국력에 적용된다.

규칙 수치·라운드 제한·난이도는 [`constants.ts`](../../sw/web/src/lib/game/hegemony/constants.ts), 결산은 [`resolve.ts`](../../sw/web/src/lib/game/hegemony/resolve.ts)가 쥔다. 화면의 규칙 안내도 이 상수를 읽는다.

## 데이터

[`getCelebCards.ts`](../../sw/web/src/actions/game/getCelebCards.ts)가 활성 인물의 `celeb_influence`와 `celeb_persona`를 함께 조회한다. 사망 시기와 통시성 조건을 통과한 인물만 후보가 된다. 평가가 없는 인물의 능력치를 임의 생성하지 않는다. 이름·호칭·명언은 현재 언어에 맞춰 읽는다. 대사 조회는 긴 UUID URL을 피하도록 묶어서 처리하고, 선발된 후보에게만 전체 상황 대사를 붙인다.

적성은 전투에 전략·사회 영향력과 무력, 책략에 정치·기술 영향력과 지력, 내정에 경제·문화 영향력과 통솔을 사용한다. 공식과 주장·천명 보정은 [`aptitude.ts`](../../sw/web/src/lib/game/hegemony/aptitude.ts)가 쥔다.

## 구현 진입점

| 책임 | 경로 |
|---|---|
| 쉼터 연결 | [`RestGameGrid.tsx`](../../sw/web/src/components/features/rest/RestGameGrid.tsx) |
| 전체화면·오디오 | [`HegemonyGame.tsx`](../../sw/web/src/components/features/game/hegemony/HegemonyGame.tsx) |
| 단계별 화면 | [`HegemonyApp.tsx`](../../sw/web/src/components/features/game/hegemony/HegemonyApp.tsx) |
| 상태 전이 | [`session/reducer.ts`](../../sw/web/src/lib/game/hegemony/session/reducer.ts) |
| 언어 문구 | [`text/`](../../sw/web/src/components/features/game/hegemony/text/) |
| 실제 DB·엔진 검증 | [`game-engine-data-audit.ts`](../../sw/web/scripts/tests/game-engine-data-audit.ts) |
| 브라우저 진행 검증 | [`hegemony-browser-audit.mjs`](../../sw/web/scripts/tests/hegemony-browser-audit.mjs) |

전적과 오디오·연출 설정은 브라우저 저장소에 보관한다. 아직 남은 검수는 [`games.md`](../todo/games.md)가 쥔다.
