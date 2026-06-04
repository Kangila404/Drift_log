# DriftLog

> 목적 의식에서 오는 안도감

홍수로 가라 앉은 한국. 물에 잠긴 도시들 사이를 배로 항해하며 서비스를 켜놓고 일상을 즐기세요.
조작이나 점수가 아니라, 그냥 시간이 지나면 가고 싶은 곳으로 흘러가도록 설계했습니다.

<!-- 배포 주소: http://driftlog.kro.kr -->
<!-- TODO: 대표 스크린샷 / GIF 추가 -->

<br>

## 소개

플레이어는 물에 잠긴 도시들을 오가며, 먼저 떠난 가족이 남긴 흔적을 하나씩 발견합니다. 
각 도시에는 고유한 풍경과 분위기가 있고, 항해 중에는 날씨와 우연한 사건들이 펼쳐집니다.
흩어진 가족의 흔적을 모두 찾아 마지막 목적지에 다다르면, 재회의 엔딩에 도달합니다.

<br>

## 기술 스택

### Frontend
- React 19, TypeScript, Vite
- TailwindCSS 4
- Three.js (`@react-three/fiber`, `@react-three/drei`) — 3D 해양 씬 및 커스텀 GLSL 셰이더
- Zustand — 상태 관리
- Framer Motion

### Backend
- Spring Boot, Java 21
- Spring Data JPA, MySQL
- Flyway — DB 마이그레이션
- JWT — 인증
- Gradle

### Infrastructure
- AWS EC2
- Docker, Docker Compose
- Nginx — 리버스 프록시 및 정적 파일 서빙
- GitHub Actions — CI
- Grafana, Loki, Prometheus — 로그/메트릭 모니터링

<br>

## 아키텍처

### Backend
DDD 스타일의 계층형 패키지 구조를 따릅니다.

```
domain        — 엔티티, 도메인 모델, 리포지토리 인터페이스
application    — 서비스, 유스케이스
presentation  — 컨트롤러, DTO
infrastructure — 외부 연동, 구현체
```

### Frontend
- React Three Fiber 기반의 3D 씬
- Zustand 스토어로 항해 상태 관리




---

<sub>Made by 강일아</sub>
