# 가상 담화 DB 단일원천

가상 담화의 텍스트·구성은 DB가 원본이고, 렌더가 읽는 파일은 DB에서 만들어 내는 산출물이다. 편집 화면은 web-bo `/discourses`가 쥔다([`apps-01-web-bo.md`](../../apps/apps-01-web-bo.md) 「가상 담화」). 시리즈 기획·연출은 [`README.md`](README.md)가 쥔다.

## 1. 원본과 산출물

| 층 | 무엇 | 비고 |
|---|---|---|
| 원본 | `discourse_episodes`·`discourse_speakers`·`discourse_turns` | 인물은 평면, 순서는 발언이 정한다. `turns`는 `speakers`의 형제(`episode_id` 직속, `speaker_id`는 링크). 편별 부속 값은 `data` jsonb |
| 저장 | RPC `discourse_replace_episode(p_folder, p_episode, p_speakers, p_turns, p_expected_updated_at)` | security definer·service_role 전용. TS가 uuid를 먼저 만들고 낙관적 잠금으로 원자 저장한다. 발언자 전원을 삭제·잠금 전에 DB CELEB로 선검증한다 |
| 발언자 정체성 | `discourse_speakers.celeb_id` | `NOT NULL`·`ON DELETE RESTRICT`. slug가 삭제되지 않은 CELEB로 해소되지 않으면 저장·가져오기 전체를 쓰기 전에 중단한다 |
| 산출물 | `sw/remotion/public/discourses/<편>/`의 `discourse-data.json`(메타)·`cast.json`(인물)·`turns.json`(발언) + `_episodes.json` | 렌더는 빌드타임 정적 import라 DB를 직접 읽지 못한다. 그래서 export 방식이다. 직접 편집하지 않는다 |

## 2. 내보내기와 손 편집 감시

```text
DB → pnpm discourse:export → 세 파일 (+_episodes.json) → 렌더 무수정
```

- 저장 직후 자동으로 export한다. `--drift`는 DB와 파일의 차이만 보고한다.
- `_generated` 마커는 `discourse-data.json` 첫 키에 **하나만** 두고, checksum은 **세 파일을 병합한 전체**로 계산한다. `cast.json`·`turns.json`은 최상위가 배열이라 마커 자리가 없지만 손 편집이 checksum으로 잡힌다. 어긋나면 export가 중단되고 JSON Pointer로 자리를 짚는다. 덮어쓰려면 `--force`.
- 백업은 `.export-backup/<ts>/`(세 파일 세트, 최근 10회)와 첫 발효 시점의 `_original/`에 남는다. `.export-backup/`은 gitignore 대상이다.
- 담화 데이터 세 파일 자체는 git이 추적한다. 담화 편을 `unstage`하면 git이 삭제로 본다([`../README.md`](../README.md) 「자산 보관소와 작업 폴더」).

## 3. 왕복 검증

`pnpm discourse:verify -- --all`이 렌더 함수를 직접 import해 DB→파일 왕복이 렌더 결과를 바꾸지 않는지 본다. 정규화 JSON, 세 파일 분해 재현, 컴포지션 ID 집합(`packages/shared/src/lib/youtube-discourse-meta.ts`의 `discourseVariants()`와 `Root.tsx` 등록 규칙), 전체 프레임 수, 큐, 음원 파일명·합성 텍스트, SRT 바이트를 대조한다. `--falsify`는 일부러 값을 깨서 검증기가 잡는지 확인하는 반증 시험이다. 통과만 보고 안심하지 않는다.

## 4. 음성 길이 소유권

1. 편집기에 `duration`·`epithet_duration`을 사람이 입력하는 칸을 두지 않는다.
2. 저장할 때 파일에 기록된 길이를 DB 값보다 우선해 살린다. 파이프라인이 파일에만 쓴 길이를 지키는 규칙이라, DB의 길이를 비워도 파일 값이 되살아난다. 되돌리려면 파일 쪽도 함께 지운다.
3. 🔴 **길이 조회 기준은 자리가 아니라 「사람 + 그 사람의 n번째 발언」이다.** 한 인물이 여러 번 말하는 것이 기본이라, 발언 순서를 바꿨을 때 자리 기준으로 붙이면 음원과 컷 길이가 어긋난다.
4. 음성 CLI(`voice:discourse`·align·transcribe·srt·youtube·durations-pull·reorder)는 아직 없다. 만들 때 위 규칙과 [`../remotion-90-gotchas.md`](../remotion-90-gotchas.md)의 폐기 방향을 따른다.

## 5. 새 시리즈를 붙일 때

split/join·비교·checksum 절차를 다시 짜지 않는다. 시리즈 무관 공통부 `packages/shared/src/lib/series-schema.ts`에 HOT 컬럼 맵과 컬럼 성질만 주입한다. 담화 전용은 `lib/discourse-schema.ts`·`lib/discourse-assemble.ts`·`bo/discourse-export.ts`, CLI는 `sw/remotion/scripts/discourse/{lib,import,export,verify}.ts`다. 음성 파일명 규칙은 `packages/shared/src/lib/discourse-voice-names.ts` 한 벌이며 렌더·BO는 재export만 한다.

web-bo의 로컬 자산 창구는 `sw/web-bo/.env`의 `REMOTION_LOCAL=1`이 있어야 열린다. 시리즈마다 스위치를 따로 두지 않는다. 이미지 확장자 주소는 로그인 검사에서 빠지므로 라우트마다 관리자 확인과 경로 잠금(`lib/discourse-asset.ts`)을 이중으로 건다.
