# ☕ 드립 타이머

> 드립 커피 레시피 타이머 & 브루잉 로그 앱
> 나만의 레시피를 만들고, 단계별 타이머로 정밀 추출하며, 결과를 기록하는 모바일 유틸리티

---

## 🧩 주요 기능

- 📖 **레시피 관리** 원두·그라인더·드리퍼·분쇄도·추출 단계(시간/물 양)까지 저장/수정/삭제
- ⏱️ **인터랙티브 타이머** 단계별 시간·물 양 안내, 부드러운 원형 프로그레스( Reanimated + SVG ), 단계 시작/종료 3초 전 카운트 사운드
- 📝 **브루잉 로그** 추출 기록 영구 저장(SQLite), 별점(1~5) 및 테이스팅 노트 기록/수정, 로그 삭제
- 🔎 **정렬 & 필터** 최신순/별점순 정렬, 특정 레시피 기준 필터링
- 🌓 **다크 모드 지원** React Context 기반 전역 테마, 시스템 연동 자동 전환 + 수동 토글
- 📱 **iOS/Android 양대 플랫폼 지원 (Expo 기반)**

---

## ⚙️ 기술 스택

| 항목     | 기술/도구                                                                                        |
| ------ | -------------------------------------------------------------------------------------------- |
| 프레임워크  | React Native + Expo                                                                          |
| 언어     | TypeScript                                                                                   |
| 상태관리   | React Hooks (`useState`, `useEffect`, `useContext`, `useMemo`)                               |
| 내비게이션  | Expo Router (파일 기반 라우팅)                                                                      |
| 데이터베이스 | expo-sqlite (로컬 영구 저장)                                                                       |
| 애니메이션  | react-native-reanimated, react-native-svg                                                    |
| 스토리지   | @react-native-async-storage/async-storage (테마 등)                                             |
| UI/UX  | react-native-keyboard-aware-scroll-view, react-native-safe-area-context, @shopify/flash-list |
| 빌드     | `npx expo run:*` (개발 빌드), EAS Build (선택)                                                     |


---

## 🚀 설치 및 실행

이 프로젝트는 네이티브 모듈(expo-sqlite 등) 을 사용합니다. Expo Go만으로는 전체 기능이 동작하지 않습니다.
아래 명령으로 개발 빌드(Development Build) 를 생성해 실행하세요.

### 1. 의존성 설치

```bash
npm install
```

### 2. iOS 시뮬레이터

```bash
npx expo run:ios
```

### 3. Android 에뮬레이터

```bash
npx expo run:android
```

---
## 📱 앱 미리보기
<p align="center">
  <img src="https://github.com/Arkaltale/drip-coffee-timer
/preview/preview_1.jpg?raw=true" width="30%" />
  <img src="https://github.com/Arkaltale/drip-coffee-timer
/preview/preview_2.jpg?raw=true" width="30%" />
  <img src="https://github.com/Arkaltale/drip-coffee-timer
/preview/preview_3.jpg?raw=true" width="30%" />
  <img src="https://github.com/Arkaltale/drip-coffee-timer
/preview/preview_4.jpg?raw=true" width="30%" />
  <img src="https://github.com/Arkaltale/mabinote/blob/main//drip-coffee-timer
/preview/preview_5.jpg?raw=true" width="30%" />
  <img src="https://github.com/Arkaltale/drip-coffee-timer
/preview/preview_6.jpg?raw=true" width="30%" />
  <img src="https://github.com/Arkaltale/drip-coffee-timer
/preview/preview_7.jpg?raw=true" width="30%" />
  <img src="https://github.com/Arkaltale/drip-coffee-timer
/preview/preview_8.jpg?raw=true" width="30%" />
</p>
---

## 📄 라이선스

MIT License

---

## ✍️ 개발자

- 조성진 [@github.com/Arkaltale](https://github.com/Arkaltale)
