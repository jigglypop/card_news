import { PPTService } from './services/pptService';
import fs from 'fs';
import path from 'path';

async function generateTestPPT() {
  try {
    console.log('새로운 디자인의 PPT 생성 시작...');
    
    // 테스트용 카드뉴스 데이터
    const testCardNewsContent = JSON.stringify({
      slides: [
        {
          type: "cover",
          title: "오늘의 IT 핫 뉴스",
          subtitle: "최신 기술 트렌드"
        },
        {
          type: "news",
          title: "인공지능의 혁신",
          content: "새로운 생성형 AI 모델이 출시되어 다양한 분야에서 혁신을 가져오고 있습니다. 특히 의료, 교육, 콘텐츠 제작 영역에서 큰 변화가 기대됩니다.",
          tags: ["AI", "기술", "혁신"]
        },
        {
          type: "news",
          title: "클라우드 컴퓨팅 트렌드",
          content: "기업들의 멀티 클라우드 도입이 가속화되고 있습니다. 비용 최적화와 서비스 안정성 향상을 위한 하이브리드 솔루션이 인기를 끌고 있습니다.",
          tags: ["클라우드", "비즈니스", "IT 인프라"]
        },
        {
          type: "news",
          title: "디지털 트랜스포메이션 가속화",
          content: "팬데믹 이후 기업들의 디지털 전환이 더욱 가속화되고 있습니다. 온라인 비즈니스 모델과 재택근무 환경 구축이 주요 과제로 떠올랐습니다.",
          tags: ["디지털 전환", "비즈니스", "트렌드"]
        },
        {
          type: "news",
          title: "사이버 보안 중요성 강화",
          content: "랜섬웨어 공격 증가로 사이버 보안의 중요성이 더욱 강조되고 있습니다. 기업들은 제로 트러스트 보안 모델 채택을 적극 검토 중입니다.",
          tags: ["보안", "랜섬웨어", "IT"]
        },
        {
          type: "news",
          title: "메타버스 기술 발전",
          content: "메타버스 기술이 게임 외에도 교육, 커머스, 협업 영역으로 확장되고 있습니다. 증강현실과 가상현실 기기의 개발도 함께 가속화되고 있습니다.",
          tags: ["메타버스", "AR", "VR"]
        },
        {
          type: "summary",
          title: "IT 트렌드 종합",
          content: "AI, 클라우드, 디지털 트랜스포메이션, 사이버 보안, 메타버스 등 다양한 기술이 발전하며 산업 전반에 혁신을 가져오고 있습니다. 기업들의 적극적인 기술 도입이 앞으로도 계속될 전망입니다."
        }
      ]
    });

    const pptService = PPTService.getInstance();
    
    // PPT 생성
    const pptPath = await pptService.generateCardNewsPPT(testCardNewsContent, 'daily');
    console.log(`PPT 파일 생성 완료: ${pptPath}`);
    
    // PDF 변환
    const pdfPath = await pptService.convertToPDF(pptPath);
    console.log(`PDF 파일 생성 완료: ${pdfPath}`);
    
    // 생성된 파일 경로
    const outputPath = path.dirname(pptPath);
    console.log(`생성된 파일은 다음 위치에 있습니다: ${outputPath}`);
    console.log(`파일명: ${path.basename(pptPath)}`);
    
  } catch (error) {
    console.error('파일 생성 중 오류 발생:', error);
  }
}

// 스크립트 실행
generateTestPPT(); 