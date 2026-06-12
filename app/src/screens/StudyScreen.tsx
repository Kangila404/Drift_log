import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import StudyNativeHud from "../components/hud/StudyNativeHud";
import { nativeNoise } from "../api/nativeNoise";
import { getUserProfile } from "../api/voyage";

const WEB_URL = "https://driftlog.kro.kr/study";

export default function StudyScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [injectedJS, setInjectedJS] = useState<string | null>(null);
  const webFade = useRef(new Animated.Value(0)).current;

  // ── 진입 인사 (WebView 로딩 완료 후 1회) ──
  const [greeting, setGreeting] = useState<{ msg: string; name: string } | null>(null);
  const greetAnim = useRef(new Animated.Value(0)).current;
  const greetedRef = useRef(false);

  const showGreeting = async () => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const hour = new Date().getHours();
    const msg =
      hour < 6 ? "깊은 밤입니다." :
      hour < 12 ? "좋은 아침입니다." :
      hour < 18 ? "좋은 오후입니다." :
      "좋은 저녁입니다.";
    let name = "";
    try { name = (await getUserProfile()).name; } catch {}
    setGreeting({ msg, name });
    Animated.timing(greetAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(greetAnim, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => setGreeting(null));
    }, 3000);
  };

  useEffect(() => {
    (async () => {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const refresh = await AsyncStorage.getItem("refreshToken");
      const js = `
        (function() {
          try {
            window.isNativeApp = true;
            ${accessToken ? `localStorage.setItem("accessToken", ${JSON.stringify(accessToken)});` : ""}
            ${refresh ? `localStorage.setItem("refreshToken", ${JSON.stringify(refresh)});` : ""}
          } catch (e) {}
          true;
        })();
      `;
      setInjectedJS(js);
    })();
  }, []);

  // 화면 떠나면 소리 정지 + 진행 중 세션 폐기 (나갔다 오면 타이머 멈춤)
  useFocusEffect(
    useCallback(() => {
      return () => {
        nativeNoise.stopAll();
        AsyncStorage.removeItem("studyStartAt");
        AsyncStorage.removeItem("studyGoalMin");
        AsyncStorage.removeItem("studySubject");
      };
    }, [])
  );

  const onWebLoaded = () => {
    setTimeout(() => {
      Animated.timing(webFade, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
      showGreeting();
    }, 250);
  };

  // 네이티브 → 웹: 공부 중이면 배 움직임(forceSailing) / 소리(fire) 신호
  const sendToWeb = (payload: object) => {
    webRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(${JSON.stringify(payload)}) }));
      true;
    `);
  };

  const handleMessage = (e: WebViewMessageEvent) => {
    let msg: any = {};
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === "navigate" && msg.to === "mode-select") {
      nativeNoise.stopAll();
      router.replace("/mode-select");
    }
  };

  // HUD가 공부 상태/소리 바뀔 때 웹에 전달
  const onStudyingChange = (studying: boolean) => sendToWeb({ type: "study-state", studying });
  const onNoiseChange = (key: string | null) => sendToWeb({ type: "study-noise", noise: key });

  if (injectedJS === null) {
    return <View style={st.root} />;
  }

  return (
    <View style={st.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: webFade }]}>
        <WebView
          ref={webRef}
          source={{ uri: WEB_URL }}
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          onMessage={handleMessage}
          onLoadEnd={onWebLoaded}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scalesPageToFit={false}
          style={st.web}
        />
      </Animated.View>

      <StudyNativeHud
        onStudyingChange={onStudyingChange}
        onNoiseChange={onNoiseChange}
        onLeave={() => { nativeNoise.stopAll(); router.replace("/mode-select"); }}
      />

      {greeting && (
        <Animated.View style={[st.greetOverlay, { opacity: greetAnim }]} pointerEvents="none">
          <Animated.Text style={[st.greetMsg, { transform: [{ translateY: greetAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
            {greeting.msg}
          </Animated.Text>
          {greeting.name ? (
            <Animated.Text style={[st.greetName, { transform: [{ translateY: greetAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
              {greeting.name}님
            </Animated.Text>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07111d" },
  web: { backgroundColor: "#07111d" },
  greetOverlay: { position: "absolute", left: 0, right: 0, top: "44%", alignItems: "center", paddingHorizontal: 24 },
  greetMsg: { color: "#7eb8d4", fontSize: 13, letterSpacing: 5, fontFamily: "monospace", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 12 },
  greetName: { color: "#cce8f5", fontSize: 24, letterSpacing: 4, fontWeight: "600", marginTop: 14, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 14 },
});