# 젠슨 황 — 쇼츠 이미지 발주서

## 납품 규격

- 총 10장, 전부 **서로 다른 생성 결과물**
- 화면비 **1:1 정사각형**
- 납품 경로: `cast/jensen-huang/01.png` ~ `10.png`
- 크롭·복원 작업 없음
- 9:16 크롭 검수 없음. 완성 이미지는 쇼츠 화면 중앙 중단 영역에 1:1로 노출한다.
- 텍스트·워터마크·실재 브랜드 로고 금지
- 모든 생성에서 아래 두 REF를 함께 투입한다.
  - 배경 REF: `_refs/background.png` — 저조도 대좌 시리즈의 재질·광원·색감 기준. 장면 자체를 복제하지 않는다.
  - 인물 REF: 장면의 연령대에 맞는 `_refs/jensen-10s.png`, `jensen-30s.png`, `jensen-60s.png`, `jensen-60s-full.png`
- REF는 정체성·톤 기준이며 완성 이미지로 돌려쓰지 않는다.

## 공통 스타일

```text
Use case: photorealistic-natural
Asset type: Discourse shorts square story still
Input images: Image 1 is the background mood and lighting reference; Image 2 is the Jensen Huang identity and age reference
Style/medium: photorealistic cinematic editorial photography, believable skin and fabric texture, restrained film grain
Composition/framing: exact 1:1 square, subject and main action readable near the center, no artificial 9:16 safe-area staging
Lighting/mood: low-key directional light, dark charcoal and warm practical light, subtle green accent only when natural
Constraints: preserve Jensen Huang's identity and requested age; one unique scene; no text; no watermark; no visible trademark or company logo
Avoid: glossy AI skin, duplicated people, extra fingers, staged stock-photo smiles, copying the reference room literally
```

## 컷별 발주

### 01 — 고통을 비는 연설

- 인물 REF: `jensen-60s-full.png`
- 연결: 발언 1, chunk 0
- 장면: 현재의 젠슨 황이 대학 강연 무대에 홀로 서 있다. 검은 가죽 재킷, 무선 마이크, 객석은 어둠 속 실루엣.
- 구도: 무대와 인물이 함께 보이는 미디엄 와이드. 정면보다 살짝 비스듬한 시점.
- 표정: 축하 연설과 어울리지 않을 만큼 진지하고 담담하다.

### 02 — 예상 밖의 한마디

- 인물 REF: `jensen-60s.png`
- 연결: 발언 1, chunk 1
- 장면: 같은 연설의 다른 순간. 얼굴과 손짓이 중심인 타이트 미디엄 클로즈업.
- 표정: 입가에 아주 옅은 장난기가 있지만 눈은 진지하다.
- 차별점: 01의 확대판이 아니라 카메라 위치·손동작·배경 조명이 다른 별도 사진.

### 03 — 아홉 살의 화장실 청소

- 인물 REF: `jensen-10s.png`
- 연결: 발언 2
- 장면: 1970년대 초 켄터키 기숙학교의 낡고 차가운 공동 화장실. 아홉 살의 대만계 소년 젠슨이 고무장갑과 솔을 들고 바닥을 청소한다.
- 구도: 소년의 작은 체구와 긴 세면대 줄이 함께 보이는 미디엄 와이드.
- 표정: 비참함을 과장하지 않고, 맡은 일을 끝내려는 집중.

### 04 — 데니스의 설거지

- 인물 REF: `jensen-10s.png`
- 연결: 발언 3, chunk 0
- 장면: 1970년대 미국 패밀리 레스토랑의 뜨거운 주방. 십 대 후반의 젠슨이 증기와 접시 더미 사이에서 빠르게 설거지한다.
- 구도: 젖은 손과 접시, 얼굴이 함께 보이는 역동적 미디엄 샷.
- 표정: 지쳤지만 속도를 늦추지 않는다.

### 05 — 커피잔을 가장 많이 나르는 웨이터

- 인물 REF: `jensen-10s.png`
- 연결: 발언 3, chunk 2
- 장면: 같은 시대 레스토랑 홀. 젠슨이 양손과 팔에 여러 개의 흰 커피잔을 능숙하게 쌓아 운반한다.
- 구도: 전신에 가까운 동작 중심. 손과 잔의 수가 자연스럽고 물리적으로 가능해야 한다.
- 표정: 처음으로 유머가 보이는 작은 자신감.

### 06 — 하찮은 일은 없다

- 인물 REF: `jensen-60s.png`
- 연결: 발언 4
- 장면: 현재의 젠슨이 어두운 빈 식당 부스에 앉아 카메라를 향해 말한다. 테이블 위에는 깨끗한 커피잔 하나만 있다.
- 구도: 대칭을 피한 미디엄 클로즈업, 손은 테이블 위에 편하게 놓인다.
- 표정: 과거를 자랑하지 않고 사실을 말하는 건조한 담담함.

### 07 — 실패한 칩

- 인물 REF: `jensen-30s.png`
- 연결: 발언 5, chunk 0
- 장면: 1990년대 초 작은 반도체 스타트업 연구실. 삼십 대 젠슨이 작동하지 않는 그래픽 보드와 오류가 뜬 CRT 모니터 앞에 서 있다.
- 구도: 보드·모니터·인물을 삼각형으로 배치한 미디엄 와이드.
- 표정: 충격보다 문제를 계산하는 엔지니어의 얼굴.

### 08 — 공개 실패 뒤의 빈 사무실

- 인물 REF: `jensen-30s.png`
- 연결: 발언 5, chunk 2
- 장면: 밤늦은 1990년대 사무실. 동료들은 떠났고 젠슨만 형광등 아래 앉아 실패한 제품 박스를 내려다본다.
- 구도: 넓은 빈 공간 속 작은 인물. 07과 다른 정적 장면.
- 표정: 굴욕과 두려움을 숨기지 않지만 무너지지는 않는다.

### 09 — 기대치를 낮추고 다시 시작

- 인물 REF: `jensen-60s.png`
- 연결: 발언 6
- 장면: 현재의 젠슨이 어두운 회의실에서 깨끗이 지운 화이트보드 앞에 서 있다. 바닥에 구겨진 실패 계획서 몇 장, 손에는 새 마커.
- 구도: 허리 위 미디엄 샷. 뒤의 빈 보드가 다시 시작할 여백을 만든다.
- 표정: 낙관이 아니라 다시 일할 준비가 된 얼굴.

### 10 — 인격은 고통에서 만들어진다

- 인물 REF: `jensen-60s-full.png`
- 연결: 발언 7
- 장면: 대좌 시리즈의 어두운 방 한가운데 젠슨이 홀로 서 있다. 뒤에는 지나온 시절을 암시하는 희미한 주방 증기와 연구실 불빛이 층처럼 겹친다.
- 구도: 무릎 위 전신, 정면을 응시하는 최종 인물 화보. 중앙 배치지만 지나치게 포스터처럼 꾸미지 않는다.
- 표정: 승리의 미소가 아니라 오래 버틴 사람의 평온.
