import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, ImageBackground, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { assetUrl } from "../../api/config";
import { nativeBgm } from "../../api/nativeBgm";

const ENDING_BGM = "/bgm/ending.mp3";

type Scene = { image: string; lines: string[] };

const SCENES: Scene[] = [
  {
    image: "/ending/endingPage_1.png",
    lines: [
      "산 자락에 배를 정박시켰다.",
      "지금껏 마치 역마살이 낀 듯 떠돌아 이곳에 왔다.",
      "그 모든 곳에 그들이 남긴 흔적이 있었다.",
      "오늘이 긴 방황의 마지막이길 바란다.",
    ],
  },
  {
    image: "/ending/endingPage_2.png",
    lines: [
      "산을 오름에도 힘이 부치지 않는다.",
      "너무 늦은 건 아닐까 생각이 들어 겁이 난다.",
    ],
  },
  {
    image: "/ending/endingPage_3.png",
    lines: [
      "산 정상에 작은 천막이 보였다.",
      "어설픈 솜씨",
      "인기척이 들리는 듯하다.",
    ],
  },
  {
    image: "/ending/endingPage_4.png",
    lines: [
      "어두운 밤이면 배의 조명 등불에 기대어 바다를 지나 왔다.",
      "옛 고전의 말처럼 스스로의 등불에 기대어 어둠을 밝히기엔 나는 어리석다.",
      "나는 편히 내 한 몸 늬울 곳이 필요했다.",
      "단지 그뿐이였다.",
    ],
  },
];

type Phase = "scenes" | "title";

// 다시보기 전용 — 피드백 없이 장면 + 타이틀
export default function EndingSequence({ onFinish }: { onFinish?: () => void }) {
  const { width, height } = useWindowDimensions();
  const [sceneIdx, setSceneIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("scenes");

  const sceneOpacity = useRef(new Animated.Value(0)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;
  const lineY = useRef(new Animated.Value(12)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0.3)).current;
  const bgmRef = useRef<AudioPlayer | null>(null);

  // 엔딩 전용 BGM
  useEffect(() => {
    let p: AudioPlayer | null = null;
    nativeBgm.duck(true);   // 게임 BGM 죽임
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "doNotMix" });
        const url = assetUrl(ENDING_BGM);
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

  useEffect(() => {
    sceneOpacity.setValue(0);
    Animated.timing(sceneOpacity, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
  }, [sceneIdx]);

  useEffect(() => {
    lineOpacity.setValue(0);
    lineY.setValue(12);
    Animated.parallel([
      Animated.timing(lineOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(lineY, { toValue: 0, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [sceneIdx, lineIdx]);

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

  const handleNext = () => {
    if (phase !== "scenes") return;
    if (!isLastLine) {
      setLineIdx((i) => i + 1);
    } else if (!isLastScene) {
      Animated.timing(lineOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setSceneIdx((i) => i + 1);
        setLineIdx(0);
      });
    } else {
      // 타이틀 → 종료
      setPhase("title");
      Animated.timing(titleOpacity, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
      setTimeout(() => onFinish?.(), 2800);
    }
  };

  return (
    <View style={st.root}>
      {phase === "scenes" ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleNext}>
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

          <View style={st.textWrap} pointerEvents="none">
            <Animated.Text style={[st.line, { opacity: lineOpacity, transform: [{ translateY: lineY }] }]}>
              {scene?.lines[lineIdx] ?? ""}
            </Animated.Text>
            <Animated.Text style={[st.hint, { opacity: hint }]}>클릭하여 계속</Animated.Text>
          </View>
        </Pressable>
      ) : (
        <Animated.View style={[st.titleWrap, { opacity: titleOpacity }]}>
          <Text style={st.title}>DriftLog</Text>
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 100 },
  scrimTop: { position: "absolute", top: 0, left: 0, right: 0, height: "25%", backgroundColor: "rgba(2,6,14,0.2)" },
  scrimBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", backgroundColor: "rgba(2,6,14,0.55)" },
  textWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 32, paddingBottom: 64, alignItems: "center" },
  line: {
    color: "#cce8f5", fontSize: 18, lineHeight: 30, textAlign: "center",
    fontFamily: "serif", maxWidth: 720,
    textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  hint: { marginTop: 28, color: "#4a7a94", fontSize: 10, letterSpacing: 4, fontFamily: "monospace" },
  titleWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  title: { color: "#a8d4e8", fontSize: 28, letterSpacing: 14, fontFamily: "serif" },
});