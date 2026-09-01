import assert from 'node:assert/strict'
import test from 'node:test'
import { clusterShotHandoffOf, sameImageCrop, type TimedCue } from '../src/compositions/Faction/timing'
import { cutKindOf } from '../src/compositions/Faction/utils'
import type { FactionPerson, FactionScript } from '../src/compositions/Faction/types'

/**
 * 단체샷 이어받기 — 단체샷 카드 바로 뒤 컷이 같은 사진·같은 맞춤으로 시작하면 단체샷 레이어를 이어 그린다.
 * 오디세이아 「출항」: 단체샷(odysseus.png) → 오디세우스 인물 컷(같은 사진)에서 줌이 튀며 전환처럼 보였다.
 */

const SHOT = 'shot.png'

function scriptWith(person: Partial<FactionPerson>, clusterCrop?: FactionPerson['imageCrop']): FactionScript {
  return {
    groups: [{
      name: '출항',
      clusters: [{ label: '귀향길에 오르다.', image: SHOT, imageCrop: clusterCrop, people: [{ name: '오디세우스', ...person }] }],
    }],
  } as unknown as FactionScript
}

const cluster: TimedCue = { cue: { kind: 'cluster', groupIndex: 0, clusterIndex: 0 }, start: 100, duration: 198 }
const personAt = (start: number): TimedCue => ({
  cue: { kind: 'person', groupIndex: 0, clusterIndex: 0, personIndex: 0, steps: {} as never },
  start,
  duration: 600,
})
const sceneAt = (start: number, scene: Partial<FactionPerson>): TimedCue => ({
  cue: { kind: 'scene', groupIndex: 0, clusterIndex: 0, scene: { isPerson: false, name: '장면', beats: [], ...scene } as FactionPerson },
  start,
  duration: 600,
})

test('같은 사진의 인물 컷은 단체샷 시작 프레임과 길이를 이어받는다', () => {
  assert.deepEqual(
    clusterShotHandoffOf(scriptWith({ image: SHOT }), cluster, personAt(298)),
    { groupIndex: 0, clusterIndex: 0, shotStart: 100, shotDuration: 198 },
  )
  // 사진을 안 정한 인물은 단체샷 사진을 쓰므로 똑같이 이어받는다.
  assert.ok(clusterShotHandoffOf(scriptWith({}), cluster, personAt(298)))
  // 같은 사진이면 인물 맞춤은 무시되고 단체샷 맞춤을 쓴다(personEntryMediaOf) — 그러므로 이어받는다.
  assert.ok(clusterShotHandoffOf(scriptWith({ image: SHOT, imageCrop: { x: 30, y: 50, scale: 1.2 } }), cluster, personAt(298)))
})

test('사진이 다르거나 단체샷과 붙어 있지 않으면 이어받지 않는다', () => {
  assert.equal(clusterShotHandoffOf(scriptWith({ image: 'other.png' }), cluster, personAt(298)), null)
  // 사이에 다른 컷이 끼면(시작이 단체샷 끝과 다르면) 이어받기 없음.
  assert.equal(clusterShotHandoffOf(scriptWith({ image: SHOT }), cluster, personAt(500)), null)
  assert.equal(clusterShotHandoffOf(scriptWith({ image: SHOT }), undefined, personAt(298)), null)
  // 앞 컷이 단체샷이 아니면 없음.
  assert.equal(clusterShotHandoffOf(scriptWith({ image: SHOT }), personAt(0), personAt(600)), null)
})

test('가로 인물 컷은 사진이 왼쪽 열에 들어가므로 이어받지 않는다 — 장면 컷은 가로에서도 이어받는다', () => {
  assert.equal(clusterShotHandoffOf(scriptWith({ image: SHOT }), cluster, personAt(298), 'landscape'), null)
  assert.ok(clusterShotHandoffOf(scriptWith({ image: SHOT }), cluster, personAt(298), 'portrait'))
  assert.ok(clusterShotHandoffOf(scriptWith({}), cluster, sceneAt(298, { image: SHOT }), 'landscape'))
})

test('장면 컷도 같은 사진·맞춤이면 이어받는다', () => {
  const script = scriptWith({}, { x: 40, y: 60 })
  assert.ok(clusterShotHandoffOf(script, cluster, sceneAt(298, { image: SHOT, imageCrop: { x: 40, y: 60 } })))
  assert.equal(clusterShotHandoffOf(script, cluster, sceneAt(298, { image: SHOT })), null)
  assert.equal(clusterShotHandoffOf(script, cluster, sceneAt(298, { image: 'cut.png', imageCrop: { x: 40, y: 60 } })), null)
})

test('이어받는 컷은 진입 전환(pixelate 등)을 걸지 않고 크로스페이드로 붙는다', () => {
  const script = { ...scriptWith({ image: SHOT }), transition: 'pixelate' } as FactionScript
  assert.equal(cutKindOf(script, cluster, personAt(298), 'portrait'), null)
  // 단체샷을 잇지 않는 인물 컷은 편 설정대로 전환한다.
  assert.equal(cutKindOf(script, undefined, personAt(298), 'portrait'), 'pixelate')
})

test('사진맞춤 비교는 미지정을 가운데·1배로 본다', () => {
  assert.equal(sameImageCrop(undefined, { x: 50, y: 50, scale: 1 }), true)
  assert.equal(sameImageCrop(undefined, { x: 50, y: 50, scale: 1.1 }), false)
})
