---
name: celeb-virtual-monologue
description: 셀럽 가상독백을 Gemini 3.8 Flash High 2회와 Claude Opus 1회로 작성·독립 검수하고, 위험도에 따라 사람 검토 뒤 DB에 반영한다. "가상독백 생성", "독백 전량 재작성", "virtual_monologue 배치" 요청에 적용한다.
---

# 가상독백 생성·검수

현행 규칙은 `docs/project/celeb/celeb-04-03-virtual-monologue.md`를 읽는다. Gemini 두 호출은 `agy-antigravity`의 비대화 호출을 쓰고, 최종 Opus는 로그인된 Claude CLI를 직접 호출한다.

실행점은 `sw/web-bo/scripts/celeb/virtual-monologue.mjs`다. 스크립트가 다음 세 호출을 고정 순서로 직접 잇는다.

1. `gemini-3.8-flash-high`: 인물 이름과 한 문장 지시만 받고 초안 작성
2. `gemini-3.8-flash-high`: 웹에서 독립 조사하고 초안 검수·수정
3. Claude CLI `--model opus`: 이전 결과와 출처를 다시 검증하고 최종 판정·수정

중간 원고는 대화에 복사하지 않는다. 콘솔 집계와 후보 경로만 받은 뒤, 위험도에 맞는 최종 검토에서 필요한 범위만 연다.

```powershell
node sw/web-bo/scripts/celeb/virtual-monologue.mjs self-test
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs generate --slugs fritz-haber
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs status
node sw/web-bo/scripts/celeb/virtual-monologue.mjs inspect --slugs elon-musk
node --env-file=sw/web-bo/.env sw/web-bo/scripts/celeb/virtual-monologue.mjs apply --slugs fritz-haber --apply --approve-high
```

양산 전 한 명을 생성부터 최종 검토까지 끝내 사용자에게 보여 준다. `standard`는 `inspect`의 검수 사유·출처 수·첫머리·끝머리로 개략 검토한다. `high`는 자동 통과 뒤에도 `review-required`로 남기고 후보 전문과 출처를 직접 열어 중심 주장을 대조한다.

Opus가 `hold`로 판정하거나 최종본문이 기계·문체 검사를 통과하지 못하면 그대로 최종 `hold`다. 추가 모델 호출이나 자동 수리 반복은 하지 않으며 DB에도 반영하지 않는다. 재실험이 필요할 때만 `--force`로 세 호출을 처음부터 다시 실행한다.

`generate`는 기본적으로 현재 독백이 비어 있는 인물만 다루고 같은 입력의 완료 후보는 재사용한다. 호출 오류 후보는 성공한 단계를 재사용하고 실패 단계부터 이어 간다. 세 단계를 모두 다시 만들 때만 `--force`를 쓴다. `apply`는 플래그가 없으면 쓰지 않으며 한국어 독백만 갱신한다.
