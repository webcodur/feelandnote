import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeSceneArtwork, validateSceneDraft, stableArtworkJSON } from './faction-scene-editor'
import { toSceneImages, type FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'

const scene = (name: string): FactionTeamImage => ({ kind: 'scene', url: `https://assets.test/${name}.webp`, label: name, caption: '설명', labelEn: name, captionEn: 'Caption' })
const cover = { url: 'https://assets.test/myth/title-art/cover.png', caption: '시작' }

test('jsonb의 객체 키 재정렬은 충돌로 오인하지 않고 장면 순서 변경은 구별한다', () => {
  assert.equal(stableArtworkJSON([{ url: 'x', ending: { title: 't', text: 'b' } }]), stableArtworkJSON([{ ending: { text: 'b', title: 't' }, url: 'x' }]))
  assert.notEqual(stableArtworkJSON([scene('one'), scene('two')]), stableArtworkJSON([scene('two'), scene('one')]))
})

test('순서를 바꾸고 장면을 추가해도 다른 단체 사진·확장 필드·원본 배열을 보존한다', () => {
  const raw = [cover, 'https://assets.test/legacy.png', scene('one'), { url: 'https://assets.test/group.png', extra: 'keep' }, scene('two')]
  const original = structuredClone(raw)
  const result = mergeSceneArtwork(raw, [scene('two'), scene('one'), scene('three')], { ...cover, caption: '수정' }, true)
  assert.deepEqual(raw, original)
  assert.equal(result[1], raw[1])
  assert.deepEqual(result[3], raw[3])
  assert.deepEqual(toSceneImages(result, 'ko').map(x => x.label), ['two', 'one', 'three'])
})

test('장면을 모두 지워도 기존 사진은 남고, 표지는 메타데이터를 잃지 않고 설명을 비울 수 있다', () => {
  const raw = [{ ...cover, custom: 'keep' }, scene('one'), 'https://assets.test/group.png']
  assert.deepEqual(mergeSceneArtwork(raw, [], { url: cover.url }, true), [{ url: cover.url, custom: 'keep' }, raw[2]])
})

test('표지 없는 신화의 단체 사진을 표지로 오인하거나 지우지 않는다', () => {
  const group = { url: 'https://assets.test/group.png', label: '단체' }
  assert.deepEqual(mergeSceneArtwork([group], [scene('one')], cover, true), [cover, group, scene('one')])
  assert.deepEqual(mergeSceneArtwork([cover, group], [], null, true), [group])
})

test('기존 가로 이미지와 번역 전 장면을 저장하고 언어별 노출 규칙을 유지한다', () => {
  const draft = { ...scene('one'), labelEn: '', captionEn: '' }
  assert.equal(validateSceneDraft([draft], cover, true), null)
  const saved = mergeSceneArtwork([], [draft], cover, true)
  assert.equal(toSceneImages(saved, 'ko').length, 1)
  assert.equal(toSceneImages(saved, 'en').length, 0)
})

test('저장 중 조용히 유실될 불완전 엔딩과 잘못된 주소를 거절한다', () => {
  const last = { ...scene('one'), ending: { title: '이후', text: '' } }
  assert.ok(validateSceneDraft([last], null, true))
  last.ending.text = '후속 이야기'
  assert.equal(validateSceneDraft([last], null, true), null)
  assert.ok(validateSceneDraft([last, scene('two')], null, true))
  assert.ok(validateSceneDraft([{ ...scene('one'), url: 'javascript:alert(1)' }], null, true))
})
