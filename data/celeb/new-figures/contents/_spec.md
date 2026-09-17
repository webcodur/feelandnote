# 감상 콘텐츠 조사 규격 (new-figures 초안)

실존 인물이 직접 감상했거나 감상 의사를 밝힌 BOOK·VIDEO·GAME·MUSIC을 조사한다.
채택·제외·증거 강도의 판정은 `docs/project/celeb/celeb-02-01-content-research.md`,
감상경유 문체는 `docs/project/celeb/celeb-02-03-content-review.md`를 따른다.
인물은 아직 미등록이라 DB 대신 이 초안 파일에 쓴다.

## 출력

`data/celeb/new-figures/contents/_out/<배치명>.json` — 인물 닉네임을 키로 하는 객체:

```json
{
  "닉네임": {
    "searched": ["BOOK","VIDEO","GAME","MUSIC"],
    "contents": [
      {
        "type": "BOOK",
        "title": "일리아스",
        "title_en": "Iliad",
        "creator": "호메로스",
        "year": null,
        "status": "FINISHED",
        "source_url": "https://…",
        "evidence": "출처가 인물↔작품을 잇는 문장의 내용을 한국어 한 문장으로 요약",
        "review": "알렉산드로스는 스승이 교정한 이 필사본을 평생 곁에 두었다.",
        "review_en": "Alexander kept this tutor-corrected copy by his side for life."
      }
    ]
  }
}
```

## 채택 기준 (요약)

- 구체 작품만. 장르·분야 언급을 대표작으로 임의 치환 금지.
- `source_url` 없는 항목 금지. 스니펫이 아니라 원문에서 관계 문장을 확인한다.
- 제외: 본인 창작물, 본인 출연작, 본인이 소재·등장인물인 작품, 본인 전기·다큐.
- 고대·근대 인물: 1차 사료(서한·사서·저술·기록)에서 작품이 특정될 때만. "병법을 배웠다"로 《손자병법》을 채택하지 않는다. 제도적 교육·시대 유추·소장만으로는 제외.
- 현대 인물: 본인 발언 또는 실명 필자가 사실로 단정한 기록만. 재큐레이션 사이트는 원 출처를 추적한다.
- 소장·선물·구입만으론 부족 — 읽겠다는 의사까지 확인돼야 채택.
- `status`: 이미 감상 `FINISHED`, 감상 의사만 확인 `WANT`.
- `review`/`review_en`은 첫 문장이 반드시 `{인물명}은/는`·`{Name}`으로 시작. 출처가 말하지 않는 동기·감정을 보태지 않는다. 2~3문장.

## 검색

`{인물} favorite books movies music games recommendations interview`로 시작해
누락 유형만 보충 검색. 같은 결과만 반복되면 종료. 건수를 채우려 약한 근거를 넣지 않는다.
영화·게임·음악이 존재하지 않던 시대의 인물은 해당 유형을 searched에서 빼고 BOOK(+해당시 MUSIC)만 조사한다.
한 명도 못 찾으면 `"contents": []`로 둔다 — 그것도 정당한 결과다.
