import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchCountries, getCountryName, getCountryNameByLocale, getCountryNameAsync, getCountryNamesMap, isCountryCode } from '@feelandnote/shared/lib/countries'

test('all country name interfaces normalize codes and resolve historical nationalities consistently', async () => {
  for (const [code, name, english] of [
    ['KR', '대한민국', 'South Korea'], ['XK', '코소보', 'Kosovo'],
    ['CS', '체코슬로바키아', 'Czechoslovakia'], ['SU', '소련', 'Soviet Union'],
  ]) {
    assert.equal(getCountryName(code), name)
    assert.equal(getCountryNameByLocale(` ${code.toLowerCase()} `, 'ko'), name)
    assert.equal(getCountryNameByLocale(code, 'en'), english)
    assert.equal(await getCountryNameAsync(code), name)
    assert.deepEqual(await getCountryNamesMap([code]), { [code]: name })
  }
})

test('country lists contain the current supported codes while historical and unknown values are not visitor countries', async () => {
  const countries = await fetchCountries()
  for (const code of ['KR', 'XK', 'BV', 'GS', 'HM', 'UM']) {
    assert.ok(countries.some(country => country.code === code))
    assert.ok(isCountryCode(` ${code.toLowerCase()} `))
    assert.notEqual(getCountryName(code), code)
  }
  for (const code of ['SU', 'CS', 'XX', 'ZZ', 'EU', 'en', 'K1']) assert.equal(isCountryCode(code), false)
})

test('unresolved codes do not leak into labels and existing written names are preserved', () => {
  assert.equal(getCountryNameByLocale('ZZ', 'ko'), '미확인')
  assert.equal(getCountryNameByLocale('ZZ', 'en'), 'Unknown')
  assert.equal(getCountryNameByLocale('K1', 'en'), 'Unknown')
  assert.equal(getCountryNameByLocale('Germany', 'en'), 'Germany')
  assert.equal(getCountryNameByLocale('영국', 'ko'), '영국')
  assert.equal(getCountryNameByLocale('  ', 'en'), '')
})
