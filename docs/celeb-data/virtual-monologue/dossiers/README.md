# 가상 독백 인물별 근거 묶음

배치 JSON을 직접 크게 편집하지 않기 위한 조사 원고다. 각 파일은 조사자가 직접 작성하고, `merge-virtual-monologue-dossier.ts`가 기계적으로 배치에 병합한다.

필수 원칙:

- 기존 `bio`는 발견용 메모일 뿐 출처가 아니다.
- URL마다 그 문서가 지지하는 내용을 `supports`에 적는다.
- 전환점·입장·긴장은 반드시 `sourceUrls`로 등록 출처와 연결한다.
- 실존 인물은 최소 2개 출처, 그중 최소 1개는 1차·기관·학술 출처다.
- 불확실하거나 확인하지 못한 범위는 `researchLimits`에 남긴다.
- `route`는 `keep | improve | new | hold` 중 하나이며 이유를 구체적으로 적는다.

병합:

```bash
pnpm exec tsx scripts/merge-virtual-monologue-dossier.ts \
  --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json \
  --dossier ../../docs/celeb-data/virtual-monologue/dossiers/peter-thiel.json
```
