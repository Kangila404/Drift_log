# 빌드 컨텍스트 = 모노레포 루트 (CD의 context: . 와 짝)
# front 가 @driftlog/shared 를 워크스페이스로 참조하므로 루트 매니페스트 + shared + front 를 함께 복사한다.
FROM node:20-alpine AS builder
WORKDIR /repo

# 1) 워크스페이스 해석에 필요한 매니페스트 먼저 복사 (레이어 캐시 최적화)
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY front/package.json ./front/

# 2) front 워크스페이스 + 그 의존성(shared 포함) 설치
RUN npm install

# 3) 소스 복사 (shared 는 src/index.ts 를 직접 export 하므로 소스만 있으면 됨)
COPY shared ./shared
COPY front ./front

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

ARG VITE_KAKAO_CLIENT_ID
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID

# 4) front 워크스페이스만 빌드
RUN npm run build -w front

FROM nginx:alpine
COPY --from=builder /repo/front/dist /usr/share/nginx/html
COPY front/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
