# Shorts 배경 이미지 생성 명세

## 용도

YouTube Shorts(9:16) 영상의 **중단 텍스트 영역 배경**으로 사용된다.
CSS 필터 `brightness(0.18) saturate(0.5)` + radial gradient 오버레이가 적용되므로, 극도로 어둡고 탈색된 상태로 표시된다.
텍스트(금색 #c8a46e / 아이보리 #e8e0d0) 위에 깔리는 분위기 텍스처 역할.

## 기술 사양

| 항목 | 값 |
|------|-----|
| **해상도** | 1024×1536 px (2:3 세로형) |
| **포맷** | PNG |
| **표시 영역** | 약 800×1132 px (`object-fit: cover`) |
| **밝기** | 18%로 극감 — **밝은 부분과 어두운 부분의 대비가 강해야** 살아남음 |
| **채도** | 50%로 감소 — **따뜻한 톤(앰버/세피아/금색 계열)** 기본 |

## 스타일 가이드

### 필수
- **얼굴/피부 노출 금지** — 18% 밝기에서 유령처럼 보임. 뒷모습 실루엣은 허용

- **강한 명암 대비** — 하이라이트(촛불, 빛줄기, 달빛 등)와 깊은 그림자
- **심플한 구도** — 디테일보다 분위기. 사물 2~3개 이하
- **다크 톤 기본** — 전체적으로 어두운 장면, 밝은 배경(하늘, 바다 등) 피할 것

### 권장
- 촛불/횃불/램프 등 **점 광원 하나** → 18%에서도 하이라이트가 살아남음
- **오브제 중심** — 책, 도구, 상징물 등 사물 클로즈업
- **질감** — 오래된 나무, 돌, 금속, 양피지, 가죽 등 촉각적 텍스처

### 금지
- 만화/일러스트/판타지 스타일 (리얼리스틱 사진 품질만)
- 밝은 하늘, 낮 풍경, 파스텔 톤
- 복잡한 군중 장면, 전투 장면
- AI 생성 티가 나는 과도한 디테일/광택

---

## 에피소드별 프롬프트

### 1. abraham-lincoln
**셀럽:** 에이브러햄 링컨 / 미국 제16대 대통령
**추천서:** 성경, 천로역정, 로빈슨 크루소

> A worn leather-bound Bible resting on a rough-hewn log cabin desk, illuminated by a single candle. A quill pen and inkwell beside it. Deep shadows, warm amber light. The cabin wall is bare dark wood. Photorealistic, dark moody atmosphere.

### 2. alexander-the-great
**셀럽:** 알렉산더 대왕 / 마케도니아 왕
**쇼츠 주제:** 일리아스 (호메로스) — 아킬레우스의 전장, 알렉산더가 가장 아낀 책
**키워드:** 트로이 전쟁, 전투 직후의 벌판, 아킬레우스의 창과 투구, 석양/황혼

> A lone Greek warrior standing on a vast ancient battlefield at dusk after combat, seen from behind in full silhouette. He holds a spear loosely at his side, wearing a Corinthian helmet pushed back. Scattered shields and broken weapons across the scorched plain. A dramatic orange-amber sunset bleeds through dust and smoke on the horizon. Wide open plain, epic and desolate. Cinematic atmosphere. No text.

### 3. dario-amodei
**셀럽:** 다리오 아모데이 / Anthropic CEO (Claude AI 창시자)
**추천서:** 원자 폭탄 만들기, 8월의 포성, 개소리에 대하여

> A stack of hardcover books on a dark walnut desk, one open face-down. A modern desk lamp casts a sharp cone of warm light. Faint circuit-board pattern etched into the desk surface. Minimalist, intellectual atmosphere. Dark background. No people, no screens.

### 4. elon-musk
**셀럽:** 일론 머스크 / 테슬라·SpaceX 창업자
**쇼츠 주제:** 파운데이션 (아이작 아시모프) — 은하 제국 멸망 예측, 인류 지식 보존 조직, SpaceX 창립의 근간
**키워드:** 은하 제국, 심리역사학, 은하 변방의 파운데이션, 문명의 백업, 다행성 종

> A dim control room with a holographic star map of a crumbling galactic empire glowing faintly above a worn metal desk. Scattered on the desk: rolled blueprint scrolls and a small glowing orb representing a distant colony planet. Deep space visible through a narrow viewport — faint nebulae and dying stars. Moody low-key lighting, muted gold and deep blue tones. Industrial sci-fi atmosphere. No people, no text.

### 5. elon-musk-2
**셀럽:** 일론 머스크 / 테슬라·SpaceX 창업자 (에피소드 2)
**추천서:** (elon-musk ep2 — 다른 도서 세트)

> Close-up of a rocket engine nozzle cross-section blueprint on aged paper, pinned to a dark cork board. A brass compass and mechanical pencil rest on the blueprint. Dramatic side-lighting from the left. Dark, engineering aesthetic. No people.

### 6. jensen-huang
**셀럽:** 젠슨 황 / 엔비디아 창업자
**추천서:** 이상한 나라의 앨리스, 스노 크래시, 혁신기업의 딜레마

> A single GPU chip placed on an open vintage book, reflecting amber light. A magnifying glass rests beside it. Dark leather desk surface, shallow depth of field. Warm tungsten lighting from above. Tech-meets-classic-literature mood. No people.

### 7. jim-carrey
**셀럽:** 짐 캐리 / 배우·코미디언
**추천서:** 위대한 개츠비, 파운틴헤드, 지금 이 순간을 살아라

> A theatrical mask (comedy/tragedy) resting on a stack of vintage books. A single spotlight from above creates dramatic shadows. Velvet curtain fabric visible in the dark background. Rich deep reds and golds. Stage atmosphere. No people.

### 8. leonardo-da-vinci
**셀럽:** 레오나르도 다빈치 / 르네상스의 거인
**추천서:** 신곡, 변신 이야기, 이솝 우화

> A leather-bound sketchbook open to a page with faint anatomical drawings, beside a set of Renaissance-era brass drawing instruments. A candle drips wax onto a stone surface. Warm chiaroscuro lighting. Workshop atmosphere. No people, no readable text.

### 9. marcus-aurelius
**셀럽:** 마르쿠스 아우렐리우스 / 철인 황제
**추천서:** 에픽테토스 강의, 국가(플라톤), 일리아스

> A marble bust pedestal (empty, no head) beside a papyrus scroll and a small bronze oil lamp, in a dark stone chamber. A shaft of moonlight from a narrow window illuminates the scroll. Roman architectural detail in shadow. Stoic, contemplative mood. No people.

### 10. mark-zuckerberg
**셀럽:** 마크 주커버그 / 메타 창업자
**추천서:** 아이네이스, 권력의 종말, 우리 본성의 선한 천사

> A modern minimalist desk with a single hardcover book, a pair of reading glasses, and a small succulent plant. Clean lines, matte surfaces. A strip of warm LED light along the desk edge. Dark concrete wall background. Silicon Valley intellectual aesthetic. No people, no screens.

### 11. napoleon-bonaparte
**셀럽:** 나폴레옹 보나파르트 / 프랑스 황제
**추천서:** 플루타르코스 영웅전, 일리아스, 군주론

> A leather-bound copy of a book on a campaign field desk, with a brass telescope and a folded map. A single candle in a brass holder. Dark tent canvas background. Military command post atmosphere. Warm amber and deep shadow. No people.

### 12. yi-sun-sin
**셀럽:** 이순신 / 충무공
**추천서:** 손자병법, 오자병법, 삼국지연의

> A bamboo scroll (병법서) partially unrolled on a dark wooden desk, beside a Korean traditional brush pen and ink stone (벼루). A single candle lantern provides warm light. Dark wooden wall with a faint grid pattern. Joseon-era military study atmosphere. No people, no ships.

---

## 파일 네이밍

```
{slug}.png
```

| # | slug | 비고 |
|---|------|------|
| 1 | abraham-lincoln | |
| 2 | alexander-the-great | |
| 3 | dario-amodei | |
| 4 | elon-musk | |
| 5 | elon-musk-2 | ep2 |
| 6 | jensen-huang | |
| 7 | jim-carrey | |
| 8 | leonardo-da-vinci | 신규 추가 |
| 9 | marcus-aurelius | |
| 10 | mark-zuckerberg | |
| 11 | napoleon-bonaparte | 신규 추가 |
| 12 | yi-sun-sin | |

## 저장 경로

```
sw/remotion/public/images/shorts/{slug}.png
```

## 검증 방법

생성 후 아래 CSS 시뮬레이션으로 확인:
```css
filter: brightness(0.18) saturate(0.5);
```
→ 18% 밝기에서도 구도와 분위기가 살아있어야 한다.
