# 범용 참고자료

Feel&Note에서 일하며 얻었지만 **이 프로젝트 없이도 그대로 가져다 쓸 수 있는 지식**을 모은다. 저장소 경로·DB·인물·스크립트 이름 같은 프로젝트 고유 내용은 여기 쓰지 않는다. 이 저장소에 어떻게 배선돼 있는지는 `docs/project/` 문서가 쥐고, 그쪽에서 여기로 링크한다. 여기서 프로젝트 문서로 거꾸로 링크하지 않는다.

모델 ID·가격·플랜 한도처럼 바뀌는 값은 작성 시점 기준이다. 쓰기 전에 공식 문서나 `--help`로 다시 확인한다.

## 문서

파일명 `res-<NN>-<이름>.md`의 두 자리 번호는 묶음 주소다. 0x 에이전트 운용 · 1x 음성 · 2x 이미지 · 3x 외부 API · 9x 저장소·도구 목록.

| 주소 | 문서 | 내용 |
|---|---|---|
| 01 | [`res-01-agent-operations.md`](res-01-agent-operations.md) | 모델 역할 분담, 병렬화 한계, 장기 작업, 자동화 경계 |
| 02 | [`res-02-cli-agent-invocation.md`](res-02-cli-agent-invocation.md) | 한 에이전트가 다른 회사의 CLI 에이전트를 셸로 호출하는 법 — 호출 규격, 공통 함정 다섯, 완료 판정 |
| 03 | [`res-03-diagnose-edit-verify.md`](res-03-diagnose-edit-verify.md) | 진단-편집 분업 — 넓은 진단은 싼 모델, 작성·검수·반영은 역할을 나눠 맡긴다 |
| 04 | [`res-04-browser-chat-automation.md`](res-04-browser-chat-automation.md) | 로그인된 브라우저로 웹 채팅(구글 AI 모드·ChatGPT)을 부리는 기법, 막히는 경로, 약관 위험 |
| 11 | [`res-11-voice-pipeline.md`](res-11-voice-pipeline.md) | 음성 합성·전사·정렬·자막 청크 파이프라인 범용 구현 명세 |
| 12 | [`res-12-voice-clone-engines.md`](res-12-voice-clone-engines.md) | 음성 복제 TTS 엔진 비교와 한 번에 끝내는 채택 시험 |
| 21 | [`res-21-image-generator-physics.md`](res-21-image-generator-physics.md) | 이미지 생성기가 잘 그리는 것과 못 그리는 것의 구조적 이유, 추상 개념의 사물화, 프롬프트 골격 |
| 31 | [`res-31-openai-usage.md`](res-31-openai-usage.md) | OpenAI 이미지·텍스트 API의 모델·비용·옵션 선택 기준 |
| 90 | [`res-90-shared-repositories.md`](res-90-shared-repositories.md) | AI 문체·문서 변환·에이전트 품질·브라우저 작업공간·조사 자동화 저장소와 주제별 작업 원칙 |

## 텍스트 메모

| 파일 | 내용 |
|---|---|
| `작품소개 예시.txt` | 작품 소개문 문체 견본 |

`.gitignore`가 로컬 전용으로 막아 둔 메모(`내 할 일.txt`·`보이스 에디터.txt`·`프롬프트_*.txt`)는 커밋하지 않는다.
