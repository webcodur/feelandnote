# 세력도감 웹 남은 일

세력도감은 웹 도감만 남았다. 명단 원천은 웹 배정(`celeb_tag_assignments`)과 그룹 표(`celeb_tag_groups`)이고, 편집은 web-bo `/factions/<테마>`가 맡는다. 화면 규격은 [`explore.md`](../project/service/explore.md) 「세력도감」, 운영 화면은 [`web-bo.md`](../project/apps/web-bo.md) 「세력도감」이 쥔다.

## 영상층 철거 마무리

1. **공개 뷰의 빈 잔재 칸 제거** — 뷰 `faction_atlas_members`가 늘 고정값·null을 내는 `source`·`person_id`·`group_subtitle`·`group_subtitle_en`·`group_color`·`group_logo_url`. 코드는 이미 읽지 않지만 배포된 운영 웹이 아직 조회하므로 **웹 배포 뒤에** 뷰·캐시 표·갱신 함수를 함께 고친다. 뷰에 걸린 셀럽 공개 정책을 깨지 않게 한 트랜잭션으로 한다.

## 웹 화면

1. **탐색 허브 세력 카드 표지** — 단체화보가 있는 테마를 우선 뽑아 표지로 쓴다(`getFactionHubPreviews`). 이 우선 규칙을 걷고 출연진 판 표지로 바꾼다.
2. **단체화보 묶음을 그룹 표로 흡수** — 세력이 하나뿐인 테마(앤트로픽·오픈AI 등)는 단체 사진 묶음(`celeb_tags.team_images`의 이름·구성원)으로 인물을 나눈다. 이것도 `celeb_tag_groups`로 옮기면 그룹 원천이 하나가 되고 사진 칸은 쓸모가 없어진다.
3. **새 인물 누끼 보장** — 출연진 판은 아바타가 배경을 지운 누끼라는 전제에 선다. 테마 편집 화면 명단에 「배경 미제거」 표시와 기존 nobg 대기열로 보내는 일괄 버튼을 붙인다.
4. **그룹 편집 칸(후순위)** — 진영 설명(`celeb_tag_groups.description`·`description_en`)·영문 이름·차례를 지금은 신화 편집(`/myths`)만 고친다. 같은 패널을 세력도감 테마 편집 화면에도 연다.
