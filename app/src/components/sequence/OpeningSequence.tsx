import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, ImageBackground, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { assetUrl } from "../../api/config";
import { nativeBgm } from "../../api/nativeBgm";

const INTRO_BGM = "/city/seoul_bgm.mp3";   // 인트로는 원래 서울 도시 BGM이 깔려 있었음

type SceneT = { image: string; lines: string[] };

const SCENES: SceneT[] = [
  {
    image: "/intro/introPage_1.png",
    lines: [
      "바람이 기분 좋게 불던 여름",
      "여느 날과 다름없는 저녁이었다.",
      "가족과 함께 한강의 노을을 바라보고 있었다.",
    ],
  },
  {
    image: "/intro/introPage_2.png",
    lines: [
      "빗방울이 하나둘 떨어지기 시작했다.",
      "어린 동생이 혹여나 감기가 걸릴까 걱정 되어",
      "우산을 사러 자리를 비웠다.",
    ],
  },
  {
    image: "/intro/introPage_3.png",
    lines: [
      "비가 내렸다.",
      "아주 내렸다.",
      "강이 범람하고, 거리가 물에 잠겼다.",
      "돌아왔을 때, 그곳엔 아무도 없었다.",
      "처음부터 아무것도 없었다는 듯이",
    ],
  },
  {
    image: "/intro/introPage_4.png",
    lines: [
      "강가에 묶여 있던 낡은 돛단배 간신히 몸을 실었다.",
      "이젠 강가라고 할 수 있는 곳일까",
      "...",
      "이제 육지는 거의 남아 있지 않다.",
      "가족이 어디로 떠내려 갔는지 알 수 없다.",
      "구하러 가야한다.",
    ],
  },
];

export default function OpeningSequence({ onFinish }: { onFinish?: () => void }) {
  const { width, height } = useWindowDimensions();
  const [sceneIdx, setSceneIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const rootOpacity = useRef(new Animated.Value(1)).current;
  const sceneOpacity = useRef(new Animated.Value(0)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;
  const lineY = useRef(new Animated.Value(12)).current;
  const hint = useRef(new Animated.Value(0.3)).current;
  const bgmRef = useRef<AudioPlayer | null>(null);

  // 인트로 전용 BGM
  useEffect(() => {
    let p: AudioPlayer | null = null;
    nativeBgm.duck(true);   // 게임 BGM 죽임
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
        const url = assetUrl(INTRO_BGM);
        if (!url) return;
        p = createAudioPlayer({ uri: url });
        p.loop = true;
        p.volume = 0.5;
        p.play();
        bgmRef.current = p;
      } catch {}
    })();
    return () => {
      try { p?.pause(); p?.remove(); } catch {}
      bgmRef.current = null;
      nativeBgm.duck(false);   // 게임 BGM 복귀
    };
  }, []);

  const scene = SCENES[sceneIdx];
  const isLastLine = scene ? lineIdx >= scene.lines.length - 1 : true;
  const isLastScene = sceneIdx >= SCENES.length - 1;

  // 장면 페이드 인
  useEffect(() => {
    sceneOpacity.setValue(0);
    Animated.timing(sceneOpacity, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
  }, [sceneIdx]);

  // 대사 페이드 인
  useEffect(() => {
    lineOpacity.setValue(0);
    lineY.setValue(12);
    Animated.parallel([
      Animated.timing(lineOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(lineY, { toValue: 0, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [sceneIdx, lineIdx]);

  // 힌트 깜빡임
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hint, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(hint, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const finish = () => {
    if (fading) return;
    setFading(true);
    Animated.timing(rootOpacity, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      .start(() => onFinish?.());
  };

  const handleNext = () => {
    if (fading) return;
    if (!isLastLine) {
      setLineIdx((i) => i + 1);
    } else if (!isLastScene) {
      // 다음 장면 — 대사 페이드아웃 후 전환
      Animated.timing(lineOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setSceneIdx((i) => i + 1);
        setLineIdx(0);
      });
    } else {
      finish();
    }
  };

  return (
    <Animated.View style={[st.root, { opacity: rootOpacity }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleNext}>
        {/* 배경 이미지 */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: sceneOpacity }]}>
          {scene && (
            <ImageBackground source={{ uri: assetUrl(scene.image)! }} style={{ width, height }} resizeMode="cover">
              <LinearGradient
                colors={["transparent", "transparent", "rgba(2,6,14,0.85)"]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />
            </ImageBackground>
          )}
        </Animated.View>

        {/* 대사 */}
        <View style={st.textWrap} pointerEvents="none">
          <Animated.Text style={[st.line, { opacity: lineOpacity, transform: [{ translateY: lineY }] }]}>
            {scene?.lines[lineIdx] ?? ""}
          </Animated.Text>
          <Animated.Text style={[st.hint, { opacity: hint }]}>클릭하여 계속</Animated.Text>
        </View>
      </Pressable>

      {/* 건너뛰기 */}
      <Pressable onPress={finish} style={st.skip} hitSlop={10}>
        <Text style={st.skipText}>건너뛰기</Text>
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 100 },
  scrimTop: { position: "absolute", top: 0, left: 0, right: 0, height: "25%", backgroundColor: "rgba(2,6,14,0.2)" },
  scrimBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", backgroundColor: "rgba(2,6,14,0.4)" },
  textWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 32, paddingBottom: 64, alignItems: "center" },
  line: {
    color: "#cce8f5", fontSize: 18, lineHeight: 30, textAlign: "center",
    fontFamily: "serif", maxWidth: 720,
    textShadowColor: "rgba(0,0,0,0.85)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  hint: { marginTop: 28, color: "#4a7a94", fontSize: 10, letterSpacing: 4, fontFamily: "monospace" },
  skip: { position: "absolute", top: 50, right: 22, paddingHorizontal: 14, paddingVertical: 8 },
  skipText: { color: "#3a6880", fontSize: 10, letterSpacing: 3, fontFamily: "monospace" },
});