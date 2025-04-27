import path from 'path';

export interface Slide {
  type: 'cover' | 'news' | 'summary';
  title: string;
  subtitle?: string;
  content?: string;
  tags?: string[];
  sourceUrl?: string;
}

export interface SlideTemplates {
  coverSlide: (data: {
    title: string;
    subtitle: string;
    date: string;
  }) => string;
  
  newsSlide: (data: {
    title: string;
    content: string;
    tags?: string[];
    sourceUrl?: string;
  }) => string;
  
  summarySlide: (data: {
    title: string;
    content: string;
    date: string;
  }) => string;
}

export const createSlideTemplates = (
  templatesPath: string,
  businessBgPath: string,
  techBgPath: string,
  blackHanSansPath: string,
  pretendardBoldPath: string,
  pretendardRegularPath: string
): SlideTemplates => {
  // 상대 경로로 변환
  const businessBgRelPath = path
    .relative(templatesPath, businessBgPath)
    .replace(/\\/g, '/');
  const techBgRelPath = path
    .relative(templatesPath, techBgPath)
    .replace(/\\/g, '/');
  
  // 폰트 파일 경로 (상대 경로로 변환)
  const blackHanSansRelPath = path
    .relative(templatesPath, blackHanSansPath)
    .replace(/\\/g, '/');
  const pretendardBoldRelPath = path
    .relative(templatesPath, pretendardBoldPath)
    .replace(/\\/g, '/');
  const pretendardRegularRelPath = path
    .relative(templatesPath, pretendardRegularPath)
    .replace(/\\/g, '/');

  // 공통 CSS 스타일
  const commonStyles = `
    @font-face {
      font-family: 'BlackHanSans';
      src: url('${blackHanSansRelPath}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    
    @font-face {
      font-family: 'Pretendard-Bold';
      src: url('${pretendardBoldRelPath}') format('opentype');
      font-weight: bold;
      font-style: normal;
    }
    
    @font-face {
      font-family: 'Pretendard-Regular';
      src: url('${pretendardRegularRelPath}') format('opentype');
      font-weight: normal;
      font-style: normal;
    }
    
    body, html {
      margin: 0;
      padding: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
    }
    
    .slide {
      width: 100%;
      height: 100%;
      position: relative;
      background-size: cover;
      background-position: center;
    }
    
    .content {
      position: absolute;
      width: 90%;
      left: 5%;
      text-align: center;
    }
  `;

  return {
    // 커버 슬라이드 템플릿
    coverSlide: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${commonStyles}
          
          .slide {
            background-image: url('${businessBgRelPath}');
          }
          
          .title {
            top: 300px;
            font-family: 'BlackHanSans', sans-serif;
            font-size: 120px;
            color: #1D1D1D;
          }
          
          .subtitle {
            top: 550px;
            font-family: 'Pretendard-Bold', sans-serif;
            font-size: 48px;
            color: #1D1D1D;
          }
          
          .date {
            position: absolute;
            bottom: 80px;
            right: 100px;
            text-align: right;
            font-family: 'Pretendard-Bold', sans-serif;
            font-size: 24px;
            color: #1D1D1D;
          }
        </style>
      </head>
      <body>
        <div class="slide">
          <div class="content title">${data.title}</div>
          <div class="content subtitle">${data.subtitle}</div>
          <div class="date">${data.date}</div>
        </div>
      </body>
      </html>
    `,
    
    // 뉴스 슬라이드 템플릿
    newsSlide: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${commonStyles}
          
          .slide {
            background-image: url('${techBgRelPath}');
          }
          
          .title {
            top: 120px;
            font-family: 'BlackHanSans', sans-serif;
            font-size: 150px;
            color: #1D1D1D;
            text-decoration: underline;
          }
          
          .tags {
            top: 320px;
            font-family: 'BlackHanSans', sans-serif;
            font-size: 36px;
            color: #5A5A5A;
          }
          
          .body-content {
            top: 440px;
            font-family: 'Pretendard-Regular', sans-serif;
            font-size: 36px;
            color: #1D1D1D;
            line-height: 1.6;
            max-width: 80%;
            margin: 0 auto;
          }
          
          .source {
            position: absolute;
            bottom: 50px;
            width: 100%;
            text-align: center;
            font-family: 'Pretendard-Regular', sans-serif;
            font-size: 20px;
            color: #5A5A5A;
          }
        </style>
      </head>
      <body>
        <div class="slide">
          <div class="content title">${data.title}</div>
          ${data.tags ? `<div class="content tags">#${data.tags.join(' #')}</div>` : ''}
          ${data.content ? `<div class="content body-content">${data.content}</div>` : ''}
          ${data.sourceUrl ? `<div class="source">출처: ${data.sourceUrl}</div>` : ''}
        </div>
      </body>
      </html>
    `,
    
    // 요약 슬라이드 템플릿
    summarySlide: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${commonStyles}
          
          .slide {
            background-image: url('${techBgRelPath}');
          }
          
          .title {
            top: 120px;
            font-family: 'BlackHanSans', sans-serif;
            font-size: 72px;
            color: #1D1D1D;
          }
          
          .body-content {
            top: 300px;
            font-family: 'Pretendard-Regular', sans-serif;
            font-size: 36px;
            color: #1D1D1D;
            line-height: 1.5;
          }
          
          .date {
            position: absolute;
            bottom: 80px;
            right: 100px;
            text-align: right;
            font-family: 'Pretendard-Bold', sans-serif;
            font-size: 24px;
            color: #1D1D1D;
          }
        </style>
      </head>
      <body>
        <div class="slide">
          <div class="content title">${data.title}</div>
          ${data.content ? `<div class="content body-content">${data.content}</div>` : ''}
          <div class="date">${data.date}</div>
        </div>
      </body>
      </html>
    `
  };
}; 