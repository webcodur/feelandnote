# 신규 인물 세력도감 배정 규격

## 목적

574명 미등록 후보를 세력도감(`/explore/faction`) 테마(= `celeb_tags`)에 배정하는 **설계도**를 만든다.
후보는 전부 `status: draft`라 DB 배정(`celeb_tag_assignments`, celeb_id 필요)은 등록 후에만 가능 — 지금 산출물은 배정안 JSON이다.

## 기존 태그 카탈로그

`tags-existing.json` — 238개 태그(slug·한영 이름·대분류 parent_slug·featured). 13개 대분류:
`ai` `art-and-creation` `business-and-industry` `historical-fiction` `music` `myth-and-fiction` `paths-of-a-life` `power-and-war` `shadow-world` `special-features` `sports-legends` `technology-and-science` `thought-and-conviction`

## 배정 규칙

1. 인물당 **주 태그 1개** 필수. 뚜렷이 맞으면 부 태그(`secondary`) 1개까지 허용 — 억지 다중 배정 금지.
2. 기존 태그가 진짜 맞으면 기존 태그 사용. 억지 매칭 금지.
3. 어울리는 기존 태그가 없으면 `new:<slug>`로 신규 테마 제안 — slug는 소문자-하이픈, 인물당 같은 new 슬러그면 같은 테마로 간주.
4. 신규 테마 제안은 가능한 아래 후보 목록 안에서 고른다(일관성). 목록에 없는 게 정말 필요하면 새 slug를 제안하고 `reason`에 이유를 쓴다.

### 신규 테마 후보 (제안 승인 전제 — 실제 생성은 등록 단계)

| new slug | 한글 | 영문 | 대분류 | 용도 |
|---|---|---|---|---|
| `new:great-archaeologists` | 고고학의 발굴자들 | The Great Archaeologists | technology-and-science | 발굴·해독·유적 인물 |
| `new:great-explorers` | 대탐험가 | The Great Explorers | power-and-war | 지리 탐험·원정 지휘 |
| `new:spies` | 스파이와 이중첩자 | Spies and Double Agents | shadow-world | 개인 첩보원(기관 수장은 spymasters) |
| `new:impostors-and-mysteries` | 사기꾼과 미스터리 | Impostors and Mysteries | shadow-world | 위작·사칭·신원 미상·기인 사건 |
| `new:survivors` | 극한의 생존자 | The Survivors | paths-of-a-life | 난파·추락·포로·극한 생환 |
| `new:soldiers-of-fortune` | 용병과 모험 군인 | Soldiers of Fortune | shadow-world | 용병·사병·부랑 군인 |
| `new:eccentric-fortunes` | 괴짜 부호들 | The Eccentric Fortunes | business-and-industry | 기행·집착으로 유명한 부호 |
| `new:record-breakers` | 한계를 넘은 사람들 | The Record Breakers | sports-legends | 고도·속도·깊이·거리 기록 도전 |
| `new:cold-war-frontlines` | 냉전의 최전선 | Cold War Frontlines | shadow-world | 핵 위기·첩보·망명 사건 인물 |

## 출력

`_out/<배치명>.json` — 닉네임 키 객체:

```json
{
  "하인리히 슐리만": {
    "tag": "new:great-archaeologists",
    "secondary": null,
    "reason": "트로이·미케네 발굴 — 고고학 태그 직접 해당"
  }
}
```

- `tag`: 기존 slug 또는 `new:slug`. `secondary`는 없으면 null.
- `reason`: 한국어 한 줄, 왜 그 태그인지(억지 매칭 방지용).
- 어느 태그에도 못 넣겠으면 `tag: null` + 이유 — 억지로 넣지 않는다.

## 2차 패스 — 도감 멤버 텍스트

배정(`tag`)이 끝난 인물에 대해 `celeb_tag_assignments` 수동 행 필드를 미리 채운다.
실제 행의 필드: `short_desc`·`short_desc_en`·`long_desc`·`long_desc_en`·`quote`·`quote_en`·`hidden`·`sort_order`.
(참고 실례: "설산 행궁에서 칭기즈칸을 만난 전진교 장문" / 2~4문장 소개)

- `short_desc`: 도감 한줄 수식어. 명사구, 20자 내외, 마침표 없음. 헤드라인과 달라도 되지만 같은 인물 정체성.
- `short_desc_en`: 자연스러운 영문 한 줄.
- `long_desc`: 2~4문장 소개(해당 테마 관점에서). 사실만, 헤징된 일화는 한정 표현 유지.
- `long_desc_en`: 한국어와 동일 내용의 영문.
- `quote`/`quote_en`: 검증된 유명 발언이 있을 때만, 출처 불명·창작 금지. 없으면 null.
- `tag: null` 인물은 이 필드를 만들지 않는다.

출력은 기존 `_out/<배치명>.json`에 필드를 병합해 덮어쓴다(tag·secondary·reason 보존).

## 주의

- 우리 후보는 전부 개별 실존 인물이라 「개별 인물만」 규칙 충족.
- `myth-*`·`historical-fiction` 하위는 허구·신화 전용 — 실존 인물 넣지 않는다(생제르맹 같은 BOTH도 실존측 태그로).
- 태그는 「테마」 — 인물이 그 테마 세계관에 시각적으로 어울리는지(세로 화보 한 장으로 카리스마가 서는지)를 같이 본다. 너무 미묘한 인물은 null이 정직하다.
