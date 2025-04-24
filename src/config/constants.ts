export const NEWS_CONSTANTS = {
  // News API 관련 설정
  NEWS_API_URL: 'https://newsapi.org/v2/top-headlines',
  NEWS_API_SEARCH_URL: 'https://newsapi.org/v2/everything',
  NEWS_API_COUNTRY: 'kr',
  NEWS_API_LANGUAGE: 'ko',
  NEWS_API_CATEGORY: 'technology',
  NEWS_API_SOURCE_NAME: 'News API',
  // 캐시 설정
  CACHE_EXPIRY: 3600000 // 1시간(밀리초)
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
  COLOR_TITLE: '363636',
  COLOR_SUBTITLE: '5B9BD5',
  COLOR_TEXT: '363636',
  COLOR_TAGS: '5B9BD5',
  COLOR_DATE: '7F7F7F',
  COLOR_SOURCE: '666666',
  COLOR_BACKGROUND: 'FFFFFF',
  
  // 파일 이름 형식
  DAILY_FILENAME: 'IT_News_YYYY-MM-DD',
  MONTHLY_FILENAME: 'IT_News_YYYY-MM'
}; 