# 📸 포토스튜디오 고객관리 시스템 (Photo Studio CRM)

현대적이고 강력한 사진관 전용 고객관리 및 예약 시스템

## 🌟 주요 기능

### 핵심 기능
- ✅ **고객 관리** - 고객 정보, 촬영 이력, 선호도 관리
- 📅 **예약 관리** - 실시간 예약 캘린더, 일정 관리
- 💰 **재무 관리** - 매출 추적, 청구서 발행, 결제 관리
- 📦 **제품 관리** - 촬영 패키지, 상품 관리
- 🎬 **촬영 유형 관리** - 웨딩, 프로필, 가족 사진 등
- 📊 **대시보드** - 실시간 비즈니스 인사이트

### 🚀 새로운 기능 (Firebase)

#### AI 자동화
- 🤖 **스마트 워크플로우** - 이벤트 기반 자동화
- 📧 **자동 이메일** - 예약 확인, 리마인더, 후속 조치
- 💬 **SMS 알림** - 중요한 일정 리마인더
- 🎂 **생일 축하** - 고객 생일 자동 메시지
- ⭐ **리뷰 요청** - 촬영 후 자동 리뷰 요청

#### 고객 포털
- 🔐 **개인 대시보드** - 고객 전용 로그인 공간
- 🖼️ **갤러리 접근** - 사진 보기, 선택, 다운로드
- 💳 **온라인 결제** - 안전한 결제 처리
- 📱 **실시간 알림** - 예약 및 갤러리 업데이트

#### 스마트 갤러리
- 📸 **사진 관리** - 클라우드 기반 갤러리
- 🏷️ **AI 태깅** - 자동 얼굴 인식 및 분류
- 🔗 **공유 링크** - 보안 갤러리 링크 생성
- ⚡ **빠른 선택** - 드래그 앤 드롭 사진 선택

#### 마케팅 자동화
- 📬 **이메일 캠페인** - 맞춤형 이메일 마케팅
- 📈 **분석 도구** - 오픈율, 클릭률 추적
- 🎯 **세그먼트** - 고객 그룹별 타겟팅

#### 고급 리포팅
- 📊 **비즈니스 인텔리전스** - 매출, 예약, 고객 분석
- 💼 **커스텀 리포트** - 원하는 지표 추적
- 📉 **트렌드 분석** - 시간대별 성과 분석

## 🛠️ 기술 스택

### Frontend
- **React 18.2** - 모던 UI 라이브러리
- **Vite** - 빠른 빌드 도구
- **Tailwind CSS** - 유틸리티 기반 CSS
- **Framer Motion** - 애니메이션
- **Radix UI** - 접근성 좋은 컴포넌트
- **TanStack Query** - 서버 상태 관리
- **Zustand** - 클라이언트 상태 관리

### Backend & Services
- **Firebase Authentication** - 사용자 인증
- **Cloud Firestore** - NoSQL 데이터베이스
- **Firebase Storage** - 파일 저장소
- **Cloud Functions** - 서버리스 함수
- **Firebase Analytics** - 사용자 분석

### 주요 라이브러리
- **react-router-dom** - 라우팅
- **react-big-calendar** - 캘린더 UI
- **recharts** - 차트 시각화
- **react-dropzone** - 파일 업로드
- **date-fns** - 날짜 처리

## 📋 사전 요구사항

- Node.js 16.x 이상
- npm 또는 yarn
- Firebase 프로젝트 (무료로 시작 가능)

## 🚀 설치 및 실행

### 1. 저장소 클론 또는 다운로드

### 2. 의존성 설치
```bash
npm install
```

### 3. Firebase 프로젝트 설정

#### 3.1 Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 및 생성

#### 3.2 Firebase 서비스 활성화
- **Authentication**: 이메일/비밀번호, Google 로그인 활성화
- **Firestore Database**: 데이터베이스 생성 (테스트 모드로 시작)
- **Storage**: 저장소 활성화
- **Functions**: Cloud Functions 활성화 (선택사항)

#### 3.3 웹 앱 등록
1. Firebase 프로젝트 설정에서 "웹 앱 추가"
2. 앱 닉네임 입력
3. Firebase 설정 객체 복사

### 4. 환경 변수 설정
```bash
# .env.example을 .env로 복사
cp .env.example .env
```

`.env` 파일을 열고 Firebase 설정 값 입력:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 5. Firestore 보안 규칙 설정

Firebase Console > Firestore Database > 규칙 탭에서:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 프로필
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 고객 데이터 (본인 것만 접근)
    match /customers/{customerId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 예약 데이터
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 트랜잭션
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 제품
    match /products/{productId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 촬영 유형
    match /filmingTypes/{typeId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 갤러리
    match /galleries/{galleryId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 워크플로우
    match /workflows/{workflowId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 템플릿
    match /templates/{templateId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // 알림
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 6. Storage 보안 규칙 설정

Firebase Console > Storage > 규칙 탭에서:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 프로필 사진
    match /profiles/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 갤러리 사진
    match /galleries/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 문서
    match /documents/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 7. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 8. 프로덕션 빌드
```bash
npm run build
```

### 9. Firebase Hosting 배포 (선택사항)
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# Firebase 초기화
firebase init hosting

# 배포
firebase deploy --only hosting
```

## 📂 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── bookings/       # 예약 관련 컴포넌트
│   ├── customers/      # 고객 관련 컴포넌트
│   ├── dashboard/      # 대시보드 컴포넌트
│   ├── finance/        # 재무 컴포넌트
│   ├── gallery/        # 갤러리 컴포넌트
│   └── ui/             # 공통 UI 컴포넌트
├── contexts/           # React Context (상태 관리)
│   ├── FirebaseAuthContext.jsx    # Firebase 인증
│   └── SupabaseAuthContext.jsx    # (레거시 - 제거 예정)
├── hooks/              # 커스텀 Hooks
├── lib/                # 유틸리티 및 서비스
│   ├── firebase.js              # Firebase 초기화
│   ├── firestoreService.js      # Firestore CRUD
│   ├── storageService.js        # Storage 관리
│   ├── workflowService.js       # 워크플로우 자동화
│   └── customSupabaseClient.js  # (레거시 - 제거 예정)
├── App.jsx             # 메인 앱 컴포넌트
├── main.jsx            # 엔트리 포인트
└── index.css           # 글로벌 스타일
```

## 🔐 보안

### 인증
- Firebase Authentication 사용
- 이메일/비밀번호 로그인
- Google OAuth 지원
- 비밀번호 재설정

### 데이터 보호
- Firestore Security Rules로 데이터 접근 제어
- Storage Rules로 파일 접근 제어
- 사용자별 데이터 격리
- HTTPS 통신

## 📊 데이터 구조

### Firestore Collections

#### users
```javascript
{
  email: string,
  displayName: string,
  photoURL: string,
  role: 'admin' | 'user',
  status: 'active' | 'suspended',
  studioName: string,
  phoneNumber: string,
  settings: {
    notifications: { email, sms, push },
    theme: 'light' | 'dark',
    language: 'ko' | 'en'
  },
  subscription: {
    plan: 'free' | 'basic' | 'pro',
    status: 'active' | 'cancelled',
    startDate: timestamp,
    endDate: timestamp
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  lastLoginAt: timestamp
}
```

#### customers
```javascript
{
  userId: string,
  name: string,
  email: string,
  phone: string,
  address: string,
  birthday: date,
  tags: string[],
  notes: string,
  totalBookings: number,
  totalSpent: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### bookings
```javascript
{
  userId: string,
  customerId: string,
  customerName: string,
  filmingType: string,
  bookingDate: timestamp,
  startTime: string,
  endTime: string,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  location: string,
  notes: string,
  totalAmount: number,
  paidAmount: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🔧 커스터마이징

### 워크플로우 추가
`src/lib/workflowService.js`의 `DEFAULT_WORKFLOW_TEMPLATES`에 새 워크플로우 추가

### 이메일 템플릿 수정
Cloud Functions에서 이메일 템플릿 커스터마이징

### UI 테마 변경
`tailwind.config.js`에서 색상 및 스타일 수정

## 🤝 기여

이슈 리포트와 기능 제안을 환영합니다!

## 📄 라이선스

MIT License

## 🆘 지원

문제가 발생하면:
1. [개선 계획서](./IMPROVEMENT_PLAN.md) 참조
2. Firebase Console 에러 로그 확인
3. 브라우저 콘솔 확인
4. GitHub Issues 생성

## 🎯 로드맵

- [x] Firebase 마이그레이션
- [x] AI 자동화 워크플로우
- [ ] 고객 포털 완성
- [ ] 스마트 갤러리 구현
- [ ] 마케팅 자동화
- [ ] 모바일 앱 (React Native)
- [ ] AI 사진 편집 통합
- [ ] 다국어 지원

## 📞 연락처

- 이메일: support@photostudio-crm.com
- 웹사이트: https://photostudio-crm.com

---

**Made with ❤️ for photographers**
