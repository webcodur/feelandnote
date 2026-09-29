# Remotion 영상 남은 작업

시리즈 규격은 [`docs/project/remotion/`](../project/remotion/README.md)가 쥔다. 렌더·음성·업로드는 사용자가 명시적으로 시킬 때만 실행한다.

## 서재 탐방 — DB 관계·표지 동기화

[콘텐츠 ID·표지 동기화](../project/remotion/book-recommend/br-06-db-sync.md)의 26.07.29 전수 점검에서 남은 것이다. 표지 문제가 아니라 **감상 관계의 출처 검증·등록 문제**이므로 Remotion 원고를 근거로 DB를 백필하지 않는다. 웹에서 팩트체크한 뒤 `celeb_contents.source_url`과 KO·EN 감상배경까지 등록하고 `/book-recommend` 작업대로 연결한다.

26.09.29 DB 재대조로 일론 머스크–반지의 제왕, 짐 캐리–`As You Wish`는 관계가 등록돼 빠졌다. 에피소드 JSON의 ID 연결은 `/book-recommend` 작업대에서 다시 동기화한다.

- [ ] 전역 콘텐츠는 있으나 인물 관계가 없음(26.09.29 확인) — 이사도라 덩컨–종의 기원·플루타르코스 영웅전, 마리 퀴리–파우스트·과학과 가설·쿠오바디스(전역 콘텐츠가 새로 생김), 세종(`sejong-the-great`)–논어, 제갈량–관자
- [ ] 전역 콘텐츠부터 없음 — 마리 퀴리–판 타데우시, 피터 틸–낭만적 거짓과 소설적 진실

- [ ] `content_locales.thumbnail_url`이 빈 판본(26.09.29 확인) — 피터 틸–주권적 개인·거대한 환상 KO, 이순신–전등신화 EN(`New Tales Told by Lamplight`). 젠슨 황–포지셔닝 EN은 표지가 채워져 빠졌다. 제프리 힌턴–The Organization of Behavior KO, 피터 틸–데카당스 사회 KO, 샘 올트먼–딜러스 오브 라이트닝 KO는 한국어 제목이 달라 대조하지 못했고, 해당 편이 작업 폴더에 걸려 있지 않다(보관소 `D:\remotion-assets\episodes`). `pnpm --filter remotion assets stage episodes <편>` 뒤 `book.ko.json`의 `contentId`로 본다.

## 카드뉴스

[카드뉴스 규격](../project/remotion/book-recommend/br-60-card-news.md) 기준.

- [ ] 비율별 레이아웃 — 1:1·9:16에서 책 많은 shelf·긴 context 넘침 점검
- [ ] PNG 출고 배치(`render:cards`) 마무리와 전 인물 일괄 출고·채널 업로드
- [ ] 카드 텍스트 미세편집 — 자동 발췌가 어색할 때 BO에서 `faction-cards.json` overrides로 보정
- [ ] X용 단독 카드(캐러셀 아닌 인용 1장)

## 가상 담화

- [ ] (선택) 음성 CLI — `voice:discourse`·align·transcribe·srt·youtube·durations-pull·reorder. [DB 단일원천](../project/remotion/discourse/discourse-01-db-integration.md) 「음성 길이 소유권」을 따른다.
