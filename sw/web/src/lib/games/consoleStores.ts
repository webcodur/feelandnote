import { load } from 'cheerio'
import type { AccessLink } from '../commerce/contentAccess'
import { ACCESS_TIMEOUT_MS } from '../commerce/contentAccess'
import { consoleUrl, gameNames, type ConsoleReference } from './consoleReferences'
import { matchesGameTitle } from './steamPurchase'

type JsonRecord = Record<string, unknown>
const record = (value: unknown): value is JsonRecord => !!value && typeof value === 'object' && !Array.isArray(value)

function editionTitle(title: string, reference: ConsoleReference) {
  const suffix = title.match(/\s+\(((?:[^()]|\([^()]*\))+)\)$/)
  const languages = /^(?:한국어판|영어판|한국어|영어|일본어|중국어(?:\((?:간체자|번체자)\))?|태국어|스페인어|프랑스어|독일어|이탈리아어|네덜란드어|러시아어|포르투갈어|아랍어)$/
  const clean = suffix && suffix[1].split(', ').every(value => languages.test(value)) ? title.slice(0, suffix.index) : title
  return reference.edition || !matchesGameTitle(clean, gameNames(reference.game)) ? clean : ''
}

function products(html: string): JsonRecord[] {
  const $ = load(html)
  const all: JsonRecord[] = []
  function visit(value: unknown) {
    if (Array.isArray(value)) return value.forEach(visit)
    if (!record(value)) return
    if ([value['@type']].flat().includes('Product')) all.push(value)
    if (value['@graph']) visit(value['@graph'])
  }
  $('script[type="application/ld+json"]').each((_, el) => {
    try { visit(JSON.parse($(el).text())) } catch { /* 다른 구조화 데이터는 건너뛴다. */ }
  })
  return all
}

export function parseConsoleStore(html: string, finalUrl: string, reference: ConsoleReference): AccessLink | null {
  if (!reference.url || consoleUrl(finalUrl)?.url !== consoleUrl(reference.url)?.url) return null
  const product = products(html).find(value => typeof value.name === 'string' && record(value.offers))
  if (!product || !record(product.offers)) return null
  const offer = product.offers
  if (offer.priceCurrency !== 'KRW' || typeof offer.price !== 'number' || offer.price < 0) return null
  const $ = load(html)
  let platforms: string[]
  if (reference.store === 'xbox') {
    if (offer.availability !== 'https://schema.org/InStock') return null
    if (typeof product.url !== 'string' || consoleUrl(product.url)?.url !== consoleUrl(reference.url)?.url) return null
    platforms = (Array.isArray(product.gamePlatform) ? product.gamePlatform : [])
      .filter((value): value is string => typeof value === 'string' && /^(?:XBOX (?:One|Series)|PC$)/i.test(value))
      .map(value => value.replace(/^XBOX/, 'Xbox'))
  } else {
    platforms = [...new Set($('[data-qa*="platform"]').text().match(/PS[45]/g) ?? [])]
  }
  if (!platforms.length) return null
  // 스토어가 실제로 선택한 판본 제목을 남긴다. 콘솔 가격 비교는 제공하지 않는다.
  return { service: reference.store, url: reference.url, title: editionTitle(String(product.name), reference), platforms, edition: reference.edition }
}

function nintendoUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'store.nintendo.co.kr' && /^\/700100\d+\/?$/.test(url.pathname)
      ? `${url.origin}${url.pathname.replace(/\/$/, '')}` : null
  } catch { return null }
}

export function findNintendoProducts(html: string, names: readonly string[]): string[] {
  const $ = load(html)
  return [...new Set($('.product-item-link').toArray().flatMap(el => {
    const url = nintendoUrl($(el).attr('href') ?? '')
    return url && matchesGameTitle($(el).text().trim(), names) ? [url] : []
  }))]
}

export function parseNintendoProduct(html: string, url: string, reference: ConsoleReference): AccessLink | null {
  const safeUrl = nintendoUrl(url)
  if (!safeUrl) return null
  const $ = load(html)
  const title = $('h1').first().text().trim()
  if (!matchesGameTitle(title, gameNames(reference.game)) || !$('.stock.available').length || $('.stock.unavailable').length) return null
  // 서비스가 후속작으로 교체된 뒤 옛 이름으로 돌아오기도 한다. 상점의 개명 고지가
  // 다른 작품을 가리키면 동명 검색만으로 원작의 판매 상품이라고 판단하지 않는다.
  const renamedFrom = $('.mfr_notice').text().match(/게임 타이틀이\s*['‘「]([^'’」]+)['’」]에서/)?.[1]
  if (renamedFrom && !matchesGameTitle(renamedFrom, gameNames(reference.game))) return null
  const platform = $('.product-attribute.label_platform_attr').text().match(/Nintendo Switch(?: 2)?/)?.[0]
  if (!platform || !reference.game.platforms?.some(value => value.name === platform)) return null
  return { service: 'nintendo', url: safeUrl, title: editionTitle(title, reference), platforms: [platform], edition: reference.edition }
}

async function readPage(fetcher: typeof fetch, url: string) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(ACCESS_TIMEOUT_MS), headers: { 'User-Agent': 'Feelandnote/1.0', 'Accept-Language': 'ko-KR,ko;q=0.9' } })
  if (response.status === 404 || response.status === 410) return null
  if (!response.ok) throw new Error(`Store unavailable: ${response.status}`)
  return { html: await response.text(), url: response.url }
}

export async function fetchConsoleLinks(fetcher: typeof fetch, reference: ConsoleReference): Promise<AccessLink[]> {
  if (reference.store !== 'nintendo') {
    const page = await readPage(fetcher, reference.url!)
    const link = page && parseConsoleStore(page.html, page.url, reference)
    return link ? [link] : []
  }
  // 국가별 NSUID는 같지 않다. 한국 공식 제목과 원제로 한국 스토어를 조회하고 제목·기종을 다시 대조한다.
  const koName = reference.game.game_localizations?.find(value => /Korea/i.test(value.region?.name ?? ''))?.name
  const queries = [...new Set([koName, reference.game.name].filter((name): name is string => !!name))]
  for (const query of queries) {
    const page = await readPage(fetcher, `https://store.nintendo.co.kr/catalogsearch/result/?q=${encodeURIComponent(query)}`)
    const urls = page ? findNintendoProducts(page.html, gameNames(reference.game)) : []
    const links = await Promise.all(urls.slice(0, 4).map(async url => {
      const detail = await readPage(fetcher, url)
      return detail ? parseNintendoProduct(detail.html, detail.url, reference) : null
    }))
    const matched = links.filter((link): link is AccessLink => !!link)
    // 같은 이름·같은 기종으로 상품이 둘이면 동명이작/판본을 구별할 근거가 부족하다.
    const found = matched.filter(link => matched.filter(other => other.platforms[0] === link.platforms[0]).length === 1)
    if (found.length) return found
  }
  return []
}
