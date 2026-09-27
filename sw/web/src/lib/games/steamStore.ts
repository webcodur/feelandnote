import { load } from 'cheerio'
import { matchesGameTitle, parseWon, steamAppId, type SteamEditionReference, type SteamPurchase } from './steamPurchase'

// 판매 페이지의 같은 작품·같은 구매 옵션만 읽는다. 위젯의 자동 패키지 선택을 쓰지 않는다.
export function readSteamStore(html: string, appId: string, names: readonly string[], editions: readonly SteamEditionReference[] = []): SteamPurchase | null {
  const $ = load(html)
  const canonical = $('link[rel="canonical"]').attr('href') ?? $('meta[property="og:url"]').attr('content') ?? ''
  if (steamAppId(canonical) !== appId) return null
  const notice = `${$('.error').text()} ${$('.notice_box_content').text()}`
  if (/unavailable in your region|no longer available|retired|removed from (?:the )?steam/i.test(notice)) return null

  const title = $('.apphub_AppName').first().text().trim()
    || ($('meta[property="og:title"]').attr('content') ?? '').replace(/^Save \d+% on /, '').replace(/ on Steam$/, '')
  const isOriginal = matchesGameTitle(title, names)
  const edition = isOriginal ? undefined : editions.find(entry => matchesGameTitle(title, entry.names))
  if (!isOriginal && !edition) return null
  const purchaseNames = edition?.names ?? names
  const result: SteamPurchase = {
    appId, url: `https://store.steampowered.com/app/${appId}/?cc=kr`,
    status: 'store', price: null, originalPrice: null, discountPercent: null,
    edition: edition ? { kind: edition.kind, title: edition.title } : null,
  }

  const options = $('.game_area_purchase_game').toArray().filter(element => {
    const heading = $(element).find('h1,h2').first().clone()
    heading.find('.bundle_label,.bundle_label_tooltip').remove()
    const text = heading.text().trim()
    return /^(Buy|Play) /.test(text) && matchesGameTitle(text.replace(/^(Buy|Play) /, ''), purchaseNames)
  })
  // 같은 이름의 구매 옵션이 여럿이어도 가격을 임의로 고르지 않는다.
  if (options.length === 1) {
    const option = $(options[0])
    const action = option.find('.game_purchase_action').text()
    const value = option.find('.discount_final_price,.game_purchase_price').first().text().trim()
    if (/^Free (?:To Play|to Play|to play)$/.test(value) && /Play Game/.test(action)) {
      return { ...result, status: 'free' }
    }
    const subId = option.find('input[name="subid"]').attr('value')
    if (subId && /^[1-9]\d*$/.test(subId) && /Add to Cart/.test(action)) {
      const price = parseWon(value)
      const original = parseWon(option.find('.discount_original_price').first().text())
      const discount = option.find('.discount_pct').first().text().trim().match(/^-(\d{1,2})%$/)
      const percent = discount ? Number(discount[1]) : null
      const validDiscount = price !== null && original !== null && original > price && percent !== null
        && Math.abs((1 - price / original) * 100 - percent) <= 1
      return { ...result, status: 'paid', price: price && price > 0 ? price : null,
        originalPrice: validDiscount ? original : null, discountPercent: validDiscount ? percent : null }
    }
  }
  // 검색 제외(unlisted)는 판매 중단과 다르다. 위에서 실제 구매 옵션을 확인한 경우만 살린다.
  if (/unlisted/i.test(notice)) return null
  if ($('.game_area_comingsoon').length && !$('.game_purchase_action').text().includes('Add to Cart')) {
    return { ...result, status: 'upcoming' }
  }
  // 연령 확인·복수 판본·가격 미확인은 구매 가능 여부를 단정하지 않고 작품 페이지만 안내한다.
  return result
}

export async function fetchSteamStore(fetcher: typeof fetch, appId: string, names: readonly string[], editions: readonly SteamEditionReference[] = []) {
  if (!/^[1-9]\d*$/.test(appId)) return null
  const response = await fetcher(`https://store.steampowered.com/app/${appId}/?cc=kr&l=english`, {
    signal: AbortSignal.timeout(8000), cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Steam store lookup failed: ${response.status}`)
  return readSteamStore(await response.text(), appId, names, editions)
}
