import { promisify } from 'node:util'
import { gzip, gunzip } from 'node:zlib'

const compress = promisify(gzip)
const decompress = promisify(gunzip)

/** 큰 공개 목록도 Next의 2MB 항목 한도 안에 저장하도록 JSON을 압축한다. */
export async function encodeCacheJson(value: unknown): Promise<string> {
  return (await compress(JSON.stringify(value))).toString('base64')
}

export async function decodeCacheJson<T>(stored: string): Promise<T> {
  return JSON.parse((await decompress(Buffer.from(stored, 'base64'))).toString('utf8')) as T
}
