/// <reference types="@react-three/fiber" />
import type { ThreeElements } from "@react-three/fiber";

// R3F v9 + React 19: three 요소(mesh, group, pointLight 등)의 JSX 타입 전역 등록.
// React 19 가 글로벌 JSX 를 폐기했으므로 react 모듈의 JSX 네임스페이스에 머지한다.
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}