/*
  파일명: /app/api/deployment/route.ts
  기능: 지금 돌고 있는 서버의 배포 식별자
  책임: 브라우저가 자기 번들에 박힌 값과 비교해 낡은 탭인지 판별하게 한다.

  값은 빌드 때 `NEXT_DEPLOYMENT_ID`로 박힌다(next.config.ts의 env). 그래서 이
  응답은 파일을 내려준 그 빌드의 값이고, 새 배포가 뜨면 자연히 다른 값이 된다.
  배포 스크립트를 거치지 않은 개발 실행에서는 빈 문자열이라 감시가 꺼진다.
*/ // ------------------------------

const DEPLOYMENT_ID = process.env.NEXT_PUBLIC_DEPLOYMENT_ID ?? ''

/* 앞단·서비스워커·브라우저 어디에도 고이면 낡은 값을 최신이라 답하게 된다 */
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(
    { id: DEPLOYMENT_ID },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
  )
}
