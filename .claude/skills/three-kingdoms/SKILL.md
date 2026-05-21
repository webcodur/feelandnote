---
name: three-kingdoms
description: 삼국지 인물 그룹 SSoT 관리. 명단 조회, 신규 인물 추가, 진행 상태 점검, 유튜브 메타 시그널(태그·해시태그) 누락 점검·소급 적용. "삼국지 인물 목록", "삼국지 진행 상태", "조운 추가해줘", "삼국지 메타 점검" 등으로 호출.
---

# 삼국지 인물 그룹 관리

후한 말 ~ 삼국 시대 인물 묶음을 시리즈와 직교한 축으로 관리한다. book-recommend와 hell-bar 두 시리즈가 같은 명단을 공유한다.

## SSoT 위치

| 파일 | 역할 |
|------|------|
| `packages/shared/src/lib/three-kingdoms.ts` | **코드 SSoT** — `THREE_KINGDOMS_MEMBERS` 배열, `isThreeKingdomsMember()` 헬퍼 |
| `docs/project/remotion/three-kingdoms.md` | **문서 SSoT** — 슬러그 표, 진영, 진행 상태, 메타 규약 |

두 파일은 **항상 동시 갱신**한다. 한쪽만 손대면 메타 자동 부착이 깨지거나 문서가 거짓말이 된다.

## 호출 키워드

- `/three-kingdoms`
- "삼국지 인물 목록 보여줘", "삼국지 명단"
- "삼국지에 \<인물\> 추가해줘"
- "삼국지 진행 상태"
- "삼국지 메타 점검", "삼국지 태그 빠진 영상 있나"

## 작동 모드

### 모드 1: 명단 조회

`THREE_KINGDOMS_MEMBERS` 배열을 그대로 출력하고, `docs/project/remotion/three-kingdoms.md`의 표에서 한국어 이름·진영·진행 상태를 함께 보여준다.

### 모드 2: 신규 인물 추가

순서를 지킨다.

1. **DB·에피소드 폴더 확인** — 셀럽이 시스템에 이미 존재하는지 (`sw/remotion/public/episodes/<slug>` 존재 여부). 없으면 사용자에게 알리고 슬러그를 확정한다.
2. **`THREE_KINGDOMS_MEMBERS` 배열에 추가** — 알파벳 순 유지. Edit tool로 한 줄 삽입.
3. **`docs/project/remotion/three-kingdoms.md` 표 갱신** — 슬러그 명단 표에 행 추가(한국어 이름·진영 채움). 진행 상태 표에도 폴더 위치 반영.
4. **기존 업로드 점검** — `sw/remotion/scripts/youtube/youtube-lineup.json`에 해당 슬러그 항목이 있고 `uploads`가 비어 있지 않으면, 사용자에게 `pnpm youtube:patch-meta -- --episode <slug>` 실행을 안내한다(승인 받아야 실제 호출).

### 모드 3: 진행 상태 점검

`sw/remotion/public/episodes/` 하위 폴더를 스캔해 각 멤버 슬러그가 어느 상태 폴더(`pre-todo/todo/live/done`)에 있는지 보고한다. 문서의 진행 상태 표와 불일치하면 차이를 명시하고 문서 갱신 여부를 묻는다.

### 모드 4: 유튜브 메타 시그널 누락 점검

다음을 확인한다.

1. `sw/remotion/scripts/youtube/youtube-lineup.json`을 읽어 `THREE_KINGDOMS_MEMBERS` 멤버 중 `uploads` 기록이 있는 슬러그를 추린다.
2. `sw/remotion/out/<PascalLabel>/youtube-meta.json`이 있다면 그 안의 tags / description에 `삼국지` / `ThreeKingdoms` 시그널이 들어가 있는지 검사한다.
   - 슬러그 → PascalLabel 변환: `zhuge-liang` → `ZhugeLiang` (kebab → PascalCase)
3. 누락된 영상이 있으면 목록을 보여주고, 사용자 승인 후 `pnpm youtube:patch-meta -- --episode <slug>`를 실행한다(승인 없이 실행 금지).

## 메타 시그널 동작 원리 (참고)

`buildTags`와 `buildDescription`(`packages/shared/src/lib/youtube-meta.ts`)이 `celebSlug` 인자를 받아 `isThreeKingdomsMember()`로 판정한다. 멤버면 자동으로 다음을 부착한다.

- **tags** — 한국어: `삼국지`, `삼국지인물` / 영문: `ThreeKingdoms`, `RomanceOfTheThreeKingdoms`
- **description 해시태그** — 한국어: `#삼국지` / 영문: `#ThreeKingdoms`

호출처(`youtube-upload.ts`, `sw/remotion-bo/.../youtube/sync/route.ts`)는 슬러그를 정확히 전달하기만 하면 된다. 신규 호출처를 추가하는 사람은 `buildTags`의 5번째 인자에 슬러그를 넘기는 걸 잊지 말아야 한다.

## 슬러그 표기 규칙

- 모두 kebab-case 영문 슬러그 (`zhuge-liang`, `sima-yi`)
- `sw/remotion/public/episodes/<slug>` 폴더명과 100% 일치
- DB `profiles.slug`와도 일치 (불일치 시 영상은 만들 수 있어도 프로필 링크가 깨진다)

## 흔한 함정

- **`yi-sun-sin`(이순신) 추가 금지** — 조선 인물이라 삼국지가 아니다. 페어 매치도 한·중을 섞지 않는다.
- **연의 캐릭터 vs 정사 인물 구분** — 슬러그는 같지만 hell-bar 시리즈는 정사 기준으로만 다룬다. 인물 명단 자체는 문제없으나 에피소드 작성 시 `hell-bar/README.md` § 2-5 정사 기준 준수.
- **태그 추가만으로 끝났다고 보고 금지** — patch-meta로 실제 영상 메타까지 갱신해야 시청자에게 닿는다. 코드만 고치고 영상은 옛 메타 그대로 있으면 의미 없다.
- **`hook` 메타와 무관** — 본 시그널은 `EpisodeMeta.hook`이나 lineup.json 항목을 건드리지 않는다. 별개 축이다.

## 마무리

작업 끝나면 한 줄로 보고한다.

```
**[삼국지 그룹]** 어떤 모드 / 무엇이 갱신됐는지 / 후속 권장 액션(있다면)
```
