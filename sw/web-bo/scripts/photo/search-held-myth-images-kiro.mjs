import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

import sharp from 'sharp'

import { runKiro } from '../../../../.agents/skills/kiro-gpt/scripts/kiro-call.mjs'

const PROJECT_ROOT = resolve(import.meta.dirname, '../../../..')
const MATERIAL_ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const OUTPUT_ROOT = join(MATERIAL_ROOT, '보류-웹검색')
const PROPOSAL_PATH = join(MATERIAL_ROOT, 'matching-proposal.json')

const expected = [
  { slug: 'astyanax', ko: '아스티아낙스', en: 'Astyanax', tradition: '일리아스' },
  { slug: 'black-bear-demon', ko: '흑웅괴', en: 'Black Bear Demon', tradition: '서유기' },
  { slug: 'yellow-wind-demon', ko: '황풍괴', en: 'Yellow Wind Demon', tradition: '서유기' },
  { slug: 'khnum', ko: '크눔', en: 'Khnum', tradition: '이집트 신화' },
  { slug: 'sobek', ko: '소베크', en: 'Sobek', tradition: '이집트 신화' },
  { slug: 'angada', ko: '앙가다', en: 'Angada', tradition: '라마야나' },
  { slug: 'jatayu', ko: '자타유', en: 'Jatayu', tradition: '라마야나' },
  { slug: 'maricha', ko: '마리차', en: 'Maricha', tradition: '라마야나' },
  { slug: 'tara-ramayana', ko: '타라', en: 'Tara', tradition: '라마야나' },
]

await mkdir(OUTPUT_ROOT, { recursive: true })

const proposal = JSON.parse(await readFile(PROPOSAL_PATH, 'utf8'))
const held = proposal.matches.filter((row) => row.status !== 'matched')
if (held.length !== expected.length) {
  throw new Error(`Expected ${expected.length} held targets, found ${held.length}`)
}

const assignments = [
  expected.slice(0, 3),
  expected.slice(3, 6),
  expected.slice(6, 9),
]

const prompt = `
당신은 Feel&Note 신화 인물 아바타용 도상 이미지를 찾는 Kiro GPT-5.6 Sol 코디네이터다.

목적:
- 인간 얼굴 재료 매칭에서 보류된 정확히 9명의 신화 인물에 대해, 그 인물의 정체성을 보존하는 얼굴 또는 도상 이미지를 웹에서 실제로 찾고 로컬에 내려받는다.
- 최종 아바타 등록이나 AI 이미지 생성은 하지 않는다. DB, R2, 기존 matching-proposal.json, 기존 재료 폴더는 절대 수정하지 않는다.

작업 루트:
- 프로젝트: ${PROJECT_ROOT}
- 입력 매칭 원장: ${PROPOSAL_PATH}
- 쓰기 허용 경로: ${OUTPUT_ROOT} 아래만

에이전트 구성:
- 이 터미널의 내부 에이전트/워커 총량은 정확히 최대 3대다.
- 코디네이터는 배정·충돌 감시·결과 검증만 하며 직접 조사 레인을 맡지 않는다.
- 재귀 위임과 완료된 대상의 재조사를 금지한다.
- 워커 1: ${assignments[0].map((x) => `${x.slug}(${x.ko})`).join(', ')}
- 워커 2: ${assignments[1].map((x) => `${x.slug}(${x.ko})`).join(', ')}
- 워커 3: ${assignments[2].map((x) => `${x.slug}(${x.ko})`).join(', ')}
- 한 워커가 자기 대상 각각의 검색, 판정, 다운로드, result.json 저장, 자체검증을 끝낸다.

정확한 대상:
${expected.map((x) => `- ${x.slug}: ${x.tradition} / ${x.ko} / ${x.en}`).join('\n')}

검색 규칙:
1. 1차 검색은 영문명·통용 별칭·전승명에 portrait, face, painting, sculpture, relief, temple, manuscript, illustration, statue를 조합한다.
2. 1차에서 쓸 수 있는 이미지가 없으면 반드시 2차 새 검색을 한다. 원어 표기와 대체 철자, 핵심 변신 형태나 등장 장면을 사용한다. 중국 인물은 한자·중문 검색어, 이집트 인물은 신명 대체 철자, 라마야나 인물은 산스크리트/힌디어 표기나 전승별 철자를 포함한다.
3. 검색 결과 URL만 보고 채택하지 않는다. 후보 원문 페이지를 실제로 열고 인물 동일성과 이미지 설명을 확인한다. 본문 추출은 가능한 경우 insane-search를 우선 사용한다.
4. Wikimedia Commons, 박물관·도서관·문화기관, 백과사전·종교/신화 전문 페이지, 고전 회화·조각·사본 삽화, 영화·TV·무대 도상까지 후보가 될 수 있다. 워터마크·배경·복식은 탈락 사유가 아니다. 이후 합성·재생성할 얼굴/도상 REF이므로 정체성과 얼굴 또는 머리 형태가 명확한지가 핵심이다.
5. 다른 캐릭터, 일반 동물 사진, 작품 로고·표지, 얼굴이나 머리가 너무 작은 군집 장면은 채택하지 않는다.
6. 인간 얼굴로 바꾸면 정체성이 훼손되는 대상은 동물형·혼합형 머리가 선명한 도상을 채택한다. 아스티아낙스는 아동이라는 연령 정체성이 보이는 도상만 허용한다.
7. 각 대상은 가장 좋은 후보 1장을 필수 선택하고, 실제로 도움이 되는 경우에만 대안 최대 2장을 더 저장한다. 서로 같은 이미지를 리사이즈한 것은 대안으로 세지 않는다.
8. 직접 이미지 URL을 HTTP로 확인하고 실제 이미지 바이너리를 대상 폴더에 다운로드한다. 다운로드 파일이 열리지 않거나 HTML이면 발견으로 인정하지 않는다.
9. 1차와 2차 새 검색을 모두 했는데도 인물 동일성이 확인된 쓸 만한 이미지를 실제로 내려받지 못하면 status를 give_up으로 확정한다. 추측 URL·가짜 파일명·억지 인간 얼굴을 만들지 않는다.

대상별 출력:
- 폴더: ${OUTPUT_ROOT}\\<slug>\\
- 이미지: selected-01.<실제확장자>, alternate-02.<실제확장자>, alternate-03.<실제확장자>
- 결과: result.json

result.json 스키마:
{
  "slug": "정확한 slug",
  "name_ko": "한국어명",
  "name_en": "영문명",
  "tradition": "전승",
  "status": "found 또는 give_up",
  "selected": {
    "file": "로컬 파일명",
    "source_page_url": "이미지를 설명하는 실제 원문 페이지",
    "direct_image_url": "검증한 실제 이미지 URL",
    "page_title": "원문 제목",
    "identity_evidence": "왜 정확히 이 인물의 도상인지 확인한 근거",
    "visual_notes": "얼굴/머리 형태와 재생성 REF로서의 장단점",
    "width": 0,
    "height": 0
  },
  "alternates": [],
  "searches": [
    { "phase": 1, "queries": [], "opened_pages": [] },
    { "phase": 2, "queries": [], "opened_pages": [] }
  ],
  "give_up_reason": null
}

검증 조건:
- status=found이면 selected가 null이 아니고 source_page_url과 direct_image_url이 http(s)이며 selected.file이 대상 폴더에 실제 존재해야 한다.
- 로컬 이미지의 실제 픽셀 크기를 읽어서 width와 height를 쓴다.
- status=give_up이면 selected는 null, alternates는 빈 배열, 1차·2차 searches 기록과 구체적인 give_up_reason이 있어야 한다.
- 모든 9개 result.json을 다시 파싱하고 slug·스키마·파일 존재를 확인한 뒤 종료한다.
- 코디네이터 자연어 보고 대신 결과 파일 완결성을 우선한다.
`

const result = await runKiro(prompt, {
  cwd: PROJECT_ROOT,
  model: 'gpt-5.6-sol',
  effort: 'high',
  agentEngine: 'v3',
  trustAllTools: true,
  timeoutMs: 45 * 60_000,
  onOutput: ({ stream, value }) => {
    const target = stream === 'stderr' ? process.stderr : process.stdout
    target.write(value)
  },
})

const summary = []
for (const target of expected) {
  const targetDir = join(OUTPUT_ROOT, target.slug)
  const resultPath = join(targetDir, 'result.json')
  const item = JSON.parse(await readFile(resultPath, 'utf8'))
  if (item.slug !== target.slug) throw new Error(`Slug mismatch: ${target.slug}`)
  if (!['found', 'give_up'].includes(item.status)) {
    throw new Error(`Invalid status for ${target.slug}: ${item.status}`)
  }

  if (item.status === 'found') {
    if (!item.selected?.file || !/^https?:\/\//u.test(item.selected.source_page_url ?? '') || !/^https?:\/\//u.test(item.selected.direct_image_url ?? '')) {
      throw new Error(`Incomplete selected metadata for ${target.slug}`)
    }
    const selectedPath = join(targetDir, item.selected.file)
    await stat(selectedPath)
    const metadata = await sharp(selectedPath).metadata()
    if (!metadata.width || !metadata.height) throw new Error(`Unreadable selected image for ${target.slug}`)
    item.selected.width = metadata.width
    item.selected.height = metadata.height
    await writeFile(resultPath, `${JSON.stringify(item, null, 2)}\n`, 'utf8')
  } else {
    if (item.selected !== null || !item.give_up_reason || item.searches?.length < 2) {
      throw new Error(`Incomplete give_up record for ${target.slug}`)
    }
  }

  const files = await readdir(targetDir)
  const images = files.filter((file) => ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(extname(file).toLowerCase()))
  summary.push({
    slug: target.slug,
    name_ko: target.ko,
    name_en: target.en,
    tradition: target.tradition,
    status: item.status,
    selected_file: item.selected?.file ?? null,
    source_page_url: item.selected?.source_page_url ?? null,
    image_files: images,
    give_up_reason: item.give_up_reason ?? null,
  })
}

const index = {
  generated_at: new Date().toISOString(),
  kiro: {
    model: 'gpt-5.6-sol',
    effort: 'high',
    agent_engine: 'v3',
    top_level_terminals: 1,
    internal_workers_max: 3,
    exit_code: result.code,
    hard_throttle: result.hardThrottle,
    timed_out: result.timedOut,
  },
  total: summary.length,
  found: summary.filter((item) => item.status === 'found').length,
  give_up: summary.filter((item) => item.status === 'give_up').length,
  results: summary,
}

await writeFile(join(OUTPUT_ROOT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
console.log(`\nVERIFIED ${index.total}: found=${index.found}, give_up=${index.give_up}`)
