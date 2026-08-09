# Evaluation Cases

Use these cases to smoke-test the skill after edits.

## Case 1: Formal Report

Input contains formal report text with a few machine-like transitions. Expected:

- formal-polite register
- no casual slang
- conclusion remains the same
- only necessary transitions removed

## Case 2: Blog Voice

Input contains a public blog paragraph with rigid labels. Expected:

- more natural rhythm
- no excessive official tone
- no new personal story invented

## Case 3: Agent Report

Input contains a run ID, issue number, file path, and uncertain test status. Expected:

- IDs preserved and labelled
- verified vs unverified separated
- no success claim unless proven

## Case 4: K-1/K-2 Cleanup

Input:

```text
룰북에 예외를 박아두고 컨텍스트를 주입했습니다.
```

Expected formal direction:

```text
룰북에 예외를 기록하고 필요한 컨텍스트를 전달했습니다.
```

## Case 5: Security Exception

Input contains:

```text
SQL 주입과 프롬프트 인젝션을 구분해야 합니다.
```

Expected:

- security terms preserved
- surrounding Korean may be improved

## Case 6: Numeric Preservation

Input contains dates, percentages, versions, and money. Expected:

- all values preserved
- no approximate replacement unless already approximate

## Case 7: Internal Chat

Input is intentionally casual team chat. Expected:

- do not over-formalize
- K-3/K-4 may remain if it fits the requested voice

## Case 8: Abstract Close (retrospective, option 1)

Input:

```text
Reflexion은 "실패에서 배운다"이고, CCR은 "왜 실패했는지를 인과로 조립한다"입니다.
둘을 붙이니 검토 흐름이 나옵니다.
```

Expected:

- abstract `검토 흐름` replaced by a concrete noun from the text's own purpose
  (e.g. `스킬의 방향`) or absorbed into an action sentence
- both quoted phrases and the Reflexion/CCR meanings preserved

## Case 9: Parallel Short Sentences (retrospective)

Input:

```text
방법을 가져오는 건 쉽습니다. 우리 일에 맞게 굴러가게 만드는 게 어렵습니다. 겪은 일들을 차례로 적습니다.
```

Expected:

- contrast merged into one sentence (`~은 쉽지만, ~은 어렵습니다` or equivalent)
- action linked with `그래서` (or equivalent) and retrospective past tense (`적었습니다`)
- easy/hard contrast, "겪은 일", "차례로" preserved

## Case 10: Missing Connective (Flow Break)

Input:

```text
보통 강화학습은 모델 가중치를 갱신하며 배웁니다. Reflexion은 그걸 하지 않습니다.
에이전트가 실패한 뒤 반성문을 다음 시도의 입력에 붙입니다. 파인튜닝 없이 프롬프트만으로 성능을 끌어올린 겁니다.
```

Expected:

- contrast marked with `그러나`/`그런데`, result marked with `그래서` (or equivalent connectives)
- a connective forced onto every sentence is a FAIL (new machine fingerprint)
- RL-vs-Reflexion contrast and the "no fine-tuning, prompt only" fact preserved

## Case 11: Formulaic Reversal (signal V)

Input:

```text
이 도구는 단순히 로그를 모으는 것이 아니라 원인을 찾아냅니다. 중요한 것은 속도가 아니라
정확성입니다. 이제 운영은 더 이상 감이 아닌 데이터의 영역입니다.
```

Expected:

- at most one load-bearing contrast survives as a reversal; the rest state the point directly
  (e.g. `원인을 찾아냅니다`, `정확성이 우선입니다`)
- an input with a single reversal is a KEEP — rewriting it away is over-correction (FAIL)
- facts (원인 분석, 정확성 우선, 데이터 기반) preserved

## Case 12: Markdown Structure Preservation (file input)

Input file contains YAML frontmatter, one table (3 rows), a checkbox list (`[ ]` 2, `[x]` 1),
a footnote, and a fenced code block. Expected:

- `_humanized` file keeps the frontmatter block byte-identical, the table at 3 rows with the
  same column count, all checkbox states, the footnote, and the code fence
- prose inside table cells and list items may be rewritten
- `rewrite_guard.py` structure checks PASS; deleting a table row, flipping a checkbox, or
  dropping the frontmatter must FAIL

## Case 13: Meeting Minutes Preset

Input is meeting minutes mixing decisions, opinions, and open items with owners and deadlines.
Expected:

- decisions and open items stay distinct — an opinion or proposal is never promoted to a decision
- owners, deadlines, and agenda order preserved verbatim
- register stays formal-polite or plain analytical without chatty drift
