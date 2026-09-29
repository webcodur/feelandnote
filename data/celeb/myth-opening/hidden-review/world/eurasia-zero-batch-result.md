# 성서·인도 왕조·페르시아·슬라브 0명 전승 배치 결과

2026-09-23 DB 재조회. 네 전승 모두 `published=false`를 유지했다. 인물 노출은 `active`·안내 `published_at`·해당 `faction_members.hidden=false`의 세 값이 함께 맞는 경우만 센다.

| 전승 | 이전 → 현재 노출 | 이번 처리 | 남은 직접 장애 |
|---|---:|---|---|
| 성서 (`myth-bible`) | 0 → 0 / 25명 | 대표 아브라함·모세·마리아의 아바타 원본 200 응답 및 실물 확인. 마리아 한영 한 줄 정의의 서로 다른 장면과 `제자들이 달아난`이라는 부정확한 표현을 요한복음 19:25–27에 맞춰 교정 | 아브라함의 유일한 연결 책이 성경 본문 판본이 아닌 『은총 성경 쓰기: 창세기』 필사 노트다. 본문 등장 및 대체 판본을 확정하기 전까지 대표 공개 보류. 욥은 아바타 없음. 나머지 22명은 관계·판본 전수 검수 전 |
| 인도 왕조 (`myth-hindu-lineage`) | 0 → 0 / 16명 | 대표 마누·바라타 2세·야야티의 아바타 원본 200 응답 및 실물 확인. 마누의 소개와 안내가 서로 다른 홍수 전승을 한 이야기로 합친 오류를 출전별 한영 문장으로 교정 | 대표 3명에게 연결된 한국어 『마하바라타』 482쪽 단권에서 각 장면이 수록되는지 미확인. 영문 강굴리 4권 세트의 등장을 한국어 단권의 근거로 대체할 수 없음. 나머지 13명도 같은 판본 범위 검증 전 |
| 페르시아 (`myth-persia`) | **0 → 3 / 14명** | 잠시드·자하크·페리둔을 `active`, 읽어보기 게시, 팩션 배정 `hidden=false`로 조건부 전환 후 독립 재조회. 대표 아바타 3장 실물 확인. 등록 한국어판이 헬렌 짐머른 영역의 한국어 번역이며, 국내판 목차와 동일 영역 원문에서 세 인물의 장면을 확인 | 나머지 11명은 숨김 유지. 각자의 책 등장·판본 및 이미지 검수 전. 전승 자체는 비공개 유지 |
| 슬라브 (`myth-slavic`) | 0 → 0 / 32명 | 대표 류리크·키이·레흐 아바타 원본 200 응답 및 실물 확인 | 키이 아바타가 현대식 올백 머리·증명사진 인상으로 대표 공개 부적합. 『The Slavic Myths』에 붙은 다수 인물의 직접 등장 미확인. 32명 전원 비공개 유지 |

페르시아 한국어 ISBN `9791156620235`는 [KAIST 도서관 서지](https://library.kaist.ac.kr/search/ctlgSearch/posesn/view.do?bibctrlno=742323&ty=B)가 저자·영역자 헬렌 짐머른·한국어 번역자를 확인하고, [국내판 목차](https://www.yes24.com/product/goods/13687032)는 「고대의 샤들」·「페리둔」을 포함한다. [동일 영역 원문 첫 장](https://classics.mit.edu/Ferdowsi/kings.1.shahsold.html)에 잠시드·자하크·페리둔의 등장과 왕권 교체가 직접 나타난다. [다음 장](https://classics.mit.edu/Ferdowsi/kings.2.feridoun.html)은 페리둔의 세 아들 이야기를 잇는다. 영문 등록판의 [출판사 목차](https://www.penguinrandomhouse.com/books/541038/shahnameh-by-abolqasem-ferdowsi-translated-by-dick-davis-foreword-by-azar-nafisi/)도 초기 왕·자하크·페리둔을 담는다. 따라서 대표 3명의 한영 등장 관계는 판본 범위와 맞는다.

마누 교정은 [《샤타파타 브라마나》 홍수 대목](https://sacred-texts.com/book/the-satapatha-brahmana-part-i/shell/story-of-the-flood-of-manu)의 홀로 생존·제사 후 물에서 나온 여인과 [《마하바라타》 3권 186절](https://www.swaveda.com/texts/mahabharata/3186/)의 일곱 현자 동승을 분리한 것이다. 마리아 교정은 [요한복음 19:25–27](https://bible.usccb.org/bible/john/19)에 어머니와 한 제자가 함께 십자가 곁에 있다고 적힌 데 따른다. 필사 노트의 성격은 [ISBN `9788984814394` 서점 설명](https://www.yes24.com/product/goods/30182257)과 현재 DB 소개에서 확인했다. 노트가 창세기 본문을 얼마나 싣는지는 열람하지 못했으므로 관계를 삭제하거나 새 책으로 바꾸지는 않았다.

교정 전 DB 값은 [`eurasia-manu-guide-before-20260923.json`](eurasia-manu-guide-before-20260923.json), [`eurasia-mary-headline-before-20260923.json`](eurasia-mary-headline-before-20260923.json), [`eurasia-persia-core-before-20260923.json`](eurasia-persia-core-before-20260923.json)에 있다. 대표 12명의 조회값은 [`eurasia-zero-batch-precheck.json`](eurasia-zero-batch-precheck.json), 실물 이미지는 [`eurasia-avatars/`](eurasia-avatars/)에 보존했다. 페르시아 전환 스크립트는 마지막에 `Z`와 `+00:00` 타임스탬프 문자열을 그대로 비교해 실패했지만, 이후 별도 DB 재조회에서 `active` 3/3, 안내 게시 3/3, 숨김 해제 3/3을 확인했다. 서비스 화면과 전승 공개는 이 배치에서 검증·실행하지 않았다.
