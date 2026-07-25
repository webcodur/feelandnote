import type { NextConfig } from 'next'

const config: NextConfig = {
  // remotion 워크스페이스 소스(BookCard 등)와 shared 공용 부품(bo/*)을 직접 import 하므로 트랜스파일 대상에 포함
  transpilePackages: ['@feelandnote/remotion', '@feelandnote/shared'],
}

export default config
