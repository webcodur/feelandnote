require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

// CORS 설정 - React 앱에서의 요청 허용
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

// 환경 변수 확인 (디버깅용)
console.log('🔍 [환경 변수 확인]');
console.log('- NAVER_CLIENT_ID:', process.env.NAVER_CLIENT_ID);
console.log('- NAVER_CLIENT_SECRET:', process.env.NAVER_CLIENT_SECRET ? '설정됨 (' + process.env.NAVER_CLIENT_SECRET.length + '자)' : '없음');
console.log('');


// 네이버 검색 API 프록시
app.get('/api/search/books', async (req, res) => {
  const { query, display = 10, start = 1, sort = 'sim' } = req.query;

  console.log('📥 [요청 수신] 도서 검색:', { query, display, start, sort });

  if (!query) {
    console.log('❌ [오류] 검색어가 제공되지 않았습니다');
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    console.log('🔄 [네이버 API 호출 중...]');
    const response = await axios.get('https://openapi.naver.com/v1/search/book.json', {
      params: { query, display, start, sort },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      }
    });

    console.log(`✅ [성공] ${response.data.items.length}개의 도서를 찾았습니다`);
    res.json(response.data);
  } catch (error) {
    console.error('❌ [네이버 API 오류]:', error.response?.data || error.message);
    console.error('상태 코드:', error.response?.status);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch from Naver API',
      details: error.response?.data || error.message
    });
  }
});

// 서버 상태 확인용
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FeelNNote 백엔드 서버가 실행 중입니다' });
});

app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
  console.log(`📚 네이버 API 프록시: /api/search/books`);
});
