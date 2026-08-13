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

iTunes는 인증·키가 없는 공개 검색이고 Apple이 밝힌 제한은 약 분당 20회다. 호출은 단일
프로세스에서 순차 실행하되, 대량 검증은 Apple의 다중 ID lookup과 로컬 응답 캐시로 실제
호출 수부터 줄인다. 레거시 이전의 요청 간격·묶음 크기·냉각·재시도 값은 실행 코드만 SSoT로
삼는다. 403/429는 결과 없음이나 기각으로 바꾸지 않는다. `--auto`는 상태를 보존하고 냉각한 뒤
마지막 미완료 행부터 재개한다. 판정·응답 캐시는 `.codex/runtime`에만 두고 실패 결과용 DB
테이블은 만들지 않는다.

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

기존 `external_source='spotify'` 콘텐츠 이전은 신규 음악 조사와 별개다. 1차 넓은 검색이
끝난 뒤에는 `itunes-music-migrate.mjs`를 반복하지 않고 정밀 단계로 넘어간다.

```bash
pnpm --filter @feelandnote/web-bo music:spotify-classify
pnpm --filter @feelandnote/web-bo music:itunes-precision:auto
```

분류기는 백업의 원래 Spotify ID에서 트랙·앨범과 공식 제목·아티스트를 복원한다. 앨범은
수록곡 순서와 길이를 지문으로 저장한다. 정밀 실행기는 남은 Spotify 행뿐 아니라 앞서 iTunes로
바뀐 원본도 전수 재조회한다. 같은 제목의 다른 아티스트, 트랙으로 잘못 바뀐 앨범, 동명 클래식
녹음을 걸러 내고 고신뢰 후보만 반영한다. 애매한 후보는 상태 파일에 남기고 DB를 바꾸지 않는다.

정상인 기존 iTunes ID는 다중 lookup으로 검증해 `verified`로 끝내고 DB에 다시 쓰지 않는다.
검색으로 확정한 후보의 반영 직전 재조회도 트랙 ID와 앨범 ID를 각각 묶는다. 분류 상태는
`.codex/runtime/spotify-music-entity-state.json`, 정밀 스캔·반영 상태는
`.codex/runtime/itunes-music-precision-state.json`, 공개 Apple 응답 캐시는
`.codex/runtime/itunes-music-api-cache.jsonl`에 남는다. 이미 끝난 행과 같은 요청은 재사용하므로
중단 뒤 같은 명령으로 재개한다. 처리 시간은 행 수가 아니라 상태 파일의 API 요청 수, 냉각 횟수,
남은 미스캔 수로 판단한다. 현재 회차의 수치와 보류 사유는
`docs/todo/external-api-migration-2026-08-01.md`만 갱신한다.

Spotify 레거시가 0이 되기 전에는 플레이어의 Spotify 호환 분기와 백업을 지우지 않는다.

## 관련 문서

| 문서 | 내용 |
|------|------|
| `docs/project/platform/external-services.md` 「외부 콘텐츠 검색 API」 | Spotify 차단 경위·iTunes 메타 SSoT |
| `docs/project/celeb/celeb-2-content-collector.md` 「MUSIC - iTunes」 | 조사와 즉시 등록 절차 |
| `docs/todo/external-api-migration-2026-08-01.md` | Spotify 레거시 이전 현황 |
