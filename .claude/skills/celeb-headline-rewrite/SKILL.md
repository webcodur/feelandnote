---
name: celeb-headline-rewrite
description: 셀럽 한 줄 정의(headline) 전량 개편 오케스트레이터. 레인 claim·원장·개편 발주. "한 줄 정의 개편", "headline 전량", "headline rewrite" 요청에 적용한다. 20레인을 사용자가 시작하라 하기 전에는 돌리지 않는다.
---

# 한 줄 정의 전량 개편

룰 본문은 복제하지 않는다. `docs/project/celeb/celeb-1-basic-profile.md` 한 줄 정의 절만 연다.
부모는 레인 번호와 경로만 넘긴다. 룰·명단·원장은 파일이 쥔다.

## 경로

- 스크립트: `sw/web-bo/scripts/celeb/headline-rewrite/cli.ts`
- 팩: `data/celeb/headline-rewrite/packs/lane-NN.json`
- 초안: `data/celeb/headline-rewrite/drafts/lane-NN.json`
- 원장: `data/celeb/headline-rewrite/ledger/lane-NN.json`
- 조회 env: `sw/web-bo/.env`
- 실제 DB apply 접속: `docs/project/platform/external-services.md`의 `Supabase self-hosted`

레인 = `celebs.id` MD5 앞 4바이트 % 20. 한 인물 한 레인. 다른 레인 대기 없음.
한 순환 10명: claim → 생성 → (부모가 띄운 새 에이전트) 개편 → record. 첫 순환은 원장만.
apply는 `--apply` 명시 시에만. 생성자가 개편자를 낳지 않는다. resume 금지.

## 명령

`sw/web-bo`에서 실행한다.

```bash
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts claim --lane <0-19> --n 10
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts status
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts record --file <초안|개편.json>
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N]
pnpm exec tsx scripts/celeb/headline-rewrite/cli.ts apply [--lane N] --apply
```

record JSON: `{ "lane": N, "items": [{ "id", "slug", "phase": "draft"|"confirm"|"skip", "headline", "headline_en" }] }`

## 부모 발주

생성 (팩 경로만 바꿔 넣는다):

```
레인 N 한 줄 정의 생성. 팩 data/celeb/headline-rewrite/packs/lane-NN.json 만 읽고, 룰은 docs/project/celeb/celeb-1-basic-profile.md 한 줄 정의 절만 따른다. 초안을 data/celeb/headline-rewrite/drafts/lane-NN.json 에 쓴 뒤 record 하라. 개편자를 낳지 마라. Task/서브에이전트 금지. DB에 쓰지 마라.
```

개편 (초안 경로만 바꿔 넣는다):

```
레인 N 한 줄 정의 개편. 초안 data/celeb/headline-rewrite/drafts/lane-NN.json 만 읽고, 룰은 docs/project/celeb/celeb-1-basic-profile.md 한 줄 정의 절만 따른다. 생성 사고과정을 추정하지 마라. 확정·유지를 record 하라. resume 금지. DB에 쓰지 마라.
```
