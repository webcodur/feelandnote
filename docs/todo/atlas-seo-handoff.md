# 신화·세력도감 검색 제목·설명 개편 인수인계

KIRO 세션(2026-09-28~29, 크레딧 소진으로 중단)의 인계다. 원본 대화는 `C:\Users\webco\Downloads\신화 v3\`(messages.jsonl + sub-executions)에 있다.

## 작업 개요

구글 검색에서 인물 페이지가 `headline` 값만 보이는 문제에서 시작했다. 인물 메타 개편(부분 커밋 `eeadc2b8b`)에 이어, 신화 78편과 세력 188개에 검색 가능한 전용 주소·제목·설명을 만드는 작업이다. 규칙 SSoT는 [ops-02-seo.md](../project/operations/ops-02-seo.md) 「신화·세력도감」 절, 한 줄 정의 규격은 [service-01-explore.md](../project/service/service-01-explore.md) 「한 줄 정의」 절이다.

## 미커밋 상태 — 작업 전체가 작업 트리에만 있다

이 개편은 아직 커밋도 배포도 안 됐다. 다른 세션 변경과 섞여 있으니 커밋 시 경로 지정(`git commit -m "..." -- <경로>`)과 `git diff` 확인이 필요하다.

- 신규(??): `sw/web/src/lib/atlasMeta.ts`·`atlasMeta.test.ts`·`seoSentences.ts`, `explore/myth/[slug]/` 페이지, `AtlasIndex.tsx`, `database/migrations/20260929120000_add_faction_lv2_headline.sql`
- 수정: `sitemap.ts`(신화·세력 주소 core.xml 등재), `middleware.ts`(옛 `/explore/myth?myth=` 308), `celeb/meta.ts`, `ops-02-seo.md`, `service-01-explore.md`, `docs/continuous/google-indexing.md`, `getMythData.ts` 등

`faction_lv2.headline`/`headline_en` 컬럼과 266개 한 줄 정의는 generated types 반영으로 보아 로컬 DB에 적용된 상태다. 운영 DB 적용 여부와 실제 값 전수 확인이 필요하다.

## 현행 구현(작업 트리 기준, 26.09.30 확정)

- 신화 제목: `{이름} 줄거리와 등장인물` — 세력 제목: `{이름}: {대표 2명} 등`(폭 초과 시 대표 1명 → `{이름} 주요 인물`)
- 설명: `{한 줄 정의}.` + 「만나 보세요!」 초대 문장 — **호객형 채택됨**(26.09.30, `ㄱㄱ` 지시로 확정·반영).
  그룹 둘 이상이면 그룹 이름 나열, 사람을 가리키는 그룹명이면 「…로 나눠」, 그룹이 없으면 아직 안 부른 인물로
  「…도 만나 보세요!」, 최종 폴백은 「{이름}의 인물들을 만나 보세요!」. 세력 그룹은 `celebs[].group_label`·`group_position`에서,
  신화는 `myth.groups[].name`에서 온다.
- 조립은 `lib/atlasMeta.ts`, 제목 폭은 `estimateTitleWidth`(예산 24). 실데이터 266개 검증본은 `Temp/prod-desc.txt`.
- `lib/korean-particle.ts`의 ㄹ받침 「로」 버그는 고쳤다 — `direction` 조사에서 종성 8(ㄹ)은 「로」를 택한다.

## 마지막 턴의 추천안(채택 완료)

사용자가 제시한 형태 — 설명은 호객형 마무리. 266개 전부 생성·자체 검수 완료(모두 두 줄 안에 듦).

- **그룹 2개 이상(202개):** `{정의}. {그룹1}, {그룹2}, {그룹3} 등으로 나뉜 인물들을 만나 보세요!`
- **그룹명이 이미 사람을 가리키면(11개):** `…로 나눠 만나 보세요!`(「인물」 중복 회피)
- **그룹 0~1개(54개):** 제목·정의에 안 나온 인물로 `슈가·정국도 만나 보세요!`, 신화는 `…등 {이름}의 등장인물을 만나 보세요!`
- **그 외(10개):** `{이름}의 등장인물을 만나 보세요!`

분포: groups3 153 / groups2 49 / people 54 / plain 10.

## 사용자 결정 대기(중단 직전 질문)

1. ~~추천안 채택 여부~~ → **채택(26.09.30)**. `atlasMeta.ts`·두 페이지·`ops-02-seo.md`에 반영, 영어도 같은 구조(「Meet …!」)로 만들었다.
2. ~~제목 접미사 `·세력도감` 추가 여부~~ → **부결(26.09.30)**. `| 필앤노트` 유지. 긴 접미사는 대표 인물 51/188을 잃어 비용 대비 이득이 없다.
3. ~~어색한 그룹 7곳 DB 수정 여부~~ → **수정 완료(26.09.30, faction_lv3)**. 화면에도 노출되는 값이라 고쳤다:
   항공기 제조사 — 스컹크 웍스 2명을 미국으로 병합·그룹 삭제(지역 기준 통일) / 프랑스 혁명 — 그룹 없던 로베스피에르·라파예트에 「혁명의 지도자들」 신설, 「제국」→「나폴레옹의 제국」 / 뉴 할리우드 — 「범죄·드라마의 배우들」「SF·어드벤처의 배우들」로 배역 기준 명시, 감독들 sort_order 100→3 / 팝의 전설 — 연대순 정렬(1960~70→1) / 아이네이스 — 「트로이의 멸망」→「함락된 트로이의 사람들」 / WW2 영국 — 「블레츨리 파크」→「블레츨리 파크의 해독가들」 / 일리아스 — 「아킬레우스」→「아킬레우스 진영」. 원본은 `data/celeb/_backup/faction-groups-fix-20260930.json`에 있다. 화면 캐시는 `CACHE_TAGS.FACTIONS`로 묶여 있어 배포·revalidate 전까지 옛 이름이 보일 수 있다.
4. ~~**`withParticle` ㄹ받침 버그 수정**~~ → **수정 완료(26.09.30)** — ㄹ받침은 「로」를 택한다. 로마자(R&B)·숫자·닫는 괄호(「한(漢)」)의 읽는 소리 판정은 아직 없다 — 필요하면 그때 다룬다.
5. **배포** — 개편이 미배포다. 배포하면 옛 신화 주소는 308로 옮기고, 신화·세력 한 편 주소를 색인 큐에 넣는다(`docs/continuous/google-indexing.md` 도달점 참조).

## 주의 — 생성 스크립트는 삭제됐다

세션 말미에 `_tmp-kiro-serp`의 mts/mjs/json 스크립트를 지우고 HTML·PNG만 남겼다. 추천안 로직을 코드로 옮길 때 위 규칙과 `atlasMeta.ts` 기반으로 다시 짠다.

## 산출물 — `C:\project\feelandnote\_tmp-kiro-serp\`(gitignore, 로컬 전용)

| 파일 | 내용 |
|---|---|
| `proposal.html`/`proposal.png` | KIRO 당시 최종 추천안 — 샘플 SERP 카드 + 266개 전체 표(어색한 7곳 표시) |
| `proposal-v2.html`/`proposal-v2.png` | 09.30 갱신판 — 7곳 그룹 수정 후 DB 실데이터, 「·세력도감」 접미사 제거 반영. 생성기: `Temp/gen-atlas-proposal.mts` |
| `variants.html`/`variants.png` | 설명 네 안 비교(간결체·모음형·서술형·호객형) |
| `compare.html`/`compare.png` | 제목 두 안 비교 |
| `report.html`/`report.png` | 바꾸기 전과 뒤 |
| `preview.html`/`preview.png`, `serp-ko.*`/`serp-en.*`, `shot-*` | 중간 미리보기·캡처 |
