# Output Contracts

Choose the smallest format that gives the user what they need.

**Contract selection comes AFTER the delivery medium.** If the input was a file path, the File
Rewrite contract below is the only valid contract — the chat contracts (Default/Short/High-Risk)
apply to pasted text only. Never "downgrade" a file task to a chat contract.

## File Rewrite (input was a file path — mandatory for file input)

1. First **Write** the full rewritten text to `<original-stem>_humanized<original-ext>` in the same
   directory (Constitution: the original file is never touched). No chat response is complete
   before this Write happens.
2. Then reply with paths and summary only — do not paste the full rewritten text into chat:

```markdown
## 저장 완료

- 원본(무수정): [original path]
- 다듬은 파일: [<stem>_humanized<ext> path]

## 기준

- 용도: [use] / 말투: [register] / 강도: [intensity]

## 주요 변경

- [change 1]
- [change 2]

## 자체 점검

- 원본 무수정: 확인
- 의미·고유명사·수치·인용 보존: 통과
```

For long documents, add 2-3 before → after sample lines so the user can judge without opening the file.

## Default Rewrite

```markdown
## 다듬은 글

[rewritten text]

## 기준

- 용도: [use]
- 말투: [register]
- 강도: [conservative/standard/strong]

## 주요 변경

- [change 1]
- [change 2]
- [change 3]

## 자체 점검

- 의미 보존: 통과
- 고유명사/수치/인용 보존: 통과
- 남은 주의점: [none or short note]
```

Use this for documents, reports, and medium-length text.

## Short Rewrite

```markdown
[rewritten text]

기준: [use], [register]
```

Use this for one sentence, title, message, button text, or quick chat.

## Agent-Status Explanation

```markdown
이 말은 "[one-line meaning]"이라는 뜻입니다.

핵심은 이렇습니다.
- 한 일:
- 확인된 것:
- 아직 확인되지 않은 것:

지금 볼 부분은 "[next check]"입니다.
```

Use this when the input is a progress report, log summary, run result, issue note, PR note, or test output.

## High-Risk Rewrite

For legal, security, financial, technical, or numeric documents:

```markdown
## 다듬은 글

[rewritten text]

## 보존 확인

- 수치/날짜/고유명사:
- 인용/코드/명령:
- 보안/법률 용어:
- 불확실성 표현:

## 변경 요약

- [high-level change only]
```

## If Required Information Is Missing

Ask only the missing decision:

```text
용도와 말투가 없어서 먼저 확인이 필요합니다. 어디에 쓸 글이고, 어떤 말투로 바꿀까요?
```

Do not ask for all metadata if only one field is unclear.
