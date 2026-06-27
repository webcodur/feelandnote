---
name: remo-text-clean
description: 에피소드 쇼츠/롱폼 JSON의 텍스트를 청정 톤으로 재작문한다. 의미·인과·분량은 유지하되 공격적·비속적·구어적·비아냥 표현을 중립·정갈한 어휘로 치환한다. imageChangeAt 앵커 텍스트도 동기화한다. "깨끗하게 해줘", "청정한 느낌", "순화해줘", "거친 표현 빼줘" 등으로 호출.
---

# 텍스트 청정 재작문

에피소드 JSON(쇼츠/롱폼, ko/en)의 텍스트를 정갈한 톤으로 재작문한다. 사료·인과·구조는 보존하고 표면 어휘만 손댄다.

## 실행 전 필수

실행 전 아래 문서를 Read tool로 읽는다:

- `docs/project/remotion/book-recommend/rules.md` — 불변 규칙
- `docs/project/remotion/book-recommend/writer/0-draft.md` — 필드별 작성 기준 (참고)
- `docs/project/remotion/book-recommend/writer/4-prose.md` — 문장 부드러움 기준 (존재 시 참고)

## 호출 시점

- 유저가 "청정하게/깨끗하게/정갈하게 해줘"
- "못된 표현/거친 표현/비속 빼줘"
- "톤 다운", "순화"
- "품격 있게 다시 써줘"

## 사전 확인 (객관식)

유저 의도가 모호하면 반드시 되묻는다:

1. **정도**
   - A) 거친 어휘만 치환 (단어 단위)
   - B) 전반 재작문 (문장 리듬까지 재조정)
2. **구성**
   - C) 세그먼트 순서·개수 유지, 텍스트만 수정
   - D) 필요하면 세그먼트 분할/병합/재배치까지
3. **타이밍 전제**
   - E) 길이 보존 (기존 `*.timing.json`·`imageChangeAt.t` 재사용)
   - F) 음성·타이밍 재생성 전제 (자유 재작문)

기본 선호가 없으면 B + C + F 조합을 제안한다.

## 표준 절차

### 1. 대상 파일 확인

쇼츠: `sw/remotion/public/episodes/live/<slug>/shorts/ko-<N>.json`
롱폼: `sw/remotion/public/episodes/live/<slug>/ko.json`

### 2. 백업 필수

`backups/` 폴더에 타임스탬프 백업 생성. 절대 건너뛰지 않는다.

```bash
TS=$(date +"%Y%m%d-%H%M%S")
cp <대상>.json <episode>/backups/<basename>.$TS.json
# timing 파일이 있으면 함께 백업
cp <대상>.timing.json <episode>/backups/<basename>.timing.$TS.json
```

### 3. 재작문

각 `segments[].text`(쇼츠) 또는 필드별 텍스트(롱폼)를 Edit tool로 수정한다.

**치환 원칙**
- 의미·인과·사료는 보존
- 분량은 ±10% 이내 유지 권장 (F 조합일 경우만 자유롭게)
- 존댓말 유지 (`~습니다` 체)
- celeb 발화의 인물 캐릭터는 유지하되 공격성만 제거

**교정 카테고리**
- **비속/공격**: 흉물, 숟가락 얹는다, 쳐낸다, 장사꾼, 질책/질타 → 중립 표현
- **비아냥/냉소**: 웬걸, 기대한 걸까요 → 담백한 서술
- **구어/게으른 표현**: 달라붙어, 매일같이, ~하죠, 되뇌인다 → 정갈 서술
- **과장**: 파격적인, 통 크게 → 담대한, 크게
- **대립적 관형구**: 누가 뭐라 하든, 넘보지 말고 → 세간의 말들과 무관하게, 내어줄 수 없으니
- **오타**: 맞춤법·조사 점검 (받아습니다 → 이끌어냈습니다 등)

**구체 치환 예시 (사전)**
| 이전 | 치환 후보 |
|---|---|
| 흉물 | 한 공사장 / 멈춰 선 현장 |
| 장사꾼 | 민간 사업가 / 상인 |
| 숟가락 얹는다 | 사익을 얹는다 / 편승한다 |
| 쳐낸다 | 돌려보낸다 / 거절한다 |
| 질책/질타 | 비판 / 지적 |
| 웬걸 | 결과는 그 반대였습니다 / 그러나 |
| 넘보지 말고 | 내어줄 수 없으니 |
| 파격적인 | 담대한 / 남다른 |
| 통 크게 | 크게 |
| 달라붙어 | 머물며 / 밀착해 |
| 누가 뭐라 하든 | 세간의 말들과 무관하게 |
| 못 한 일 | 마치지 못한 일 / 매듭짓지 못한 일 |

**금지**
- 사료·인명·연도·숫자 변경 금지
- 존재하지 않은 사실 추가 금지
- 도치/역어순 금지 (한국어 자연어순 유지)
- 문장 시작 연결어 누락 금지 (문단 첫 문장 예외)
- 같은 연결어 반복 금지

### 4. imageChangeAt 앵커 동기화

쇼츠 `book-context-*` 세그먼트의 `imageChangeAt[].text` 앵커는 재작문된 문장 속에 실제로 존재하는 문구여야 한다. 재작문 후 각 앵커가 본문에 그대로 남아 있는지 확인하고, 사라진 앵커는 인접 문구로 치환한다.

```bash
# 앵커 검증 스니펫
node -e "
const d = JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
for (const s of d.segments) {
  if (!s.imageChangeAt) continue;
  for (const a of s.imageChangeAt) {
    if (a.t === 0) continue; // 미사용 앵커
    if (!s.text.includes(a.text)) console.log('MISS', s.id, '|', a.text);
  }
}
" <파일>
```

### 5. JSON 유효성 검증

```bash
node -e "JSON.parse(require('fs').readFileSync('<파일>','utf8')); console.log('JSON OK')"
```

### 6. 후속 필요 사항 보고

텍스트 길이·어순이 바뀌면 다음이 어긋난다. 반드시 유저에게 명시 보고한다:

- `*.timing.json` (음성 세그먼트 타이밍) → `/remo-voice-sync` 필요
- `imageChangeAt[].t` (이미지 전환 시각) → 앵커 기반 자동 재동기화 필요 (`/remo-image-anchor-sync` 또는 수동)
- 음성 파일 자체 (`voice/`) → TTS 재생성 필요 (유저 승인 필수, 자동 실행 금지)

## en.json 병행 처리

ko를 수정한 경우 en.json 대응 텍스트도 동일 톤으로 수정하거나 `/remo-episode-translate`로 재번역 권장을 보고한다. 자동 재번역은 금지 (유저 승인 필수).

## 체크리스트 (보고 전)

- [ ] 백업 파일 생성 완료
- [ ] JSON.parse 통과
- [ ] 사료·숫자·인명 보존 확인
- [ ] imageChangeAt 앵커 본문 포함 여부 검증
- [ ] celeb 발화의 인물성 유지
- [ ] 한국어 자연어순·연결어 규칙 준수
- [ ] 후속 재생성 필요 항목(타이밍/음성/이미지앵커) 명시 보고
- [ ] en.json 처리 방침 명시
