# Feel&Note 사용자 웹

Next.js 사용자 서비스다. 로컬 개발은 저장소 루트에서 `pnpm dev:web`으로 실행한다.

프로덕션 요청은 Cloudflare를 거쳐 Oracle VM의 Caddy와 `feelandnote-web.service`로 들어간다.
Vercel 배포는 과거 방식이며 현재 사용하지 않는다. 서버 경로·배포·캐시 운영은
[`docs/project/platform/external-services.md`](../../docs/project/platform/external-services.md)를 따른다.

## 점검 안내 화면 로컬 미리보기

개발 서버에서만 아래 주소로 점검 안내와 리다이렉트를 시험할 수 있다. 공개 환경에서는 아무
효과가 없다.

- 켜기: <http://localhost:3000/?maintenance-preview=1>
- 영어로 켜기: <http://localhost:3000/en?maintenance-preview=1>
- 끄기: 안내 화면의 `미리보기 종료`를 누른다.
