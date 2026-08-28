---
name: celeb-headline-rewrite
description: 셀럽 한 줄 정의(headline) 신설·개편 오케스트레이터. 10안 무기명 경쟁전으로 값을 정하고 레인 claim·원장·배치를 관리한다. "한 줄 정의 개편", "headline 전량", "headline rewrite", "새 인물 한 줄 정의" 요청에 적용한다. 20레인 전량은 사용자가 시작하라 하기 전에는 돌리지 않는다.
---

# 한 줄 정의 신설·개편

룰 본문은 복제하지 않는다. `docs/project/celeb/celeb-1-basic-profile.md` 한 줄 정의 절만 연다.
현재 서비스값은 대결의 한 후보로 쓰되, 새 후보를 만드는 쪽에는 숨긴다.

## 경로

- 스크립트: `sw/web-bo/scripts/celeb/headline-rewrite/cli.ts`
- 생성 팩: `data/celeb/headline-rewrite/packs/lane-NN.json`
- 대결 팩: `data/celeb/headline-rewrite/reviews/lane-NN.json`
- 초안: `data/celeb/headline-rewrite/drafts/lane-NN.json`
- 원장: `data/celeb/headline-rewrite/ledger/lane-NN.json` — 회차 중 작업 PC 간 공유용 중간 상태. 커밋으로 공유하고 반영이 끝나면 지운다 — 회차 중 작업 PC 간 공유용 중간 상태. 커밋으로 공유하고 반영이 끝나면 지운다
- 조회 env: `sw/web-bo/.env`
- 실제 DB apply 접속: `docs/project/platform/external-services.md`의 `Supabase self-hosted`

레인 = `celebs.id` MD5 앞 4바이트 % 20. 한 인물 한 레인. 다른 레인 대기 없음.
한 인물의 순환은 claim → 블라인드 10안 생성 → 다른 심사자의 무기명 대결 → record다.

## 값을 정하는 법 — 10안 무기명 경쟁전

**생성자는 고르지 않고, 심사자는 출처를 모른다.** 이 두 가지가 이 절차의 전부다.

1. 생성자는 최소 신원과 대표 사실만 적정량 확인한다. 조사 보고서를 만들지 않는다.
2. 영어를 쓰지 않고 서로 다른 사실·동사·장면으로 한국어 rough를 발산해 **자연스러운 현대 한국어 10안**을 만든다. 단어만 바꾼 유사문은 한 개로 센다.
3. 10안 모두 `headline — 이름`으로 읽어 바로 이해되어야 한다. 고어·과장된 문어체·영어식 조어·번역투는 relay에도 남기지 않는다.
4. 길이는 12~28자를 지킨다. 30자를 넘기지 않는다. 영어 후보 네 개는 한국어를 직역하지 않고 따로 쓰며 90자를 넘기지 않는다.
5. **생성자는 여기서 멈춘다.** 베스트를 뽑지 않고 10안과 영어 후보를 그대로 넘긴다.
6. 심사자는 신규 10안·현재 서비스값·직전 개편안을 **한데 섞어 출처를 지운 목록**으로 받는다. 어느 것이 현재값인지 모르는 상태에서 사실 → 이름 뒤 한 호흡 → 인물 고유성 → 자연스러운 한국어 → 짧기 순으로 1위를 고른다. 한국어와 영어를 따로 판정한다.
7. 1위의 출처로 phase가 정해진다. 한영 모두 현재값이 이기면 `skip`, 하나라도 신규안이나 직전 개편안이 이기면 `confirm`이다.
8. 대결 결과는 바로 record한다. 별도 언어 교정이나 세 번째 감사를 상시 절차로 두지 않는다. 사실 의문이 생기면 그 쟁점만 확인한다.

생성자가 1안을 미리 뽑던 옛 방식은 쓰지 않는다. 판단이 한 사람에게 몰리고 기존값과 붙기 전에 후보 아홉 개가 사라진다. 심사자에게 `current`를 알려주고 "명백히 이길 때만 교체하라"고 지시하던 보정 규칙도 쓰지 않는다. 출처를 숨기면 그 보정이 필요 없다.

### 26.08 전량 개편에서 배운 것

생성자가 스스로 고르게 했더니 값이 캐치프레이즈에서 이력 요약으로 늘어났다. 평균 19.8자에서
28.9자가 됐고 20자 이하가 488건에서 70건으로 줄어, 863건 중 167건을 되돌려 다시 썼다.
**생성 단계에서 길이 상한을 프롬프트에 박는 것이 사후 심사보다 효과가 크다.** 상한을 박은
회차의 후보는 평균 19.6자에 28자 초과가 0개였다.

## relay 파일

생성 relay에는 한국어 `ideaPool` 10개 이상과 `englishPool`만 보존한다. `winner` 필드는 쓰지 않는다.

```json
{ "id": "...", "slug": "...", "lane": 0, "nickname": "...", "ideaPool": ["..."], "englishPool": ["..."] }
```

대결 relay는 아래 최종 스키마만 쓴다. 최상단 `{ lane, reviewVersion, items: [단일 항목] }`이며
중첩 final·phase audit·people 키를 쓰지 않는다. 이 파일을 바로 record한다.

```json
{
  "lane": 0,
  "reviewVersion": 2,
  "items": [
    {
      "id": "...",
      "slug": "...",
      "phase": "confirm",
      "headline": "...",
      "headline_en": "...",
      "selection": { "ko": "blind", "en": "blind" }
    }
  ]
}
```

`phase`는 `confirm` 또는 `skip`, `selection.ko`와 `selection.en`은 `blind`·`current`·`previous` 중 하나다.
`skip`도 최종 한영값을 넣는다.

## 실행 규모별 경로

| 규모 | 방식 |
|---|---|
| 인물 1~수십 명 | 서브에이전트. 생성 3개를 한 병렬 호출에서 동시 실행하고, 끝나면 대결 3개를 같은 방식으로 실행한다 |
| 수백 명 | codex 배치 러너 `scripts/celeb/headline-rewrite/codex-batch.mjs`(`targets → gen → review → record`, 이후 `cli.ts apply`). `codex-gpt` 스킬을 따른다 |

서브에이전트 경로에서는 생성 3명을 record하면 보고하거나 쉬지 말고 즉시 다음 3명을 claim한다.
`N명 처리`나 중간 보고는 중단 경계가 아니며 `newRemain=0`·실제 차단·사용자 중단 전에는 멈추지 않는다.
mutation 에이전트와 결과 read를 같은 병렬 호출에 넣지 않는다.

codex 배치 경로는 생성과 대결을 각각 러너로 돌린다. 동시 3, 산출물이 있으면 건너뛰는 재실행
안전 설계, 사실 날조를 막는 근거로 DB `bio` 제공이 필수다. 후보 순서는 slug 해시로 고정 셔플해
재실행해도 같은 목록이 나오게 한다.

## 명령

`sw/web-bo`에서 실행한다.

```bash
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane <0-19> --n 1
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane <0-19> --n 1 --recheck
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane <0-19> --n 1 --redo --slug <slug>
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts status
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file <대결결과.json>
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N]
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N] --apply
```

record의 `reviewVersion`은 대결 팩 값을 그대로 쓴다. `confirm`은 교체, `skip`은 현재값 유지이며
한영 중 한쪽만 교체할 때도 최종 한영값을 함께 기록한다. record는 `confirm`의 `applied`를 false로
되돌리므로 재작업 뒤 원장을 손으로 고칠 필요가 없다.

기존 원장 전체를 다시 볼 때만 심사 버전을 올리고 `claim --recheck`를 쓴다. 현재 버전을 이미 거친
일부만 다시 열 때는 버전을 올리지 않고 `claim --redo --slug <slug>`를 쓴다. 회차가 끝나 원장이 없으면
개별 재작업은 `claim --lane N --n 1 --slug <slug>`(new)로 연다.

원장은 회차 중에만 존재한다. 작업 PC 간 이어 붙이기 위해 커밋으로 공유하고, apply까지 끝나면
`git rm`으로 지운다. 서비스 값의 원천은 DB이며 경위는 커밋 이력에서 꺼낸다.
apply는 현재 심사 버전의 `confirm`만 받으며 `--apply` 명시 시에만 DB에 쓴다.

## 부모 발주

생성:

```
인물 한 명의 headline 후보 10안 블라인드 생성. data/celeb/headline-rewrite/packs/lane-NN.json과 docs/project/celeb/celeb-1-basic-profile.md의 한 줄 정의 절만 읽어라. current·review·ledger·기존 draft·기존 relay는 읽지 마라. 최소 신원과 대표 사실을 적정량 조사하되 조사 보고서를 만들지 말고 영어 없이 한국어 rough부터 발산하라. 서로 다른 사실·동사·장면을 쓰고, 한국인이 실제로 쓰는 자연스러운 현대 한국어만 남겨 10안을 완성하라. 단어만 바꾼 유사문은 한 개로 센다. 각 안은 12~28자를 지키고 30자를 넘기지 마라. 각 안을 `headline — 이름`으로 읽어 바로 이해되지 않는 고어·과장된 문어체·영어식 조어·어색한 추상 비유·번역투는 relay에도 남기지 마라. 특히 `벼리다`, 이 문맥의 `비애`·`포개다`, `변신가`, `결을 고르다` 같은 표현은 금지한다. 직함을 그대로 옮긴 문구는 정의가 아니므로 후보로 세지 마라. 수치나 연도로 문장을 시작하지 마라(그 수치가 곧 그 인물의 정체성일 때만 예외다). 영어 후보 4개를 별도로 만들되 한국어를 직역하지 말고 90자를 넘기지 마라. **10안 중 하나를 고르지 마라.** 한국어 ideaPool 10개와 englishPool을 data/celeb/headline-rewrite/.tmp/relay/gen/lane-NN-<slug>.json에 표준 스키마와 UTF-8로 저장하라. drafts·record·DB 쓰기는 하지 말고 서브에이전트를 낳지 마라.
```

대결은 생성과 다른 새 에이전트에게 한 번만 맡긴다. **부모가 후보를 섞어 출처를 지운 목록을 만들어
넘긴다.** 심사자에게 어느 것이 현재값인지 알려주지 않는다.

```
레인 N 한 줄 정의 무기명 대결. 아래 번호 매긴 한국어 후보와 영어 후보 중 각각 1위 하나를 골라라. 후보의 출처는 알려주지 않으며 묻지도 마라. 룰은 docs/project/celeb/celeb-1-basic-profile.md 한 줄 정의 절만 따른다. 판정은 사실 → `후보 — 이름`으로 읽었을 때 한 덩어리 캐치프레이즈인가 → 그 인물에게만 붙는 고유성이 있는가 → 자연스러운 현대 한국어인가 → 짧은가 순이다. 사실이 틀렸거나 의심스러운 안은 탈락시켜라. 이력을 나열한 설명문과 직함을 그대로 옮긴 문구는 진다. 30자가 넘는 안은 아주 뛰어날 때만 골라라. 영어는 한국어와 따로 판정하되 영어 문장 자체의 자연스러움과 정확성으로 고르고 90자가 넘으면 감점하라. 고른 번호와 한 문장 이유만 JSON으로 출력하라. 파일·DB·ledger에 쓰지 말고 서브에이전트를 낳지 마라.
```

부모는 받은 번호를 출처와 대조해 `selection`과 `phase`를 정하고 대결 relay를 기록한 뒤 record한다.
