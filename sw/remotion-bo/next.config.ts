import type { NextConfig } from 'next'

const config: NextConfig = {
  // remotion 워크스페이스 소스(BookCard 등)를 직접 import 하므로 트랜스파일 대상에 포함
  transpilePackages: ['@feelandnote/remotion'],
}

export default config
