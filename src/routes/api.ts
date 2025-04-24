import express from 'express';
import path from 'path';
import fs from 'fs';
import { SchedulerService } from '../services/schedulerService';
import { NewsService } from '../services/newsService';

const router = express.Router();
const schedulerService = SchedulerService.getInstance();
const newsService = NewsService.getInstance();

// 출력 디렉토리 경로 수정
const outputDir = path.resolve(process.cwd(), 'data/output');
console.log('API 라우터 - 출력 디렉토리 경로:', outputDir);

// 생성된 카드뉴스 목록 조회
router.get('/card-news', (req, res) => {
  try {
    console.log('카드뉴스 목록 요청 수신');
    
    if (!fs.existsSync(outputDir)) {
      console.error('출력 디렉토리를 찾을 수 없음:', outputDir);
      return res.status(500).json({
        success: false,
        error: '출력 디렉토리를 찾을 수 없습니다.',
        path: outputDir
      });
    }
    
    const files = fs.readdirSync(outputDir);
    console.log('발견된 파일 수:', files.length);
    
    const cardNews = files
      .filter(file => file.endsWith('.pptx') || file.endsWith('.pdf'))
      .map(file => {
        const stats = fs.statSync(path.join(outputDir, file));
        return {
          filename: file,
          path: `/output/${file}`,
          createdAt: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('반환할 카드뉴스 항목 수:', cardNews.length);
    res.json(cardNews);
  } catch (error) {
    console.error('카드뉴스 목록 조회 중 오류 발생:', error);
    res.status(500).json({ 
      success: false, 
      error: '카드뉴스 목록을 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 수동으로 일일 작업 실행
router.post('/run-daily', async (req, res) => {
  try {
    // API 키 유효성 검사
    if (!process.env.NEWS_API_KEY || !process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.'
      });
    }

    // 작업 실행 전에 클라이언트에게 작업이 시작되었음을 알림
    res.status(202).json({
      success: true,
      message: '일일 카드뉴스 생성 작업이 시작되었습니다. 잠시 기다려주세요.',
      processing: true
    });

    // 비동기적으로 작업 실행 (응답을 기다리지 않음)
    schedulerService.runDailyTask()
      .then(pptPath => {
        if (pptPath) {
          const filename = path.basename(pptPath);
          console.log(`일일 카드뉴스 생성 완료: ${pptPath}`);
          console.log(`생성된 파일: ${filename}`);
        } else {
          console.log('일일 카드뉴스 생성 완료되었으나 파일 경로가 없습니다.');
        }
      })
      .catch(err => {
        console.error('일일 카드뉴스 생성 실패:', err);
      });
  } catch (error) {
    console.error('일일 작업 실행 중 오류 발생:', error);
    res.status(500).json({ 
      success: false, 
      message: '일일 카드뉴스 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 수동으로 월간 작업 실행
router.post('/run-monthly', async (req, res) => {
  try {
    // API 키 유효성 검사
    if (!process.env.NEWS_API_KEY || !process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.'
      });
    }

    // 작업 실행 전에 클라이언트에게 작업이 시작되었음을 알림
    res.status(202).json({
      success: true,
      message: '월간 카드뉴스 생성 작업이 시작되었습니다. 잠시 기다려주세요.',
      processing: true
    });

    // 비동기적으로 작업 실행 (응답을 기다리지 않음)
    schedulerService.runMonthlyTask()
      .then(pptPath => {
        if (pptPath) {
          const filename = path.basename(pptPath);
          console.log(`월간 카드뉴스 생성 완료: ${pptPath}`);
          console.log(`생성된 파일: ${filename}`);
        } else {
          console.log('월간 카드뉴스 생성 완료되었으나 파일 경로가 없습니다.');
        }
      })
      .catch(err => {
        console.error('월간 카드뉴스 생성 실패:', err);
      });
  } catch (error) {
    console.error('월간 작업 실행 중 오류 발생:', error);
    res.status(500).json({ 
      success: false, 
      message: '월간 카드뉴스 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 생성된 파일 진행 상태 확인
router.get('/task-status', (req, res) => {
  try {
    // schedulerService에서 마지막으로 생성된 파일 경로 가져오기
    const lastGeneratedFile = schedulerService.getLastGeneratedFile();
    console.log('마지막으로 생성된 파일:', lastGeneratedFile);
    
    // 파일 목록 조회
    const files = fs.readdirSync(outputDir);
    
    // 가장 최근에 생성된 파일 확인
    const recentFiles = files
      .filter(file => file.endsWith('.pptx') || file.endsWith('.pdf'))
      .map(file => {
        const stats = fs.statSync(path.join(outputDir, file));
        return {
          filename: file,
          path: `/output/${file}`,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // 생성된 파일 정보
    let completed = false;
    let recentFile = null;
    let lastGeneratedInfo = null;
    
    // 마지막으로 생성된 파일이 있는 경우
    if (lastGeneratedFile && fs.existsSync(lastGeneratedFile)) {
      const filename = path.basename(lastGeneratedFile);
      const stats = fs.statSync(lastGeneratedFile);
      completed = true;
      lastGeneratedInfo = {
        filename,
        path: `/output/${filename}`,
        createdAt: stats.birthtime,
        fullPath: lastGeneratedFile
      };
      recentFile = lastGeneratedInfo;
      console.log(`마지막으로 생성된 파일 정보: ${JSON.stringify(lastGeneratedInfo)}`);
    } 
    // 마지막으로 생성된 파일이 없거나 존재하지 않는 경우, 최근 파일 목록 사용
    else if (recentFiles.length > 0) {
      const timeLimit = 5 * 60 * 1000; // 5분
      const recentTime = new Date().getTime() - new Date(recentFiles[0].createdAt).getTime();
      
      if (recentTime < timeLimit) {
        completed = true;
        recentFile = recentFiles[0];
        console.log(`최근 생성된 파일 정보: ${JSON.stringify(recentFile)}`);
      }
    }

    res.json({
      success: true,
      completed,
      recentFile,
      lastGeneratedInfo,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('진행 상태 확인 중 오류 발생:', error);
    res.status(500).json({
      success: false,
      message: '진행 상태 확인 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 