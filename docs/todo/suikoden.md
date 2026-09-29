# 천도 남은 작업

현재 코드 사실은 [`10-implementation-status.md`](../games/suikoden/10-implementation-status.md), 작업 규칙은 [`dev-guide.md`](../games/suikoden/dev-guide.md)가 쥔다. 핵심 완주 흐름은 코드상 연결됐지만 아래 검증 전에는 배포 가능으로 표시하지 않는다.

## 검증

- [ ] 브라우저 실제 완주 — 한국어·영어·모바일에서 시나리오 선택부터 통일·패망·제한 턴까지.
- [ ] 실 DB 고정 인물 — 시나리오 5종의 필수 UUID가 전부 활성 조회되는지.
- [ ] 전체 `tsc`·`pnpm build:web` 통과 확인(26.07.30에는 천도 밖 파일의 없는 JSON import로 중단됐다).

## 정합성

- [ ] 거점 배경 3장(`new_york`·`tenochtitlan`·`sydney`)을 추가한다. 세 거점은 `constants.ts`에 `imageUrl`이 없고 `territories/`에 파일도 없다(26.09.29 확인). 지역 배경 2장(`americas`·`oceania`)·효과음도 없다.
- [ ] 죽은 코드 처리 방침 — 미사용 전술 상수(`TACTIC_MATCHUP`·`TACTIC_INFO`·`CLASS_TACTIC_BONUS`), 미호출 `previewWorld`·`initGame`.

## 확장 (우선순위순)

1. **이벤트 팝업** — 계절 이벤트가 로그에만 남는다. 화면 중앙 팝업과 확인 버튼, 세력별 영토·자원·병력 비교표.
2. **인사·경영** — 학당 학습(`academy`의 `special: 'discover'` 처리로 intellect·virtue 성장), 병영의 인구→병력 징병(민심 −5), 민심 폭동(0–19) 시 건물 파괴·인재 이탈 이벤트.
3. **승리 조건** — 문화 승리(극장·사원 영향력 전체 60% 이상), 외교 승리(2/3 이상 세력과 동맹).
4. **장비·저장** — 비용 상수(`EQUIPMENT_COST`) 정의 후 무기고 구매 UI, `ships` 수상전 보정, 수동 저장·여러 슬롯·서버 동기화 필요 여부 판단.
5. **외교** — 이간(두 AI 세력 관계 악화) 커맨드.
