# active 요건

인물의 `publication_status='active'` 전환에 필요한 데이터와 조사는 이 문서가 쥔다. 공개 상태와 노출은 [`celeb-00-05-publication.md`](celeb-00-05-publication.md), 데이터별 작성·검수는 아래 룰북을 따른다.

## 필수

| 데이터·조사 | 확보 기준 | 룰북 |
|---|---|---|
| 기본 프로필·bio·headline | 미상·해당 없음으로 완료 처리하지 않고, 해당 인물과 관련된 기본 항목을 채운다 | [`기본 프로필`](celeb-01-00-profile.md) |
| 아바타 | 해당 인물의 아바타를 등록한다 | [`아바타`](celeb-08-01-avatar.md) |
| 인물 안내 | 본문을 채운다 | [`인물 안내`](celeb-05-01-reading.md) |
| 가상독백 | 본문을 채운다 | [`가상독백`](celeb-04-03-virtual-monologue.md) |
| 한마디 | 검증된 발언을 채운다. 없으면 기존 룰북의 ‘없음’ 표준값을 한영으로 저장한다 | [`Speech`](celeb-04-01-speech.md) |
| 감상 콘텐츠 조사 | `REAL`·`BOTH`는 조사 필수. `FICTION`은 조사하지 않는다 | [`콘텐츠 근거 조사`](celeb-02-01-content-research.md) |
| 관계망 조사 | 생애와 인맥을 최소 1회 조사한다. 위키 조회만으로 완료하지 않는다. 확인된 관계 건수가 아니라 조사 여부를 본다 | [`인물 관계`](celeb-07-01-relations.md) |
| 등장 도서 조사 | 인물이 등장하거나 직접 다뤄지는 도서를 적정 수준으로 최소 1회 조사한다 | [`인물 도서`](celeb-02-05-figure-books.md) |
| 집필 도서 조사 | 인물이 집필한 도서를 적정 수준으로 최소 1회 조사한다 | [`인물 도서`](celeb-02-05-figure-books.md) |
| 소속 세력 조사 | 해당 인물이 소속되어야 할 세력을 최소 1회 조사한다 | [`세력도감`](../apps/apps-01-web-bo.md#세력도감) |

- 필수 텍스트는 한국어·영어를 모두 채운다.
- `REAL`·`BOTH`에 감상 콘텐츠가 없으면 네 유형 조사를 마치고 0건을 확정해 보유 숫자 `-1` 처리까지 완료한다. 저장·표시 규약은 [`celeb-content-research.ts`](../../../packages/shared/src/constants/celeb-content-research.ts)를 따른다.
- 관계망은 조사 근거와 결과로 완료 여부를 확인한다. 조사했으나 확인된 관계가 0건이어도 충족한다.

## 선택

대표사진, 각성사진, 타임라인, 한마디 외 대사, 영향력, 스펙트럼, 등장 도서(`appear`) 연결, 집필 도서(`authored`) 연결, 세력 소속 연결, `speech_tone`, 음원은 active 요건이 아니다.
