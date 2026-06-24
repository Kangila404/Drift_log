# DriftLog
> 목적 의식에서 오는 안도감

바다에 가라앉은 한국.

물에 잠긴 도시들 사이를 배로 항해하며, 서비스를 켜놓고 일상을 즐기세요.

조작이나 점수가 아니라, 그냥 시간이 지나면 가고 싶은 곳으로 흘러가도록 설계했습니다.


## 주소

배포 주소: http://driftlog.kro.kr


앱스토어 주소 : https://apps.apple.com/kr/app/driftlog-항해와-집중/id6780740692



## 실행 화면

**앱 화면**

<img width="300" height="500" alt="image" src="https://github.com/user-attachments/assets/995ccf48-e846-4bba-9d06-358a8d7b166b" />


**PC 화면**
<img width="2878" height="1530" alt="image" src="https://github.com/user-attachments/assets/08bba42c-153d-421e-8074-4754762014c6" />



<br>

## 서비스
**<서비스 선택 화면>**

<img width="640" height="400" alt="image" src="https://github.com/user-attachments/assets/e3649ee5-24f3-41c4-8c3a-9bb777bf15b4" />

**<웹/앱 연동>**

: 웹과 앱은 같은 서비스이며 연동이 가능합니다.

<항해 모드>


<img width="300" height="500" alt="image" src="https://github.com/user-attachments/assets/496a1c01-82fe-4efb-9add-e5d2f8e396a0" />

- 항해 모드는 스토리 게임입니다.
- 바다에 가라 앉은 한국의 도시들을 항해하며, 음악과 도시 사진, 항해중 발생하는 이벤트, 잃어버린 가족의 흔적을 찾아 보세요.
- 기상청 API를 사용하여, 매일의 날씨에 맞춰 바다의 날씨가 변화합니다.
- 가끔 특별한 날씨가 나타 납니다.

**<공부 모드>**


<img width="300" height="500" alt="image" src="https://github.com/user-attachments/assets/47492362-cc1d-459c-bc2b-c5c189f6806d" />

- 백색 소음을 들으며 몰입하세요.
- 공부 시간 및 주제를 기록할 수 있습니다.
- ios 위젯 및 다이나믹 아일랜드도 지원합니다.
<br>


## 기술 스택

### Frontend
- React 19, TypeScript, Vite
- flutter
- TailwindCSS 4
- Three.js
- Zustand
- Framer Motion

### Backend
- Spring Boot
- Java 21
- Spring Data JPA
- MySQL

### Infrastructure
- AWS EC2
- GitHub Actions — CI/CD
- Grafana, Loki, Prometheus

<br>

## 아키텍처

### Backend
DDD 스타일의 계층형 패키지 구조를 따릅니다.

\`\`\`
domain         — 엔티티, 도메인 모델, 리포지토리 인터페이스
application    — 서비스, 유스케이스
presentation  — 컨트롤러, DTO
infrastructure — 외부 연동, 구현체
\`\`\`

### Frontend
- React Three Fiber 기반의 3D 씬 (해양 셰이더, 하늘, 보트)
- Zustand 스토어로 항해 상태 관리

<br>

### 안전한 항해를 기원합니다

---

<sub>Made by 강일아</sub>
