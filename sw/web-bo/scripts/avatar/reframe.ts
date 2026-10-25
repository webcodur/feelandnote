// 정수리·쇄골 실루엣 기준으로 재배치한다. --nobg는 기존 nobg 배치로 배경부터 지운다.
// R2·DB 등록은 upload-reframed.ts에서 별도로 실행한다.
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join, parse as parsePath } from 'node:path'
import { parseArgs } from 'node:util'
import { CELEB_AVATAR_ORIGINAL } from '@feelandnote/shared/constants/celeb-avatar-small'
import { AVATAR_SILHOUETTE_SPEC } from '../../src/lib/avatar-geometry'
import { computeReframeCrop } from '../../src/lib/avatar-reframe'
import { loadModels, anchorsOf, silhouetteOf } from './reframe-detection'
import { removeBackgrounds } from './reframe-nobg'
import { makeSheet, type Row } from './reframe-sheet'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    nobg: { type: 'boolean' }, sheet: { type: 'boolean' },
    'group-size': { type: 'string' }, help: { type: 'boolean' },
    'beard-bottom': { type: 'string' },
    'face-top': { type: 'string' },
  },
})
const usage = '사용법: npx tsx scripts/avatar/reframe.ts <입력폴더> <출력폴더> [--nobg] [--sheet] [--group-size <인원>] [--beard-bottom <원본 마지막 수염 행> [--face-top <원본 이마 상단 행>]]'
if (values.help || positionals.length !== 2) {
  console.log(usage)
  console.log('--nobg: 배경 제거 → 재배치. PNG·WebP 입력, 중간본 보존. NOBG_SPEED 기본 medium.')
  console.log('--beard-bottom: 직접 검수한 입력 원본의 수염 마지막 행(0부터). 단일 이미지·개인 얼굴만 허용.')
  console.log('--face-top: 긴 수염과 함께 보존할 이마 상단의 입력 행. 관모·머리 상단이 아니며 --beard-bottom과 함께만 사용.')
  process.exit(values.help ? 0 : 1)
}
const [inDir, outDir] = positionals.map((dir) => resolve(dir))
const wantNobg = !!values.nobg
const wantSheet = !!values.sheet
const groupSize = values['group-size'] === undefined ? 0 : Number(values['group-size'])
const beardBottom = values['beard-bottom'] === undefined ? undefined : Number(values['beard-bottom'])
const faceTop = values['face-top'] === undefined ? undefined : Number(values['face-top'])
if (values['group-size'] !== undefined && (!Number.isInteger(groupSize) || groupSize < 2)) {
  throw new Error('--group-size 는 2 이상의 정수여야 한다')
}
if (beardBottom !== undefined && (!Number.isInteger(beardBottom) || beardBottom < 0)) {
  throw new Error('--beard-bottom 은 검수한 수염 마지막 행의 0 이상 정수 좌표여야 한다')
}
if (beardBottom !== undefined && groupSize) throw new Error('--beard-bottom 은 그룹 입력에 적용할 수 없다')
if (faceTop !== undefined && (!values['face-top']?.trim() || !Number.isInteger(faceTop) || faceTop < 0)) {
  throw new Error('--face-top 은 직접 검수한 이마 상단의 0 이상 정수 좌표여야 한다')
}
if (faceTop !== undefined && beardBottom === undefined) throw new Error('--face-top 은 --beard-bottom 과 함께 사용해야 한다')

async function main() {
  const files = readdirSync(inDir).filter((f) => /\.(webp|png)$/i.test(f) && !f.startsWith('_')).sort()
  if (!files.length) throw new Error('재배치할 이미지가 없다')
  if (beardBottom !== undefined && files.length !== 1) throw new Error('--beard-bottom 은 단일 이미지 입력에만 적용한다')
  if (resolve(inDir) === resolve(outDir)) throw new Error('입력과 출력 폴더는 달라야 한다')
  const names = files.map((file) => parsePath(file).name.toLowerCase())
  if (new Set(names).size !== names.length) throw new Error('확장자를 제외한 파일명이 중복된다')
  if (wantNobg && existsSync(outDir) && readdirSync(outDir).length) {
    throw new Error('--nobg 출력 폴더는 비어 있어야 한다. 새 폴더를 지정하라')
  }
  const sources = new Map(files.map((file) => [parsePath(file).name, join(inDir, file)]))
  const processed = wantNobg ? await removeBackgrounds(files, inDir, outDir) : null
  await loadModels()
  mkdirSync(outDir, { recursive: true })
  console.log(`재배치 대상 ${files.length}장`)
  const rows: (Row & { beardBottom?: number; faceTop?: number })[] = []
  for (const file of files) {
    const name = parsePath(file).name
    const buf = readFileSync(processed?.get(file) ?? join(inDir, file))
    try {
      const sil = await silhouetteOf(buf)
      if (!sil) {
        rows.push({ name, error: '투명 배경이 아니거나 실루엣 없음' })
        console.log(`  ${name} — 실루엣 없음, 건너뜀`)
        continue
      }
      const anchors = await anchorsOf(buf, groupSize)
      if (!anchors) {
        rows.push({ name, error: '얼굴 미검출' })
        console.log(`  ${name} — 얼굴 미검출, 건너뜀`)
        continue
      }
      if (groupSize) {
        if (sil.W !== sil.H) throw new Error('그룹 입력은 멤버 전체를 담은 정사각이어야 한다')
        // 개인의 눈~턱 비율로 그룹을 확대하면 다른 멤버가 잘린다. 검수된 전체 정사각을 보존한다.
        await sharp(buf)
          .resize(CELEB_AVATAR_ORIGINAL.sizePx, CELEB_AVATAR_ORIGINAL.sizePx, { kernel: 'lanczos3' })
          .webp({ quality: CELEB_AVATAR_ORIGINAL.webpQuality })
          .toFile(join(outDir, name + '.webp'))
        rows.push({
          name,
          faceCount: anchors.faceCount,
          crop: { left: 0, top: 0, size: sil.W },
          spanRatio: +(Math.abs(anchors.chinY - anchors.eyeY) / sil.H).toFixed(3),
          eyeLine: +(anchors.eyeY / sil.H).toFixed(3),
          headroom: +(sil.headTop / sil.H).toFixed(3),
          decidedBy: 'group-square',
          upscale: +(CELEB_AVATAR_ORIGINAL.sizePx / sil.W).toFixed(2),
          warnings: [],
        })
        console.log(`  ${name} — 그룹 ${anchors.faceCount}명 확인, 전체 정사각 보존 (개인 기하 기준 미적용)`)
        continue
      }
      const crop = computeReframeCrop(anchors, sil, sil.W, sil.H, { beardBottom, faceTop })
      // 좌우로 원본 밖으로 나간 만큼 투명으로 넓힌 뒤 자른다.
      // sharp는 한 파이프라인 안에서 extend를 extract 뒤에 적용하므로 넓히기를 별도 단계로 끝내고 자른다.
      const padL = Math.max(0, -crop.left)
      const padR = Math.max(0, crop.left + crop.size - sil.W)
      const canvas =
        padL || padR
          ? await sharp(buf)
              .ensureAlpha()
              .extend({ left: padL, right: padR, top: 0, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer()
          : buf
      await sharp(canvas)
        .extract({ left: crop.left + padL, top: crop.top, width: crop.size, height: crop.size })
        .resize(CELEB_AVATAR_ORIGINAL.sizePx, CELEB_AVATAR_ORIGINAL.sizePx, { kernel: 'lanczos3' })
        .webp({ quality: CELEB_AVATAR_ORIGINAL.webpQuality })
        .toFile(join(outDir, name + '.webp'))
      const row: Row & { beardBottom?: number; faceTop?: number } = {
        name,
        ...(beardBottom === undefined ? {} : { beardBottom }),
        ...(faceTop === undefined ? {} : { faceTop }),
        crop: { left: crop.left, top: crop.top, size: crop.size },
        spanRatio: +crop.spanRatio.toFixed(3),
        eyeLine: +crop.eyeLine.toFixed(3),
        emphasis: +anchors.emphasis.toFixed(2),
        headroom: +((sil.headTop - crop.top) / crop.size).toFixed(3),
        decidedBy: crop.decidedBy,
        upscale: +(CELEB_AVATAR_ORIGINAL.sizePx / crop.size).toFixed(2),
        warnings: crop.warnings,
      }
      rows.push(row)
      console.log(
        `  ${name.padEnd(24)} 눈~턱 ${(row.spanRatio! * 100).toFixed(1).padStart(5)}%  눈높이 ${(row.eyeLine! * 100).toFixed(1).padStart(5)}%  정수리여백 ${(row.headroom! * 100).toFixed(1).padStart(5)}%  x${row.upscale}  ${row.decidedBy}` +
          (Math.abs(anchors.emphasis) > AVATAR_SILHOUETTE_SPEC.emphasis.deadZone
            ? `  ${anchors.emphasis > 0 ? '왼쪽' : '오른쪽'} 부각 ${Math.abs(anchors.emphasis).toFixed(2)}`
            : '') +
          (crop.warnings.length ? `  ! ${crop.warnings.join(' / ')}` : '')
      )
    } catch (e) {
      rows.push({ name, error: e instanceof Error ? e.message : String(e) })
      console.log(`  ${name} — 실패: ${e instanceof Error ? e.message : e}`)
    }
  }
  writeFileSync(join(outDir, '_report.json'), JSON.stringify(rows, null, 2))
  const done = rows.filter((r) => r.crop)
  const warned = done.filter((r) => r.warnings?.length)
  console.log(`\n완료 ${done.length} / ${rows.length}  ·  경고 ${warned.length}  ·  건너뜀 ${rows.length - done.length}`)
  if (wantSheet) await makeSheet(rows, sources, outDir)
  if (rows.some((row) => row.error)) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
