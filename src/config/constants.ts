export const NEWS_CONSTANTS = {
  // News API 관련 설정
  NEWS_API_URL: 'https://newsapi.org/v2/top-headlines',
  NEWS_API_SEARCH_URL: 'https://newsapi.org/v2/everything',
  NEWS_API_COUNTRY: 'kr',
  NEWS_API_LANGUAGE: 'ko',
  NEWS_API_CATEGORY: 'technology',
  NEWS_API_SOURCE_NAME: 'News API',
  // 캐시 설정
  CACHE_EXPIRY: 3600000, // 1시간(밀리초)
  // 수집 키워드 설정
  SEARCH_KEYWORDS: ['AI', '인공지능', '클라우드', '보안', '블록체인', '빅데이터', '메타버스', 'NFT'],
  // 수집 주기 설정
  DAILY_CRON: '0 9 * * *', // 매일 오전 9시
  MONTHLY_CRON: '0 9 1 * *' // 매월 1일 오전 9시
};

export const PPT_CONSTANTS = {
  // PPT 스타일 설정
  FONT_FAMILY: 'Pretendard',
  FONT_REGULAR: 'Pretendard-Regular',
  FONT_MEDIUM: 'Pretendard-Medium',
  FONT_BOLD: 'Pretendard-Bold',
  // PPT 레이아웃 설정
  SLIDE_WIDTH: 10,
  SLIDE_HEIGHT: 7.5,
  // 색상 스키마
  COLOR_TITLE: '1D1D1D',
  COLOR_SUBTITLE: '1D1D1D',
  COLOR_TEXT: '1D1D1D',
  COLOR_TAGS: '1D1D1D',
  COLOR_DATE: 'FFFFFF',
  COLOR_SOURCE: '1D1D1D',
  COLOR_BACKGROUND: 'FFFFFF',
  // 파일 이름 형식
  DAILY_FILENAME: 'IT_News_YYYY-MM-DD',
  MONTHLY_FILENAME: 'IT_News_YYYY-MM'
}; 