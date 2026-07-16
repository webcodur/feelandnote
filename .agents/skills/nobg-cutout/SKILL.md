---
name: nobg-cutout
description: 이미지 배경 제거(누끼)를 할 때 항상 적용한다. 전용 도구 C:\project\nobg 를 쓰고 직접 rembg 코드를 새로 짜지 않는다. "누끼 따줘", "배경 지워", "배경 제거", "인물만 남겨", "투명 배경으로", "nobg" 등에 호출. 셀럽 아바타·팩션 인물·카드 소재 등 대상 불문.
---

# 누끼(배경 제거)

**누끼는 `C:\project\nobg` 로 한다. rembg 호출 코드를 새로 짜지 마라.** 이미 만들어 둔 도구가 있다.

## 도구 두 가지

| 용도 | 도구 |
|------|------|
| 여러 장 일괄 | `C:\project\nobg\batch\batch_nobg.py rembg` |
| 한 장씩 손보기(브러시·객체 제거·페이드) | `C:\project\nobg\gui\nobg.pyw` (Tkinter GUI, 유저가 직접 씀) |

모델은 **birefnet-general** 고정이다. u2net보다 느리지만(장당 ~13초 대 ~1초) 머리카락 가닥을 살린다. u2net은 머리 윤곽을 뭉뚱그려 잘라 실사 인물에 부적합하다.

## 일괄 처리 절차

`batch_nobg.py rembg` 는 입력 폴더가 고정이다. 경로 인자를 받지 않는다.

```
입력:  C:\project\nobg\batch\batch_work\originals\*.webp   ← webp만 읽는다(png는 무시)
출력:  C:\project\nobg\batch\batch_work\nobg\<이름>_nobg.webp
```

1. 대상 이미지를 **webp로 변환해** `batch_work\originals\` 에 넣는다(png를 그대로 두면 조용히 0장 처리된다).
2. `cd C:\project\nobg\batch && py -3.12 batch_nobg.py rembg`
3. `batch_work\nobg\` 에서 결과를 회수한다.
4. **작업이 끝나면 `batch_work\originals`·`nobg` 를 비운다.** 다음 작업에 남은 파일이 섞인다(이미 있으면 스킵하므로 옛 결과가 그대로 나온다).

`download`·`all` 명령은 Supabase에서 셀럽 portrait을 받아오는 전용 흐름이다. 로컬 이미지를 처리할 땐 `rembg` 만 쓴다.

## 셀럽 아바타 파이프라인에서의 자리

```
개인샷 → crop-faces(얼굴 정사각) → codex 고해상도 재생성 → [여기서 누끼] → upload-celeb-image-from-wikimedia.ts
```

- 크롭 → 재생성 → 누끼 순서로 해도 된다. 재생성본은 인물 형태가 온전해 목 단면을 배경으로 오인하지 않는다.
- `crop-faces.ts` 에는 누끼 기능이 없다. 넣지 마라.
- 업로드 스크립트는 알파를 보존하므로 누끼 결과를 그대로 넘기면 된다.

## 함정

- **어두운 배경 화면에서는 누끼가 역효과일 수 있다.** 배경을 지우면 인물의 검은 갑옷·머리·그림자가 사이트 배경(`#0a0a0a`)에 묻혀 얼굴만 떠 보인다. 원본 배경이 있을 땐 대비가 살아 있었다. 누끼 결과는 **실제 배경색에 얹어 확인**하고, 밝은 배경에서만 검수해 통과시키지 마라.
- rembg 실행 시 CUDA dll 경고(`onnxruntime_providers_cuda.dll`)가 뜨지만 무해하다. CPU로 처리된다.
- 실패 시 조용히 원본을 흘려보내지 마라. 누끼된 줄 알고 등록된다.
