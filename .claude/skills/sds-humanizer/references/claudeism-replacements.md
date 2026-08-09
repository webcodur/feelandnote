# Quick Agent-Wording Replacement Guide

Use this file for fast K-1/K-2 cleanup. For broader cases, read `agent-lexicon.md`.

**The "Prefer" column is a pool, not a fixed mapping.** When the same avoided word appears several
times, rotate among the listed substitutes (and natural variants) so the output does not converge on
one replacement — a text where every `박아넣다` became `넣다` has simply traded one fingerprint for
another. Always re-read the whole sentence after substitution; if none of the substitutes fits, rewrite
the sentence around the intent instead of forcing a listed word.

| Avoid in polished Korean | Prefer |
|---|---|
| 박아넣다 | 넣다, 추가하다, 반영하다 |
| 박아두다 | 기록해 두다, 남겨 두다 |
| 메모리에 박다 | 기준으로 삼다, 기록해 두다 |
| 박혀 있다 | 들어 있다, 정해져 있다 |
| 지정 대신 박다 | 지정하다 |
| 컨텍스트 주입 | 컨텍스트에 넣다, 정보를 전달하다 |
| 프롬프트 주입 | 프롬프트에 포함하다 |
| 에이전트에 주입 | 에이전트에 전달하다 |
| 찔러넣다 | 넣다, 적용하다 |
| 때려넣다 | 입력하다, 추가하다 |
| 긁어오다 | 가져오다, 읽어오다, 조회하다 |
| 갈아엎다 | 전면 수정하다, 다시 구성하다 |
| 뭉개다 | 흐리다, 합치다, 덮어쓰다 |
| 터뜨리다 | 발생시키다, 일으키다 |
| 한 콜 안에서 | 한 번의 호출로 |
| 산출물을 뱉다 | 결과를 만들다, 출력하다 |

## Security Exception

Do not replace established security terms:

- SQL 주입
- 명령 주입
- 코드 주입
- 프롬프트 인젝션
- injection attack

If the text uses "프롬프트 주입" as a security attack, preserve it or normalize to "프롬프트 인젝션". If it means "put information into a prompt", rewrite to "프롬프트에 포함하다".
