import { useQuery } from '@tanstack/react-query';
import { searchBooks } from '../lib/api/naverBooks';
import { searchMovies } from '../lib/api/tmdb';
import type { Content, ContentType } from '../types/content';

export const useContentSearch = (query: string, type: ContentType) => {
  return useQuery<Content[]>({
    queryKey: ['search', type, query],
    queryFn: async () => {
      if (!query) return [];
      
      if (type === 'BOOK') {
        return searchBooks(query);
      } else if (type === 'MOVIE') {
        return searchMovies(query);
      }
      
      return [];
    },
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
