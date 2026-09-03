# 스펙트럼

인물의 능력·덕목·성향을 16축으로 평가한다. 제품과 문서에서는 **스펙트럼**이라 부르고, 이미 배포된 `celeb_persona` 테이블과 `persona` JSONB 같은 식별자만 레거시 이름을 유지한다.

full·light 실존 인물에 적용하며 fiction에는 만들지 않는다. 각 축의 한국어·영문 근거와 종합 해설을 한 작업에서 함께 작성한다. 영문 누락을 [`celeb-09-01-i18n.md`](celeb-09-01-i18n.md)로 넘기지 않는다.

## SSoT와 저장 구조

| 책임 | SSoT |
|---|---|
| 축 키·정의·점수 범위·부호·기준점·무력 보정·채점 원칙 | `packages/shared/src/constants/celeb-spectrum-scale.ts` |
| 근거문 길이·중복·금지 정보·중립대 검사 | `sw/web-bo/scripts/lib/spectrum-reason-check.ts` |
| DB 물리 구조 | [`../data/03-celeb.md`](../data/03-celeb.md) |
| 패치 검증과 반영 | `sw/web-bo/scripts/celeb/check-patch.ts`, `fill.ts` |

척도 숫자와 허용값을 이 문서에 복제하지 않는다. 채점 전에는 코드의 `SPECTRUM_ANCHORS`, `SCORING_PRINCIPLES`, 성향 부호와 해당 인물군의 특칙을 직접 읽는다.

작성·갱신의 원본은 `celeb_persona.persona` JSONB다.

```text
persona
├─ abilities.<axis>       = { score, reason_ko, reason_en }
├─ inner_virtues.<axis>   = { score, reason_ko, reason_en }
├─ outer_virtues.<axis>   = { score, reason_ko, reason_en }
├─ dispositions.<axis>    = { score, reason_ko, reason_en }
├─ rationale_ko
└─ rationale_en
```

`command`, `martial` 등 평면 16개 컬럼은 DB 트리거가 JSONB에서 만드는 조회용 파생값이다. 수치 벡터만 필요한 소비처가 이 컬럼을 읽지만, 작업자는 평면 컬럼을 직접 쓰지 않는다.

## 채점

1. 이름·소속·직군·생몰로 동명이인을 차단하고 티어가 full 또는 light인지 확인한다.
2. 각 축의 정의와 기준점 인물을 읽는다. 현재 DB의 같은 직군 인물을 임의 기준으로 삼지 않는다.
3. 행적을 조사한 뒤 기준점과 상대 비교해 점수를 정한다. 직군 기본값은 개인 행적을 찾지 못한 축의 마지막 수단이다.
4. 성향 축은 점수를 쓰기 직전에 코드의 양극 방향을 다시 확인한다. 근거가 말하는 방향과 부호가 같아야 한다.
5. 무력은 코드의 등급·하한·직군 구간·보정 함수를 그대로 적용한다. 전투 기록이 없다는 사실과 신체 능력이 낮다는 판단을 같은 것으로 보지 않는다.
6. 16개 근거와 종합 해설을 한국어·영어로 완성한 뒤 기계 검사와 사람 검수를 통과시킨다.

명성·흥행력은 통솔이 아니고, 유명세는 지력이 아니다. 조직을 실제로 이끈 범위, 분석과 창작을 입증한 행동처럼 해당 축이 재는 능력으로 환산할 수 있는 행적만 쓴다. 범죄·처벌·피해 경험도 그 자체만으로 공정·성찰·무력 같은 다른 축을 증명하지 않는다.

## 축별 근거

`reason_ko`는 점수를 설명하는 구체적 행적 한 문장이고 `reason_en`은 같은 의미의 영어다.

- 고점과 저점 모두 근거를 쓴다. `용감한 인물`, `높은 지력`, `여러 업적`처럼 점수를 되풀이하는 문장은 근거가 아니다.
- 같은 직군이나 그룹이라는 이유로 문장을 복사하지 않는다. 같은 문장이 다른 점수에 붙으면 어느 점수도 설명하지 못한다.
- 회사·그룹·팬덤의 행위를 개인의 공으로 옮기지 않는다.
- 확인하지 못한 사실을 만들지 않는다. 공개 근거가 없는 축은 무엇이 확인되지 않았는지 정직하게 적고 코드가 정한 중립 처리 규칙을 따른다.
- 생존 연예인의 사적 신상 등 금지 범위는 검사 코드가 가르는 대상과 맥락을 그대로 따른다. 단어만 보고 더 넓게 일반화하지 않는다.
- 인물·작품 혼동, 동명이인, 정치 성향 과잉 해석은 기계 검사가 잡지 못하므로 사람이 원자료와 대조한다.

## 종합 해설

`rationale_ko`와 `rationale_en`은 16개 점수를 다시 나열하는 전기가 아니라, 능력·덕목·성향이 실제 판단에서 어떻게 결합되는지 설명하는 짧은 분석이다.

- 가장 두드러진 축과 서로 충돌하거나 보완하는 축을 골라 연결한다.
- 사건은 해석의 근거로 필요한 만큼만 언급하고 생애를 순서대로 되풀이하지 않는다.
- 점수에 없는 성격을 새로 만들지 않는다.
- 두 언어의 평가 강도와 인과를 맞춘다.

## 검증과 반영

`sw/web-bo`에서 패치를 먼저 검사한다.

```bash
pnpm celeb:spectrum:check --file <패치.json>
pnpm celeb:spectrum:review --file <패치.json>
```

검사가 통과해도 원자료 귀속과 16축 전체의 상대 균형은 직접 읽는다. 반영은 `celeb:fill apply`의 slug 잠금을 사용한다. 기본 실행은 dry-run이며, 기존 스펙트럼을 교체할 때만 `--replace-spectrum`을 붙인다. DB 쓰기는 사용자가 명시한 범위에서만 `--apply`하고, 반영 뒤 `persona` JSONB와 파생 점수를 다시 읽어 일치 여부를 확인한다.

```bash
pnpm celeb:fill apply --file <패치.json> --only-slugs "slug-a,slug-b"
pnpm celeb:fill apply --file <패치.json> --only-slugs "slug-a,slug-b" --replace-spectrum --apply
```
