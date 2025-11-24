export type ContentType = 'BOOK' | 'MOVIE';

export interface ContentMetadata {
  // Book specific
  page_count?: number;
  isbn?: string;
  link?: string;
  discount?: string;
  
  // Movie specific
  runtime?: number; // in minutes
  genre_ids?: number[];
  original_language?: string;
}

export interface Content {
  id: string; // ISBN for books, TMDB ID for movies
  type: ContentType;
  title: string;
  creator: string; // Author or Director
  publisher: string; // Publisher or Studio
  release_date: string;
  thumbnail_url: string;
  metadata: ContentMetadata;
  description: string;
}

// Naver Book API Response Types
export interface NaverBookItem {
  title: string;
  link: string;
  image: string;
  author: string;
  discount: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  description: string;
}

export interface NaverBookResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBookItem[];
}

// TMDB API Response Types
export interface TMDBMovieItem {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export interface TMDBMovieResponse {
  page: number;
  results: TMDBMovieItem[];
  total_pages: number;
  total_results: number;
}
