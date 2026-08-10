---
name: verify-ui-in-browser
description: 실행 중인 웹 UI를 실제 브라우저로 열어 데스크톱·모바일 화면, 상호작용, 접근성 구조와 콘솔을 검수한다. 로컬 웹 테스트, 실화면 검수, 반응형·hover 확인, 스크린샷, 브라우저 연결 실패 진단 요청에 적용하며 browser-client뿐 아니라 Paseo와 Obscura 직접 도구까지 점검한다.
---

# 브라우저 UI 검수

코드 검사만으로 UI 작업을 완료 처리하지 말고 실제 렌더 화면을 확인한다.

## 연결 경로 판정

1. 사용자가 Chrome·Edge·앱 내 브라우저처럼 특정 브라우저를 지정했다면 해당 브라우저 스킬의 선택 규칙을 우선한다.
2. 특정 브라우저를 지정하지 않았다면 현재 도구 목록에서 다음 세 경로를 확인한다.
   - `browser-client`: 브라우저 플러그인이 제공하는 상위 선택 경로
   - `mcp__paseo__browser_*`: 탭 단위 브라우저 자동화
   - `mcp__obscura__browser_*`: 별도 브라우저 자동화
3. `browser-client`가 `No browser is available` 또는 빈 목록을 반환해도 브라우저 전체가 없다고 결론 내리지 않는다. Paseo와 Obscura 직접 도구가 호출 가능한지 반드시 확인한다.
4. 세 경로가 모두 호출 불가능할 때만 브라우저 검수 불가를 보고한다.

스킬 목록과 도구 목록을 혼동하지 않는다. MCP 도구는 별도 `SKILL.md` 없이 노출될 수 있으므로, 실제 가용 능력은 현재 호출 가능한 도구 목록으로 판단한다.

## Paseo 사용

1. `browser_list_tabs`로 열린 탭을 확인한다.
2. 대상 탭이 없으면 `browser_new_tab`으로 검수 URL을 연다.
3. 반환된 `browserId`를 이후 모든 호출에 재사용한다.
4. `browser_resize` 후 `browser_screenshot`으로 데스크톱과 모바일을 각각 확인한다.
5. `browser_snapshot`으로 접근 가능한 이름과 상호작용 요소를 확인한다.
6. 필요하면 `browser_hover`·`browser_click`·`browser_evaluate`·`browser_logs`로 상태 변화와 오류를 검증한다.
7. 직접 만든 탭만 `browser_close_tab`으로 닫는다. 사용자가 열어 둔 탭은 닫지 않는다.

## Obscura 사용

Paseo가 없거나 연결되지 않을 때 `browser_tab_list`를 확인하고 `browser_tab_new` 또는 `browser_navigate`로 대상 URL을 연다. 이어서 `browser_screenshot`, `browser_snapshot`, `browser_interactive_elements`, `browser_console_messages`를 사용한다. 클릭이나 입력 전에는 가능한 경우 요소 ref를 먼저 얻는다.

## 필수 검수

- 서버 응답만으로 실화면 성공을 선언하지 않는다.
- 기본 데스크톱 폭과 모바일 폭을 모두 확인한다. 별도 규격이 없으면 1280×900과 390×844를 기준으로 삼는다.
- 잘림, 넘침, 겹침, 고정 헤더·하단 내비 충돌, 폰트 대체, 대비를 직접 판단한다.
- hover·active는 색상 또는 계산 스타일 변화와 요소 크기 불변 여부를 함께 확인한다.
- 폼이나 내비게이션을 수정했다면 핵심 상호작용을 한 번 이상 실행한다.
- 콘솔 오류를 확인하고 작업과 관련된 오류를 구분해 보고한다.

## 보고

확인한 URL과 화면 폭, 발견 사항, 미검수 항목을 짧게 남긴다. 스크린샷 파일을 저장했다면 프로젝트 `AGENTS.md` 규칙에 따라 절대 경로를 보고한다.
