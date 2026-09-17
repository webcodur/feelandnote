# 세력도감 웹 남은 일

세력도감은 웹 도감만 남았다. 명단 원천은 배정(`faction_members`)과 그룹 표(`faction_lv3`)이고, 편집은 web-bo `/factions/<세력>`이 맡는다. 화면 규격은 [`explore.md`](../project/service/explore.md) 「세력도감」, 운영 화면은 [`web-bo.md`](../project/apps/web-bo.md) 「세력도감」이 쥔다. 스키마 이관(`celeb_tags` 계열 → `faction_lv*` + `faction_members`)은 [`faction-schema-migration.md`](faction-schema-migration.md)가 쥔다 — 읽기 뷰는 이미 `faction_member_rows`다.

## 웹 화면

1. **탐색 허브 세력 카드 표지** — 단체화보가 있는 세력을 우선 뽑아 표지로 쓴다(`getFactionHubPreviews`). 이 우선 규칙을 걷고 출연진 판 표지로 바꾼다.
2. **단체화보 묶음을 그룹 표로 흡수** — 세력이 하나뿐인 분류(앤트로픽·오픈AI 등)는 단체 사진 묶음(`faction_lv2.team_images`의 이름·구성원)으로 인물을 나눈다. 이것도 `faction_lv3`로 옮기면 그룹 원천이 하나가 되고 사진 칸은 쓸모가 없어진다.
3. **새 인물 누끼 보장** — 출연진 판은 아바타가 배경을 지운 누끼라는 전제에 선다. 세력 편집 화면 명단에 「배경 미제거」 표시와 기존 nobg 대기열로 보내는 일괄 버튼을 붙인다.
4. **그룹 편집 칸(후순위)** — 진영 설명(`faction_lv3.description`·`description_en`)·영문 이름·차례를 지금은 신화 편집(`/myths`)만 고친다. 같은 패널을 세력 편집 화면에도 연다.
5. **「주요 장면」 구획(구상 단계)** — 신화의 세계와 공통 과제다. [`myth-handoff.md`](myth-handoff.md)의 남은 작업 목록이 쥔다.
