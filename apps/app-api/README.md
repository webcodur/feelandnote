# FeelNNote Backend 서버 실행 가이드

## 백엔드 서버 시작

```bash
cd backend
npm run dev
```

서버가 http://localhost:3001 에서 실행됩니다.

## 프론트엔드 서버 시작 (별도 터미널)

```bash
npm run dev
```

프론트엔드가 http://localhost:5173 에서 실행됩니다.

## 서버 상태 확인

백엔드 서버가 정상 작동하는지 확인:
```bash
curl http://localhost:3001/health
```

## 중요 사항

- **백엔드와 프론트엔드 모두 실행해야 검색 기능이 작동합니다**
- 백엔드 서버가 먼저 시작되어야 합니다
- 환경 변수는 `backend/.env`에 설정되어 있습니다

## 문제 해결

1. 포트 3001이 이미 사용 중인 경우:
   - `backend/server.js`에서 PORT 변경
   - `src/lib/api/search.ts`에서 BACKEND_URL도 동일하게 변경

2. CORS 에러 발생 시:
   - 백엔드 서버가 실행 중인지 확인
   - `backend/server.js`의 CORS 설정 확인
