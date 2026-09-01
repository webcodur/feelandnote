# 게임 문서 허브

> **마지막 코드 대조: 26.08.28** — `/rest`의 서버·클라이언트 게임 목록을 함께 확인했다.

게임 문서는 이 파일에서 찾는다. 이 허브는 규격과 수치를 복제하지 않는 **길잡이**다. 실제 규칙은 연결된 게임별 문서가, 돌아가는 판정값은 코드의 상수와 로직이 쥔다.

## 먼저 열 문서

| 하려는 일 | 먼저 열 곳 | 이어서 볼 곳 |
|---|---|---|
| 전체 게임의 공개·보존·실험 상태 파악 | 이 문서의 「현재 문서 지도」 | 각 행의 상태 근거 |
| 쉼터 라우트와 앵커 확인 | [`architecture.md`](../project/platform/architecture.md#네비게이션) | [`card-images.md`](card-images.md) |
| 쉼터 게임 카드 이미지 작업 | [`card-images.md`](card-images.md) | 실제 납품 경로와 적용 현황은 해당 문서 §4~6 |
| 천도 코드 작업 재개 | [`suikoden/dev-guide.md`](suikoden/dev-guide.md) | [`10-implementation-status.md`](suikoden/10-implementation-status.md) |
| 천도 기획·시스템 확인 | [`suikoden/README.md`](suikoden/README.md) | 주제별 01~09 문서 |
| 시대의 초상 수정 | [`portrait.md`](portrait.md) | 코드 위치와 검증 한계는 문서 하단 |
| 유랑 수정 | [`wander.md`](wander.md) | 코드 위치와 검증 상태는 문서 하단 |
| 실험 게임 2차 물결 확인 | [`experimental/README.md`](experimental/README.md) | 게임별 규격 7종 |

## 현재 문서 지도

아래 표의 공개 상태는 `rest/page.tsx`와 `RestGameGrid.tsx`의 `dev` 값을 기준으로 한다.

| 구역 | 게임 | 문서에 적힌 상태 | 상태 근거 |
|---|---|---|---|
| 공개 쉼터 `/rest` | 여명, 미궁, 패권, 천도, 기억 | 한 페이지에 마운트된 공개 게임 5종. 개별 페이지가 아니라 앵커로 진입 | [`architecture.md`](../project/platform/architecture.md#네비게이션), [`card-images.md`](card-images.md) |
| 개발자 모드 | 시대의 초상, 유랑 | 구현은 보존하며 로컬 개발 서버 또는 `?dev=1`에서만 카드 노출 | [`card-images.md`](card-images.md#6-적용-현황) |
| 실험실 `/lab/games` | 교차 격자, 넷씩 넷, 근접도, 경로 잇기, 어느 쪽, 상위 다섯, 가림 해제 | 실험 구역에서만 열고 공개 쉼터에는 등록하지 않음 | [`experimental/README.md`](experimental/README.md#9-마감-결정-기록-260731) |

공개 카드에 올라와 있다는 사실과 게임의 최종 검증 완료는 같은 뜻이 아니다. 특히 천도의 구현·검증 상태는 카드 문서가 아니라 [`10-implementation-status.md`](suikoden/10-implementation-status.md)의 「현재 검증 상태」를 기준으로 판단한다.

## 게임별 문서

### 공개 쉼터

| 게임 | 전용 문서 | 범위 |
|---|---|---|
| 여명 | 전용 게임 규격 문서 없음 | 라우트는 [`architecture.md`](../project/platform/architecture.md), 카드용 장면과 한 줄 설명은 [`card-images.md`](card-images.md#3-1-여명-dawn--역사의-서광) |
| 미궁 | 전용 게임 규격 문서 없음 | 라우트는 [`architecture.md`](../project/platform/architecture.md), 카드용 장면과 한 줄 설명은 [`card-images.md`](card-images.md#3-2-미궁-labyrinth--은둔한-현자-찾기) |
| 패권 | [`hegemony.md`](hegemony.md) | 게임 규칙, 카드·적성·상성 판정, 라운드 결산, AI 판단, 파일 구조, 추후 개발 예정 기능 |
| 천도 | [`suikoden/dev-guide.md`](suikoden/dev-guide.md), [`suikoden/`](suikoden/README.md) | 개발 규칙과 작업 절차는 룰북, 설계는 01~09, 현재 코드 사실은 10 |
| 기억 | 전용 게임 규격 문서 없음 | 공개 상태와 카드 자산은 [`card-images.md`](card-images.md), 실제 규칙은 `sw/web/src/components/features/game/memory/` |

여명·미궁에 전용 문서가 없다는 표기는 새 문서를 만들자는 과제가 아니라, 현재 문서 범위를 숨기지 않기 위한 목록 정보다. 패권 문서는 26.08.12에 코드 폴더에서 이곳으로 옮겨 왔으며, 마지막 코드 대조 시점은 문서 자체를 확인한다.

### 개발자 모드

| 게임 | 전용 문서 | 범위 |
|---|---|---|
| 시대의 초상 | [`portrait.md`](portrait.md) | 플레이 흐름, 공정성, 모바일·접근성, 코드 위치, 검증 한계 |
| 유랑 | [`wander.md`](wander.md) | 완주 흐름, 사건, 인물 데이터, 시대 판정, 코드 위치, 검증 상태 |

### 실험 게임 2차 물결

공통 경계, 실험실 진입, 표본 데이터, 공개 보류 근거는 [`experimental/README.md`](experimental/README.md)가 쥔다. 개별 규칙은 다음 문서가 쥔다.

| 키 | 게임 | 규격 문서 |
|---|---|---|
| `grid` | 교차 격자 | [`grid.md`](experimental/grid.md) |
| `groups` | 넷씩 넷 | [`groups.md`](experimental/groups.md) |
| `proximity` | 근접도 | [`proximity.md`](experimental/proximity.md) |
| `travel` | 경로 잇기 | [`travel.md`](experimental/travel.md) |
| `moreless` | 어느 쪽 | [`moreless.md`](experimental/moreless.md) |
| `topfive` | 상위 다섯 | [`topfive.md`](experimental/topfive.md) |
| `redact` | 가림 해제 | [`redact.md`](experimental/redact.md) |

실험 게임 문서는 공개 승격 여부와 무관하게 게임 문서끼리 찾을 수 있도록 `docs/games/experimental/`에 둔다. 구현 여부와 공개 여부를 한 단어인 “완료”로 합치지 않는다.

## 천도 문서 읽는 순서

1. 개발 작업이면 [`dev-guide.md`](suikoden/dev-guide.md)에서 작업 규칙과 지뢰밭을 먼저 읽는다.
2. [`10-implementation-status.md`](suikoden/10-implementation-status.md)에서 현재 코드 사실과 검증 한계를 확인한다.
3. 바꾸려는 영역의 01~09 설계 문서를 [`suikoden/README.md`](suikoden/README.md)에서 찾아 연다.
4. 설계와 코드가 다르면 10은 현재 사실, 01~09는 설계 의도로 취급한다.

`docs/games/suikoden/`의 파일별 설명은 그 디렉토리 README가 이미 쥐므로 여기서 다시 옮겨 적지 않는다.

## 공통 문서와 경계

| 문서 | 게임 작업에서 맡는 범위 |
|---|---|
| [`architecture.md`](../project/platform/architecture.md) | `/rest` 단일 페이지·앵커, `/lab`의 위치 같은 전체 라우팅 사실 |
| [`card-images.md`](card-images.md) | 쉼터 카드 이미지 발주 규격, 파일 경로, 적용 현황 |
| [`code-rules.md`](../project/platform/code-rules.md) | 앱 공통 UI·상호작용 규칙 |
| [`db-core.md`](../project/data/db-core.md), [`db-celeb.md`](../project/data/db-celeb.md) | 게임이 읽는 공통 데이터의 스키마 |
| [`i18n.md`](../project/platform/i18n.md) | 앱 공통 다국어 구조와 운영 원칙 |

사용자 대면 화면 문서 묶음은 게임을 다루지 않는다. 쉼터에서 시작하는 작업은 [`service/README.md`](../project/service/README.md)가 아니라 이 허브에서 시작한다.

## 문서 유지 규칙

- 게임 문서를 새로 만들거나 이름·경로를 바꾸면 이 허브의 링크와 분류를 함께 고친다.
- 공개 쉼터, 개발자 모드, 실험실 사이의 노출 상태가 바뀌면 상태 근거 문서를 먼저 갱신하고 이 허브의 날짜와 표를 뒤따라 고친다.
- 게임 규칙, 상수, 파일 수, 검증 수치를 이 허브에 복제하지 않는다. 각 게임 SSoT와 코드에 둔다.
- 실험 게임 공통 계약과 개별 규격은 `docs/games/experimental/`에 함께 둔다. 공개 상태는 폴더 위치가 아니라 공통 계약의 마감 결정 기록으로 판단한다.
- 문서에 없는 게임 내용을 조사하거나 추론해서 빈칸을 채우지 않는다. 문서가 없으면 이 허브에 “전용 문서 없음”이라고만 표시한다.
