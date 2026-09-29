# 출품 전 최종 점검

> **최종 실측 체크: 26.07.16** — 에피소드 디스크 구조, `voice-names.ts` 음성 파일명 규칙, `voice/{locale}/gemini/` 실물 대조. 1·3번 점검 스크립트는 폐기된 `ko.json` 단일 파일을 읽고 있어 신 구조(`meta.ko.json` + `books/*/book.ko.json`)로 재작성하고 실행 검증함

에피소드 렌더·업로드 직전에 실행하는 품질 게이트. 롱폼·쇼츠·한영 전체를 대상으로 한다.

## 대상 파일 구조

점검 스크립트는 **인물 폴더에서** 실행한다 (예: `sw/remotion/public/episodes/abraham-lincoln/`).

```
meta.ko.json / meta.en.json           ← narrator·host·tts
books/{NN-책제목}/
  book.ko.json / book.en.json         ← summary·contextMain·quotePairs·images
  shorts.ko.json / shorts.en.json     ← segments (쇼츠 있는 책만)
  images/
voice/{ko|en}/{gemini|elevenlabs}/
```

`ko.json`·`en.json` 단일 파일은 폐기된 레거시다 (`peter-thiel`만 잔존).

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

en은 ko에서 파생된다. 번역 과정에서 필드 누락·순서 뒤바뀜이 빈번하게 발생한다.

### 자동 점검 스크립트

**인물 디렉토리에서** 실행한다 (예: `sw/remotion/public/episodes/abraham-lincoln/`).

```python
import json, sys, glob, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def load(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

errors = []
books = sorted(glob.glob('books/*/'))

for bd in books:
    name = os.path.basename(os.path.normpath(bd))
    ko_p, en_p = f'{bd}book.ko.json', f'{bd}book.en.json'
    if not os.path.exists(ko_p):
        errors.append(f'{name}: book.ko.json 없음'); continue
    if not os.path.exists(en_p):
        errors.append(f'{name}: book.en.json 없음'); continue
    k, e = load(ko_p), load(en_p)

    # 1-1. images 배열 일치 (file명 기준)
    ko_imgs = [i['file'] for i in k.get('images', [])]
    en_imgs = [i['file'] for i in e.get('images', [])]
    if ko_imgs != en_imgs:
        errors.append(f'{name} images MISMATCH:\n  ko: {ko_imgs}\n  en: {en_imgs}')

    # 1-2. quotePairs 길이·구조 일치
    ko_qp, en_qp = k.get('quotePairs', []), e.get('quotePairs', [])
    if len(ko_qp) != len(en_qp):
        errors.append(f'{name} quotePairs count: ko={len(ko_qp)}, en={len(en_qp)}')
    for j, (kp, ep) in enumerate(zip(ko_qp, en_qp)):
        for field in ['quote', 'after']:
            if (field in kp) != (field in ep):
                errors.append(f'{name} quotePairs[{j}].{field}: ko={field in kp}, en={field in ep}')

    # 1-3. 쇼츠 segments id/role 일치 + imageChangeAt 존재 여부 일치
    sko_p, sen_p = f'{bd}shorts.ko.json', f'{bd}shorts.en.json'
    if os.path.exists(sko_p) and os.path.exists(sen_p):
        sk, se = load(sko_p), load(sen_p)
        ks = [(s.get('id'), s.get('role')) for s in sk.get('segments', [])]
        es = [(s.get('id'), s.get('role')) for s in se.get('segments', [])]
        if ks != es:
            errors.append(f'{name} shorts segments MISMATCH:\n  ko: {ks}\n  en: {es}')
        for a, b in zip(sk.get('segments', []), se.get('segments', [])):
            if ('imageChangeAt' in a) != ('imageChangeAt' in b):
                errors.append(f"{name} shorts '{a.get('id')}' imageChangeAt: ko={'imageChangeAt' in a}, en={'imageChangeAt' in b}")
    elif os.path.exists(sko_p) != os.path.exists(sen_p):
        errors.append(f'{name}: 쇼츠 ko/en 한쪽만 존재')

# 1-4. meta narrator/host 키 일치
mko, men = load('meta.ko.json'), load('meta.en.json')
for section in ['narrator', 'host']:
    kk, ek = set(mko.get(section, {})), set(men.get(section, {}))
    if kk != ek:
        errors.append(f'meta {section} keys differ: ko-only={kk-ek}, en-only={ek-kk}')

if errors:
    print(f'FAIL — {len(errors)} issue(s):')
    for e in errors: print(f'  X {e}')
    sys.exit(1)
print(f'PASS — ko/en 구조 정합 (books {len(books)})')
```

책 수 일치 점검은 사라졌다. 책이 폴더 단위라 ko/en이 같은 폴더를 공유하므로 어긋날 수가 없고, 대신 폴더별 `book.en.json` 존재 여부를 본다.

### 대표 실패 패턴

| 패턴 | 원인 | 증상 |
|------|------|------|
| **이미지 순환 오류** | 번역 시 book 순서 밀림 | en book N에 book N+2의 이미지가 할당됨 |
| **필드 누락/초과** | 번역 중 quotePairs 복사 실수 | ko에 없는 quotePairs 항목이 en에 존재하거나 그 반대 |
| **중복 인용문** | 필드가 잘못된 book에 복사됨 | 같은 인용문이 두 book에 미묘하게 다른 표현으로 존재 |

---

## 2. 텍스트 오류

### 자동 점검

인물 디렉토리에서 실행:

```bash
# 한글 오타 패턴 — 존재하지 않는 한글 조합 탐지
# 예: 영욷(×) → 영웅(○), 스스러(×) → 스스로(○)
grep -Prn '[가-힣]*[욷읏뤃][가-힣]*' --include='*.ko.json' .

# 이중 공백
grep -Prn '  ' --include='book.*.json' --include='shorts.*.json' --include='meta.*.json' .

# 빈 text 필드
grep -Prn '"text"\s*:\s*""' --include='*.json' books/ meta.ko.json meta.en.json
```

### 수동 점검

- 주어 누락: 모든 문장에 주어가 있는지 (celebIntro 제외)
- 연결어 반복: 같은 접속사가 연속 문장에서 반복되는지
- 시간 역행: book 내에서 "훗날"이 앞에, 결과가 뒤에 나오는지
- 인용부호 규칙: `""` 안의 내용이 검증된 실제 발언인지

---

## 3. 이미지 파일 존재

각 책의 `book.{locale}.json`이 참조하는 이미지가 **그 책의** `images/` 디렉토리에 존재하는지 확인. 인물 디렉토리에서 실행.

```python
import json, os, glob, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

missing = []
for bd in sorted(glob.glob('books/*/')):
    name = os.path.basename(os.path.normpath(bd))
    for locale in ['ko', 'en']:
        p = f'{bd}book.{locale}.json'
        if not os.path.exists(p): continue
        data = json.load(open(p, encoding='utf-8'))
        for img in data.get('images', []):
            f = img['file']
            # file이 episodes/ 로 시작하면 public/ 기준, 아니면 그 책의 images/ 기준
            path = f if f.startswith('episodes/') else os.path.join(bd, 'images', f)
            if not os.path.exists(path):
                missing.append(f'{name} [{locale}]: {f}')

    # 쇼츠 image·imageChangeAt — 경로는 episodes/ 기준
    for locale in ['ko', 'en']:
        p = f'{bd}shorts.{locale}.json'
        if not os.path.exists(p): continue
        data = json.load(open(p, encoding='utf-8'))
        for seg in data.get('segments', []):
            cands = []
            if seg.get('image'): cands.append(seg['image'])
            ic = seg.get('imageChangeAt')
            if ic:
                for c in (ic if isinstance(ic, list) else [ic]):
                    if c.get('image'): cands.append(c['image'])
            for f in cands:
                path = os.path.join('../../', f) if f.startswith('episodes/') else os.path.join(bd, 'images', f)
                if not os.path.exists(path):
                    missing.append(f"{name} shorts [{locale}]: {f}")

if missing:
    print(f'MISSING {len(missing)}:')
    for m in missing: print(f'  X {m}')
else:
    print('PASS — 참조 이미지 전부 존재')
```

쇼츠의 `image`·`imageChangeAt[].image`는 `episodes/...` 전체 경로다. 위 스크립트는 인물 폴더 기준이라 `../../`로 `public/`까지 거슬러 푼다.

---

## 4. 음성 파일 완성도

### 필수 파일 목록 (롱폼)

```
A2-service-intro, A3-featured-quote,
B1-celeb-intro, B2-philosophy,
D{NN}a-title, D{NN}b-summary, D{NN}c-context,
D{NN}d1-quote, D{NN}d2-after, D{NN}d3-quote, D{NN}d4-after, ... (quotePairs 배열 순서대로),
E1-outro
```

`A1-service-greeting`·`C1-label-summary`·`C2-label-context`는 에피소드 폴더가 아니라 **공통 음성**에서 온다. 여기 없다고 결락이 아니다. `E2-interlude`·`E3-return-intro`·`E4-prev-recap`은 여러 편으로 나뉜 인물만 쓴다.

### 필수 파일 목록 (쇼츠)

쇼츠 음성은 **`shorts-{N}/` 접두사가 필수**다 (N = 쇼츠 번호, 1-based). 접두사 없는 레거시 경로는 더 이상 쓰지 않는다.

```
shorts-{N}/S01-hook, shorts-{N}/S02-intro, shorts-{N}/S03-celeb-mid,
shorts-{N}/S04-book-context-1, ...
```

번호는 세그먼트 배열 순서(1-based)를 2자리로, 뒤에는 그 세그먼트의 id를 붙인다. 1권 모드는 `solo-B{NN}/S{nn}-{segId}.wav`.

### 점검 방법

```bash
# 각 locale의 gemini 디렉토리에서 WAV 파일 목록과 manifest.json 비교
ls voice/ko/gemini/*.wav | wc -l
ls voice/en/gemini/*.wav | wc -l
cat voice/ko/gemini/manifest.json | python -m json.tool | grep -c '"'
cat voice/en/gemini/manifest.json | python -m json.tool | grep -c '"'
```

### ElevenLabs 파일 확인

`voice/{locale}/elevenlabs/` 에 있는 WAV는 셀럽 음성(인용문). 해당 book에 `quotePairs[].quote`가 있고, `quotePairs[].quoteSource`가 "민간전승" 등 불확실한 출처가 아닌지 교차 확인.

---

## 5. TTS 오버라이드

`tts.replace` 맵이 본문의 모든 숫자·특수 발음을 커버하는지 확인. `tts`는 `meta.ko.json`과 각 `book.ko.json`·`shorts.ko.json`에 모두 있을 수 있다.

```bash
# 본문에서 숫자가 포함된 토큰 추출
grep -ohPr '\d+[가-힣]*' --include='*.ko.json' . | sort -u
```

커버 대상:
- `NNN년` → `삼백삼십사 년` 등
- `N권`, `N세기`, `N만` 등 단위 포함 숫자
- 기원전 연도는 "기원전"은 한글이므로 변환 불필요

---

## 6. 윤리 규칙 준수

| 규칙 | 점검 |
|------|------|
| 셀럽 음성은 검증된 인용문만 | `quotePairs[].quoteSource`가 신뢰할 수 있는 1차 사료인지 |
| 민간전승·출처 미상 인용문 | 나레이터 음성으로 전환하거나, 화면에 "전해지는 이야기" 표기 |
| contextMain/quotePairs[].after의 간접 인용 | 인용부호(`""`)로 감싸고 출처 명시 |
| AI 작성 텍스트에 인용부호 금지 | philosophy, philosophySnippet에 `""` 없는지 |

---

## 7. 콘텐츠 품질

### 감정 곡선

책 전체의 흐름이 기승전결을 이루는지 (권수는 인물마다 다르다. 아래는 8권 기준 예시):
- 도입부(book 1~2): 인물의 핵심 특성 확립
- 전개(book 3~5): 깊어지는 맥락, 다양한 면모
- 절정(book 6~7): 가장 강렬한 에피소드
- 마무리(마지막 book): 여운과 메시지

### 한영 분량 균형

ko와 en의 `contextMain`·`quotePairs[].after` 분량이 극단적으로 차이 나면 영상 길이가 달라진다. en이 지나치게 축약된 book이 있는지 비교.

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
