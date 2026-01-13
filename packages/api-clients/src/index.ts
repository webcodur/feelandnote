// API Clients Package - 외부 API 클라이언트 통합 모듈

// region: Naver Books
export { searchBooks } from './naver-books'
export type { BookSearchResult } from './naver-books'
// endregion

// region: TMDB (Video)
export { searchMovies, searchTVShows, searchVideo, getMovieDetails, getVideoById } from './tmdb'
export type { VideoSearchResult, MovieSearchResult, DramaSearchResult, VideoSubtype } from './tmdb'
// endregion

// region: IGDB (Games)
export { searchGames, getGameDetails, getGameById } from './igdb'
export type { GameSearchResult } from './igdb'
// endregion

// region: Spotify (Music)
export { searchMusic, getAlbumDetails, getAlbumById } from './spotify'
export type { MusicSearchResult } from './spotify'
// endregion

// region: Q-Net (Certificates)
export { searchCertificates, QUALIFICATION_TYPES, QUALIFICATION_GRADES } from './qnet'
export type { CertificateSearchResult } from './qnet'
// endregion

// region: Gemini AI
export { callGemini, buildReviewPrompt, buildSummaryPrompt } from './gemini'
// endregion

// region: Celeb Profile Generator
export { generateCelebProfile, buildCelebProfilePrompt, generateCelebProfileWithInfluence } from './celeb-profile-generator'
export type {
  CelebProfileInput,
  GeneratedCelebProfile,
  GenerateCelebProfileResult,
  InfluenceScore,
  GeneratedInfluence,
  GeneratedCelebProfileWithInfluence,
  GenerateCelebProfileWithInfluenceResult,
} from './celeb-profile-generator'
// endregion

// region: Unified Search
export { searchExternal, toContentRecord } from './search'
export type { ContentType, ExternalSearchResult, SearchResponse } from './search'
// endregion

// region: URL Fetcher
export { fetchUrlContent } from './url-fetcher'
export type { FetchUrlResult } from './url-fetcher'
// endregion

// region: Content Extractor
export { extractContentsFromText, buildExtractionPrompt, parseExtractionResponse } from './content-extractor'
export type { ExtractedContent, ExtractionResult } from './content-extractor'
// endregion

// region: Title Translator
export { translateTitles, translateSingleItem, buildTranslationPrompt, parseTranslationResponse } from './title-translator'
export type { TitleItem, TranslatedTitle, TranslationResult } from './title-translator'
// endregion
