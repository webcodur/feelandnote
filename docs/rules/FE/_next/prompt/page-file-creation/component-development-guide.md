
# Component Development Guide

이 문서는 프로젝트의 컴포넌트 구조 설계와 리팩토링을 위한 통합 가이드라인입니다.

---

## 1. 컴포넌트 구조 설계 (Vertical Structure)

### 기본 원칙
- 컴포넌트를 기능별로 중첩시켜 계층을 만든다.
- 상위 컴포넌트가 하위 컴포넌트를 포함한다.
- 각 레벨은 하위 레벨을 완전히 제어한다.
- 깊이는 기능의 복잡성에 따라 3~6레벨 사이로 유지한다.

### 구조 예시
```
orderManager/
├── OrderManager.tsx          # 최상위 관리자
├── useOrderOperations.ts     # 비즈니스 로직
├── orderFilters/             # 수평적 - 필터링 기능
│   ├── OrderFilters.tsx
│   ├── StatusFilter.tsx
│   └── DateFilter.tsx
├── orderList/                # 수직적 - 목록 표시
│   ├── OrderList.tsx
│   └── orderCard/            # 수직적 - 개별 항목
│       ├── OrderCard.tsx
│       └── orderDetails/     # 수직적 - 카드 상세
│           ├── OrderDetails.tsx
│           ├── ProductList.tsx
│           └── PaymentInfo.tsx
└── orderActions/             # 수평적 - 전역 액션들
    ├── OrderActions.tsx
    ├── BulkActions.tsx
    └── ExportButton.tsx
```

### 관계 정의
- **수직적 관계**: 기능의 포함 관계 (List → Card → Details).
- **수평적 관계**: 동일 레벨의 독립적 기능 (Filters, Actions). 상위 컴포넌트에서 조율됨.

---

## 2. 컴포넌트 리팩토링 원칙 (Clean Code)

가독성, 유지보수성, 일관성을 위해 다음 원칙을 준수한다.

### 데이터 중심 구조 (Data-Driven)
반복되는 UI 요소나 메뉴 항목은 JSX 내부에서 하드코딩하지 않고 상수를 활용한다.
- **방법**: `NAV_ITEMS`와 같은 상수 배열을 정의하고 `map`으로 렌더링.
- **장점**: 로직과 UI 분리, 항목 추가/삭제 용이.

### 로직 단순화 (Logic Simplification)
불필요한 중복 변수 선언을 피하고 간결한 표현식을 사용한다.
- **방법**: 여러 불리언 변수 대신 루프 내 조건문 활용.

### 명시적 인터페이스 (Explicit API)
고정된 구조를 가진 컴포넌트는 `children` 대신 명시적인 프로퍼티를 사용한다.
- **방법**: `icon: LucideIcon`, `label: string` 등의 prop 정의.
- **장점**: 사용처 코드가 간결해지고 컴포넌트 용도가 명확해짐.

### 스타일 및 상태 관리 통일
유사한 기능을 수행하는 요소(링크, 버튼 등)는 인터랙션 스타일을 일치시킨다.
- **방법**: 트랜지션, 호버 효과, 활성화 상태 디자인 시스템 통일.
