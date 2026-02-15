# 천도 에셋 디렉터리

이 디렉터리에 에셋 파일을 넣으면 게임에서 자동으로 인식하여 사용한다.
에셋이 없어도 게임은 CSS 폴백으로 정상 동작한다.

## 디렉터리 구조

```
assets/suikoden/
├── portraits/                    # 캐릭터 초상화 (64×64px, PNG)
│   ├── {uuid}.png               # 개별 캐릭터 (DB profiles.id)
│   ├── general_m_light.png      # 템플릿: {병과}_{성별}_{피부톤}
│   ├── general_m_medium.png
│   ├── general_m_dark.png
│   ├── general_f_light.png
│   └── ... (6병과 × 2성별 × 3피부톤 = 36장)
│
├── tiles/                        # 지형 타일 (32×32px, PNG)
│   ├── plain.png
│   ├── forest.png
│   ├── mountain.png
│   ├── river.png
│   ├── desert.png
│   ├── snow.png
│   ├── coast.png
│   ├── sea.png
│   ├── wall.png
│   ├── gate.png
│   ├── town.png
│   └── road.png
│
├── buildings/                    # 건물 (32×48px, PNG)
│   ├── farm.png
│   ├── market.png
│   └── ...
│
├── effects/                      # 이펙트 스프라이트 시트
│   ├── slash.png
│   └── ...
│
└── audio/                        # 오디오
    ├── bgm/
    │   ├── title.mp3
    │   ├── strategy_calm.mp3
    │   ├── battle_normal.mp3
    │   └── ...
    └── se/
        ├── sword.mp3
        ├── arrow.mp3
        └── ...
```

## 병과 코드

| 코드 | 한국어 |
|------|--------|
| general | 장수 |
| strategist | 책사 |
| artisan | 장인 |
| official | 관료 |
| artist | 예인 |
| ranger | 유격 |

## 성별/피부톤

- 성별: m (남), f (여)
- 피부톤: light, medium, dark

## 스타일 가이드

- 픽셀 아트 (도트) 스타일 권장
- 16색 팔레트 권장
- image-rendering: pixelated 적용됨
