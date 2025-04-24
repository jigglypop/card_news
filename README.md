# IT 카드뉴스 생성기

최신 IT 뉴스를 수집하고 OpenAI의 최신 모델을 활용하여 일일/월간 카드뉴스를 자동으로 생성하는 애플리케이션입니다.

## 주요 기능

- **뉴스 API 활용**: NewsAPI를 통해 최신 IT 뉴스를 수집합니다.
- **일일 뉴스 수집**: 주요 기술 뉴스를 자동으로 수집합니다.
- **월간 뉴스 요약**: 한 달간의 주요 IT 트렌드를 요약합니다.
- **AI 분석**: OpenAI의 GPT 모델을 활용하여 뉴스 중요도를 판단하고 요약합니다.
- **카드뉴스 생성**: 분석된 뉴스를 바탕으로 PPT 형식의 카드뉴스를 자동 생성합니다.
- **웹 인터페이스**: 사용자 친화적인 웹 인터페이스를 통해 카드뉴스 생성 및 관리가 가능합니다.

## 기술 스택

- **언어**: TypeScript
- **런타임**: Node.js
- **패키지 관리자**: Yarn
- **뉴스 데이터**: NewsAPI
- **AI 통합**: OpenAI API
- **PPT 생성**: PptxGenJS
- **스케줄링**: Node-cron
- **웹 서버**: Express
- **환경 변수 관리**: Dotenv

## 시작하기

### 필수 조건

- Node.js (v14 이상)
- Yarn
- OpenAI API 키
- NewsAPI 키 ([https://newsapi.org](https://newsapi.org)에서 가입 후 발급)

### 설치

1. 저장소 클론:
```bash
git clone https://github.com/yourusername/card_news.git
cd card_news
```

2. 의존성 설치:
```bash
yarn install
```

3. 환경 변수 설정:
```bash
cp config/env.example .env
```
`.env` 파일을 열고 필요한 설정을 입력하세요. 특히 `OPENAI_API_KEY`와 `NEWS_API_KEY`는 반드시 설정해야 합니다.

### 빌드 및 실행

1. 애플리케이션 빌드:
```bash
yarn build
```

2. 서버 실행:
```bash
yarn start
```

3. 개발 모드로 실행:
```bash
yarn dev
```

### 수동 실행

- 일일 카드뉴스 생성:
```bash
yarn daily
```

- 월간 카드뉴스 생성:
```bash
yarn monthly
```

- NewsAPI 테스트:
```bash
yarn test:newsapi
```

## 사용 방법

1. 웹 브라우저에서 `http://localhost:3000`에 접속합니다.
2. "일일 카드뉴스 생성" 또는 "월간 카드뉴스 생성" 버튼을 클릭합니다.
3. 생성이 완료되면 목록에서 생성된 카드뉴스를 확인할 수 있습니다.
4. "보기" 버튼을 클릭하여 브라우저에서 바로 확인하거나, "다운로드" 버튼을 클릭하여 파일을 저장할 수 있습니다.

## 커스터마이징

### 뉴스 키워드 설정

`.env` 파일의 `NEWS_KEYWORDS` 값을 수정하여 뉴스 수집 키워드를 조정할 수 있습니다. 쉼표로 구분된 키워드 목록을 입력하세요.

### PPT 디자인 변경

`src/services/pptService.ts` 파일의 슬라이드 생성 메소드를 수정하여 PPT 디자인을 변경할 수 있습니다.

### 스케줄링 조정

`.env` 파일의 `DAILY_CRON`과 `MONTHLY_CRON` 값을 수정하여 실행 스케줄을 조정할 수 있습니다. cron 표현식을 사용합니다.

## 라이선스

MIT
