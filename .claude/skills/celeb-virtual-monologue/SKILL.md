---
name: celeb-virtual-monologue
description: 셀럽 가상독백(virtual_monologue 한영)을 채운다. 한국어 문장력이 필요해 agy Gemini 3.8 Flash High가 인물 소개 한 줄을 받아 쓰고, 표기 정리·muse 인물 판정·muse 영문 번역을 거쳐 DB에 넣는다. "가상독백 생성", "가상독백 채워", "독백 번역", "virtual_monologue 배치" 요청에 적용한다.
---

# 가상독백 채우기

규칙은 `docs/project/celeb/celeb-04-03-virtual-monologue.md`가 쥔다. 먼저 읽는다. agy는 `agy-antigravity`, muse는 `opencode-muse` 스킬의 헬퍼를 스크립트가 직접 부른다.

```powershell
node sw/web-bo/scripts/celeb/virtual-monologue.mjs self-test
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs light --apply --limit 3
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs light --apply
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs notation --apply
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs identity --apply
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs translate --apply
```

1. agy와 muse 호출은 구독 한도를 쓰는 비용이다. 빈칸이 수십 명을 넘으면 `--limit 3`으로 먼저 돌려 원고를 읽고, 호출 수를 보고한 뒤 이어 간다.
2. `identity`가 비운 slug는 `light --apply --slugs …`로 다시 쓰고 판정을 한 번 더 거친다. unsure는 전문을 읽고 정한다. `long`은 두 인물이 섞였는지 읽는다.
3. 원고 전문을 대화에 옮겨 적지 않는다. 확인할 인물만 DB나 `data/celeb/virtual-monologue/light.jsonl`에서 읽는다.
4. 오래 걸리는 배치는 PowerShell `Start-Process`로 떼어 띄우고 PID를 적어 둔다. 멈출 때는 그 PID만 끊는다.
5. 빈칸이 모두 채워지면 `data/celeb/virtual-monologue/`를 지운다.

이미 넣은 원고는 부서진 곳만 직접 고친다. 평이하거나 반복되는 첫머리는 고치지 않는다. `generate`·`inspect`·`apply`·`devin`·`repair`로 쓰거나 고치지 않는다.
