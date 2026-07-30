# 쉼터 게임 카드 상징 이미지 발주서

> **최종 실측 체크: 26.07.30** — 카드 자산 5장과 `/rest` 등록 코드를 대조했다. 기억궁·시대의 초상·유랑은 구현만 보존하고 공개 진입을 주석 처리했다. 현재 허브에는 배경 자산이 연결된 게임 4종만 노출된다.

쉼터(`/rest`) 허브용 게임 카드 상징 이미지 5장을 관리한다. 현재 공개 카드가 사용하는 자산은 4장이고, `memory-card.webp`는 비공개 게임 구현이 보존한다.

## 1. 목적과 표시 방식

각 게임에 들어가면 로비 캔버스로 펼쳐지는 광경을 **카드에서 미리 맛보게** 한다. 이미 구현된 캔버스 연출이 원본이며, 이미지는 그 광경의 정지 회화판이다.

- **표시 위치**: `HubCard`(`sw/web/src/components/shared/HubCard.tsx`) 내부 배경 레이어
- **표시 방식**: 어둡게 깔고 그 위에 기존 아이콘·제목·설명 텍스트가 올라간다. (초안은 블러도 걸었으나 지금은 걷었다 — §6 참조)
- **따라서 디테일보다 구도·실루엣·색조가 전부다.** 카드가 작고 왼쪽 절반이 어둡게 덮이므로 남는 것은 큰 덩어리의 형태와 빛뿐이다. 잔글씨·작은 장식·복잡한 패턴은 뭉개져 노이즈만 된다.

## 2. 공통 규칙 (5장 전부)

**반드시 지킬 것**

- 각 게임 로비 캔버스의 **색조와 구도를 그대로 계승**한다. 새 세계관을 창작하지 않는다. 아래 게임별 항목의 "원본 캔버스" 기술이 사실 기준이다.
- 화면 **가운데에서 왼쪽 60%**에 시선이 걸리는 주 형상을 두고, **오른쪽 40%는 비교적 비운다**. 카드 위 텍스트가 그쪽에 얹힌다.
- 명암 대비를 강하게. 블러가 걸리면 중간 톤은 전부 회색 죽으로 뭉개진다. **어두운 바탕 + 한 점의 강한 광원** 구조를 유지한다.
- 광원 색은 게임별 지정색을 따르되, 서비스 기준 금색(`#d4af37`) 계열과 충돌하지 않게 한다.
- 회화적 디지털 일러스트. 사진 실사 아님.

**금지**

- 인물·얼굴·사람 형체 (멀리 있는 실루엣 1개만 예외적으로 허용 — 천도 항목 참조)
- 글자·숫자·로고·워터마크 일체
- UI 요소, 프레임, 테두리 장식
- 지나친 디테일(벽돌 한 장 한 장, 나뭇잎 하나하나), 어지러운 패턴
- 현대 문물(전선, 차량, 간판 등)

## 3. 게임별 발주

### 3-1. 여명 (DAWN) — 역사의 서광

**원본 캔버스**: 지평선 위로 막 떠오르는 태양. 하늘이 위에서부터 남색(`#070b1e`) → 보라(`#2d1540`) → 붉은 자주(`#6b2a38`) → 주황(`#b8622a`) → 황금(`#d4962a`) → 옅은 노랑(`#ffe066`)으로 이어진다. 위쪽에는 아직 별이 남아 있고, 태양에서 지면으로 긴 빛줄기가 부챗살처럼 뻗는다.

**게임 내용**: 인물들의 탄생 순서를 맞추는 연대기 게임.

**프롬프트**

```
A vast dawn horizon painted as a digital illustration. The sun has just broken the horizon line slightly left of center, a small brilliant white-gold core bleeding warm light outward. The sky is a smooth vertical gradient: deep navy blue (#070b1e) at the top, through violet (#2d1540) and dark crimson (#6b2a38), into burnt orange (#b8622a), then golden amber (#d4962a), ending in pale yellow (#ffe066) at the horizon. Faint stars still linger in the upper navy band. Long fan-shaped rays of light stretch from the sun across a dark, featureless plain toward the viewer. The right 40 percent of the frame is calm open sky with no detail. No people, no buildings, no text. Cinematic, minimal, high contrast, painterly.
```

**핵심**: 세로 그라디언트의 층이 또렷해야 한다. 블러 후에도 "밤에서 새벽으로 넘어가는 띠"가 읽혀야 한다.

### 3-2. 미궁 (LABYRINTH) — 은둔한 현자 찾기

**원본 캔버스**: 1점 투시로 끝없이 뻗는 석조 회랑. 좌우로 사각 기둥이 열 지어 서고, 기둥 사이 벽에 작은 횃불이 드문드문 걸려 주황빛(`rgba(255,170,60)`)을 뿌린다. 바닥은 석판이 소실점으로 수렴하며 횃불빛을 옅게 반사한다. 전체가 거의 검정(`#0a0a0c`)이고 소실점 안쪽은 완전한 암흑이다.

**게임 내용**: 현자 6인의 행적을 살펴 은둔한 인물을 찾아내는 탐문 게임.

**프롬프트**

```
An endless stone corridor in strict one-point perspective, painted as a digital illustration. Square stone pillars line both sides, receding toward a vanishing point slightly left of center that dissolves into absolute darkness. Small torches mounted between the pillars cast pools of warm orange light (rgba 255,170,60) on the columns, fading rapidly into near-black (#0a0a0c). The flagstone floor converges toward the vanishing point, faintly reflecting the torchlight. Heavy darkness dominates; only the torch pools and the floor sheen are lit. Cold gray stone against warm orange flame. No people, no text, no ornament. Oppressive, mysterious, cinematic, high contrast.
```

**핵심**: 어둠이 주인공이다. 밝기를 올리고 싶은 유혹을 참는다. 블러 후 "빛 웅덩이가 점점이 소실점으로 빨려드는 형태"만 남으면 성공이다.

### 3-3. 패권 (HEGEMONY) — 강한 자가 지배한다

**원본 캔버스**: 남색 밤하늘(`#020617` → `#1e293b`)에 별이 흩뿌려진 우주. 화면 아래 중앙에서 검은 산봉우리가 날카롭게 솟고, 그 정상에 황금빛(`#D97706`/`#F59E0B`/`#FCD34D`) 신전이 홀로 빛난다. 신전 주변으로 금빛 후광(`rgba(255,215,0,0.07)`)이 번지고, 산 아래쪽은 옅은 구름 덩어리에 잠겨 있다.

**게임 내용**: 인물 카드로 군령을 내려 상대와 격돌하는 전략 대전.

**프롬프트**

```
A lone golden temple crowning a sharp black mountain peak, painted as a digital illustration. The night sky is a deep gradient from near-black navy (#020617) at the top into slate blue (#1e293b), scattered with small stars. The mountain silhouette rises from the bottom center-left as a pure black wedge; at its summit a small classical marble temple glows in amber and gold (#D97706, #F59E0B, #FCD34D), its columns catching warm light, surrounded by a soft golden bloom (rgba 255,215,0). Pale cloud banks pool around the mountain's base in soft translucent masses. The right side of the sky stays open and quiet. No people, no text. Mythic, remote, cinematic, high contrast.
```

**핵심**: "도달할 수 없는 높은 곳의 단 하나의 빛" 구조. 신전은 작게, 산은 새까맣게.

### 3-4. 천도 (CHEONDO) — 뜻이 있는 자, 천하를 얻으리라

**원본 캔버스**: 안개 낀 청회색(`#5f7a86` → `#2f3f4a`) 수묵 풍경. 겹겹의 산등성이가 옅어지며 멀어지고, 오른쪽 위에 흐린 태양이 떠 빛줄기를 던진다. 기러기 몇 마리가 가로지른다. 아래쪽은 청록빛 호수이고 물 위에 작은 정자가, 왼편에는 삿갓 쓴 어부의 나룻배가 떠 있다. 화면 하단은 갈대숲이 실루엣으로 촘촘하다.

**게임 내용**: 역사 속 인물들을 이끌고 세력을 키워 문명을 통일하는 전략 시뮬레이션.

**프롬프트**

```
A misty East Asian ink-wash lakescape, painted as a digital illustration. Layered mountain ridges recede into blue-gray haze, from #5f7a86 in the distance to #2f3f4a nearer, each ridge flatter and paler than the last. A hazy sun sits in the upper right, casting thin pale rays across the mist; a few wild geese cross beneath it in silhouette. Below, a still teal lake holds a small wooden pavilion on stilts near the center, and at the left a tiny fishing boat with a single distant figure in a straw hat, rendered only as a dark silhouette. Tall reed grasses rise as dark silhouettes along the bottom edge. Muted blue-green and slate palette, soft atmospheric depth. No text. Serene, contemplative, painterly.
```

**핵심**: 유일하게 사람 실루엣이 허용된다. 단 얼굴이 없는 먹點 수준의 어부 하나뿐이다. 나머지 게임은 인물 금지를 그대로 지킨다.

### 3-5. 시대의 초상 (PORTRAITS IN TIME) — 가려진 얼굴

**원본 캔버스**: 숯빛 석재와 낡은 황동으로 지은 어두운 기록 회랑. 뒷면만 보이는 직사각형 초상 카드가 황동 레일에 줄지어 걸리고 소실점을 향해 멀어진다. 같은 두 장에 빛이 들던 기존 기억궁 그림을 그대로 사용한다.

**게임 내용**: 흐릿한 초상이 3초마다 선명해지는 동안 네 이름 중 인물을 빠르게 맞히는 1인용 게임.

**프롬프트**

```
A vast dark archival gallery in strict perspective, built from charcoal stone and aged brass. Rows of rectangular portrait cards hang from thin brass rails and recede toward a shadowed vanishing point. Every card is turned face-down, showing only refined embossed concentric-line patterns like a memory maze. Near the left-center, exactly two matching face-down cards catch the same narrow warm-gold rim light, visually suggesting a pair without showing their fronts. The floor is dark polished stone with restrained, physically plausible reflections. Painterly cinematic game key art, mostly near-black with aged brass, muted gold and a subtle cold blue ambient fill. Keep the rightmost 35 percent calmer and darker. No people, no visible faces, no readable writing, no letters, no numbers, no logos, no watermark, no UI panels, no playing-card suits.
```

**핵심**: 실제 얼굴을 카드 배경에 합성하지 않는다. 가려진 초상이 늘어선 회랑은 게임 안에서 한 사람의 얼굴이 서서히 드러나는 경험을 미리 암시한다.

### 3-6. 유랑 (WANDER) — 빼앗긴 고향으로

**원본 캔버스**: 거의 검정(`#121212`)인 바탕에 `#0a0a0a` → `#1a1a1b` 그라디언트. 위쪽 1/3에 금색 가로 실선이 지나고, 왼쪽 위에 나침반, 오른쪽 아래에 집이 큰 윤곽으로 놓인다. 그 사이를 점선 경로와 지도 핀 두 개가 잇는다(`WanderBackground.tsx`).

**게임 내용**: 시대를 건너 인물들과 힘을 모아 빼앗긴 고향을 되찾는 여정.

**프롬프트**

```
An abandoned stone gateway arch stands in the left foreground as a heavy dark silhouette, framing the view. Through and beyond it, a road runs away across empty ground toward a distant gate town glowing on the horizon. Broken paving stones scatter near the arch base.

The scene is night and almost entirely dark. A single warm gold light source (#d4af37) marks a distant walled hometown, small and far away, sitting left of center on the horizon. A pale dirt road leads toward it. Thin mist pools in the low ground. The sky is a deep vertical gradient from near-black (#0a0a0a) at the top into cold slate blue near the horizon, with a few faint stars. The right 40 percent of the frame stays empty and quiet with no detail, only open sky.

Painterly cinematic digital illustration, not photorealistic. Strong contrast between the near-black land and the one warm light. Muted palette: black, slate blue, and a single warm gold accent.

Strictly forbidden: people, human figures, faces, text, letters, numbers, logos, watermarks, UI panels, frames, borders, modern objects (wires, vehicles, signs).

Output size: exactly 2048 x 1024 pixels (2:1 landscape).
```

**핵심**: 폐허 아치를 지나 멀리 고향 불빛 하나를 바라보는 구조. 아치가 왼쪽을 채우고 그 너머 지평선이 오른쪽으로 열려, 카드에서 왼쪽이 그라디언트로 덮여도 형태가 읽힌다.

## 4. 규격과 납품

| 항목 | 값 |
|------|-----|
| 비율 | 2:1 (가로) |
| 해상도 | 1536×768 이상 |
| 형식 | 원본 PNG → 최종 WebP 변환 |
| 파일명 | `dawn-card.webp`, `labyrinth-card.webp`, `hegemony-card.webp`, `suikoden-card.webp`, `memory-card.webp`, `wander-card.webp` |
| 경로 | `sw/web/public/images/games/` (신규 폴더) |
| 용량 | 장당 150KB 이하 목표 (블러가 걸리므로 화질 손실 무해) |

`memory-card.webp`는 기억궁용으로 납품된 파일명을 바꾸거나 복제하지 않고 시대의 초상 카드와 전체화면 배경에서 재사용한다. 비공개 기억궁 코드도 같은 경로를 참조하므로 파일은 유지한다.

기존 인게임 배경(`public/images/backgrounds/{게임}-1-{pc|mb}.webp`)과는 **별개 자산**이다. 그쪽은 게임 플레이 중 배경이고, 이번 건은 카드용이다. 같은 폴더에 섞지 않는다.

## 5. 진행 방식

1. 게임당 3장씩 뽑는다. 같은 프롬프트로 3장이 아니라, **광원 위치·산등성이 각도·소실점 위치를 조금씩 달리한** 3안을 뽑아 비교한다.
2. 선별은 **카드에 실제로 얹은 상태**로 본다. 현재는 블러를 걷었으므로(§6) 선명한 그림 위에 왼쪽 그라디언트를 덮은 화면이 판정 기준이다. 그림만 따로 예쁜지가 아니라 글씨가 얹힌 상태에서 읽히는지를 본다.
3. 5장이 나란히 놓였을 때 **한 세트로 보이는지** 확인한다. 톤은 각기 다르되 어둠의 깊이와 빛의 세기가 비슷해야 카드 5장이 형제로 읽힌다.
4. 이미지 생성은 비용이 발생하므로 **사용자 승인 후** 실행한다.

## 6. 적용 현황 (26.07.15 납품 → 26.07.31 유랑 납품·개발자 모드 노출)

6장 모두 납품·연결 완료. 파일은 `sw/web/public/images/games/`에 `dawn-card.webp`(24KB)·`labyrinth-card.webp`(64KB)·`hegemony-card.webp`(47KB)·`suikoden-card.webp`(77KB)·`memory-card.webp`(147KB)·`wander-card.webp`(18KB)로 있다.

- **유랑 카드 납품(26.07.31)**: §3-6 프롬프트로 3안(평원 길·능선 조망·폐허 아치)을 뽑아 카드에 얹은 상태로 비교하고 폐허 아치안을 채택했다. 1536×768 WebP 18KB. 평균 밝기 17.7로 기억궁(16.3)·미궁(24.5)과 같은 대역이라 여섯 장이 한 세트로 읽힌다.
- **세 게임 개발자 모드 노출(26.07.31)**: 유랑·기억궁·시대의 초상은 `dev: true`로 표시되어 로컬 개발 서버나 `?dev=1`에서만 카드가 뜬다. 카드 라벨에 `· 개발 중`이 붙고, 미공개 게임 자료는 개발자 모드일 때만 조회한다.
- **시대의 초상 카드**: `memory-card.webp`를 카드와 전체화면 배경에 재사용한다(파일을 복제하지 않는다).
- **연결 지점**: `HubCard`(`sw/web/src/components/shared/HubCard.tsx`)에 `backgroundImage` prop 추가 → `RestGameGrid`(`sw/web/src/components/features/rest/RestGameGrid.tsx`)의 `GAME_SECTIONS[].image`가 게임별 경로를 넘긴다.
- **표시 처리(현행값)**: `next/image` `fill` + `object-cover`, `opacity-90`. 그 위에 왼쪽만 짙은 가로 그라디언트 `from-bg-main/95 via-bg-main/60 to-transparent`.
- **블러는 걸지 않는다(변경됨)**: 초기 적용은 `blur-[3px]` + `opacity-70`이었으나 카드 개편에서 블러를 걷고 그림을 선명하게 두는 쪽으로 바뀌었다. **따라서 §1의 "블러 후 남는 큰 덩어리만 생각하라"는 전제는 지금 화면과 다르다.** 다만 §2의 발주 규칙(강한 명암 대비, 왼쪽 60%에 주 형상, 오른쪽 40% 비우기)은 그라디언트가 왼쪽을 덮는 구조 때문에 그대로 유효하다. 새로 뽑을 때는 선명한 상태로 선별한다.
- **가독성 원칙**: 본문·제목이 얹히는 **왼쪽은 짙게, 오른쪽은 그림이 살도록** 덮는다. 처음에 `opacity-35` + 좌우 균일하게 짙은 막으로 적용했더니 그림이 사실상 실종됐다 — 상징 이미지를 다는 목적이 사라진다. 지금 값이 "글씨 안 묻히고 광경은 읽히는" 균형점이다.
- **호버(현행)**: 테두리 금색 강조·제목 금색 전환은 `transition` 없이 즉시. 배경 이미지는 곁들이는 연출로 분류되어 `group-hover:scale-105`가 `duration-700`으로 천천히 확대된다 (`docs/project/code-rules.md` 상호작용 절 — 즉각 반응축과 연출축의 구분).
