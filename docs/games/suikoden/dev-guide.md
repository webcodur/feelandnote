# 천도 게임 개발 룰북

> **최종 실측 체크: 26.07.30** — 천도 코드·실제 진입 경로·검증 결과 전수 대조

> **개발 재개·핵심 완주 흐름 구현.** 시나리오 선택부터 방랑·거병·경영·전투·외교·통일/패망 결과까지 코드상 연결됐다. 다만 브라우저 실제 한 판 완주, 실 DB의 시나리오 고정 UUID, 전체 web 빌드는 아직 검증 완료로 보지 않는다. 상세는 아래 「현재 검증 상태」를 따른다.

천도(天導) 게임 개발 시 지키는 **개발 규칙**. 게임 설계는 여기 싣지 않는다.

- **오마주**: 코에이 『수호전 천도 108성』 (1996)
- **게임 설계 단일원천(SSoT)**: `docs/games/suikoden/` — 개요·데이터 소스·스탯·병과·전투·경영은 전부 이쪽이다
- **구현 현황**: `docs/games/suikoden/10-implementation-status.md` — 작업 전 필독

---

## 작업 규칙

1. **착수 전 실측**: 문서를 근거로 코드를 단정하지 않는다. 편집 대상 파일을 먼저 연다. 설계(01~09)와 코드가 충돌하면 코드가 사실이다.
2. **기획서 우선**: 새로 만드는 수치·로직은 `docs/games/suikoden/` 기획서를 따른다. 기획서에 없으면 기획서에 먼저 적는다.
3. **타입 체크**: 작업 완료 후 저장소 루트에서 `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter '@feelandnote/web' exec tsc --noEmit --pretty false`를 실행한다.
4. **상수 관리**: 매직 넘버 금지. `constants.ts`에서 관리한다.
5. **문서 갱신**: 시스템 추가·변경 시 `10-implementation-status.md`를 함께 고친다. 설계 자체가 바뀌면 해당 기획서(01~09)도 고친다.
6. **파일 경로**: 상대 경로만 사용.

---

## 코드 경로

전체 파일 목록과 역할은 `10-implementation-status.md`에 있다. 아래는 진입점만이다.

| 구분 | 경로 |
|------|------|
| 게임 로직 | `sw/web/src/lib/game/suikoden/` |
| UI 컴포넌트 | `sw/web/src/components/features/game/suikoden/` |
| Server Actions | `sw/web/src/actions/game/suikoden/index.ts` |
| 화면 | `sw/web/src/app/[locale]/(main)/rest/page.tsx` → `RestGameGrid` → `SuikodenGameWrapper` |
| 에셋 | `sw/web/public/images/game/suikoden/`, `sw/web/public/assets/suikoden/` |

**전용 라우트는 없다.** 게임은 쉼터 화면(`/[locale]/rest`)의 천도 카드를 누르면 그 자리에 열린다. 카드는 주소를 `#suikoden`으로 바꾸며, `/[locale]/rest#suikoden` 직접 접근도 자동으로 게임을 연다. `app/[locale]/(main)/rest/suikoden/`에는 `loading.tsx`만 있고 `page.tsx`가 없어 `/rest/suikoden`은 404다. `constants/navigation.tsx`에 이 죽은 링크가 남아 있다.

---

## 현재 핵심 완주 흐름

- 비밀코드 없이 공개 로비에서 새 게임 또는 이어하기를 선택한다.
- DB는 `SUIKODEN_CHARACTER_IDS`에 포함된 시나리오 고정 인물만 조회한다. 선택 시나리오의 필수 인물이 빠졌으면 해당 시나리오를 시작할 수 없고 누락 안내가 보인다.
- 한 판의 진행 상태는 브라우저에 단일 자동 저장한다. 저장 실패 시 플레이는 계속되지만 창을 닫으면 진행이 사라질 수 있다는 한/영 경고를 보인다.
- 침공은 인접 영토와 실제 거점 주둔 인물만 사용한다. 무주지는 무혈 점령하며, 점령지 담당 배치를 비우고 패배측 주둔 인물은 남은 거점으로 후퇴시킨다.
- 병영 생산 병사는 세력 예비 병사로 쌓이고, 플레이어와 AI 모두 같은 보충 명령으로 선택 인물의 등급별 병력 상한까지 배치한다.
- 전투는 3×5 개별 인물 턴제다. 기존 부상과 병력을 전투 시작에 반영하고, 전투 뒤 체력·병력 손실을 캠페인에 유지한다. 일기토는 선공과 생존 시 반격이 이어지는 1:1 상호 타격이다.
- 중앙 판정은 플레이어 영토 0이면 패망, 시나리오 활성 영토 전부를 플레이어가 차지하면 통일, 난이도 제한 턴에 도달하면 시간 초과로 끝낸다.
- 영토나 인물을 잃은 AI 세력은 정리하고, 다른 곳에 남지 않은 인물·포로는 방랑자 풀로 돌려보낸다.

---

## 지뢰밭 — 건드리기 전에 확인할 것

| 함정 | 내용 |
|------|------|
| **죽은 전술 상수** | `TACTIC_MATCHUP`, `TACTIC_INFO`, `CLASS_TACTIC_BONUS`, `TacticType`은 남아 있으나 **아무도 import하지 않는다.** 전투는 `battleEngine.ts`의 그리드 턴제다 |
| **미호출 엔진 함수** | `previewWorld()`, `initGame()`은 현행 시작 흐름에서 호출되지 않는다. 셋업은 `previewScenario()` → `finalizeGame()` 경로다 |
| **HP 공식 두 벌** | `utils.dbToCharacter`(월드맵)와 `battleEngine.calcUnitHp`(전투)가 다른 공식을 쓴다. 어느 쪽인지 명시하지 않고 "HP"라 부르지 않는다 |
| **로그 정규식 번역** | `i18n.ts`의 `translateSuikodenMessage`/`translateSuikodenBattleLog`가 **엔진이 만든 한국어 로그를 정규식으로 매칭해 영어로 재조립**한다. 엔진 로그 문구를 바꾸면 조용히 깨진다 |
| **i18n 이중 체계** | next-intl(`rest.arena.suikoden`)과 게임 전용 `i18n.ts`를 병행한다. 텍스트를 어디에 넣을지 먼저 정한다 |
| **시나리오 UUID** | `scenarios.ts`가 인물을 프로필 UUID로 지정한다. 인물 명단 변경 시 `SUIKODEN_CHARACTER_IDS`와 시나리오 필수 인물 검사를 함께 확인한다 |
| **이미지 검사는 시작 조건 아님** | 초상은 폴백이 있고 이미지 HEAD 검사는 3초 제한으로 뒤에서 실행한다. 이미지 지연·실패 때문에 시나리오 시작을 거부하지 않는다 |
| **거점 배경 URL** | `imageUrl` 필드를 읽지 않고 거점 id로 경로를 조립한다. 이미지 없는 3개 거점이 404를 낸다 |
| **미사용 상수** | `DIFFICULTY_CONFIG.startAP`, 건물의 `special: 'discover'`·`'sorcery'`는 정의만 있고 읽히지 않는다. `maxTurns`는 중앙 캠페인 판정에서 사용한다 |

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **DB 테이블**: `celebs`, `celeb_influence`, `celeb_persona`, `celeb_dialogues`
- 캐릭터 로딩 조건·쿼리는 `docs/games/suikoden/02-characters.md`와 `10-implementation-status.md` 참조

---

## 현재 검증 상태 (26.07.30)

- 천도 범위 ESLint: **0 errors / 19 warnings**
- 천도 관련 경로 `git diff --check`: **통과**
- Node 22 내장 TypeScript 로딩: 시나리오 **5종 확인**
- 전체 TypeScript 검사와 `pnpm build:web`: 천도 밖의 사용자 수정 파일 `sw/web/src/constants/scripturesMuseum.ts`가 존재하지 않는 `scriptures/ko/ai-academy.json`, `scriptures/en/ai-academy.json`을 가져와 중단. 이 두 오류 외 천도 타입 오류는 보고되지 않았다.
- 미검증: 브라우저에서 실제 한 판 완주, 한국어/영어·모바일 시각 검수, 실 DB 시나리오 UUID 전원 생존 여부, 엔진 런타임 직접 실행. 저장소에 `tsx` 실행기가 없고 브라우저 도구가 없어 이번 작업에서 확정하지 못했다.

따라서 **코드상 본 서비스 진입과 완주 흐름은 연결됐지만, 배포 가능 확정 상태는 아니다.** 위 미검증 항목과 전체 빌드 차단 원인을 해소한 뒤 실제 플레이로 최종 승인한다.
