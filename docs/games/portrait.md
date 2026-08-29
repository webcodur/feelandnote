# 시대의 초상 게임

> **최종 실측 체크: 26.07.30** — 현행 코드·KO/EN 번역·쉼터 진입 주석·생산 빌드 대조. 실제 브라우저 완주는 로컬 DB 연결 환경값 부재로 미검증

시대의 초상은 흐릿한 인물 사진이 점차 선명해지는 동안 네 이름 중 정답을 고르는 1인용 게임이다. 구현·조회·번역·자산은 보존하지만 현재 쉼터(`/[locale]/rest`)의 카드·목차·데이터 조회·렌더 연결을 주석 처리해 공개 화면에서는 진입할 수 없다. 재공개할 때는 `RestGameGrid.tsx`와 `rest/page.tsx`의 `시대의 초상 비공개` 주석 묶음만 복원한다.

## 플레이 흐름

1. 한 판에 서로 다른 인물 10명이 출제된다.
2. 각 문제는 정답 1명과 오답 3명으로 구성한다.
3. 사진이 실제로 화면에 준비된 뒤 첫 3초 구간이 시작된다.
4. 3초마다 사진이 선명해지며 획득 가능 점수는 1,000 → 750 → 500 → 250점으로 낮아진다.
5. 네 번째 구간이 끝나면 시간 초과다. 정답·오답·시간 초과 후 원본 사진과 정답을 확인하고 다음 문제로 간다.
6. 결과에서 유효 문제 기준 점수·정답률·최대 연속 정답·브라우저 최고 기록을 본다.

숫자키 1~4로 답하고 Enter로 다음 문제로 갈 수 있다. 터치에서는 선택지를 항상 2열로 보여 스크롤 중 점수가 깎이지 않게 한다.

## 공정성과 오류 처리

- 사진 `onLoad` 전에는 타이머, 숫자키, 선택 버튼이 모두 멈춘다. 네트워크 속도를 점수에 반영하지 않는다.
- 사진 `onError`는 사용자 오답으로 처리하지 않는다. 문제를 건너뛰고 결과의 정답률 분모와 최대 가능 점수에서도 제외한다.
- 서버 조회 오류는 빈 목록으로 숨기지 않고 예외로 드러낸다. 잘못된 정상 화면보다 명시적 실패를 택하는 프로젝트 원칙을 따른다.
- 후보가 4명 미만이면 시작 버튼을 비활성화한다.

## 모바일·접근성

- 320px 폭에서는 초상 너비 160px, 선택지는 2열이다. 화면이 커지면 초상만 230px·290px로 확대된다.
- 이 게임은 대사 자막을 쓰지 않아 공용 전체화면의 자막용 하단 112px 여백을 예약하지 않는다. 다른 게임은 기본값으로 기존 여백을 유지한다.
- 현재 획득 가능 점수를 크게 표시하고 각 3초 구간을 줄어드는 막대로 보여준다.
- 진행 막대는 `progressbar` 의미와 현재 단계를 제공한다. 가려진 사진에도 일반 설명을 제공하며, 정오답은 색상뿐 아니라 Check/X와 문장으로 구분한다.
- 답변 뒤 별도 다음 버튼에 포커스를 옮긴다. Enter 기본 클릭은 막아 전역 단축키와 중복 실행되지 않게 한다.

## 코드 위치

| 책임 | 경로 |
|------|------|
| 상태·타이머·점수 제어 | `sw/web/src/components/features/game/portrait/PortraitGame.tsx` |
| 로비 | `sw/web/src/components/features/game/portrait/PortraitLobby.tsx` |
| 문제·초상·선택·피드백 | `sw/web/src/components/features/game/portrait/PortraitRoundView.tsx` |
| 결과 | `sw/web/src/components/features/game/portrait/PortraitResult.tsx` |
| 출제 엔진 | `sw/web/src/components/features/game/portrait/engine.ts` |
| 타입·점수 상수 | `sw/web/src/components/features/game/portrait/types.ts` |
| 인물 사진 조회 | `sw/web/src/actions/game/getPortraitFigures.ts` |
| 쉼터 등록 | `sw/web/src/components/features/rest/RestGameGrid.tsx` · `sw/web/src/app/[locale]/(main)/rest/page.tsx` |
| 번역 | `sw/web/messages/{ko,en}/rest.json`의 `rest.arena.portrait` |

## 현재 검증과 남은 한계

- 관련 ESLint, 캐시 없는 전체 TypeScript, 번역 JSON 파싱, 출제 엔진 회귀 시험, `git diff --check` 통과.
- `pnpm build:web` 성공: TypeScript와 정적 페이지 131/131 생성, `/[locale]/rest` 포함.
- 독립 회귀 감사에서 로딩 전 정지, 사진 오류 제외, 마지막 문제 오류, 320×640 배치, 다음 버튼 포커스, 공용 전체화면 하위 호환, KO/EN 키를 확인했다.
- 로컬에 DB 연결 환경값이 없어 실제 DB 사진을 사용한 브라우저 완주는 하지 못했다. 배포 전 실제 모바일 한 판 완주가 최종 확인 항목이다.
- 카드 배경은 비공개 기억 게임의 `memory-card.webp`를 재사용한다. 어두운 기록 회랑 분위기는 맞지만 두 장만 밝은 구도에 짝 맞추기 흔적이 남는다. 전용 이미지를 만들 때는 한 초상으로 시선이 모이는 구도로 교체한다.
