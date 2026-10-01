import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractCoverPalette } from './coverPalette'

const pixels = (rgb: number[], count: number) => Array.from({ length: count }, () => [...rgb, 255]).flat()
test('red and blue covers produce their own hues', () => {
  const red = extractCoverPalette(pixels([200, 30, 20], 20))!
  const blue = extractCoverPalette(pixels([20, 60, 200], 20))!
  assert.equal(red[1], '#c81e14')
  assert.equal(blue[1], '#143cc8')
  assert.notDeepEqual(red, blue)
})
test('white margins do not replace the cover color', () => {
  assert.equal(extractCoverPalette([...pixels([255, 255, 255], 200), ...pixels([30, 150, 80], 25)])![1], '#1e9650')
})
test('monochrome covers remain monochrome and transparency has no palette', () => {
  const palette = extractCoverPalette(pixels([100, 100, 100], 20))!
  assert(palette.every((color) => color.slice(1, 3) === color.slice(3, 5) && color.slice(3, 5) === color.slice(5, 7)))
  assert.equal(extractCoverPalette([255, 150, 0, 0]), null)
  assert.equal(extractCoverPalette([]), null)
})
