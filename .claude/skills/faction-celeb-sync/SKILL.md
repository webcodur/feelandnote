---
name: faction-celeb-sync
description: 팩션(factions/) 영상 인물을 세력도감(/explore/faction)에 반영할 때 적용한다. 표준 경로는 web-bo `/factions` 편집기의 「출간」 패널(진단→dry-run→출간). 데이터 매핑·이미지 3종 구분·캐시 규칙과, 파이프라인이 못 하는 예외 작업(신규 인물 등록·아바타·신원 비공개 인물·상위 그룹 상수)의 절차를 담는다. "세력도감 인물 채워", "태그에 인물 배정", "개인샷/그룹샷 넣어", "팩션 인물 세력도감 반영", "얼굴 없는/익명 인물 등록", "세력도감 이미지 안 뜸/얼굴만 뜸", "출간 안 됨" 등에 호출.
---

> **본문은 멀티툴 공용 원본에 있다 → `.agents/skills/faction-celeb-sync/SKILL.md`**
>
> 이 스킬이 발동되면 **즉시 위 파일을 Read tool로 읽고**, 그 내용을 이 스킬의 전체 지침으로 삼아 그대로 따른다. frontmatter의 description은 트리거용 요약이며, 실제 절차·규칙은 `.agents` 원본이 단일 기준(SSoT)이다.
