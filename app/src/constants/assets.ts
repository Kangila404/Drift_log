// 모든 정적 에셋 매핑 — RN은 require()에 동적 문자열을 못 쓰므로 전부 명시
// 이미지/오디오 실파일은 app/assets/ 아래에 있음

// ── 도시 이미지 ──
export const CITY_IMAGES: Record<number, any> = {
  1: require("../../assets/city/seoul.png"),
  2: require("../../assets/city/incheon.png"),
  3: require("../../assets/city/daejeon.png"),
  4: require("../../assets/city/gangneung.png"),
  5: require("../../assets/city/busan.png"),
  6: require("../../assets/city/suwon.png"),
  7: require("../../assets/city/gwangju.png"),
  8: require("../../assets/city/daegu.png"),
  9: require("../../assets/city/pohang.png"),
  10: require("../../assets/city/jeju.png"),
};

// ── 도시 BGM ──
export const CITY_BGM: Record<number, any> = {
  1: require("../../assets/city/seoul_bgm.mp3"),
  2: require("../../assets/city/incheon_bgm.mp3"),
  3: require("../../assets/city/daejeon_bgm.mp3"),
  4: require("../../assets/city/gangneung_bgm.mp3"),
  5: require("../../assets/city/busan_bgm.mp3"),
  6: require("../../assets/city/suwon_bgm.mp3"),
  7: require("../../assets/city/gwangju_bgm.mp3"),
  8: require("../../assets/city/daegu_bgm.mp3"),
  9: require("../../assets/city/pohang_bgm.mp3"),
  10: require("../../assets/city/jeju_bgm.mp3"),
};

// ── 모드 선택 이미지 ──
export const MODE_IMAGES = {
  voyage: require("../../assets/mode/voyage.png"),
  study: require("../../assets/mode/study.png"),
};

// ── 흔적(가족) 이미지 ──
export const TRACE_IMAGES: Record<string, any> = {
  "busan_mom": require("../../assets/trace/busan_mom.png"),
  "daejeon_dad": require("../../assets/trace/daejeon_dad.png"),
  "gangwon_sibling": require("../../assets/trace/gangwon_sibling.png"),
  "incheon_mom": require("../../assets/trace/incheon_mom.png"),
  "seoul_sibling": require("../../assets/trace/seoul_sibling.png"),
};

// ── 이벤트 이미지 ──
export const EVENT_IMAGES: Record<string, any> = {
  "city_lights": require("../../assets/event/city_lights.png"),
  "dolphins": require("../../assets/event/dolphins.png"),
  "floating_sign": require("../../assets/event/floating_sign.png"),
  "rainbow": require("../../assets/event/rainbow.png"),
  "whale_shadow": require("../../assets/event/whale_shadow.png"),
};

// ── 인트로 이미지 ──
export const INTRO_IMAGES: Record<number, any> = {
  1: require("../../assets/intro/introPage_1.png"),
  2: require("../../assets/intro/introPage_2.png"),
  3: require("../../assets/intro/introPage_3.png"),
  4: require("../../assets/intro/introPage_4.png"),
};

// ── 엔딩 이미지 ──
export const ENDING_IMAGES: Record<number, any> = {
  1: require("../../assets/ending/endingPage_1.png"),
  2: require("../../assets/ending/endingPage_2.png"),
  3: require("../../assets/ending/endingPage_3.png"),
  4: require("../../assets/ending/endingPage_4.png"),
};

// ── 전역 BGM ──
export const BGM_AUDIO = {
  voyage: require("../../assets/bgm/voyage.mp3"),
  ending: require("../../assets/bgm/ending.mp3"),
};

// ── 환경음(노이즈) ──
export const NOISE_AUDIO = {
  rain: require("../../assets/sound/rain.mp3"),
  wave: require("../../assets/sound/wave.mp3"),
  fire: require("../../assets/sound/fire.mp3"),
  white_noise: require("../../assets/sound/white_noise.mp3"),
};

// ── 기타 ──
export const DONATE_QR = require("../../assets/donate/toss_qr.png");