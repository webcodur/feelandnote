import type { TMDBMovieResponse, Content } from '../../types/content';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export const searchMovies = async (query: string): Promise<Content[]> => {
  if (!query) return [];

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ko-KR&page=1`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch movies from TMDB API');
    }

    const data: TMDBMovieResponse = await response.json();

    return data.results.map((item) => ({
      id: item.id.toString(),
      type: 'MOVIE',
      title: item.title,
      creator: '', // Director info requires separate API call, leaving empty for list view
      publisher: '', // Studio info requires separate call
      release_date: item.release_date,
      thumbnail_url: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : '',
      metadata: {
        genre_ids: item.genre_ids,
      },
      description: item.overview,
    }));
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};
