import { HtmlCardService } from './services/htmlCardService';
import path from 'path';
import fs from 'fs';

async function generateFromO4Mini() {
  try {
    console.log('O4 Mini 데이터로 카드뉴스 생성 시작...');
    
    // 로그 디렉토리에서 최신 O4 Mini 데이터 찾기
    const logsDir = path.join(process.cwd(), 'logs');
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('cardnews-content-') && file.endsWith('.json'))
      .sort()
      .reverse(); // 최신 파일 먼저
    
    if (logFiles.length === 0) {
      console.error('O4 Mini 데이터 파일을 찾을 수 없습니다.');
      return;
    }
    
    const latestLogFile = path.join(logsDir, logFiles[0]);
    console.log(`최신 O4 Mini 데이터 파일: ${latestLogFile}`);
    
    // JSON 데이터 읽기
    const cardNewsContent = fs.readFileSync(latestLogFile, 'utf8');
    console.log('O4 Mini 데이터 로드 완료');
    
    // 현재 날짜 가져오기
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // HtmlCardService로 PDF 생성
    const htmlCardService = HtmlCardService.getInstance();
    const pdfPath = await htmlCardService.generateCardNewsPDF(cardNewsContent, 'daily', dateStr);
    
    console.log(`카드뉴스 PDF 생성 완료: ${pdfPath}`);
    console.log(`생성된 파일은 다음 위치에 있습니다: ${path.dirname(pdfPath)}`);
    console.log(`파일명: ${path.basename(pdfPath)}`);
  } catch (error) {
    console.error('카드뉴스 생성 중 오류 발생:', error);
  }
}

// 스크립트 실행
generateFromO4Mini(); 