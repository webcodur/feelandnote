# millie-capture

밀리의 서재 윈도우 데스크탑 앱 자동 캡쳐 → PDF 바인딩. **브라우저 조작 화면(권장)** 과 CLI 둘 다 지원.

## 동작 원리

윈도우 시스템 캡쳐(`mss`)로 화면을 찍고, `pyautogui`로 →(우 화살표) 키를 눌러 페이지를 넘기는 단순 루프. 외부 장치·미러링·드라이버 일체 불필요.

조작 화면은 로컬 서버(`app.py`)가 브라우저에 띄운다. 실제 캡쳐·페이지 넘김은 파이썬이 직접 하고, 브라우저는 설정·시작·중단·미리보기만 담당한다.

## 준비

```powershell
cd C:\project\feelandnote\millie-capture
pip install -r requirements.txt
```

## 브라우저 화면으로 쓰기 (권장)

```powershell
python app.py
```

`http://127.0.0.1:5000` 이 자동으로 열린다. 화면에서:

1. **설정** — 책 이름, 페이지 수, 모니터, 페이지 넘김 키, 대기 시간을 입력.
2. **본문 영역 지정** — 버튼을 누르면 좌상단·우하단 모서리를 차례로 3초씩 가리키며 영역을 잡는다. (생략 시 모니터 전체)
3. **캡쳐 시작** — 준비 시간 카운트다운 동안 밀리 창을 띄워 첫 페이지를 펴 두면, 진행률 막대와 방금 찍은 페이지 미리보기가 실시간으로 뜬다. 중간에 **중단** 가능, **시작 페이지**로 재개 가능.
4. **PDF 만들기** — 찍은 이미지들을 한 권으로 묶는다.

## CLI로 쓰기

브라우저 화면 없이 터미널에서 바로 쓰는 방식.

### 설정 (1회)

`config.example.json`을 복사해 `config.json`으로 만든 뒤 값 조정:

```json
{
  "pages": 100,                  // 캡쳐할 페이지 수
  "capture_region": null,        // null=전체 화면, [x,y,w,h]=영역만
  "next_key": "right",           // 페이지 넘김 키 (pageup/pagedown/space 등 가능)
  "countdown_seconds": 5,        // 시작 전 카운트다운(앱 띄울 시간)
  "delay_before_capture_ms": 350,// 캡쳐 직전 대기(렌더 안정화)
  "delay_after_next_ms": 800,    // 페이지 넘긴 뒤 대기(다음 페이지 로드)
  "session_name": "book01",
  "pdf_filename": "book01.pdf",
  "output_dir": "./captures"
}
```

### 영역만 캡쳐하고 싶다면

전체 화면이면 상단바·UI까지 들어간다. 책 본문 영역만 잘라내려면:

```powershell
python region_picker.py
# 본문 좌상단 → Enter → 본문 우하단 → Enter
# 출력된 [x, y, w, h] 값을 config.json의 capture_region에 붙여넣기
```

### 실행

```powershell
# 1) 밀리 창을 띄우고 첫 페이지 펴 둔다
# 2) 캡쳐 시작
python capture.py

# 카운트다운 동안 밀리 창에 포커스 맞춰 두면 됨.
# 페이지마다 PNG로 저장되고, 마지막에 안내 출력.

# 중단했다가 재개할 때
python capture.py --start 47
```

**안전장치**: 마우스를 화면 **좌상단(0,0)** 으로 빠르게 옮기면 pyautogui FAILSAFE로 즉시 중단된다.

### PDF로 묶기

```powershell
python bind.py
# 또는 폴더 직접 지정
python bind.py --folder captures/book01 --out my_book.pdf
```

## 속도 가이드

- 페이지당 약 1.1초(=`350ms + 캡쳐 + 800ms`) 정도가 안정적.
- 500페이지 ≈ 10분 정도 예상.
- `delay_after_next_ms`를 너무 줄이면 페이지 로드 전에 캡쳐돼 같은 페이지가 두 번 찍힌다.

## 트러블슈팅

- **카운트다운 후 첫 페이지가 안 잡힘**: 카운트다운 동안 다른 창이 포커스 가져갔을 가능성. 카운트다운 늘리고 밀리 창을 클릭해 포커스 확보.
- **페이지가 안 넘어감**: 밀리 PC 앱은 Electron 기반이라 창을 맨 앞에 띄워도 책 본문에 키 입력 초점이 안 잡혀 화살표 키를 무시하는 경우가 많다(키 입력 자체는 메모장 등 일반 앱엔 정상 전달됨). **해결: 넘김 방식을 `마우스 우측 클릭`(`key_method: "click"`)으로 둔다.** 화면 오른쪽 클릭이 초점 확보와 페이지 넘김을 동시에 처리한다. 기본값이 `click`이다. 클릭은 밀리 창(없으면 캡쳐 영역/모니터)의 오른쪽 92% 지점을 누른다. 그래도 안 되면 `key`(일반 화살표)·`direct`(scan code 화살표)로 바꿔 "넘김 키 테스트" 버튼으로 한 장씩 확인한다.
- **같은 페이지가 두 번 찍힘**: `delay_after_next_ms` 늘리기(1200~1500).
- **PNG에 다른 창이 끼어듦**: 마우스 호버로 툴팁 뜨는 경우. 마우스를 화면 가장자리(0,0 제외)에 두고 시작.
- **고해상도 모니터에서 좌표 어긋남**: 디스플레이 배율(125%, 150%) 적용 환경. `region_picker.py`로 측정한 값은 OS 좌표라 일관적. 문제 시 디스플레이 배율 100%로 임시 변경.

## 약관·법적 주의

- 자동 캡쳐는 밀리의 서재 약관상 회색 지대다. 개인 소장·학습용으로만 사용하고 공유·배포는 피한다.

## 다음 단계 (위키화)

PDF가 생기면 `hermes-pdf-skills` 패턴으로 Markdown 변환 후 Obsidian/Claude Code 위키에 적재. 자세한 흐름은 `../밀리의서재추출/01_밀리의서재.md` 참고.

## OCR (선택)

- **OCRmyPDF**: `pip install ocrmypdf` → `ocrmypdf input.pdf output.pdf -l kor`
- 윈도우는 Apple Vision 미지원 → OCRmyPDF가 가장 무난
