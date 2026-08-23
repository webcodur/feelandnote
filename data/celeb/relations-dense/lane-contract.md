# 관계 칸 레인 계약

전원(3059) × 관계 칸을 연다. 이미 그 칸에 간선이 있어도 **그 짝이 아니면** 확인된 새 짝은 넣는다. 없는 관계는 만들지 않는다.

## 칸

| 칸 | rel_group / rel_type |
|---|---|
| 스승 | thought / teacher (역: student) |
| 제자 | thought / student |
| 영향받음 | thought / influence (to = 영향을 준 사람) |
| 영향줌 | thought / influenced |
| 지기 | friendship / friend |
| 맞수 | rivalry / rival |
| 공동창업 | career / cofounder |

가족은 이번 레인 대상이 아니다. 배우자·남매를 지기로 넣지 않는다. 살해·왕위 분쟁은 가족 위에 rivalry 가능.

## 방향

`rel_type` = to가 from에게 무엇인가.
- (머스크, 알렉산더, influence) = 알렉산더는 머스크의 영향원
- (알렉산더, 머스크, influenced) = 머스크는 알렉산더가 영향을 준 사람
화면은 from_id = 페이지 주인만 읽는다. 양방향 필수.

## 수록

- 확인된 사건: 연도·행동·결과. 사람 주어. 「라이벌이다」로 끝내지 않음.
- 양쪽 시점 **다르게**. 복붙 금지.
- 한국어 한 줄 약 55~75자, `note` + `note_en`.
- 사상 연쇄는 시대가 달라도 넣는다. 알렉산더→머스크가 기준선.
- 만나지 않은 **개인 대립**(공자–묵자)은 라이벌로 넣지 않음. 영향은 넣는다.
- 연애 파국은 지기가 아니다.

## 저장

- 양쪽 다 `celebs` 명단에 있으면 내부(`celeb_relations`).
- 명단 밖은 `celeb_relations_external`. **허용 유형은 family / rival / friend만.** influence·teacher·student·cofounder는 바깥 테이블 체크에 걸린다.
- **대체 금지.** 본짝이 명단 밖이라고 처형자·부하·같은 전선의 다른 사람을 그 칸에 넣지 않는다. 위연의 맞수는 양의이지 마대가 아니다. 맞수·지기는 external에 넣고, 스승·영향·창업은 칸을 비운다.
- 노트 있으면 `source='manual'`.
- 한글 JSON은 Node로 읽기→쓰기. Edit로 고치지 않음.
- 스킵 원장·`skipped` 배열 만들지 말 것. DB에 적용하지 말 것. 짝 JSON만 남긴다.

## 산출물

`data/celeb/relations-dense/lane-<이름>-pairs.json`

```json
{
  "lane": "tech",
  "pairs": [
    {
      "kind": "influence|teacher|cofounder|friend|rival",
      "a": "slug-of-page-owner-or-junior",
      "b": "slug-of-other",
      "a_ko": "...",
      "a_en": "...",
      "b_ko": "...",
      "b_en": "..."
    }
  ]
}
```

influence: a가 b에게 영향받음 (a→b influence, b→a influenced)
teacher: a의 스승이 b
cofounder/friend/rival: 대칭

번역투 금지. ❌ "사람이 사람을 소유하는 제도를 두고 형제끼리 총을 겨눈 전쟁이었지요" → ✅ "같은 땅의 형제들은 노예제를 두고 서로 총을 겨누고 있었습니다"
사람 주어, 한 문장 한 일, 동사로 끝냄. 포개다·벼리다·빚어내다 금지.
