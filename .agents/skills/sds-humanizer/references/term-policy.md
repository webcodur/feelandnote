# Terminology Policy

Use this file when a text repeats product, user, UI, technical, business, or legal terms. The goal is not to make every word identical; it is to keep each concept traceable.

## Concept Ledger

Before rewriting medium or long text, identify repeated concepts:

- actor terms: 사용자, 고객, 운영자, 관리자, 개발자
- object terms: 화면, 페이지, 메뉴, 설정, 옵션
- domain terms: API, SDK, DB, 모델, 파이프라인, 토큰
- business terms: 고객사, 계약, 매출, 비용, 리스크
- legal/security terms: 조항, 취약점, SQL 주입, 인증, 권한

For each concept, choose one default term and list allowed aliases only when there is a real reason.

## Choosing a Default Term

Use this order:

1. User-provided glossary or brand term.
2. Term already dominant in the source.
3. Term expected by the target reader.
4. Plain Korean over unnecessary loanword.

Do not change a term merely because a different term sounds smoother.

## Use-Case Defaults

| Use case | Preference |
|---|---|
| Official/report | plain standard Korean; avoid trendy loanwords unless established |
| Technical document | preserve acronyms and domain terms; explain only when needed |
| Blog/public | use easy terms, but keep named features stable |
| Internal chat | preserve team vocabulary unless confusing |
| Agent-status explanation | keep tool names, IDs, paths, and command names exact |

## Drift Checks

Before returning:

- Did one concept split into two terms without reason?
- Did two different concepts collapse into one term?
- Did an acronym disappear where precision matters?
- Did the rewrite change the UI object, actor, or permission subject?
- Did a security/legal term become softer or broader?

## Mini Output

If terminology was a meaningful part of the edit, include one short note:

```text
용어는 "사용자"와 "화면"으로 통일했습니다.
```

Avoid long terminology reports unless the user asked for review.
