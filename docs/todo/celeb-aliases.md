# 인물 다른 이름·수식어 전수 점검 — 남은 일

다른 이름(`aliases`)과 이름(`nickname`) 기준은 [`celeb-01-01-profile-facts.md`](../project/celeb/celeb-01-01-profile-facts.md) 「이름」「다른 이름」, 수식어 기준은 [`celeb-01-03-title.md`](../project/celeb/celeb-01-03-title.md), 등록 전 중복 확인과 중복 프로필 통합은 [`celeb-00-01-pipeline.md`](../project/celeb/celeb-00-01-pipeline.md) 「중복 확인」「중복 프로필 통합」이 쥔다.

## 현재 도달점

- 공개 인물 전원의 이름·다른 이름·수식어를 운영 DB에 반영했고, 같은 사람의 중복 프로필(쇼와 천황)도 합쳤다. `pnpm --dir sw/web-bo celeb:dup-check --all`이 같은 사람 의심 0쌍·규칙 오류 0건이다.
- 이름 검색(`es-hangul` 유사 표기 + 다른 이름)은 개발 서버까지만 반영했다. 운영 검색은 웹 배포 뒤에 다른 이름을 읽는다.
- 주소가 바뀐 인물 3명(`kim-namjoon`→`rm`, `anura-kurankan-dissanayake`→`anura-kumara-dissanayake`, `emperor-hirohito`→`emperor-showa`)의 308은 `middleware.ts`에 넣었다. 웹 배포 전까지 운영의 옛 주소는 404다.

## 남은 순서

1. 웹 배포(사용자 지시 뒤). 대상은 `sw/web/src/lib/celeb/celebNameSearch*.ts`, `actions/search/searchCelebs.ts`, `actions/home/getCelebs.ts`, `actions/user/getCelebBySlug.ts`, `celeb/[slug]/celebPageJsonLd.ts`(Person `alternateName`), `components/layout/header/useHeaderSearch.ts`, `middleware.ts`, `messages/{ko,en}/core.json`, `types/database.generated.ts`, `database/migrations/20260928120000_add_celeb_aliases.sql`(운영 DB에는 적용됨), `sw/web/package.json`의 `es-hangul`과 `pnpm-lock.yaml`. 같은 파일에 다른 세션 변경이 섞였는지 `git diff`로 먼저 본다.
2. 백오피스(미룸): 인물 편집 화면의 다른 이름 칸, `createCeleb`에 `@feelandnote/shared/lib/celeb-identity` 중복·규칙 검사 연결.
3. 끝나면 이 문서와 `docs/todo/README.md` 행을 지운다.
