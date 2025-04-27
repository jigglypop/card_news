import express from 'express';
import path from 'path';
import fs from 'fs';
import { SchedulerService } from '../services/schedulerService';
import { tryCatch } from '../utils/errorHandler';
import { Logger } from '../utils/logger';

const router = express.Router();
const schedulerService = SchedulerService.getInstance();
const outputDir = path.resolve(process.cwd(), 'data/output');

function checkRequiredEnvVars() {
  const missingVars = [];
  if (!process.env.NEWS_API_KEY) missingVars.push('NEWS_API_KEY');
  if (!process.env.OPENAI_API_KEY) missingVars.push('OPENAI_API_KEY');
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

router.get('/card-news', (_, res) => {
  return tryCatch(
    async () => {
      Logger.log('카드뉴스 목록 요청 수신');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        Logger.info(`출력 디렉토리 생성: ${outputDir}`);
        return res.json([]);
      }

      const files = fs.readdirSync(outputDir);

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
      res.json(cardNews);
    },
    '카드뉴스 목록 조회 중 오류 발생',
    res
  ).catch(error => {
    res.status(500).json({
      success: false,
      error: '카드뉴스 목록을 조회하는 중 오류가 발생했습니다.'
    });
  });
});

// 일일 작업 실행
router.post('/run-daily', async (req, res) => {
  const envCheck = checkRequiredEnvVars();

  if (!envCheck.isValid) {
    return res.status(400).json({
      success: false,
      message: `필수 API 키가 설정되지 않았습니다: ${envCheck.missingVars.join(', ')}`,
      missingKeys: envCheck.missingVars
    });
  }

  // 이미 응답을 보냈으므로 이후 오류 처리는 서버에서만 진행
  res.status(202).json({
    success: true,
    message: '일일 카드뉴스 생성 작업이 시작되었습니다. 잠시 기다려주세요.',
    processing: true
  });

  // 비동기 작업 실행 (응답과 별개로 처리)
  schedulerService
    .runTaskManually('daily')
    .then(pdfPath => {
      const filename = path.basename(pdfPath);
      Logger.log(`일일 카드뉴스 생성 완료: ${filename}`);
    })
    .catch(err => {
      Logger.error('일일 카드뉴스 생성 실패:', err);
    });
});

// 월간 작업 실행
router.post('/run-monthly', async (req, res) => {
  const envCheck = checkRequiredEnvVars();

  if (!envCheck.isValid) {
    return res.status(400).json({
      success: false,
      message: `필수 API 키가 설정되지 않았습니다: ${envCheck.missingVars.join(', ')}`,
      missingKeys: envCheck.missingVars
    });
  }

  // 이미 응답을 보냈으므로 이후 오류 처리는 서버에서만 진행
  res.status(202).json({
    success: true,
    message: '월간 카드뉴스 생성 작업이 시작되었습니다. 잠시 기다려주세요.',
    processing: true
  });

  // 비동기 작업 실행 (응답과 별개로 처리)
  schedulerService
    .runTaskManually('monthly')
    .then(pdfPath => {
      const filename = path.basename(pdfPath);
      Logger.log(`월간 카드뉴스 생성 완료: ${filename}`);
    })
    .catch(err => {
      Logger.error('월간 카드뉴스 생성 실패:', err);
    });
});

// 작업 상태 확인
router.get('/task-status', (req, res) => {
  tryCatch(async () => {
    const lastGeneratedFile = schedulerService.getLastGeneratedFile();
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const files = fs.readdirSync(outputDir);
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

    // 생성 파일 정보
    let completed = false;
    let recentFile = null;

    // 마지막 생성 파일 확인
    if (lastGeneratedFile && fs.existsSync(lastGeneratedFile)) {
      const filename = path.basename(lastGeneratedFile);
      const stats = fs.statSync(lastGeneratedFile);
      completed = true;
      recentFile = {
        filename,
        path: `/output/${filename}`,
        createdAt: stats.birthtime
      };
    }
    // 최근 파일 사용
    else if (recentFiles.length > 0) {
      const timeLimit = 5 * 60 * 1000; // 5분
      const recentTime = new Date().getTime() - new Date(recentFiles[0].createdAt).getTime();

      if (recentTime < timeLimit) {
        completed = true;
        recentFile = recentFiles[0];
      }
    }

    res.json({
      success: true,
      completed,
      recentFile,
      lastUpdate: new Date().toISOString()
    });
  }, '진행 상태 확인 중 오류 발생').catch(error => {
    res.status(500).json({
      success: false,
      message: '진행 상태 확인 중 오류가 발생했습니다.'
    });
  });
});

// 환경 변수 디버깅 엔드포인트 추가
router.get('/debug-env', (req, res) => {
  res.json({
    hasNewsApiKey: !!process.env.NEWS_API_KEY,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd()
  });
});

// 테스트 엔드포인트 추가
router.get('/test-news', async (req, res) => {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    console.log('apiKey', apiKey);
    if (!apiKey) {
      return res.json({
        success: false,
        error: 'API 키가 설정되지 않았습니다',
        env: {
          hasNewsApiKey: !!process.env.NEWS_API_KEY,
          hasOpenAiKey: !!process.env.OPENAI_API_KEY,
          nodeEnv: process.env.NODE_ENV,
          cwd: process.cwd()
        }
      });
    }

    const axios = require('axios');
    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=kr&category=technology&pageSize=5&apiKey=${apiKey}`
    );
    const responseData = await response.data;
    console.log('response', responseData);
    return res.json({
      success: true,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 4) + '...',
      status: response.status,
      totalResults: response.data.totalResults,
      articlesCount: response.data.articles?.length || 0,
      sampleArticle:
        response.data.articles?.length > 0
          ? {
              title: response.data.articles[0].title,
              source: response.data.articles[0].source.name
            }
          : null
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message || 'Unknown error',
      response: error.response?.data || null,
      stack: error.stack || null
    });
  }
});

export default router;
