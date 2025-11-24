import axios from 'axios';
import type { Content, ContentType } from '../../types/content';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface NaverBookResponse {
  items: {
    title: string;
    link: string;
    image: string;
    author: string;
    discount: string;
    publisher: string;
    pubdate: string;
    isbn: string;
    description: string;
  }[];
  total: number;
  start: number;
  display: number;
}

export const searchContent = async (query: string, type: ContentType): Promise<Content[]> => {
  if (!query) return [];

  // Currently only supporting Book search via Naver
  if (type === 'MOVIE') {
    // TODO: Implement TMDB or Naver Movie search (Naver Movie API is deprecated)
    console.warn('Movie search is not yet implemented with real API');
    return [];
  }

  try {
    const response = await axios.get<NaverBookResponse>(`${BACKEND_URL}/api/search/books`, {
      params: {
        query: query,
        display: 10,
        start: 1,
        sort: 'sim',
      },
    });

    return response.data.items.map((item: NaverBookResponse['items'][0]) => ({
      id: item.isbn, // Use ISBN as ID
      type: 'BOOK',
      title: item.title.replace(/<[^>]+>/g, ''), // Remove HTML tags
      creator: item.author.replace(/<[^>]+>/g, ''),
      thumbnail_url: item.image,
      publisher: item.publisher.replace(/<[^>]+>/g, ''),
      release_date: formatPubDate(item.pubdate),
      description: item.description.replace(/<[^>]+>/g, ''),
      metadata: {
        link: item.link,
        discount: item.discount,
      },
    }));
  } catch (error: any) {
    console.error('Backend Search API Error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
};

const formatPubDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
};

