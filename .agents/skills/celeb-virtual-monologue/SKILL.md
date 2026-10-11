---
name: celeb-virtual-monologue
description: 셀럽 가상독백(virtual_monologue 한영)을 채운다. 작업자가 조사한 신원·독백 방향·사용할 정보를 agy Gemini에 전달해 한국어 문장을 쓰고, 툴북의 GPT로 인물 판정·영문 번역을 검수해 DB에 넣는다. "가상독백 생성", "가상독백 채워", "독백 번역", "virtual_monologue 배치" 요청에 적용한다.
---

# 가상독백 채우기

서비스 반영 작업의 부가데이터 생성·보관 금지와 검증 뒤 전량 폐기는 [데이터 원칙](../../../docs/project/data/README.md)을 따른다.

규칙은 `docs/project/celeb/celeb-04-03-virtual-monologue.md`가 쥔다. 먼저 읽는다. agy는 `agy-antigravity`, GPT는 `codex-gpt` 스킬의 헬퍼를 스크립트가 직접 부른다. 모델 배정은 `docs/project/agent-tools.md`를 따른다.

```powershell
node sw/web-bo/scripts/celeb/virtual-monologue.mjs self-test
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs light --brief-file <작업자-재료.json> --slugs <대상들> --limit 3
```

1. 작업자가 먼저 출처를 확인하고 검증 신원·인물별 독백 방향·사용할 정보를 리스팅해 `--brief-file`로 전달한다. agy는 한국어 문장만 작성한다. 처음 생성한 원고를 직접 읽고 품질을 확인한 뒤 배치를 이어 간다. agy가 소진되면 `agy-accounts`에 따라 `agm`으로 CLI 계정을 전환한다.
2. dry 원고 전문의 목소리·생각과 사실·표기·분량을 검수하고, 검증 신원과 함께 툴북의 GPT에 보내 same·other·unsure를 판정한다. other는 다시 작성하고 unsure는 전문을 읽어 판단한다. same 원고만 GPT로 번역하고 한영 전문을 대조한다. 현재값·잠금을 확인한 뒤 한영 두 필드를 한 UPDATE로 반영하고 readback한다. 기존 한국어만 있는 행을 보완할 때는 룰북의 `notation`·`identity --backend codex`·`translate --backend codex` 명령을 쓴다.
3. 원고 전문을 대화에 옮겨 적지 않는다. 확인할 인물만 DB나 `data/celeb/virtual-monologue/light.jsonl`에서 읽는다.
4. 오래 걸리는 배치는 PowerShell `Start-Process`로 떼어 띄우고 PID를 적어 둔다. 멈출 때는 그 PID만 끊는다.
5. 빈칸이 모두 채워지면 `data/celeb/virtual-monologue/`를 지운다.

이미 넣은 원고의 국소 수정과 사용자가 명시한 재집필은 룰북의 「고치는 기준」을 따른다. `generate`·`inspect`·`apply`·`devin`·`repair`로 쓰거나 고치지 않는다.
