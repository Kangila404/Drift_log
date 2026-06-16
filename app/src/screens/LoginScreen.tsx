import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Easing, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin, statusCodes, isErrorWithCode,
} from "@react-native-google-signin/google-signin";
import { initializeKakaoSDK } from "@react-native-kakao/core";
import { login as kakaoSDKLogin } from "@react-native-kakao/user";
import { login, socialLogin, kakaoNativeLogin, appleLogin } from "../api/auth";
import { getTodayWeather } from "../api/weather";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
});
initializeKakaoSDK(process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY as string);

type Mode = "select" | "email";
type Field = "email" | "password";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("select");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<Field | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [weather, setWeather] = useState<string | null>(null);

  const fullText = "물에 잠긴 한국을 항해하다";
  const [displayText, setDisplayText] = useState("");
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) { setDisplayText(fullText.slice(0, index + 1)); index++; }
      else clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getTodayWeather().then((w) => setWeather(w.label)).catch(() => {});
  }, []);

  // iOS + Apple 로그인 사용 가능 여부 (지원 안 되면 버튼 숨김)
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  const formFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    formFade.setValue(0);
    Animated.timing(formFade, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [mode]);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await login({ email, password });
      await AsyncStorage.setItem("accessToken", result.accessToken);
      await AsyncStorage.setItem("refreshToken", result.refreshToken);
      router.replace("/mode-select");
    } catch (e) {
      console.error("로그인 실패:", e);
      Alert.alert("로그인 실패", "이메일 또는 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) { Alert.alert("구글 로그인 실패", "인증 토큰을 받지 못했어요."); return; }
      const result = await socialLogin(idToken);
      await AsyncStorage.setItem("accessToken", result.accessToken);
      await AsyncStorage.setItem("refreshToken", result.refreshToken);
      router.replace("/mode-select");
    } catch (e) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (e.code === statusCodes.IN_PROGRESS) return;
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert("구글 로그인 불가", "이 기기에서 Google Play 서비스를 사용할 수 없어요."); return;
        }
      }
      console.error("구글 로그인 실패:", e);
      Alert.alert("구글 로그인 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setKakaoLoading(true);
    try {
      const token = await kakaoSDKLogin();
      const kakaoAccessToken = token.accessToken;
      if (!kakaoAccessToken) { Alert.alert("카카오 로그인 실패", "인증 토큰을 받지 못했어요."); return; }
      const result = await kakaoNativeLogin(kakaoAccessToken);
      await AsyncStorage.setItem("accessToken", result.accessToken);
      await AsyncStorage.setItem("refreshToken", result.refreshToken);
      router.replace("/mode-select");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("cancel") || msg.includes("Cancel") || e?.code === "Cancelled") return;
      console.error("카카오 로그인 실패:", e);
      Alert.alert("카카오 로그인 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setKakaoLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (appleLoading) return;
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const identityToken = credential.identityToken;
      if (!identityToken) { Alert.alert("애플 로그인 실패", "인증 토큰을 받지 못했어요."); return; }

      // 애플은 최초 로그인 시에만 이름 제공 (이후엔 null)
      let name: string | undefined;
      if (credential.fullName) {
        const { familyName, givenName } = credential.fullName;
        name = [familyName, givenName].filter(Boolean).join("") || undefined;
      }

      const result = await appleLogin(identityToken, name);
      await AsyncStorage.setItem("accessToken", result.accessToken);
      await AsyncStorage.setItem("refreshToken", result.refreshToken);
      router.replace("/mode-select");
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return;  // 사용자가 취소
      console.error("애플 로그인 실패:", e);
      Alert.alert("애플 로그인 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setAppleLoading(false);
    }
  };

  const borderFor = (f: Field) => (focused === f ? "#c88a7a" : "rgba(150,140,160,0.25)");

  return (
    <LinearGradient
      colors={["#0c1622", "#121a28", "#1e1a2a", "#281a28", "#331d28"]}
      locations={[0, 0.3, 0.55, 0.8, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={["rgba(74,154,187,0.13)", "rgba(74,154,187,0.06)", "rgba(74,154,187,0.02)", "transparent"]}
        locations={[0, 0.4, 0.7, 1]}
        style={st.topGlow}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      {/* 하단 황혼 빛번짐 */}
      <LinearGradient
        colors={["transparent", "rgba(180,100,120,0.16)", "rgba(200,120,100,0.20)"]}
        locations={[0, 0.6, 1]}
        style={st.duskGlow}
        start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={st.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 헤더 */}
          <View style={st.header}>
            <Text style={st.headTyping}>{displayText}</Text>
            <Text style={st.brand}>DriftLog</Text>
            <Text style={st.headSub}>가족을 찾아, 도시에서 도시로</Text>
          </View>

          {mode === "select" ? (
            <Animated.View style={[st.formCol, { opacity: formFade }]}>
              <Pressable onPress={handleKakaoLogin} disabled={kakaoLoading} style={[st.socialBtn, { backgroundColor: "#FEE500" }]}>
                <KakaoGlyph />
                <Text style={[st.socialText, { color: "#191600" }]}>
                  {kakaoLoading ? "로그인 중..." : "카카오로 로그인"}
                </Text>
              </Pressable>

              <Pressable onPress={handleGoogleLogin} disabled={googleLoading} style={[st.socialBtn, { backgroundColor: "#fff" }]}>
                <GoogleGlyph />
                <Text style={[st.socialText, { color: "#1f1f1f" }]}>
                  {googleLoading ? "로그인 중..." : "Google로 로그인"}
                </Text>
              </Pressable>

              {appleAvailable && (
                <Pressable onPress={handleAppleLogin} disabled={appleLoading} style={[st.socialBtn, { backgroundColor: "#000", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }]}>
                  <AppleGlyph />
                  <Text style={[st.socialText, { color: "#fff" }]}>
                    {appleLoading ? "로그인 중..." : "Apple로 로그인"}
                  </Text>
                </Pressable>
              )}

              <Pressable onPress={() => setMode("email")} style={st.emailBtn}>
                <MailGlyph />
                <Text style={st.emailBtnText}>이메일로 로그인</Text>
              </Pressable>

              <Pressable onPress={() => router.push("/signup")} style={{ paddingVertical: 12 }}>
                <Text style={st.signupLink}>
                  처음이신가요? <Text style={st.signupLinkAccent}>회원가입</Text>
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View style={[st.emailForm, { opacity: formFade }]}>
              <View style={st.fieldWrap}>
                <Text style={st.label}>이메일</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#5a4a52"
                  style={[st.input, { borderColor: borderFor("email") }]}
                />
              </View>

              <View style={st.fieldWrap}>
                <Text style={st.label}>비밀번호</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  secureTextEntry
                  placeholder="비밀번호"
                  placeholderTextColor="#5a4a52"
                  style={[st.input, { borderColor: borderFor("password") }]}
                />
              </View>

              <Pressable onPress={handleLogin} disabled={loading} style={st.submit}>
                <Text style={st.submitText}>{loading ? "..." : "출항"}</Text>
              </Pressable>

              <Pressable onPress={() => setMode("select")} style={{ paddingVertical: 4 }}>
                <Text style={st.backLink}>‹ 다른 방법으로 로그인</Text>
              </Pressable>
            </Animated.View>
          )}

          {weather && (
            <View style={st.weatherWrap}>
              <Text style={st.weatherText}>오늘의 바다 · {weather}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function KakaoGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Path d="M12 3C6.9 3 3 6.3 3 10.3c0 2.6 1.8 4.9 4.4 6.1-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.7-1.8 3.8-2.6.4 0 .8.1 1.2.1 5.1 0 9-3.3 9-7.3S17.1 3 12 3Z" fill="#191600" />
    </Svg>
  );
}
function GoogleGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M21.6 12.2c0-.6-.1-1.2-.2-1.8H12v3.4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.1Z" fill="#4285F4" />
      <Path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
      <Path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z" fill="#FBBC05" />
      <Path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1Z" fill="#EA4335" />
    </Svg>
  );
}
function AppleGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Path d="M16.4 12.7c0 2.8 2.5 3.7 2.5 3.8 0 .1-.4 1.3-1.3 2.6-.8 1.1-1.6 2.2-2.8 2.3-1.2 0-1.6-.7-3-.7s-1.8.7-3 .7c-1.2 0-2.1-1.2-2.9-2.3-1.6-2.3-2.8-6.5-1.2-9.3.8-1.4 2.2-2.3 3.8-2.3 1.2 0 2.3.8 3 .8.7 0 2.1-1 3.5-.8.6 0 2.3.2 3.4 1.8-.1.1-2 1.2-2 3.7zM14.1 5.4c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z" fill="#fff" />
    </Svg>
  );
}
function MailGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16v12H4z" stroke="#c0b0b8" strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="m4 7 8 6 8-6" stroke="#c0b0b8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const st = StyleSheet.create({
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 520 },
  duskGlow: { position: "absolute", bottom: 0, left: 0, right: 0, height: 480 },

  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 60 },

  header: { alignItems: "center", marginBottom: 40 },
  headTyping: { color: "rgba(200,170,180,0.5)", fontSize: 10, letterSpacing: 3, marginBottom: 8, fontFamily: "monospace" },
  brand: { color: "rgba(225,210,215,0.92)", fontSize: 36, fontWeight: "300", letterSpacing: 8 },
  headSub: { color: "rgba(200,170,180,0.5)", fontSize: 10, letterSpacing: 3, marginTop: 12, fontFamily: "monospace" },

  formCol: { width: "100%", maxWidth: 320, gap: 12 },
  socialBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 8 },
  socialText: { fontSize: 14, fontWeight: "500", letterSpacing: 1 },

  emailBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: "rgba(220,200,205,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
  emailBtnText: { color: "rgba(225,210,215,0.9)", fontSize: 14, letterSpacing: 1 },
  signupLink: { textAlign: "center", color: "rgba(200,170,180,0.5)", fontSize: 12 },
  signupLinkAccent: { color: "rgba(225,190,180,0.85)", textDecorationLine: "underline" },

  emailForm: { width: "100%", maxWidth: 320, borderWidth: 1, borderColor: "rgba(200,150,160,0.22)", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 26, gap: 18 },
  fieldWrap: { gap: 6 },
  label: { color: "rgba(200,170,180,0.55)", fontSize: 11, letterSpacing: 2, fontFamily: "monospace" },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: "#e1d2d7", fontSize: 14 },
  submit: { borderWidth: 1, borderColor: "rgba(200,150,160,0.4)", borderRadius: 8, paddingVertical: 13, alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  submitText: { color: "rgba(225,210,215,0.85)", fontSize: 12, letterSpacing: 2, fontFamily: "monospace" },
  backLink: { textAlign: "center", color: "rgba(200,170,180,0.5)", fontSize: 12 },

  weatherWrap: { alignItems: "center", marginTop: 36 },
  weatherText: { color: "rgba(200,180,185,0.35)", fontSize: 10, letterSpacing: 3, fontFamily: "monospace" },
});