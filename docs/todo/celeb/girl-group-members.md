# 미등록 걸그룹 멤버 등록

걸그룹 세력(`kpop-girl-groups`)에 없던 그룹의 멤버를 실존 인물로 비공개 등록했다. 인지도 재선별 뒤 255명이 남았다. [active 요건](../../project/celeb/celeb-00-02-active-requirements.md) 가운데 아래 항목이 남았다. 순서는 [실존 인물 등록 런북](../../project/celeb/celeb-00-03-real-figure-runbook.md)을 따른다.

## 남은 일

| 항목 | 상태 | 룰북 |
|---|---|---|
| 인물 안내 한영 | 완료 | [인물 안내](../../project/celeb/celeb-05-01-reading.md) |
| 가상독백 한영 | 완료 | [가상독백](../../project/celeb/celeb-04-03-virtual-monologue.md) |
| 한마디 | 완료 | [Speech](../../project/celeb/celeb-04-01-speech.md) |
| 감상 콘텐츠 | 완료. 187명 648건, 0건 확정 68명 | [콘텐츠](../../project/celeb/celeb-02-01-content-research.md) |
| 관계망 | 완료 | [관계](../../project/celeb/celeb-07-01-relations.md) |
| 대표사진·아바타 | 완료. 255명 전원 등록 | [대표사진](../../project/celeb/celeb-08-02-hero-photo.md) |
| 공개 전환 | 253명 공개(2026-10-24 86명, 2026-10-25 167명). 미야오 엘라·나린 2명은 요건을 채웠으나 아직 inactive다 | [공개 상태](../../project/celeb/celeb-00-05-publication.md) |
| 등장·집필 도서 연결 (선택) | 조사는 완료했다. 연결은 active 요건이 아니라 하지 않았다. 후보 49명분이 `books-candidates.json`에 있다 | [도서](../../project/celeb/celeb-02-05-figure-books.md) |
| 세력 배정 | 작업 원장에만 둔다. 세력도감에 새 세력이나 소속을 만들지 않는다 | — |

## 작업 방법

- 등록: `pnpm --dir sw/web-bo celeb:seed:inactive --dir <원장 폴더> --apply`. 이름이 겹치는 기존 인물은 `distinct_from`으로 구분한다.

## 작업 파일

임시 작업 폴더: `%TEMP%\feelandnote\girlgroup-members-1020\`

| 파일 | 내용 |
|---|---|
| `groups/<그룹키>.mjs` | 그룹별 멤버 정의(신원·bio·사실·안내·독백 방향). 삭제한 멤버는 파일 끝 제외 줄로 막는다 |
| `run/<그룹키>/` | 등록 원장, `slugs.txt`·`slugs-vm.txt`, 재료 `brief.json`, 독백 초안 `vm.jsonl` |
| `ledger/illit.json` | ILLIT 5명 등록 원장 |
| `faction-ledger.json` | 세력 배정 원장 255행 |
| `del-slugs.txt` | 범위 축소·삭제 요청으로 지운 slug |
| `books-candidates.json` | 등장·집필 도서 조사 후보(ChatGPT 웹 조사 결과, 출처·발췌 포함). 연결 전 판본 확인·선별이 필요하다 |

## 등록 범위 기준

- 몇 년 이상 정식 활동한 그룹은 주요 라인업을 등록한다. 이름만 같은 기존 인물은 `distinct_from`으로 구분한다.
- 등록하지 않는다: 아이오아이 파생 그룹의 아이오아이 외 멤버(구구단·위키미키·프리스틴), 활동이 짧거나 미미했던 팀(클라씨·픽시·소나무·베리굿·써니힐·투야·티티마), 연예계를 떠나 일반인이 된 사람, 데뷔 직후 탈퇴한 멤버.
- 은퇴하며 프로필 삭제를 요청한 사람은 등록하지 않는다(CLC 권은빈, 2026-10-21 삭제).
- 인지도 재선별(2026-10-24)로 하이키·위클리·라잇썸·퍼플키스·세이마이네임·메이딘·우아·트라이비·배드빌런·첫사랑·유니스 69명을 하드 삭제했다. 영문·한국어 위키백과 12개월 조회수와 위키백과 언어판 수의 순위 평균이 낮은 그룹이다. 다시 등록하지 않는다.
- 다이아 솜이는 탈퇴 뒤 무고죄 법정구속 이력으로 사용자 지시에 따라 삭제했다(2026-10-23).
- 두 그룹을 거친 멤버는 한 번만 등록하고 수식어는 대표 그룹으로 둔다.
- 출처로 소개를 쓸 수 없는 멤버는 등록하지 않는다. 원본 명단은 AI 브레인스토밍 자료이므로 멤버 구성은 그룹마다 다시 검증한다.
