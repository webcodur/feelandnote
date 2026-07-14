import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto'

/**
 * 익명 자유게시판 전용 유틸.
 * 4자리 비밀번호로 본인 글·댓글을 관리한다. 원문 비밀번호와 IP는 저장하지 않고 해시만 남긴다.
 */

// 4자리 숫자 비밀번호 형식 검사
export function isValidAnonPassword(pw: string): boolean {
  return /^[0-9]{4}$/.test(pw)
}

// 비밀번호 해시 (글마다 다른 salt) → "salt:hash"
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pw, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

// 비밀번호 대조 (timing-safe)
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = scryptSync(pw, salt, 32)
  const orig = Buffer.from(hash, 'hex')
  return orig.length === test.length && timingSafeEqual(orig, test)
}

// IP 해시 (도배 방지·추적용, 원문 IP 저장 안 함)
const IP_SALT = process.env.ANON_IP_SALT ?? 'feelandnote-free-board'
export function hashIp(ip: string | null): string | null {
  if (!ip) return null
  return createHash('sha256').update(IP_SALT + ip).digest('hex')
}
