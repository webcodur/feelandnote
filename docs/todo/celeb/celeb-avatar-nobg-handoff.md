# 셀럽 아바타 nobg 인수인계

## 마지막 완료 기준

- 마지막 nobg 업로드 완료: `2026-08-05T03:00:24.149Z`
- 한국 시각: `2026-08-05 12:00:24.149 KST`
- 마지막 처리 인물: `wild-bill-hickok`
- 이번 증분 처리: 19명
- 완료 상태: R2 재업로드, `celebs.avatar_url` 갱신, 800×800 RGBA WebP 원격 재검증, 임시 이미지 삭제 완료
- 최종 R2 `LastModified` 검사: 위 완료 기준 이후 미처리 아바타 0개

이번에 처리한 slug:

`amartya-sen`, `beeple`, `eugene-de-beauharnais`, `hiroshi-fujiwara`, `j.-paul-getty`, `jalal-ad-din-mangburni`, `james-jebbia`, `jennifer-doudna`, `kim-philby`, `marcus-samuel`, `martin-lorentzon`, `mikhail-kutuzov`, `phil-knight`, `robert-mercer`, `roger-scruton`, `shawn-stussy`, `stephane-bancel`, `steve-jurvetson`, `wild-bill-hickok`

## 다음 작업

다음에는 전량을 다시 받지 않는다. 위 마지막 완료 시점 이후 생성·교체된 인물 이미지만 찾아 nobg 처리한다.

1. DB `celebs`에서 `avatar_url`이 있는 행을 조회한다.
2. `celebs.updated_at`이 위 완료 시점보다 최신인 행을 1차 후보로 잡는다. URL 캐시 버스터 `?v=<밀리초 시각>`도 함께 대조한다.
3. 동일 R2 키를 직접 덮어써 `?v=`가 바뀌지 않은 경우를 잡기 위해 R2 `celebs/*/avatar.webp`의 `LastModified`가 위 완료 시점보다 최신인 객체도 조회한다.
4. DB 후보와 R2 후보의 합집합만 다운로드해 배경을 검사한다. 전체 아바타 다운로드는 하지 않는다.
5. 알파 채널이 없거나 가장자리 불투명 비율이 높은 이미지를 nobg 후보로 잡는다. 모자·긴 머리·어깨가 프레임 가장자리를 채우는 인물은 오탐할 수 있으므로 밝은색 또는 체크무늬 배경 합성으로 육안 확인한다.
6. 배경 제거는 반드시 `C:\project\nobg\batch\batch_nobg.py rembg`를 한 프로세스로 실행한다. 작업 전에 고정 입력·출력 폴더의 기존 파일을 확인하고 타 작업 파일을 삭제하지 않는다.
7. 결과는 `sw/web-bo/scripts/upload-celeb-avatar.ts`로 업로드한다. 기존 인물과 구도를 유지하는 배경 전용 변환임을 `source-note`에 기록하고 외부 신원 근거를 넣는다.
8. 업로드 직후 R2 파일을 다시 받아 HTTP 200, 800×800, WebP, 알파 채널을 검증한 뒤 해당 로컬 원본과 중간본을 삭제한다.
9. 전체 후보 처리 후 R2 `LastModified`를 다시 조회해 미처리 최신 객체가 0개인지 확인한다.
10. 검증이 끝난 시각으로 이 문서의 마지막 완료 기준을 갱신한다.

## 주의

- `sw/web-bo/scripts/avatar-nobg-cursor.json`의 `lastChecked`는 slug 순서용이라, 커서보다 앞쪽 slug에 새 이미지가 등록되면 놓칠 수 있다. 신규·수정분 탐지는 이 문서의 시각 기준을 사용한다.
- R2 조회 비용보다 네트워크 전송과 이미지 디코딩 시간이 핵심이다. 증분 후보만 받으면 보통 수초 안에 탐지가 끝난다.
- `wild-bill-hickok`처럼 큰 모자가 가장자리를 덮으면 가장자리 불투명 비율이 50%를 넘어도 배경이 제거된 정상 이미지일 수 있다. 기계 판정만으로 재처리하지 않는다.
