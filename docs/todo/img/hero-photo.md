# 인물 화보 — 남은 일

사진이 남지 않은 인물 **468명**에게 인물 상세 상단의 개인 화보(`celebs.portrait_url`)를 만들어 붙인다. 대상 명단은 배정 원장 `D:\image\_avatar-work\hero-batch.json`이다.

## 어디까지 왔나

- **1단계 아바타 — 끝.** 468장을 만들어 등록했다. 26.09.29 DB 조회에서 아바타 없는 활성 인물은 0명이다.
- **2단계 화보 — 남음.** 확정된 아바타 얼굴을 REF로 붙여 세로 4:5로 찍는다. 아바타를 먼저 고정했으므로 화보를 다시 뽑아도 얼굴 검수를 다시 할 필요가 없다.

## 따를 문서

| 무엇 | 문서 |
|---|---|
| 사진 규격·두 단계 제작 원칙 | [`brief-rules.md`](../../../data/celeb/hero-photo/brief-rules.md) 「화면 규격」 |
| 대표 사진 규격 | [`celeb-08-02-hero-photo.md`](../../project/celeb/celeb-08-02-hero-photo.md) |
| 생성기 조작(Gemini·Grok 웹) | [`gen-lanes.md`](../../../data/celeb/hero-photo/gen-lanes.md) |
| 권역별 복식·장면·금지 항목·얼굴 겹침 조합 | [`region-notes.md`](../../../data/celeb/hero-photo/region-notes.md) |
| 인물별 장면 배분 | [`scene-manifest.md`](../../../data/celeb/hero-photo/scene-manifest.md), 조선 소설 19명은 `sw/web-bo/.tmp/joseon-fiction-avatar/_manifest.md` |
| 등록 | `celeb-avatar-register` 스킬, [`celeb-08-01-avatar.md`](../../project/celeb/celeb-08-01-avatar.md) |

## 할 일

1. 화보 468장을 찍는다. 아바타 REF를 붙이고 세로 4:5로.
2. 계통 폴더별로 훑어 어긋난 것만 다시 뽑는다. 아바타와 같은 사람으로 보이는지가 첫 기준이다.
3. 등록한다. 끝나면 `data/celeb/hero-photo/`의 작업 자료(장면 배분·권역 메모·생성 레인)와 아래 옛 잔재를 정리하고 이 문서를 지운다.

## 아직 확인 못 한 것

- **시리즈 일관성** — 468장 규모에서 톤이 유지되는지.
- **REF 반영 편차** — 씨앗 개성이 뚜렷이 산 인물(아이깁토스·아카 라렌티아)과 덜 산 인물(바야지다·아카마피치틀리)의 차이. 원인 미상.

## 옛 방식의 잔재

대표 사진을 먼저 뽑던 시절의 산출물이다. 화보가 끝나면 지운다. 얼굴 씨앗(`D:\image\_재료\지정\<계통>\`)은 버리지 않는다.

| 잔재 | 자리 |
|---|---|
| 발주서 468건 | `sw/web-bo/.tmp/briefs.jsonl`, `.tmp/briefs-v2.jsonl` |
| 발주서 생성기·검사기 | `sw/web-bo/scripts/photo/brief-generate.mjs` |
| 씨앗 배정기·원장 | `sw/web-bo/scripts/photo/assign-faces.mjs`, `.tmp/face-assign-ledger.json` |
| 옛 방식 폐기분 22장 | `sw/web-bo/.tmp/hero-out/_discarded/` |
