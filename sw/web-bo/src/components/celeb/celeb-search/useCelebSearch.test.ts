import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldCloseCelebSearch } from './useCelebSearch'

function targetWithClosest(matchesModal: boolean): EventTarget {
  return {
    closest: () => matchesModal ? {} : null,
  } as unknown as EventTarget
}

function rootContaining(insideTarget: EventTarget | null): HTMLDivElement {
  return {
    contains: (target: Node | null) => target === insideTarget,
  } as unknown as HTMLDivElement
}

test('검색 결과에서 연 포털 모달을 조작해도 검색대를 닫지 않는다', () => {
  const resultTarget = targetWithClosest(false)
  const modalTarget = targetWithClosest(true)
  const outsideTarget = targetWithClosest(false)
  const root = rootContaining(resultTarget)

  assert.equal(shouldCloseCelebSearch(root, resultTarget), false)
  assert.equal(shouldCloseCelebSearch(root, modalTarget), false)
  assert.equal(shouldCloseCelebSearch(root, outsideTarget), true)
})
