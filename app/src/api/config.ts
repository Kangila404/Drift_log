export const ASSET_BASE = "https://driftlog.kro.kr:30001";



export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${ASSET_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}


export const CITY_META: Record<number, { name: string; img: string; bgm: string; desc: string }> = {
  1: { name: "서울", img: "/city/seoul.png", bgm: "/city/seoul_bgm.mp3", desc: "물에 잠긴 고궁. 한때 가장 번화했던 도시가 수면 아래 남아 있다." },
  2: { name: "인천", img: "/city/incheon.png", bgm: "/city/incheon_bgm.mp3", desc: "수몰된 인천 대교, 파도가 잔잔한 날이면 물 아래로 도시의 윤곽이 희미하게 보인다." },
  3: { name: "대전", img: "/city/daejeon.png", bgm: "/city/daejeon_bgm.mp3", desc: "내륙 깊숙이 물이 차올랐다. 바람이 불면 도시였던 자리에서 이상한 소리가 들린다." },
  4: { name: "강릉", img: "/city/gangneung.png", bgm: "/city/gangneung_bgm.mp3", desc: "산자락까지 물이 차올랐지만 높은 봉우리는 살아남았다. 안개가 자욱한 날이면 섬처럼 보이는 산봉우리들이 수평선 위로 떠오른다." },
  5: { name: "부산", img: "/city/busan.png", bgm: "/city/busan_bgm.mp3", desc: "남쪽 끝 항구 도시. 수몰을 피한 사람들이 모여들었다는 소문이 있다. 멀리서 보면 불빛이 깜빡이는 것 같기도 하다." },
  6: { name: "수원", img: "/city/suwon.png", bgm: "/city/suwon_bgm.mp3", desc: "화성의 성벽이 수면 위로 드러나 있다. 성곽을 따라 물이 차오른 모습이 낯설다. 성 안쪽 깊은 곳에서 가끔 빛이 흔들린다." },
  7: { name: "광주", img: "/city/gwangju.png", bgm: "/city/gwangju_bgm.mp3", desc: "가장 낮은 고지의 있는 광주, 무등산 주상절리가 보인다." },
  8: { name: "대구", img: "/city/daegu.png", bgm: "/city/daegu_bgm.mp3", desc: "분지였던 지형 탓에 물이 깊게 고였다." },
  9: { name: "포항", img: "/city/pohang.png", bgm: "/city/pohang_bgm.mp3", desc: "가족과 함께 보았던 상생의 손이 보인다. 이젠 상생의 손마디인가." },
  10: { name: "제주", img: "/city/jeju.png", bgm: "/city/jeju_bgm.mp3", desc: "한라산 중턱까지 물이 찼다. 백록담이 섬이 되었다." },
};

export const CITY_COORDS: Record<number, { x: number; y: number; name: string }> = {
  1: { x: 45.5, y: 53.0, name: "서울" }, 2: { x: 36.0, y: 55.0, name: "인천" },
  3: { x: 48.5, y: 69.0, name: "대전" }, 4: { x: 63.0, y: 50.0, name: "강릉" },
  5: { x: 73.8, y: 75.2, name: "부산" }, 6: { x: 46.2, y: 59.2, name: "수원" },
  7: { x: 43.0, y: 75.8, name: "광주" }, 8: { x: 64.0, y: 72.5, name: "대구" },
  9: { x: 75.0, y: 70.5, name: "포항" }, 10: { x: 38.0, y: 95.5, name: "제주" },
};

export const KOREA_PATH = "M 78.1,2.0 L 76.0,3.1 L 75.7,7.9 L 70.5,8.1 L 66.2,12.3 L 60.1,11.4 L 55.5,12.5 L 58.3,14.8 L 58.0,18.3 L 47.2,17.5 L 43.3,14.0 L 39.0,16.0 L 39.3,18.1 L 33.2,22.7 L 29.5,22.7 L 13.0,30.3 L 16.1,35.3 L 21.0,34.3 L 25.2,37.2 L 21.3,42.4 L 22.8,44.6 L 19.7,45.0 L 15.8,49.6 L 21.0,49.8 L 19.7,51.3 L 22.2,51.3 L 22.8,53.3 L 25.8,53.3 L 28.0,50.6 L 32.6,53.3 L 35.9,51.5 L 35.0,55.7 L 41.7,57.6 L 39.0,59.0 L 43.3,61.3 L 41.7,62.0 L 37.8,60.3 L 32.3,63.0 L 35.0,63.8 L 35.3,67.0 L 35.9,63.8 L 37.8,64.0 L 40.5,71.8 L 35.0,76.6 L 35.0,78.9 L 30.7,81.0 L 31.0,85.0 L 35.0,83.3 L 31.0,87.5 L 36.2,84.0 L 36.2,86.5 L 43.9,86.7 L 42.7,84.8 L 46.0,82.3 L 47.2,84.0 L 44.5,85.8 L 49.4,85.8 L 48.2,82.7 L 52.1,83.3 L 52.8,80.6 L 54.6,83.3 L 58.3,80.6 L 64.4,83.3 L 64.7,80.0 L 62.2,80.8 L 61.9,79.1 L 67.1,79.8 L 74.5,75.4 L 75.7,69.9 L 72.9,70.3 L 72.9,57.8 L 61.9,48.9 L 58.0,42.4 L 49.7,39.7 L 49.4,34.3 L 61.6,30.9 L 63.8,28.4 L 69.0,27.4 L 69.0,25.9 L 75.7,23.2 L 75.7,14.8 L 79.0,11.2 L 86.7,9.5 L 85.5,6.4 L 83.0,6.4 Z";
export const JEJU_PATH = "M 32.0,96.7 L 33.5,96.9 L 33.8,97.8 L 35.3,96.9 L 37.2,97.8 L 37.5,96.9 L 41.4,96.9 L 41.4,95.5 L 42.7,94.7 L 35.3,94.6 L 35.0,95.3 L 34.1,95.3 Z";