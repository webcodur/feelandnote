# 전체지도 거점 클릭 → 정보창 진입

## Context

현재 방랑 모드에서 지구본의 거점을 클릭하면 대륙 이동만 트리거된다. 도시별 전용 노래/배경 등 고유 특성을 부여할 예정이므로, 어떤 phase든 거점 클릭 시 해당 거점의 정보창으로 진입해야 한다.

## 변경 파일

### 1. `WorldMapView.tsx` — 클릭 핸들러 변경

현재 wandering phase에서 territory 클릭 → `onSelectRegion(t.regionId)` 호출.

변경: **territory 클릭은 항상 `onSelectTerritory(hit)`을 호출.** wandering에서 비거점 영역 클릭만 `onSelectRegion` 유지.

```
handleClick:
  if (hit) {
    onSelectTerritory(hit)  // 양쪽 phase 모두 동일
    return
  }
  // 비거점 영역 클릭 → wandering일 때만 onSelectRegion
  if (phase === 'wandering' && onSelectRegion) { ... }
```

### 2. `WanderingScreen.tsx` — 거점 정보 패널 추가

- `viewingTerritoryId` 상태 추가
- `onSelectTerritory` 핸들러: 해당 territory 선택 + 지구본 포커스
- 거점 선택 시 정보 패널 표시 (소유 세력, 인구, 민심, 건물 등)
- 닫기 버튼으로 패널 dismiss
- 기존 `onSelectRegion`은 비거점 영역 클릭 시에만 동작 (이동 확인)

### 3. `StrategyScreen.tsx` — 변경 없음

이미 `handleSelectTerritory`가 모든 거점(아군/적/무주지) 정보를 보여주고 있다.

## 검증

- 방랑 중 거점 클릭 → 거점 정보 패널 표시
- 방랑 중 비거점 영역 클릭 → 기존대로 대륙 이동 확인
- 전략 중 거점 클릭 → 기존대로 정상 동작
- `npx tsc --noEmit` 타입 에러 없음
