# 셀럽 아바타 로컬 자산 상태

> 최종 갱신: 2026-07-31

서비스 최종본의 단일 보관처는 R2 `celebs/<profile-id>/avatar.webp`다. 완성본이 R2와 DB에서 검증된 뒤에는 원본·REF·누끼본·검수 시트를 로컬에 보관하지 않는다.

## 현재 상태

- `D:\image\서비스_재료\인물`: **0개 파일**
- 제거량: 1,620개 파일, 1,226개 하위 폴더, 약 2.4GB
- 이번 삼국지 작업의 imagegen 원본·실패본·업로드용 검수본: 전량 제거
- 이번 삼국지 작업의 `.tmp\celeb-avatar-*`·`.tmp\three-kingdoms-avatar-wave` 작업 폴더와 `C:\project\nobg\batch\batch_work` 내 삼국지 입력·출력: **0개**
- 공유 누끼 작업칸에서 잠시 분리했던 다른 작업의 북유럽 6명 원본·누끼는 원래 `batch_work`로 복원. 삼국지 파일과 섞인 항목 0개
- 오래된 `_정리_매니페스트.json`: 보존 파일이 없어졌으므로 제거

다음 두 항목만 남긴다.

| 경로 | 용도 |
|---|---|
| `D:\image\서비스_재료\R2_아바타_검색기.cmd` | 이름·slug로 R2 아바타를 찾아 필요할 때 다시 내려받는 실행기 |
| `D:\image\서비스_재료\_R2_다운로드\` | 검색기가 내려받은 파일의 임시 위치 |

삼국지 canonical REF는 영상 제작 원천이므로 `sw/remotion/public/factions/three-kingdoms/_refs`에 그대로 둔다. 업로드용 크롭·누끼·검수본만 제거한다.

현재 미등록 수와 보류 근거는 `celeb-avatar-missing.md`를 따른다.
