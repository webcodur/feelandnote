# ChatGPT 웹 사용량 활용 테스트

웹·앱 ChatGPT의 일반 채팅 사용량을 활용해 현재 쓰는 Codex·ChatGPT Work의 사용량을 아낄 수 있는지 확인한다.

우선 대상은 [miuuyy/codex-chatgpt-web](https://github.com/miuuyy/codex-chatgpt-web)이다.
Codex의 작업 문맥과 로컬 도구를 유지하면서 답변 생성을 ChatGPT 웹으로 보내는 구현이다.
공개 코드와 문서는 조사했으며, 설치·계정 연결·실제 사용량 비교는 아직 하지 않았다.

- [ ] Windows에서 `ChatGPT Web` 모델로 짧은 응답 생성과 파일 읽기·편집이 이어지는지 테스트한다.
- [ ] 다른 Codex·Work 작업이 없는 상태에서 테스트 전후 계정 사용량을 비교한다. 브리지의 토큰 추정치를 실제 계정 차감량으로 취급하지 않는다.
- [ ] 자동 승인 심사와 일반 Codex 모델을 쓰는 자식 작업에서 기존 사용량이 소모되는지 확인한다. 답변 생성이 웹으로 갔다는 이유만으로 전체 소비가 0이라고 판단하지 않는다.
- [ ] 긴 작업의 문맥 압축 실패·웹 활동 제한·재시도가 절약 효과와 실사용을 방해하는지 확인한다.

기존 사용량 의존과 웹 제한은 [문제 해결 문서](https://github.com/miuuyy/codex-chatgpt-web/blob/main/TROUBLESHOOTING.md),
문맥 압축 실패는 [이슈 #321](https://github.com/miuuyy/codex-chatgpt-web/issues/321)를 재확인한다.

텍스트 작업만 별도로 넘기는 대안은 [yukkcat/chatgpt2api](https://github.com/yukkcat/chatgpt2api)다.
조사·초안·번역·검토용 후보이며, 일반 로컬 도구 호출에는 제약이 있다.
