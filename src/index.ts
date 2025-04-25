import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { SchedulerService } from './services/schedulerService';
import fs from 'fs';
import morgan from 'morgan';
import helmet from 'helmet';
import net from 'net';
import apiRouter from './routes/api';
// 환경 변수 로드
dotenv.config();
const schedulerService = SchedulerService.getInstance();
// Express 앱 생성
const app = express();
// 서버 초기화
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(helmet());
// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));
app.use('/output', express.static(path.join(__dirname, '../data/output')));
app.use('/static', express.static(path.join(__dirname, '..', 'data', 'output')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// CORS 헤더 추가
app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
// API 라우터 연결
app.use('/api', apiRouter);
// 에러 핸들러 미들웨어
app.use((err: any, _: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
// 출력 디렉토리가 없는 경우 생성
const outputDir = path.join(__dirname, '../data/output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
// 라우트 설정
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
// 404 처리
app.use((_, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.'
  });
});

// 사용 가능한 포트 찾기
const findAvailablePort = (startPort: number, maxPort: number = startPort + 100): Promise<number> => {
  return new Promise((resolve, reject) => {
    const testPort = (port: number) => {
      if (port > maxPort) {
        reject(new Error(`포트를 찾을 수 없습니다. 범위: ${startPort}-${maxPort}`));
        return;
      }
      const server = net.createServer();
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`포트 ${port}는 이미 사용 중입니다. 다음 포트 확인...`);
          testPort(port + 1);
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        server.close(() => {
          console.log(`사용 가능한 포트를 찾았습니다: ${port}`);
          resolve(port);
        });
      });
      server.listen(port);
    };
    testPort(startPort);
  });
};
// 서버 시작
const startServer = async () => {
  try {
    // 기본 포트 또는 환경 변수에서 포트 가져오기
    const preferredPort = parseInt(process.env.PORT || '3000', 10);
    // 사용 가능한 포트 찾기
    const port = await findAvailablePort(preferredPort);
    app.listen(port, () => {
      console.log(`서버가 포트 ${port}에서 실행 중입니다`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    console.log('수동으로 포트를 변경하려면 .env 파일에서 PORT 값을 수정하세요.');
    process.exit(1);
  }
};
// 스케줄러 시작
schedulerService.start();
// 서버 시작
startServer(); 