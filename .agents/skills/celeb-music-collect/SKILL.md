---
name: celeb-music-collect
description: 음악 콘텐츠를 iTunes로 확인해 contents·content_locales·celeb_contents에 즉시 등록한다. "음악 조사", "음악 등록", "아이튠즈 등록" 등에 호출.
---

# 음악 조사·등록

셀럽이 언급한 음악은 **찾은 작업에서 바로 iTunes 메타를 확인하고 최종 등록한다.**

## 현행 원칙

1. 제목·아티스트·직접 감상 근거와 `source_url`을 확보한다.
2. iTunes에서 정확한 트랙을 찾는다.
3. 제목·아티스트가 맞고 `previewUrl`이 있는 트랙만 채택한다.
4. `contents` → KO/EN `content_locales` → `celeb_contents`를 같은 작업에서 등록한다.
   `review`와 `review_en`도 이때 함께 쓴다.
5. 재조회해 iTunes ID·미리듣기·두 locale·인물 연결·감상배경·출처를 확인한다.

## 등록 조건

- `contents.type='MUSIC'`
- `contents.external_source='itunes'`
- `contents.external_id='itunes-{trackId}'`
- `contents.metadata.previewUrl` 필수
- `content_locales`의 KO·EN 두 행과 `sources.primary='itunes'`
- `celeb_contents.status='FINISHED'`, `visibility='public'`
- `celeb_contents.review`·`review_en`과 `source_url` 필수
- 같은 iTunes 곡이 이미 있으면 `contents`를 재사용하고 인물 연결만 추가

## 속도 제한 처리

iTunes는 인증·키가 없는 공개 검색이라 IP 제한이 있다. 호출은 전역 순차로 하고 최소
2초 간격을 둔다. 403/429는 결과 없음이나 기각으로 바꾸지 말고 즉시 오류로 드러낸다.
403/429가 나면 해당 곡을 등록하지 않고 작업을 실패 상태로 유지한 뒤, 호출 간격을 두고
같은 인물 작업을 재개한다. 실패한 결과를 별도 후보 테이블에 적치하지 않는다.

## 밟으면 터지는 곳

### 미리듣기 없는 곡을 등록하지 않는다

재생기는 `metadata.previewUrl`을 사용한다. 이 값 없이 iTunes ID만 넣으면 재생 버튼이
죽는다. 과거 80곡을 그렇게 등록했다가 되돌린 이력이 있으므로 이 판정을 풀지 않는다.

### 차단을 검색 실패로 저장하지 않는다

403/429를 빈 결과로 삼키면 정상 곡을 검색 실패로 오판한다. 차단 시 등록하지 않고
실행을 실패시켜야 한다.

### 다국어 아티스트 표기를 함께 판정한다

iTunes가 `저스틴 비버`를 `Justin Bieber`처럼 돌려줄 수 있다. 괄호 안 원어명과
제목·검색 순위를 함께 대조하고, 단순 문자열 불일치만으로 기각하지 않는다.

## Spotify 레거시 이전

기존 `external_source='spotify'` 콘텐츠 이전은 같은 스크립트의 기본 모드가 맡는다.
이는 신규 음악 조사와 별개다.

```bash
cd sw/web-bo && node scripts/itunes-music-migrate.mjs --limit 200
```

Spotify 레거시가 0이 되기 전에는 플레이어의 Spotify 호환 분기와 백업을 지우지 않는다.

## 관련 문서

| 문서 | 내용 |
|------|------|
| `docs/project/platform/external-services.md` 「외부 콘텐츠 검색 API」 | Spotify 차단 경위·iTunes 메타 SSoT |
| `docs/project/celeb/celeb-2-content-collector.md` 「MUSIC - iTunes」 | 조사와 즉시 등록 절차 |
| `docs/todo/external-api-migration-2026-08-01.md` | Spotify 레거시 이전 현황 |
