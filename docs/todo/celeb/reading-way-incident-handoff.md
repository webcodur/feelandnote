# 독서 방식 사고 잔여 처리

26.11.24 08:15 ~ 26.11.26 21:07 KST 다른 에이전트(OpenBot 「독서 방식」)가 웹 Gemini가 막힌 뒤에도 실행자 임의 초안과 무료 ChatGPT 출력을 그대로 저장했다. 1,386명의 독서방식을 NULL로 원복했고(네이버 실발행 `dk`·`aman-sanger`·`kim-yeon-koung` 3명은 유지), 재발 방지 규칙은 [독서 방식 룰북](../../project/celeb/celeb-05-02-reading-way.md) 「1-3. 응답 판정」에 넣었다. 아래는 남은 일만 둔다.

## 처리 완료

- 감상 백필 149건(68명)을 훑었다. 표본 6건 중 4건이 원문과 맞았고 2건은 원문 페이지가 열리지 않았다. 결함 행만 손봤다.
  - 삭제 10건: 위키백과·굿리즈만 출처인 4건(`laurence-olivier` 3, `anthony-bourdain` 1), 한 문장짜리 1건(`chiang-kai-shek` 『관자』), 주어 없는 토막 감상 5건(`neil-pasricha` 2, `chrissy-teigen` 3).
  - 영어 감상 보완 9건: `roy-h.-williams` 5, `mitch-gerads` 2, `farah-khan` 1, `marshall-goldsmith` 1(문단 수 맞춤, 원문 영어를 확인하지 못해 간접화법으로 씀).
  - 영어 판본 행 추가 1건: `naomi-klein` 『그녀의 몸과 타인들의 파티』(Her Body and Other Parties).
  - 남은 139건은 유지했다. 판본 메타가 한 언어 제목뿐인 29건은 한국어판·영문판이 없는 책이 섞여 있어 그대로 두었다.
- 저장소: 쓸 만한 러너(`ego-gemini-run`·`ego-pool-probe`·`verify-live`)와 slug 분리 수정을 커밋했다. 무료 ChatGPT 검증 출력을 본문으로 저장하는 통로였던 `ego-verify-run.mjs`는 지웠다.

## 남은 일

- **OpenBot 로컬 스킬 `셀럽 독서방식 처리`**(`local-skill-3cef9f51-94ee-407a-8ab9-67e54ad5a54e`): 네이버 에이전트에 `expectsReply: true`로 넘기는 절차가 남아 있다. OpenBot 앱에서 `openbot.revise_skill`로 고치거나 지운다. 앱 DB(`%APPDATA%/OpenBot/openbot.db`)를 직접 고치지 않는다.
- **OpenBot 상시 메모리** `b39e9279-a1d7-4014-9aad-f8c128a1b264`: 「새 조사 결과가 있으면 먼저 네이버 에이전트에 메시지로 알릴 것」을 지우고 보호 3명 사실만 남긴다. 위와 같이 OpenBot 앱에서 고친다.
- **기존 책장 변경 추적 한계**: 26.11.24 08:15 ~ 26.11.25 01:05 구간의 기존 감상 삭제·수정은 기록이 없다. 로그로 확인된 삭제 12건은 미독서·허구·중복 판정 행이라 되살리지 않았다. 해당 인물의 책장은 독서방식을 다시 쓸 때 룰북 「본문이 바뀔 때 함께 처리」로 다시 본다.
- **영어 판본 행 변경 19건**: `john-mackey` 5건·`jimmy-carter` 6건 등 표지가 없는 행이 있다. 그 인물의 책장을 다룰 때 [콘텐츠 등록](../../project/celeb/celeb-02-02-content-registration.md) 「영문판과 표지」로 확인한다.
- **백업 파일 2개**: 위 일이 끝나면 지운다.
  - `C:/Users/webco/AppData/Local/Temp/feelandnote/rw-rollback-backup-20261126.json`
  - `D:/feelandnote/blog-assets/naver-blog/backups/publish-candidates.before-rollback-20261126.txt`
