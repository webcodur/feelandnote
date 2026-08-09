# Agent Lexicon

This file handles agent-style motion words. Apply it as a register filter, not as blind find/replace.

## Categories

### K-1 Embedded/Fixed Metaphors

Use when a text describes adding rules, values, metadata, prompts, comments, or settings with rough "putting into" language.

| Source wording | Better direction |
|---|---|
| 박아넣다 | 넣다, 추가하다, 반영하다, 기록하다, 지정하다 |
| 박아두다 | 기록해 두다, 남겨 두다, 기준으로 삼다 |
| 박혀 있다 | 들어 있다, 정해져 있다, 정의되어 있다 |
| 한 줄로 박다 | 한 줄로 정리하다, 끝에 적다 |
| 룰북에 박다 | 규칙에 반영하다, 룰북에 넣다 |

Default severity: Blocker for external writing.

### K-2 Injection/Insertion Metaphors

Use for non-security "injection" language.

| Source wording | Better direction |
|---|---|
| 컨텍스트 주입 | 컨텍스트에 넣다, 필요한 정보를 전달하다 |
| 프롬프트 주입 | 프롬프트에 포함하다 |
| 에이전트에 주입 | 에이전트에 전달하다 |
| 찔러넣다 | 넣다, 적용하다 |
| 때려넣다 | 입력하다, 추가하다 |

Keep security terms:

- SQL 주입
- 프롬프트 인젝션
- 명령 주입
- 코드 주입 when it is a security concept

### K-3 Rough Collection/Rebuild Verbs

Use when technical work is narrated too aggressively.

| Source wording | Better direction |
|---|---|
| 긁어오다 | 가져오다, 읽어오다, 조회하다 |
| 긁어 모으다 | 수집하다, 모으다 |
| 갈아엎다 | 전면 수정하다, 다시 구성하다 |
| 갈아끼우다 | 교체하다, 바꾸다 |
| 뭉개다 | 흐리다, 합치다, 덮어쓰다 |
| 터뜨리다 | 발생시키다, 일으키다 |

Default severity: Strong. Allow in internal chat if the user wants team vernacular.

### K-4 Agent Progress Phrases

Use when a report exposes internal orchestration language.

| Source wording | Better direction |
|---|---|
| 산출물을 뱉다 | 결과를 만들다, 출력하다 |
| 파이프라인을 태우다 | 파이프라인을 실행하다 |
| 한 방에 끝내다 | 한 번에 처리하다 |
| 한 콜 안에서 | 한 번의 호출로 |
| 도구 호출 chain | 연속 도구 호출 |
| wall-clock | 실제 소요 시간 |

### K-5 Memory/Session Metaphors

Use when memory-like phrasing makes the writer sound like an agent.

| Source wording | Better direction |
|---|---|
| 메모리에 박다 | 기록해 두다, 기준으로 삼다 |
| 머릿속에 넣다 | 기준으로 삼다, 기억해 두다 |
| 컨텍스트 윈도우에 넣다 | 컨텍스트에 포함하다 |
| 잊히지 않게 남기다 | 기록해 두다 |

## Application Rules

1. Identify object and domain before replacing.
2. Preserve security vocabulary.
3. In reports and public writing, remove K-1 and K-2 completely.
4. In internal chat, keep rough wording only when it is intentional and useful.
5. Rewrite the sentence after choosing the replacement. Direct substitution often leaves an unnatural sentence.

## Examples

Source:

```text
룰북에 예외를 박아두고 컨텍스트를 주입했습니다.
```

Formal-polite:

```text
룰북에 예외를 기록하고 필요한 컨텍스트를 전달했습니다.
```

Plain analytical:

```text
예외는 룰북에 남겼고, 필요한 컨텍스트는 함께 전달했다.
```
