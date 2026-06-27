---
name: remo-shorts-slot-map
description: Remotion 쇼츠의 "슬롯 번호(S1, S2…) ↔ 책 ↔ 음성/렌더/유튜브" 매핑을 한 번에 진단한다. 쇼츠를 렌더·업로드하기 전에 "이 책이 몇 번으로 나가는지, 기존 업로드와 충돌·덮어쓰기 위험이 없는지"를 확인할 때 호출. "쇼츠 순서 체크", "슬롯 매핑", "렌더하면 몇 번으로 생기나", "업로드 번호 꼬이나", "S몇으로 들어가나" 등에 적용.
---

# 쇼츠 슬롯 매핑 진단

## 왜 필요한가 (핵심 원리)

쇼츠의 슬롯 번호는 **제작/발행 순서가 아니라 책 폴더 번호(01, 02…) 순서**로 자동 매겨진다.

- `shortsIndex` = `books/` 폴더를 번호순 정렬한 뒤 **shorts.{locale}.json을 가진 책들만** 1-based로 센 인덱스
- 렌더 출력: `out/{PascalCase}/{LANG}/S{shortsIndex}-VID.mp4`
- 음성 경로: `voice/{locale}/{gemini|elevenlabs}/shorts-{shortsIndex}/`
- 유튜브 기록: `scripts/youtube/youtube-lineup.json` 의 `{locale}-shorts-{shortsIndex}`

**함정**: 책 폴더 사이에 shorts 보유 책이 새로 끼면(예: 비어 있던 01번에 쇼츠를 새로 작성) **그 뒤 슬롯 번호가 전부 +1 밀린다.** 그러면 이미 렌더된 `out/SN`·업로드된 `youtube ko-shorts-N`이 가리키던 책과 어긋난다. `youtube-lineup.json`에는 videoId만 있고 "어느 책인지"가 없어서 눈으로는 알 수 없다.

## 실행

```bash
cd sw/remotion
node scripts/shorts-slot-map.mjs <episode> [locale]   # 예: node scripts/shorts-slot-map.mjs elon-musk ko
```

각 슬롯마다 다음을 한 줄로 보여준다:
- 슬롯 번호(S1…)와 책 폴더명
- `voice:gem/ele` 음성 폴더 존재, `out:O` 렌더 존재, `youtube:` videoId+업로드일
- **책 celeb 세그먼트 id + hook 앞부분** (그 책의 정체)
- **voice/shorts-N 음성 지문** (그 슬롯 음성 폴더 안의 세그먼트 id들 = 실제 녹음된 책의 정체)

## 해석 — 무엇을 보는가

1. **음성 지문 ↔ 책 celeb 대조 (가장 중요)**
   - 슬롯의 "책 celeb"과 "voice 음성 지문"의 celeb id가 **일치하면 정상**.
   - 어긋나면(예: 슬롯은 `국부론`인데 음성 지문에 `celeb-cantrell`=스페이스X) → **그 voice 폴더는 다른 책 음성**이다. 책 폴더 구성이 바뀌어 슬롯이 밀린 흔적. 그대로 렌더하면 엉뚱한 음성이 붙는다.

2. **업로드 충돌 위험**
   - 업로드된 쇼츠 수(`ko-shorts-1..N`)와, 그 슬롯들의 책이 업로드 당시와 같은지 확인.
   - 신규 책이 앞에 끼어 밀렸다면, 그 책을 렌더·업로드할 때 기존 `out/SN`·`youtube ko-shorts-N`을 덮어쓰고 기존 영상이 고아가 된다.

3. **잔재 음성**
   - 음성 지문에 현재 책 세그먼트에 없는 id(`explanation-1` 등)가 섞여 있으면 옛 구조 잔재. 정리 후보(삭제 전 사용자 확인).

## 충돌 발견 시 대응 (사용자 판단 필요 — 임의 실행 금지)

슬롯이 밀려 충돌이 확인되면 **렌더·업로드를 멈추고** 사용자에게 보고한 뒤 택일:
- (a) 책 폴더 번호를 재배치해 슬롯 순서를 의도대로 맞춘다 (SSoT는 폴더 번호). 단 기존 업로드 매핑도 함께 재정렬해야 한다.
- (b) `youtube-lineup.json`의 슬롯 기록을 실제 영상에 맞게 수동 교정한다.
- (c) BO UI 책 탭 드래그로 순서 변경 (voice 파일 자동 rename 동반).

어느 쪽이든 **기존 youtube videoId가 어느 책인지부터 사용자에게 확인**하고 진행한다. videoId만으로는 책을 알 수 없으므로 추측하지 않는다.

## 관련 코드 (사실 출처)

- 슬롯 매김: `sw/remotion/scripts/render/render-all.ts` (책 폴더 정렬 → shorts 배열 → `S${i+1}`)
- 컴포지션 id: `sw/remotion/src/Root.tsx`
- 유튜브 키: `sw/remotion/scripts/youtube/youtube-upload.ts` `variantKey()`
- 업로드 기록: `sw/remotion/scripts/youtube/youtube-lineup.json`
- 진단 스크립트: `sw/remotion/scripts/shorts-slot-map.mjs`
