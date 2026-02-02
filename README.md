# Workday - 업무 일지 애플리케이션

iOS의 일기 앱과 같은 인터페이스를 가진 업무 일지 작성 웹 애플리케이션입니다.

## 기술 스택

- **프론트엔드**: Next.js 14, React 18, TypeScript
- **스타일링**: Tailwind CSS
- **백엔드**: Supabase (PostgreSQL, Authentication, Storage)
- **배포**: Vercel (예정)

## 주요 기능

- ✍️ 업무 일지 작성 및 편집
- 📅 날짜별 일지 조회
- 🔍 일지 검색
- 📱 반응형 디자인 (모바일 최적화)
- 🌓 다크 모드 지원
- 🔐 사용자 인증 및 개인 공간

## 개발 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 프로젝트 구조

```
workday/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # 재사용 가능한 컴포넌트
│   ├── lib/             # 유틸리티 함수 및 설정
│   └── types/           # TypeScript 타입 정의
├── public/              # 정적 파일
└── ...
```

## 라이선스

MIT
