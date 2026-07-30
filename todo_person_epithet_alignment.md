# TODO — 영상 인물 소개문과 웹 세력별 소개 의미 정합

> 기준 시각: 2026-07-30 KST
> 상태: **필드 투영 구조 교정 완료, 인물별 의미 감사 미완료**

## 목적

영상과 웹에서 같은 인물이 서로 다른 사람·직책·소속·세력 역할처럼 보이지 않게
한다. 여기서 “통일”은 문장을 똑같이 복사하는 것이 아니라 **인물 정체성과 핵심
사실의 일치**다.

## 사용자 확정 방침

영상과 웹의 수식어는 동일 필드도, 동일 문구도 아니다.

| 매체 | 필드 | 역할 |
|---|---|---|
| 영상 | `faction_people.lines[0]` | 이름 곁의 짧은 대표 직함 |
| 영상 | `faction_people.epithet` | 화면 표시 또는 낭독용 한 문장 소개 |
| 웹 | `celeb_tag_assignments.short_desc` | 태그별 10자 안팎 한줄 역할 소개 |
| 웹 | `celeb_tag_assignments.long_desc` | 그 태그에 속하는 이유를 설명하는 1~2문장 |

- 신규 배정 초안은 `lines[0] → short_desc`,
  `epithet → long_desc` 방향이다.
- `epithet`이 없을 때만 `lines[1..2]`가 `long_desc` 초안 재료가 된다.
- 기존 웹 소개는 사람이 세력 맥락에 맞게 다듬은 값이므로 출간 시 보존한다.
- 같은 인물이 여러 태그에 있으면 `short_desc`와 `long_desc`가 태그마다 다른 것이 정상이다.
- KO와 EN도 사실은 같게 유지하되 문장 경계와 표현까지 복제하지 않는다.

## “의미 정합” 판정

다음이 맞으면 문구가 달라도 통과다.

- `celeb_id`·slug·이름이 같은 실제 인물을 가리킨다.
- 현직·전직·조직·제품·업적의 시간축이 서로 모순되지 않는다.
- 영상 직함은 짧고, 영상 `epithet`은 낭독 가능한 한 문장이다.
- 웹 `short_desc`는 해당 태그에서의 역할을 짧게 설명한다.
- 웹 `long_desc`는 왜 그 세력에 속하는지 설명한다.
- 한국어와 영어가 같은 핵심 주장과 고유명사를 보존한다.

문자열 동일 여부·글자 수 차이·어순 차이는 결함 판정이 아니다.

## 2026-07-30 현재 실측

- 활성 프로필에 연결된 공개 태그 배정: 643건
- 공개 배정의 `short_desc`, `long_desc`, `short_desc_en`, `long_desc_en` 결측: 모두 0
- `tag_id`와 `celeb_id`가 모두 있는 팩션 배치: 468건
- 고유 `(tag_id, celeb_id)` 쌍: 465개
- 위 468배치는 대응 웹 배정이 모두 존재한다.

전체 468배치를 단순 문자열로만 비교하면:

| 비교 | 동일 | 다름 | 영상 `epithet` 없음 |
|---|---:|---:|---:|
| KO `epithet` ↔ `short_desc` | 4 | 387 | 77 |
| KO `epithet` ↔ `long_desc` | 248 | 143 | 77 |
| EN `epithet_en` ↔ `short_desc_en` | 0 | 14 | 454 |
| EN `epithet_en` ↔ `long_desc_en` | 6 | 8 | 454 |

이 수치는 결함 수가 아니라 검토 큐다. 특히 `epithet`과 `short_desc`가 거의
다른 것은 최신 설계에 맞는 정상 결과다. `epithet_en` 부재도 해당 인물이 실제
영문 영상에서 epithet 스텝을 쓰는지 확인한 뒤 판정한다. 영문 로더는
`epithetEn ?? epithet`으로 한국어에 폴백하므로, 영문판에서 실제 표시·낭독되는
배치는 별도 확인이 필요하다.

2026-07-29 구조 교정 전 실측(443개 웹 연결 배치에서 동일 4·다름 169·영상
소개문 없음 270)은 당시 스냅샷이다. 이후 fiction 연결과 데이터 보강으로 현재
수치가 달라졌으므로 완료 판정에 옛 숫자를 고정하지 않는다.

## 완료된 것

- 출간 투영을 `lines[0] → short_desc`, `epithet → long_desc`로 교정했다.
- 기존 웹 소개는 fill-only로 보호한다.
- web-bo 입력 라벨을 「영상 소개문」으로 바꾸고 웹의 짧은 세력별 수식어와
  별도임을 명시했다.
- force 출간 경고도 실제 덮어쓰기 방향에 맞게 교정했다.
- 공개 웹 배정의 한·영 short/long 결측은 0이다.

## 남은 작업

### 1. 감사 범위 만들기

- `faction_groups.tag_id`와 `faction_people.celeb_id`가 모두 있는 배치를 모은다.
- 같은 태그·같은 인물의 중복 배치는
  `winningPlacements` 규칙대로 세력→그룹→인물 위치가 가장 앞선 배치를 대표로 삼는다.
- 문자열 동일/다름은 우선순위 신호로만 쓰고, 인물별 네 문구를 함께 읽는다.
- `registered`와 `status`를 함께 기록하되 의미를 섞지 않는다.

### 2. 사람 검토

우선순위:

1. 다른 인물·다른 조직처럼 보이는 신원 충돌
2. 현직/전직, 회사명, 제품명, 시대가 모순되는 사실 충돌
3. 세력과 무관한 범용 칭찬·평전 문구
4. 영문판에서 한국어 `epithet`으로 폴백하는 실제 사용 배치
5. 지나치게 긴 `short_desc` 또는 낭독 불가능한 `epithet`

### 3. 수정 원칙

- 영상 필드는 web-bo `/factions`에서 고치고 DB 저장→자동 export를 따른다.
- 웹 설명은 태그 문맥에 맞춰 `celeb_tag_assignments`에서 따로 고친다.
- 기존 웹 설명을 맞추려고 force 출간하지 않는다.
- 신규 배정 또는 빈칸 보충만 정상 출간의 fill-only 경로를 쓴다.
- 유튜브 공개 6편의 영상 문구는 보호 기준선으로 보고 일괄 수정하지 않는다.
  웹 문구가 틀렸으면 웹만 고치고, 공개 영상 자체의 사실 오류는 별도 보고한다.
- 한국어를 먼저 확정하고 영어는 같은 사실을 자연스러운 영어로 별도 검토한다.

### 4. 검증

```powershell
cd C:\project\feelandnote\sw\web-bo
pnpm.cmd exec tsx scripts/audit-public-celeb-quality.ts --json

cd C:\project\feelandnote\sw\remotion
pnpm.cmd faction:verify -- --all --drift
```

변경 인물은 web-bo 출간 패널에서 진단→dry-run 순으로 확인한다.
실제 출간이 필요하면 `faction-celeb-sync` 스킬의 출간 절차를 따른다.
변경한 웹 KO/EN 화면은 캐시 갱신 뒤 전원 확인한다.

## 절대 금지

- `epithet`을 `short_desc`에 일괄 복사하지 않는다.
- 웹 `short_desc`를 영상 `epithet`으로 역복사하지 않는다.
- 문자열이 다르다는 이유만으로 결함 처리하지 않는다.
- 같은 인물의 여러 태그별 웹 소개를 하나로 합치지 않는다.
- 기존 웹 설명을 force 출간으로 덮지 않는다.
- `lines[0]`, `epithet`, `short_desc`, `long_desc`를 “수식어” 한 필드로 통합하지 않는다.
- 영문 누락을 한국어 복사로 채우지 않는다.
- 유튜브 공개 6편의 영상 원고를 일괄 교정하지 않는다.

## 권위 SSoT

- 데이터 경계와 투영:
  `docs/project/remotion/faction-unification.md` §4
- 웹 설명 규격:
  `docs/project/celeb/celeb-tag-system.md`
- 실제 투영 코드:
  `sw/web-bo/src/lib/faction-sync/collect.ts`의 `descsOf`
- fill-only 저장:
  `sw/web-bo/src/lib/faction-sync/publish.ts`
- 편집 UI:
  `sw/web-bo/src/components/factions/FactionEditor/FactionGroupEditor/FactionPersonRow/sections/PersonBasicInfo.tsx`
- 영상 영문 폴백:
  `sw/remotion/src/compositions/Faction/script.ts`

## 완료 판정

- 공개 배정의 한·영 short/long 필수 결측이 0이다.
- 연결 배치 전부가 신원·소속·시대·세력 역할 의미 검토를 통과하거나 근거와 함께 보류됐다.
- 영상 `epithet`과 웹 `short_desc`의 문자열 동일률을 목표치로 삼지 않았다.
- 실제 영문 영상에서 epithet 스텝을 쓰는 배치에 한국어 폴백이 없다.
- 기존 웹 소개의 의도치 않은 force 덮어쓰기가 0이다.
- 유튜브 공개 보호편의 일괄 변경이 0이다.
- 변경분의 DB→JSON drift 검사와 KO/EN 실제 화면 검수가 끝났다.
