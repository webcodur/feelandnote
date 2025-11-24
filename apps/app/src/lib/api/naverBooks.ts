import type { NaverBookResponse, Content } from '../../types/content';

const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = import.meta.env.VITE_NAVER_CLIENT_SECRET;

// Note: Direct calls to Naver API from browser will fail due to CORS.
// In development, we use Vite proxy. In production, we need a proxy server or Edge Function.
export const searchBooks = async (query: string): Promise<Content[]> => {
  if (!query) return [];

  try {
    const response = await fetch(`/api/v1/search/book.json?query=${encodeURIComponent(query)}&display=10`, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch books from Naver API');
    }

    const data: NaverBookResponse = await response.json();

    return data.items.map((item) => ({
      id: item.isbn,
      type: 'BOOK',
      title: item.title.replace(/<[^>]+>/g, ''), // Remove HTML tags
      creator: item.author.replace(/<[^>]+>/g, ''),
      publisher: item.publisher.replace(/<[^>]+>/g, ''),
      release_date: item.pubdate,
      thumbnail_url: item.image,
      metadata: {
        isbn: item.isbn,
      },
      description: item.description.replace(/<[^>]+>/g, ''),
    }));
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
};
