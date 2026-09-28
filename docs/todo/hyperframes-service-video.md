# HyperFrames로 서비스 홍보 영상

HyperFrames(HTML+GSAP → MP4)로 Feel&Note 홍보영상을 실제 렌더까지 검증한 뒤, 서비스 영상 제작 경로로 쓸 방법을 정리하는 과제다. 당장 진행하지 않는다.

## 실험 결과 (26.09.27)

- 작업 프로젝트: `C:\project\hyperframes-test\feelandnote-promo` (저장소 밖)
- 산출물: `renders\video.mp4` — 1920×1080 · 30fps · 29.5초 · h264+AAC · 8.1MB
- 구성: 훅 타이포 → 오늘의 인물(디자인 히어로) → 인물+3작품 증거 → 취향의 지도(9작품 컨스텔레이션) → 페이오프 문구 → 아웃트로
- 오디오: Mixkit BGM(Silent Descent) + Mixkit SFX 3종 + Edge TTS ko-KR-SunHiNeural 내레이션 6줄 + 보이스 카브
- 검증: lint·runtime·motion·contrast 0에러, WCAG AA 전량 통과, 렌더 885프레임 33초

## 얻은 판단

- **사이트 UI 캡처는 대표성이 없다.** 홈페이지 스크린샷을 그대로 쓴 초안은 사이트 완성도가 그대로 노출돼 폐기하고, 아바타·표지 같은 '콘텐츠 에셋'만 가져와 디자인 씬을 짰다. 이 방향이 서비스 영상의 정답에 가깝다.
- HyperFrames 강점: 번들러 없이 HTML 한 파일이 씬, `check`가 레이아웃·대비·런타임을 잡아줌, 오디오는 HTML 속성(`data-volume`·`data-automation`·카브)으로 선언.
- 약점: HeyGen CLI가 Windows 바이너리 없음(WSL 권장) → 카탈로그 BGM·공식 TTS 경로는 이 머신에서 막힘. Edge TTS+Mixkit으로 우회했으나 음성 품질은 서비스 공개용으론 재검토 필요.
- `sw/remotion` 에피소드 파이프라인(음성 sync·자막 chunk)을 대체할 이유는 없다. 용도는 **1회성 마케팅 영상**(랜딩 상단, Show GN·디스콰이엇 소개, 앱스토어 프리뷰)으로 한정하는 게 맞다.

## 착수 시 할 일

1. **소재 결정**: 영상의 주인공을 '오늘의 인물 1명'으로 할지(현재안), '여러 인물 몽타주'로 할지. 후자면 인물별 아바타+작품 커버를 DB에서 배치로 꺼내는 수집 스크립트가 필요하다.
2. **내레이션 품질**: Edge TTS는 무료지만 톤이 평범하다. 서비스 공개용이면 ElevenLabs/Gemini TTS(기존 에피소드 음성 계열)로 재생성을 검토. 스크립트는 `assets/audio/voice/`의 6줄을 기초로 다듬는다.
3. **BGM 라이선스**: Mixkit 라이선스는 상업적 사용 무료지만 배포 채널(유튜브 수익화 등)별로 조건을 다시 확인한다. 아니면 `sw/remotion/public/music/` 자체 음원으로 교체.
4. **비율 변형**: 16:9 외에 9:16 쇼츠·1:1 피드용 프레임 변형. HyperFrames는 `data-width/height`만 바꾸면 되지만 각 프레임의 절대 좌표 레이아웃을 재배치해야 한다.
5. **배포 채널별 엔드카드**: URL 표기(`feelandnote.com`)는 유지하고, 채널에 따라 CTA 문구를 가변화하는 규칙을 정한다.
6. 프로젝트를 저장소로 옮길지 결정 — 옮긴다면 `sw/hyperframes` 식으로 분리하고 Remotion 포트(3002·8001)와 충돌 없는 실행 규약을 정한다.

## 참고

- 나레이션 그룹과 BGM 카브 배선: `C:\project\hyperframes-test\feelandnote-promo\index.html` (`vo-*` 요소, `#bgm`의 `data-fx-carve`)
- 스토리보드·브리프: 같은 디렉터리의 `STORYBOARD.md`, `BRIEF.md`
