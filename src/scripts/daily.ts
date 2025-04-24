import dotenv from 'dotenv';
import { SchedulerService } from '../services/schedulerService';

// 환경 변수 로드
dotenv.config();

async function runDailyTask() {
  try {
    console.log('수동으로 일일 카드뉴스 생성 작업을 시작합니다...');
    
    const schedulerService = SchedulerService.getInstance();
    const pptPath = await schedulerService.runDailyTask();
    
    console.log('작업 완료!');
    console.log(`생성된 파일: ${pptPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error('일일 작업 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
runDailyTask(); 