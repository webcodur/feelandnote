# 천도 (天導) — 셀럽 전략 시뮬레이션

> 수호지 천도 108성에서 영감을 받은 턴제 전략 시뮬레이션 웹게임.
> 역사 속 실존 인물들로 세력을 키우고, 문명을 통일한다.

---

## 문서 구조

| 파일 | 내용 |
|------|------|
| [01-overview.md](./01-overview.md) | 게임 컨셉, 목표, 핵심 루프 |
| [02-characters.md](./02-characters.md) | 캐릭터 시스템 (스탯, 병과, 동적 로딩) |
| [03-combat.md](./03-combat.md) | 전투 시스템 (턴제, 지형, 계략) |
| [04-management.md](./04-management.md) | 거점 경영 (건물, 자원, 내정) |
| [05-items.md](./05-items.md) | 아이템 시스템 (콘텐츠 기반 장비) |
| [06-campaign.md](./06-campaign.md) | 캠페인 (맵, 세력, 승리 조건) |
| [07-assets.md](./07-assets.md) | 에셋 명세 (도트, 음악, UI, 효과음) |
| [08-tech.md](./08-tech.md) | 기술 스택, DB 연동, 아키텍처 |
| [09-feature-roadmap.md](./09-feature-roadmap.md) | 기능 로드맵 (구현 완료/미구현/우선순위) |
| [10-implementation-status.md](./10-implementation-status.md) | 구현 현황 상세 (파일별, 시스템별, 재개 가이드) |

---

## 데이터 소스

- **캐릭터**: Supabase `profiles` + `celeb_influence` (1906년 이전 사망자, ~148명, 계속 추가)
- **아이템**: Supabase `contents` + `user_contents` (~6,488건)
- **게임 시작 시 DB에서 동적 로딩** — 캐릭터는 사전 정의되지 않음

---

## 원작 참조

코에이 『수호전 천도 108성』 (1996)의 핵심 메커니즘을 참조하되,
셀럽 데이터에 맞게 재설계한다.
