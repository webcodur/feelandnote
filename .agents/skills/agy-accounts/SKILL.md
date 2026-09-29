---
name: agy-accounts
description: agy(Antigravity CLI) 작업·배치 요청, 또는 agy 쿼터 소진·계정 전환이 필요할 때 적용한다. agm이 관리하는 구글 계정 풀의 쿼터를 확인하고 전환·자동 선택·토큰 갱신·계정 추가를 처리한다. "agy로", "제미니로 생성", "쿼터 다 씀", "Individual quota reached", "계정 바꿔", "다른 계정으로" 등에 호출한다.
---

# agy 다계정 풀 (agm)

agy는 구글 계정 OAuth 로그인으로 돈다. `agm`(github.com/shyim/agm)이 계정들의 토큰을 `~/.antigravity-agent/`에 AES-256으로 암호화해 두고, 어떤 계정을 agy에 적용할지 전환을 처리한다. 쿼터가 차면 사용자 손을 거치지 않고 다음 계정으로 넘긴다.

실행 파일은 PATH의 `agm`이다(실물 `%USERPROFILE%\go\bin\agm.exe`). agy 호출 절차·모델 선택·쿼터 소진 감지법은 `agy-antigravity` 스킬이 쥔다.

## 착수 확인

agy 작업·배치를 시작할 때 풀 상태를 먼저 본다.

```bash
agm list
```

- `STATUS`의 `cli` 태그 = agy에 적용된 계정
- `GEM-PRO`·`GEM-FLASH`·`CLAUDE` = 계정별 모델 잔여 쿼터(%)
- 쓸 모델의 쿼터가 얕으면 시작 전에 전환한다

## 전환 절차

쿼터 소진 신호는 agy 출력의 `Individual quota reached`다(배치에서는 타임아웃 + 최신 로그의 같은 문구 — 감지는 `agy-antigravity`가 쥔다). 신호가 나면:

```bash
# 자동 — 잔량 충분한 최적 계정으로 (확인 프롬프트를 echo y로 넘긴다)
echo y | agm auto-switch --min 40

# 지정 — 계정을 골라 바꾼다
agm switch <email> --target agy
```

- **`--target agy`를 붙인다.** 생략하면 기본값 `all`로 Antigravity IDE까지 같이 바뀐다. 배치는 CLI만 바꾸면 된다.
- `auto-switch`에 `--model gemini|claude`로 해당 모델 쿼터 기준을 고를 수 있다 — CLAUDE가 0%인 계정을 피할 때 쓴다.
- **전환은 다음 `agy` 프로세스부터 먹힌다.** 배치(`agy -p` 단발 호출)는 호출마다 새 프로세스라 전환 직후 이어 돌면 된다. 떠 있는 대화형 agy는 토큰을 메모리에 쥐고 있으니 재시작이 필요하다.
- 전환 뒤 `agm list`로 `cli` 태그가 옮겼는지 확인하고 같은 명령으로 재개한다.

## 풀 관리

- `STATUS`에 `token-exp`가 보이면 `agm validate` — 리프레시 토큰으로 일괄 갱신한다
- 전 계정의 해당 모델 쿼터가 바닥이면 그때만 멈추고 사용자에게 보고한다. 대기·재시도 루프는 두지 않는다
- 계정 추가는 `agm login` — 뜨는 OAuth URL을 해당 구글 계정으로 완료하면 `localhost:8888` 콜백으로 등록된다. 어사이드 볼트 자동입력 활용 등 절차 상세는 `%USERPROFILE%\.antigravity-agent\SETUP.md`가 쥔다

## 비밀 취급

- `~/.antigravity-agent/`의 `.mk`(복호화 키)+`cloud_accounts.db`(계정 DB)는 등록 계정 전권이다. 내용을 출력·복사·커밋하지 않는다
- 이관·유출 대응은 `docs/project/platform/platform-04-env-vars.md`가 쥔다

## 형제 스킬

| 스킬 | 역할 |
|---|---|
| `agy-antigravity` | agy 호출법·모델 선택·쿼터 소진 감지 — 전환 신호의 원천 |
| `agy-accounts` | 계정 풀 확인·전환·추가 — 이 문서 |
