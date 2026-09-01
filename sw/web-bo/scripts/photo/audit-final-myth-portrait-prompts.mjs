/** 최종 신화 초상화 발주서의 생성 필드와 참조 파일을 엄격히 검사한다. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트')
const PROMPTS = path.join(ROOT, 'portrait-prompts.json')
const REPORT = path.join(ROOT, '_agy-tradition-rework-final', 'final-audit.json')
const MODERN_HAIR = /\b(fade|high-and-tight|undercut|pompadour|crew cut|buzz cut|pixie|bob|wolf cut|mullet|salon|streetwear|face-framing|modern side part|contemporary fringe|slick|sleek|ponytail|crown braid|chignon|jaw-level|crop cut|blowout)\b/iu
const DEGRADING = /\b(ugly|haggard|cadaveric|sickly|deformed|grotesque|decayed|corpse-like|emaciated|rotting|weathered|rugged|feral|untamed|grizzled|sorrow-stricken|battle-hardened|haunting)\b/iu
const BAD_COSTUME = /\b(gorget|pectoral|epaulets?|pauldrons?|neck[- ]guard|collar plate|chestplate|breastplate|chest protector|chest harness|upper chest|across the chest|over the chest|collarbones?|torso|high[- ]neck(?:ed)?|high collar|tailored|tailoring|leather jerkin|plate armor|fantasy armor)\b/iu
const FACIAL_HAIR_DECISION = /\b(beard|bearded|moustache|mustache|goatee|whiskers|clean-shaven|clean shaven|no facial hair|no human facial hair|facial plumage|muzzle fur|muzzle scales|beak feathers|beak plumage|rictal bristles)\b/iu

function normalized(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/gu, ' ').trim()
}

function main() {
  const data = JSON.parse(readFileSync(PROMPTS, 'utf8'))
  const prompts = data.prompts ?? []
  const errors = []
  const warnings = []
  const ids = new Set()
  const slugs = new Set()
  const traditions = new Set()
  const exact = {
    impression_en: new Map(),
    hair_en: new Map(),
    costume_en: new Map(),
    prompt: new Map(),
  }

  for (const item of prompts) {
    const appearance = item.appearance_direction ?? {}
    const impression = appearance.impression_en ?? ''
    const hair = appearance.hair_en ?? ''
    const facial = appearance.facial_hair_en ?? ''
    const costume = item.art_direction?.costume_en ?? ''
    const lighting = item.art_direction?.lighting_background_en ?? ''
    const pose = item.art_direction?.pose_expression_en ?? ''
    const mythic = item.art_direction?.mythic_treatment_en ?? ''
    if (ids.has(item.target_id)) errors.push(`${item.slug}: target_id 중복`)
    if (slugs.has(item.slug)) errors.push(`${item.slug}: slug 중복`)
    ids.add(item.target_id)
    slugs.add(item.slug)
    traditions.add(item.tradition)
    if (item.reference_image && !existsSync(item.reference_image)) errors.push(`${item.slug}: 참조 파일 없음 ${item.reference_image}`)
    if (item.iconography_reference_image && !existsSync(item.iconography_reference_image)) {
      errors.push(`${item.slug}: 신화 도상 참조 파일 없음 ${item.iconography_reference_image}`)
    }
    if (item.tradition === 'myth-japan' && !item.iconography_reference_image) {
      errors.push(`${item.slug}: 일본 신화 개별 도상 참조 누락`)
    }
    if (!impression || !hair || !facial || !costume) errors.push(`${item.slug}: 생성 필드 누락`)
    if (MODERN_HAIR.test(hair)) errors.push(`${item.slug}: 현대 헤어 표현 ${hair}`)
    if (DEGRADING.test(`${impression} ${hair} ${facial} ${costume}`)) errors.push(`${item.slug}: 인상 저하 표현`)
    if (BAD_COSTUME.test(costume)) errors.push(`${item.slug}: 크롭·복식 금지 표현 ${costume}`)
    if (BAD_COSTUME.test(`${lighting} ${pose} ${mythic}`)) errors.push(`${item.slug}: 보조 연출의 폐기 복식 표현`)
    if (DEGRADING.test(`${lighting} ${pose} ${mythic}`)) errors.push(`${item.slug}: 보조 연출의 인상 저하 표현`)
    if (!FACIAL_HAIR_DECISION.test(facial)) errors.push(`${item.slug}: 수염·안면 피복 결정 누락`)
    if (/\b(avoid|without|never|do not|don't|no modern|not modern|free of)\b/iu.test(`${impression} ${hair} ${costume}`)) {
      errors.push(`${item.slug}: 긍정형 생성 지시 위반`)
    }
    if (/\b(silver|white|grey|gray|aged|elderly|mature)\b/iu.test(`${impression} ${hair} ${facial}`)) {
      warnings.push(`${item.slug}: 나이·백발 표현 수동 확인`)
    }
    for (const [field, seen] of Object.entries(exact)) {
      const value = normalized(field === 'prompt' ? item.prompt : field === 'costume_en' ? costume : appearance[field])
      if (seen.has(value)) errors.push(`${item.slug}: ${field} 완전 중복 (${seen.get(value)})`)
      else seen.set(value, item.slug)
    }
  }

  if (prompts.length !== 198) errors.push(`인물 수 오류 ${prompts.length}/198`)
  if (traditions.size !== 17) errors.push(`전승 수 오류 ${traditions.size}/17`)
  const report = {
    checked_at: new Date().toISOString(),
    prompts: prompts.length,
    traditions: traditions.size,
    face_references_checked: prompts.filter((item) => item.reference_image).length,
    iconography_references_checked: prompts.filter((item) => item.iconography_reference_image).length,
    errors,
    warnings,
    usable: errors.length === 0,
  }
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
  if (errors.length > 0) process.exitCode = 1
}

main()
