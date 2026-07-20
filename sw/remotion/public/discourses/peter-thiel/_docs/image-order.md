# 피터 틸 — 쇼츠 이미지 발주서

## 납품 규격

- 총 14장, 전부 **서로 다른 생성 작업에서 나온 고유 결과물**
- 쇼츠 편성: 1부 `경쟁` 8장, 2부 `비밀과 미래` 6장
- 화면비 **1:1 정사각형**
- 납품 경로: `cast/peter-thiel/01.png` ~ `14.png`
- 크롭·복원 작업 없음
- 9:16 크롭 검수 없음. 정사각형 완성 이미지를 쇼츠 화면 중앙 중단 영역에 그대로 노출한다.
- 완성 이미지 돌려쓰기 금지. 같은 결과물을 파일명만 바꿔 저장하는 것도 금지.
- 텍스트·워터마크·실재 브랜드 로고 금지.
- 모든 생성에 배경 REF와 인물 REF를 함께 투입한다.
  - 배경 REF: `_refs/background.png`
  - 얼굴 REF: `_refs/peter-thiel-face.png`
  - 현재 인물의 체형·착석 분위기 보조 REF: `_refs/peter-thiel-seated.png`
- REF는 정체성과 시리즈 톤의 기준일 뿐, 완성 장면으로 납품하거나 그대로 복제하지 않는다.

## 공통 스타일

```text
Use case: photorealistic-natural
Asset type: Discourse shorts square story still
Input images: the dark background image is the series mood and lighting reference; the Peter Thiel images are identity references
Style/medium: photorealistic cinematic editorial photography, believable skin, hair, fabric, glass and metal, restrained film grain
Composition/framing: exact 1:1 square, main subject and action readable near the center, no artificial 9:16 safe-area staging
Lighting/mood: low-key directional light, charcoal and cold steel-blue shadows, sparse warm practical lights
Constraints: preserve Peter Thiel's recognizable identity and requested age; one unique scene per generation; no text; no watermark; no visible trademark or company logo
Avoid: glossy AI skin, heroic propaganda posing, duplicated people, extra fingers, fake lettering, copying a prior finished image
```

## 컷별 발주

### 01 — 아무도 동의하지 않는 진실

- 연결: 발언 1
- 현재의 피터 틸이 어두운 인터뷰실의 긴 테이블 끝에 홀로 앉아 카메라를 본다.
- 타이트한 미디엄 클로즈업. 손끝을 맞댄 채 답을 요구하는 정적.
- 표정은 도발적 미소가 아니라 상대가 실제로 생각하기를 기다리는 무표정.

### 02 — 같은 답을 쓰는 교실

- 연결: 발언 2, chunk 0
- 1980년대 미국 대학 강의실. 이십 대 초반의 피터 틸이 같은 답안지를 쓰는 학생들 사이에서 혼자 펜을 멈춘다.
- 높은 곳에서 내려다본 사선 구도. 반복되는 책상과 같은 자세가 모방을 보이게 한다.
- 젊은 틸의 얼굴은 현재 REF를 자연스럽게 젊게 해석한다.

### 03 — 같은 문으로 몰리는 사람들

- 연결: 발언 2, chunk 2
- 정장 차림의 젊은 구직자들이 하나의 밝은 회전문으로 몰려간다. 삼십 대 초반의 틸만 흐름 옆에 멈춰 다른 어두운 복도를 본다.
- 인파와 반대 방향을 보는 인물이 함께 읽히는 미디엄 와이드.

### 04 — 하나의 말을 두고 싸우는 체스 기사들

- 연결: 발언 3
- 어두운 체스 대회장. 젊은 틸과 다른 선수가 판 위의 같은 핵심 말을 두고 팽팽하게 마주한다.
- 얼굴보다 두 시선과 하나의 체스 말이 삼각형을 이루는 구도.
- 실제 폭력 없이 모방 욕망과 충돌을 시각화한다.

### 05 — 군중과 반대로 걷기

- 연결: 발언 4
- 현재의 틸이 동일한 회색 정장을 입은 창업자 군중과 반대 방향으로 천천히 걷는다.
- 군중은 약한 모션 블러, 틸은 선명하다. 도시 횡단보도나 상표는 피한다.

### 06 — 피 흘리는 붉은 시장

- 연결: 발언 5, chunk 0
- 여러 경영진이 작은 붉은 시장 지도 하나를 차지하려 서로 자료를 당긴다. 틸은 테이블 끝에서 그들을 관찰한다.
- 과장된 판타지가 아니라 냉정한 전략 회의 사진처럼 보이게 한다.

### 07 — 서로 닮아버린 회사들

- 연결: 발언 5, chunk 3
- 끝없이 반복되는 똑같은 사무실 부스, 똑같은 제품 상자, 똑같은 회의. 현재 틸이 복도 중앙에 작게 서 있다.
- 06의 회의 장면과 다른 건축적 대칭 이미지.

### 08 — 아무도 없는 시장

- 연결: 발언 6
- 현재 틸이 텅 빈 짙은 청색 전략실에서 아직 아무 표시도 없는 넓은 지도를 펼친다.
- 잠긴 문이나 왕좌가 아니라, 아무도 풀지 않은 문제 앞에 혼자 선 상태로 독점을 표현한다.

### 09 — 숨겨진 설계도

- 연결: 발언 7
- 오래된 산업 연구소의 아카이브. 틸이 먼지 쌓인 서랍에서 빛이 새는 미완성 설계도를 꺼낸다.
- 보물 판타지가 아니라 실제 기술 문서를 발견한 듯한 절제된 놀라움.

### 10 — 어렵지만 가능한 문제

- 연결: 발언 8
- 거대한 칠판 가득 복잡한 도식과 실패 흔적이 있고, 현재 틸이 지워지지 않은 단 하나의 경로를 따라간다.
- 글자는 읽히지 않는 추상 도형만 사용한다. 수학적 집중과 긴 시간을 보여준다.

### 11 — 1에서 n과 0에서 1

- 연결: 발언 9
- 화면 왼쪽에는 동일한 물건이 생산라인을 따라 수없이 복제되고, 오른쪽에는 한 엔지니어가 처음 보는 단 하나의 시제품을 켠다. 틸이 경계에서 오른쪽을 본다.
- 한 장 안에서 복제와 창조가 명확히 대비되되 숫자나 글자는 넣지 않는다.

### 12 — 비트와 원자의 속도 차이

- 연결: 발언 10
- 왼쪽은 빛나는 서버와 디지털 화면이 빠르게 돌아가고, 오른쪽은 멈춘 항공우주 격납고와 낡은 물리 실험 장비가 어둠 속에 남아 있다.
- 틸이 두 공간 사이의 문턱에 선다. 디지털 쪽만 과도하게 미래적으로 만들지 않는다.

### 13 — 포트폴리오가 아니라 계획

- 연결: 발언 11
- 투자 회의실. 다른 사람들 앞에는 수십 장의 얇은 투자 카드가 흩어져 있고, 틸 앞에는 하나의 두꺼운 장기 설계도만 펼쳐져 있다.
- 틸은 카메라가 아니라 설계도를 본다. 확신을 허세가 아닌 책임으로 표현한다.

### 14 — 열려 있는 미래

- 연결: 발언 12
- 현재 틸이 아직 완성되지 않은 실제 산업 도시의 높은 공사 플랫폼에 선다. 멀리 에너지 시설, 연구소, 발사체 격납고가 공사 중이다.
- 석양 영웅화 대신 새벽 전의 차가운 빛. 완성된 유토피아가 아니라 누군가 만들어야 할 미래.
- 마지막 인물 화보지만 승리 포즈나 미소는 없다.
