import { getRobotsText } from '@/lib/robots'

export const dynamic = 'force-static'

// Daum이 robots.txt에 공개하도록 발급한 사이트 확인 문구다. 로그인 PIN은 보관하지 않는다.
const DAUM_VERIFICATION = '#DaumWebMasterTool:d308ff65b2d43dcd805dfda97356c0961b72422683cb4110ddc38016500cbb48:UjR58tlt8ZMRZi79BVamzQ=='

export function GET() {
  return new Response(`${getRobotsText()}\n${DAUM_VERIFICATION}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
