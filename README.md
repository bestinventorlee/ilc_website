# ILC 회원 포털 백엔드 서버

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (자동 재시작)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## 서버 정보

- 포트: 3000 (기본값)
- API 엔드포인트: http://localhost:3000/api
- 헬스 체크: http://localhost:3000/health

## 데이터베이스

- 현재: JSON 파일 (`data/users.json`)
- 데이터는 서버 시작 시 자동으로 초기화됩니다.

