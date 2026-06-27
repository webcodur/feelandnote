---
name: celeb-avatar-wikimedia
description: 셀럽 avatar 이미지를 자동 등록한다. 1차로 위키미디어 Commons P18 자동 조회를 시도하고, 실패한 인물은 2차로 임의 출처(Commons 카테고리·검색, 일반 웹 검색)에서 적당한 인물 사진을 찾아 단건 등록한다. 라이선스 까다롭게 따지지 않는다 — 얼굴이 분명한 사람이 맞으면 그대로 등록한다. face detection 기반 얼굴 중앙 크롭·R2 업로드·DB 갱신을 포함한다. "셀럽 이미지 채워줘", "avatar 자동 등록", "얼굴 사진 채워줘", "초상화 세팅" 등으로 호출.
---

> **본문은 멀티툴 공용 원본에 있다 → `.agents/skills/celeb-avatar-wikimedia/SKILL.md`**
>
> 이 스킬이 발동되면 **즉시 위 파일을 Read tool로 읽고**, 그 내용을 이 스킬의 전체 지침으로 삼아 그대로 따른다. frontmatter의 description은 트리거용 요약이며, 실제 절차·규칙은 `.agents` 원본이 단일 기준(SSoT)이다.
