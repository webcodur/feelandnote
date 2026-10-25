import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { decodeHtmlEntities } from '../../../../packages/content-search/src/html-entities.ts'
import { publicUrl, BIO_AUDIT, validateResult } from './bio-audit-contract.mjs'

// Retry missing evidence, not the same blocked URLs. Models still make the factual judgment.
export async function researchEvidence(person, feedback, { discover, assess, collect = fetchSource, onSources = () => {} }) {
  const attempted = new Set(), materials = [], failures = []
  let result, validationError, supplement = ''
  for (let round = 0; round < 2; round++) {
    const context = [feedback, supplement, attempted.size && `이미 시도한 URL(재요청 금지): ${JSON.stringify([...attempted])}`].filter(Boolean).join('\n')
    const found = await discover(context)
    if (found.id !== person.id || !Array.isArray(found.urls)) throw new Error('Discovery identity or URL list mismatch')
    const urls = [...new Set(found.urls)].filter(url => publicUrl(url) && !attempted.has(url))
      .slice(0, Math.min(3, BIO_AUDIT.maxSources - attempted.size))
    urls.forEach(url => attempted.add(url))
    const fetched = await Promise.allSettled(urls.map(url => collect(url)))
    fetched.forEach((item, index) => {
      if (item.status === 'fulfilled') materials.push(item.value)
      else failures.push({ url: urls[index], reason: String(item.reason?.message || item.reason).slice(0, 150) })
    })
    onSources({ round: round + 1, requested: urls.length, readable: materials.length, failures })
    if (materials.length && (urls.length || !result)) {
      result = await assess(materials, context)
      validationError = null
      try { assertGrounding(validateResult(result, person), materials) } catch (error) { validationError = error }
    }
    const missing = result?.currentClaims?.filter(claim => claim.verdict === 'UNVERIFIED').map(claim => claim.claim) || []
    if (result && !validationError && result.decision !== 'HOLD' && !missing.length) return result
    supplement = `보완 조사: ${JSON.stringify({ missing, reason: result?.reason || found.notes,
      validation: validationError?.message, failures })}. 부족한 주장을 직접 확인할 다른 실제 원문을 찾아라. 핵심 활동을 삭제하여 근거 부족을 숨기지 않는다.`
  }
  if (validationError) throw validationError
  return result || { id: person.id, slug: person.slug, decision: 'HOLD',
    reason: `보완 검색 후에도 실제 원문을 확보하지 못함. ${JSON.stringify(failures)}`,
    issues: ['원문 수집 실패'], bio: '', bio_en: '', sources: [], currentClaims: [], claims: [], selfCheck: {} }
}

const MAX_BYTES = 8_000_000, MAX_TEXT = 80_000
export const normalizeSourceText = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim()
export function pageText(html) {
  const title = decodeHtmlEntities(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, ' ') || '')
  let body = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    || html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html
  body = body.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(?:p|div|section|h[1-6]|li|tr)>|<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return { title: normalizeSourceText(title), text: normalizeSourceText(decodeHtmlEntities(body)) }
}
function privateAddress(address) {
  const value = address.toLowerCase()
  if (isIP(value) === 6) return !/^[23][0-9a-f]{0,3}:/i.test(value)
  return /^(0\.|10\.|127\.|169\.254\.|192\.168\.|192\.0\.|198\.(18|19)\.|22[4-9]\.|2[3-5]\d\.)/.test(value)
    || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(value)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(value)
}
async function safeAddress(url) {
  if (!publicUrl(url)) throw new Error('Non-public source URL')
  const addresses = await lookup(new URL(url).hostname, { all: true })
  if (!addresses.length || addresses.some(item => privateAddress(item.address))) throw new Error('Non-public source address')
}
export async function fetchSource(rawUrl, options = {}) {
  let url = rawUrl, response
  for (let redirects = 0; redirects < 5; redirects++) {
    await safeAddress(url)
    response = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'FeelAndNote-BioAudit/1.0 (public-source verification)' }, signal: AbortSignal.timeout(20_000) })
    if (![301, 302, 303, 307, 308].includes(response.status)) break
    await response.body?.cancel()
    if (!response.headers.get('location')) throw new Error('Redirect without a location')
    url = new URL(response.headers.get('location'), url).toString()
  }
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Source HTTP ${response.status}`) }
  if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw new Error('Source exceeds size limit') }
  const chunks = []; let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > MAX_BYTES) throw new Error('Source exceeds size limit')
    chunks.push(chunk)
  }
  const bytes = Buffer.concat(chunks), type = response.headers.get('content-type') || ''
  let parsed
  if (/pdf/i.test(type) || bytes.subarray(0, 4).toString() === '%PDF') {
    const extracted = spawnSync('py', ['-3.12', '-X', 'utf8', '-c',
      'import sys,pymupdf; d=pymupdf.open(stream=sys.stdin.buffer.read(),filetype="pdf"); print("\\n".join(p.get_text() for p in d))'],
    { input: bytes, windowsHide: true, timeout: 30_000, maxBuffer: 4_000_000 })
    if (extracted.status !== 0) throw new Error('PDF text extraction failed')
    parsed = { title: new URL(url).pathname.split('/').pop(), text: normalizeSourceText(extracted.stdout.toString('utf8')) }
  } else if (/html|text|xml|json/i.test(type)) {
    const charset = type.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]
      || bytes.subarray(0, 4000).toString('ascii').match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] || 'utf-8'
    let text
    try { text = new TextDecoder(charset).decode(bytes) } catch { text = bytes.toString('utf8') }
    parsed = pageText(text)
  }
  else throw new Error('Unsupported source content type')
  if (parsed.text.length < 120 || /verify you are human|access denied|captcha|just a moment/i.test(parsed.title)) throw new Error('Source returned a block or empty page')
  return { url, requestedUrl: rawUrl, title: parsed.title || new URL(url).hostname,
    text: parsed.text.slice(0, options.maxText || MAX_TEXT), truncated: parsed.text.length > (options.maxText || MAX_TEXT),
    fetchedAt: new Date().toISOString(), contentHash: createHash('sha256').update(parsed.text).digest('hex') }
}
export function assertGrounding(result, fetched) {
  result.sources = (result.sources || []).map(source => {
    const actual = fetched.find(item => item.url === source.url || item.requestedUrl === source.url)
    if (!actual) throw new Error('A cited source was not actually fetched')
    const excerpt = normalizeSourceText(source.excerpt)
    if (excerpt.length < 15 || !normalizeSourceText(actual.text).includes(excerpt)) throw new Error(`Evidence excerpt does not occur literally in fetched source: ${source.url}`)
    return { ...source, opened: true, contentHash: actual.contentHash, fetchedAt: actual.fetchedAt }
  })
  return result
}
