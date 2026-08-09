# 개발 도구: X-Ray UI와 Explain Mode

## React/Next.js X-Ray UI

개발 환경에서 컴포넌트 경계와 소스 정보를 화면 위에 직접 표시하는 도구다.

- 개발 환경에서만 활성화한다.
- `Ctrl+Alt`를 누르는 동안 컴포넌트 경계를 오버레이한다.
- hover 시 강조하고 클릭 시 inspector 패널을 연다.
- 컴포넌트명·DOM 노드·소스 경로·크기·z-index·주요 props를 확인한다.
- React Portal로 띄운다.
- overlay가 pointer event와 레이아웃을 방해하지 않게 한다.
- X-Ray 자체 UI는 탐색 대상에서 제외한다.
- `Esc`로 종료한다.
- `data-xray-component`, `data-xray-source`로 대상을 식별한다.

스크린샷만 보고 컴포넌트 구조를 추측하는 시간을 줄이는 것이 목적이다.

## Explain Mode

외부 분석기가 앱을 추측하게 두는 대신, 앱이 자신의 기술 스택·컴포넌트·동작을 직접 설명하는 모드다. 공개 서비스에서는 소스 경로·props·내부 구조의 노출 범위를 제한해야 한다.

## 참고

- [KLIC-FrontScope](https://github.com/klic-co-kr/KLIC-FrontScope): 컴포넌트 탐색·인스펙터 아이디어
- [mattpocock/skills](https://github.com/mattpocock/skills): 대형 작업을 계획·분해하는 스킬 모음
