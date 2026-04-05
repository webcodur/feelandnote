# 출품 전 최종 점검

에피소드 렌더·업로드 직전에 실행하는 품질 게이트. 롱폼·쇼츠·한영 전체를 대상으로 한다.

---

## 점검 순서

| # | 영역 | 중요도 | 소요 |
|---|------|--------|------|
| 1 | 한영 구조 정합성 | CRITICAL | 자동 |
| 2 | 텍스트 오류 | CRITICAL | 수동+자동 |
| 3 | 이미지 파일 존재 | CRITICAL | 자동 |
| 4 | 음성 파일 완성도 | HIGH | 자동 |
| 5 | TTS 오버라이드 | HIGH | 수동 |
| 6 | 윤리 규칙 준수 | HIGH | 수동 |
| 7 | 콘텐츠 품질 | MODERATE | 수동 |

---

## 1. 한영 구조 정합성

en.json은 ko.json에서 파생된다. 번역 과정에서 필드 누락·순서 뒤바뀜이 빈번하게 발생한다.

### 자동 점검 스크립트

에피소드 디렉토리에서 실행:

```python
import json, sys

with open('ko.json', 'r', encoding='utf-8') as f: ko = json.load(f)
with open('en.json', 'r', encoding='utf-8') as f: en = json.load(f)

errors = []

# 1-1. books 수 일치
if len(ko['books']) != len(en['books']):
    errors.append(f"book count: ko={len(ko['books'])}, en={len(en['books'])}")

# 1-2. 각 book의 images 배열 일치 (file명 기준)
for i, (k, e) in enumerate(zip(ko['books'], en['books'])):
    ko_imgs = [img['file'] for img in k.get('images', [])]
    en_imgs = [img['file'] for img in e.get('images', [])]
    if ko_imgs != en_imgs:
        errors.append(f"Book {i} ({k['title']}) images MISMATCH:\n  ko: {ko_imgs}\n  en: {en_imgs}")

# 1-3. directQuote / contextAfter 필드 존재 여부 일치
for i, (k, e) in enumerate(zip(ko['books'], en['books'])):
    for field in ['directQuote', 'contextAfter']:
        ko_has = field in k
        en_has = field in e
        if ko_has != en_has:
            errors.append(f"Book {i} ({k['title']}) field '{field}': ko={ko_has}, en={en_has}")

# 1-4. shorts segments id/role 일치
ko_segs = [(s['id'], s['role']) for s in ko['shorts']['segments']]
en_segs = [(s['id'], s['role']) for s in en['shorts']['segments']]
if ko_segs != en_segs:
    errors.append(f"shorts segments MISMATCH:\n  ko: {ko_segs}\n  en: {en_segs}")

# 1-5. narrator/host 필드 키 일치
for section in ['narrator', 'host']:
    ko_keys = set(ko[section].keys())
    en_keys = set(en[section].keys())
    if ko_keys != en_keys:
        errors.append(f"{section} keys differ: ko-only={ko_keys-en_keys}, en-only={en_keys-ko_keys}")

# 1-6. shorts imageChangeAt 존재 여부 일치
for i, (ks, es) in enumerate(zip(ko['shorts']['segments'], en['shorts']['segments'])):
    ko_ic = 'imageChangeAt' in ks
    en_ic = 'imageChangeAt' in es
    if ko_ic != en_ic:
        errors.append(f"shorts segment '{ks['id']}' imageChangeAt: ko={ko_ic}, en={en_ic}")

if errors:
    print(f"FAIL — {len(errors)} issue(s):")
    for e in errors: print(f"  ❌ {e}")
    sys.exit(1)
else:
    print("PASS — ko/en 구조 정합")
```

### 대표 실패 패턴

| 패턴 | 원인 | 증상 |
|------|------|------|
| **이미지 순환 오류** | 번역 시 book 순서 밀림 | en book N에 book N+2의 이미지가 할당됨 |
| **필드 누락/초과** | 번역 중 directQuote·contextAfter 복사 실수 | ko에 없는 필드가 en에 존재하거나 그 반대 |
| **중복 인용문** | 필드가 잘못된 book에 복사됨 | 같은 인용문이 두 book에 미묘하게 다른 표현으로 존재 |

---

## 2. 텍스트 오류

### 자동 점검

```bash
# 한글 오타 패턴 — 존재하지 않는 한글 조합 탐지
# 예: 영욷(×) → 영웅(○), 스스러(×) → 스스로(○)
grep -Pn '[가-힣]*[욷, 읏, 뤃][가-힣]*' ko.json

# 이중 공백
grep -Pn '  ' ko.json en.json

# 빈 text 필드
grep -Pn '"text"\s*:\s*""' ko.json en.json
```

### 수동 점검

- 주어 누락: 모든 문장에 주어가 있는지 (celebIntro 제외)
- 연결어 반복: 같은 접속사가 연속 문장에서 반복되는지
- 시간 역행: book 내에서 "훗날"이 앞에, 결과가 뒤에 나오는지
- 인용부호 규칙: `""` 안의 내용이 검증된 실제 발언인지

---

## 3. 이미지 파일 존재

ko.json과 en.json에서 참조하는 모든 이미지 파일이 `images/` 디렉토리에 존재하는지 확인.

```python
import json, os

for locale in ['ko', 'en']:
    with open(f'{locale}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    missing = []
    
    # books images
    for i, book in enumerate(data['books']):
        for img in book.get('images', []):
            # file이 상대 경로(episodes/...)면 public/ 기준, 아니면 images/ 기준
            path = img['file']
            if not path.startswith('episodes/'):
                path = f"images/{path}"
            if not os.path.exists(path) and not os.path.exists(path.replace('/', os.sep)):
                missing.append(f"Book {i}: {img['file']}")
    
    # shorts images
    for seg in data.get('shorts', {}).get('segments', []):
        if 'image' in seg:
            # shorts image는 episodes/ 기준 절대 경로
            pass  # 별도 체크 필요 시 추가
    
    if missing:
        print(f"{locale} MISSING images: {missing}")
    else:
        print(f"{locale} — all images present")
```

---

## 4. 음성 파일 완성도

### 필수 파일 목록 (롱폼)

```
A2-service-intro, A3-featured-quote,
B1-celeb-intro, B2-philosophy,
D{NN}a-title, D{NN}b-summary, D{NN}c-context,
D{NN}d-quote (directQuote가 있는 book만),
D{NN}e-context-after (contextAfter가 있는 book만),
E1-outro
```

### 필수 파일 목록 (쇼츠)

```
S01-hook, S02-intro, S03-celeb-mid,
S04-book-context-1, S05-book-context-2,
S06-book-quote, S07-book-context-3
```

### 점검 방법

```bash
# 각 locale의 gemini 디렉토리에서 WAV 파일 목록과 manifest.json 비교
ls voice/ko/gemini/*.wav | wc -l
ls voice/en/gemini/*.wav | wc -l
cat voice/ko/gemini/manifest.json | python -m json.tool | grep -c '"'
cat voice/en/gemini/manifest.json | python -m json.tool | grep -c '"'
```

### ElevenLabs 파일 확인

`voice/{locale}/elevenlabs/` 에 있는 WAV는 셀럽 음성(직접 인용문). 해당 book에 `directQuote`가 있고, `directQuoteSource`가 "민간전승" 등 불확실한 출처가 아닌지 교차 확인.

---

## 5. TTS 오버라이드

ko.json `tts.replace` 맵이 본문의 모든 숫자·특수 발음을 커버하는지 확인.

```bash
# 본문에서 숫자가 포함된 토큰 추출
grep -oP '\d+[가-힣]*' ko.json | sort -u
```

커버 대상:
- `NNN년` → `삼백삼십사 년` 등
- `N권`, `N세기`, `N만` 등 단위 포함 숫자
- 기원전 연도는 "기원전"은 한글이므로 변환 불필요

---

## 6. 윤리 규칙 준수

| 규칙 | 점검 |
|------|------|
| 셀럽 음성은 검증된 직접 인용문만 | `directQuoteSource`가 신뢰할 수 있는 1차 사료인지 |
| 민간전승·출처 미상 인용문 | 나레이터 음성으로 전환하거나, 화면에 "전해지는 이야기" 표기 |
| context/contextAfter의 간접 인용 | 인용부호(`""`)로 감싸고 출처 명시 |
| AI 작성 텍스트에 인용부호 금지 | philosophy, philosophySnippet에 `""` 없는지 |

---

## 7. 콘텐츠 품질

### 감정 곡선

8권 전체의 흐름이 기승전결을 이루는지:
- 도입부(book 1~2): 인물의 핵심 특성 확립
- 전개(book 3~5): 깊어지는 맥락, 다양한 면모
- 절정(book 6~7): 가장 강렬한 에피소드
- 마무리(book 8): 여운과 메시지

### 한영 분량 균형

ko와 en의 context/contextAfter 분량이 극단적으로 차이 나면 영상 길이가 달라진다. en이 지나치게 축약된 book이 있는지 비교.

### 쇼츠 훅

- 첫 문장이 결과를 먼저 보여주는지 (원인→결과 아닌 결과→원인)
- 2문장 구성인지 (1문장 임팩트 + 2문장 보조)

---

## 점검 완료 기준

- [ ] 1~4번 자동 스크립트 전부 PASS
- [ ] 5번 TTS 오버라이드 누락 없음
- [ ] 6번 윤리 위반 0건
- [ ] 7번 콘텐츠 품질 수동 리뷰 완료
- [ ] Remotion Studio에서 ko/en 롱폼·쇼츠 프리뷰 재생 확인
