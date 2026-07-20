# 천도 게임 개발 룰북

> ⚠️ **현재 비활성 (26.07.16 기준).** 개발이 멈춘 상태다. 재개 시 「지뢰밭」 절을 먼저 읽는다.

천도(天導) 게임 개발 시 지키는 **개발 규칙**. 게임 설계는 여기 싣지 않는다.

- **오마주**: 코에이 『수호전 천도 108성』 (1996)
- **게임 설계 단일원천(SSoT)**: `docs/suikoden-sim/` — 개요·데이터 소스·스탯·병과·전투·경영은 전부 이쪽이다
- **구현 현황**: `docs/suikoden-sim/10-implementation-status.md` — 작업 재개 전 필독

---

## 작업 규칙

1. **착수 전 실측**: 문서를 근거로 코드를 단정하지 않는다. 편집 대상 파일을 먼저 연다. 설계(01~09)와 코드가 충돌하면 코드가 사실이다.
2. **기획서 우선**: 새로 만드는 수치·로직은 `docs/suikoden-sim/` 기획서를 따른다. 기획서에 없으면 기획서에 먼저 적는다.
3. **타입 체크**: 작업 완료 후 `cd sw/web && npx tsc --noEmit` 통과 확인.
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

**전용 라우트는 없다.** 게임은 쉼터 화면(`/rest`)의 카드를 누르면 그 자리에 마운트된다. `app/[locale]/(main)/rest/suikoden/`에는 `loading.tsx`만 있고 `page.tsx`가 없어서 `/rest/suikoden`은 404다. `constants/navigation.tsx`에 이 죽은 링크가 남아 있다.

---

## 지뢰밭 — 건드리기 전에 확인할 것

| 함정 | 내용 |
|------|------|
| **죽은 전술 상수** | `TACTIC_MATCHUP`, `TACTIC_INFO`, `CLASS_TACTIC_BONUS`, `TacticType`은 남아 있으나 **아무도 import하지 않는다.** 전투는 `battleEngine.ts`의 그리드 턴제다 |
| **미호출 엔진 함수** | `previewWorld()`, `initGame()`은 import만 되고 호출되지 않는다. 셋업은 `previewScenario()` → `finalizeGame()` 경로다 |
| **HP 공식 두 벌** | `utils.dbToCharacter`(월드맵)와 `battleEngine.calcUnitHp`(전투)가 다른 공식을 쓴다. 어느 쪽인지 명시하지 않고 "HP"라 부르지 않는다 |
| **로그 정규식 번역** | `i18n.ts`의 `translateSuikodenMessage`/`translateSuikodenBattleLog`가 **엔진이 만든 한국어 로그를 정규식으로 매칭해 영어로 재조립**한다. 엔진 로그 문구를 바꾸면 조용히 깨진다 |
| **i18n 이중 체계** | next-intl(`rest.arena.suikoden`)과 게임 전용 `i18n.ts`를 병행한다. 텍스트를 어디에 넣을지 먼저 정한다 |
| **시나리오 UUID** | `scenarios.ts`가 인물을 프로필 UUID로 지정한다(51개). 인물 명단 변경 시 함께 고친다 |
| **거점 배경 URL** | `imageUrl` 필드를 읽지 않고 거점 id로 경로를 조립한다. 이미지 없는 3개 거점이 404를 낸다 |
| **미사용 상수** | `DIFFICULTY_CONFIG.maxTurns`·`startAP`, 건물의 `special: 'discover'`·`'sorcery'`는 정의만 있고 읽히지 않는다 |

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **DB 테이블**: `profiles`, `celeb_influence`, `celeb_persona`, `celeb_dialogues`
- 캐릭터 로딩 조건·쿼리는 `docs/suikoden-sim/02-characters.md` 참조
