# 인물 다른 이름·수식어 전수 점검 — 남은 일

다른 이름(`aliases`)과 이름(`nickname`) 기준은 [`celeb-01-01-profile-facts.md`](../project/celeb/celeb-01-01-profile-facts.md) 「이름」「다른 이름」, 수식어 기준은 [`celeb-01-03-title.md`](../project/celeb/celeb-01-03-title.md), 등록 전 중복 확인과 중복 프로필 통합은 [`celeb-00-01-pipeline.md`](../project/celeb/celeb-00-01-pipeline.md) 「중복 확인」「중복 프로필 통합」이 쥔다.

## 현재 도달점

- 공개 인물 전원의 이름·다른 이름·수식어와 중복 프로필 통합을 운영 DB에 반영했다. `pnpm --dir sw/web-bo celeb:dup-check --all`이 같은 사람 의심 0쌍·규칙 오류 0건이다.
- 다른 이름 검색, Person JSON-LD `alternateName`, 바뀐 주소 3개의 308은 운영 웹에 배포했다.

## 남은 순서

1. 백오피스(미룸): 인물 편집 화면의 다른 이름 칸, `createCeleb`에 `@feelandnote/shared/lib/celeb-identity` 중복·규칙 검사 연결.
2. 끝나면 이 문서와 `docs/todo/README.md` 행을 지운다.
