# Speech 실행 파이프라인

작성 판단은 [`celeb-04-01-speech.md`](celeb-04-01-speech.md)가 쥔다. 이 문서는 현재 백오피스 도구로 대상 선별부터 DB readback까지 실행하는 순서만 다룬다.

```text
대상 선별 → 자료 회수 → 최소 입력 작성 → 패치 조립 → dry-run → 반영·재조회
```

`sw/web-bo`에서 실행한다. `.env`의 `NEXT_PUBLIC_DB_API_URL`과 `DB_SECRET_KEY`가 필요하며 중간 파일은 `.tmp-celeb-fill/`에 둔다. 이 폴더는 실행 중 복구에만 쓰고 배치가 끝나면 지운다.

## 기존 대사 대량 감사

기존 대사를 넓게 점검할 때는 외부 CLI 작업 기법의 [`진단-편집 분업`](../agent-cli/diagnose-edit-verify.md)을 따른다. 이 작업의 진단 단위는 한 인물의 상황 대사 21개다. 문제 위치와 원문을 짚고 상황 역할, 말투, 비문·조어, 평전형 설명, 범용 문장, 반복, 사실 의심을 구분한다. 사실이 의심되면 자료 회수 대상으로 보내며, `quote`는 수정 범위에 넣지 않는다.

## 1. 대상 선별

```bash
pnpm celeb:speech:1-targets --current-dialogue-batch --include-placeholders --include-quote-blanks \
  --out .tmp-celeb-fill/targets.json
```

필요한 옵션만 골라 쓴다. `--current-dialogue-batch`는 한국어 대사는 있지만 영문 대사가 비어 있는 영문화 대상, `--include-placeholders`는 자료 희박 표준값의 재조사 대상, `--include-quote-blanks`는 한마디가 빈 대상을 포함한다. 영문화 대상은 아래 한국어 `CREATE` 조립기가 아니라 마지막 영문 대사 경로로 보낸다. 출력의 현재값 해시는 참고용이며 손으로 패치에 옮기지 않는다.

## 2. 자료 회수

```bash
pnpm celeb:speech:2-collect probe "인물명"
pnpm celeb:speech:2-collect extract "https://..."
pnpm celeb:speech:2-collect verify "https://..." "확인할 문장"
```

`probe`는 신원과 직접 발언 후보를 찾고, `extract`는 연 본문에서 후보를 꺼내며, `verify`는 선택한 문장이 본문에 실제로 있는지 확인한다. 도구는 화자 귀속을 판정하지 않으므로 다화자 전사에서는 앞뒤 문맥을 사람이 읽는다.

호스트가 일반 요청을 막으면 별도 회수로 저장한 본문을 같은 추출기에 넣을 수 있다.

```bash
pnpm celeb:speech:2-collect extract --file .tmp-celeb-fill/source.html --url "https://원본주소"
```

검색 요약에만 있는 문장은 쓰지 않는다. 발화자가 분명한 대담 전사, 본인 답변이 구분된 인터뷰, 공식 발언 전문, 모국어 원문을 우선한다. 영상은 화자와 문장을 검증할 수 있는 수동 자막이나 공식 전사를 사용한다.

## 3. 최소 입력 작성

입력 계약의 정본은 `sw/web-bo/scripts/celeb/speech/3-patch.ts`의 `MinimalInput`이다. 한 명은 객체, 여러 명은 배열로 쓴다.

판단이 필요한 값만 작성한다.

- `slug`, `tone`, 신원 요약과 신원 출처
- 한영 한마디·원문 언어·직접 출처 또는 `unavailable` 판정과 이유
- 출처가 붙은 대표 사실, 대사 앵커, 검색어, 확인한 본문과 발견 내용, 출처 계열
- 대사를 선택한 판단 근거
- `SPEECH_SITUATIONS` 전체의 한국어 대사

필수 개수와 문자열 상한은 입력 조립기와 `celeb-speech-research.ts`가 검사한다. 한국어가 든 JSON은 문자열 치환으로 고치지 않고 JSON으로 파싱해 쓴다.

현재 `3-patch.ts`는 신규 한국어 완성본인 `CREATE` 패치만 조립한다. 기존 대사를 보존하는 `KEEP`이나 교체하는 `REVISE`는 `SpeechResearch` 계약의 `dialogueDecision`과 현재값 해시를 갖춘 패치로 직접 검증해야 하며, `CREATE`로 가장해 기존 대사를 덮지 않는다.

## 4. 패치 조립

```bash
pnpm celeb:speech:3-patch .tmp-celeb-fill/input.json .tmp-celeb-fill/patch.json
```

조립기는 조사 스키마, 출처 배선, 발화 표본, 판정 값과 DB의 현재 `lines`에서 계산한 해시를 넣는다. 해시는 손으로 만들지 않는다. 이 단계에서 필수 필드·상한·상황 배열·중복·금지 태그가 실패하면 입력을 고친다.

## 5. dry-run과 반영

```bash
pnpm celeb:fill apply --file .tmp-celeb-fill/patch.json --only-slugs "slug-a,slug-b"
pnpm celeb:fill apply --file .tmp-celeb-fill/patch.json --only-slugs "slug-a,slug-b" --apply
```

`--only-slugs`에는 패치가 소유한 slug 전체를 명시한다. PowerShell에서는 쉼표 목록을 따옴표로 묶는다. 기본 실행은 dry-run이고 `--apply`는 사용자가 DB 반영을 명시한 경우에만 쓴다.

적용기는 쓰기 직전 현재 해시를 다시 확인한다. 달라졌다면 값을 우회해 덮지 말고 3단계 입력에서 다시 조립한다. 반영 뒤에는 대상의 `speech_tone`, `lines`, `lines_en`을 재조회해 한마디·상황 키·기존 값 보존을 확인한다.

full·light의 영문 상황 대사를 별도 생성한 경우 `scripts/celeb/i18n-lines-en-apply.ts`로 구조 검사와 dry-run을 한 뒤 반영한다. 이 도구는 기존 `lines_en.quote`를 보존하며, fiction에는 영문 대사가 작업 범위일 때만 사용한다.
