import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
import { initializeKakaoSDK } from "@react-native-kakao/core";
import { login as kakaoSDKLogin } from "@react-native-kakao/user";
import { login, socialLogin, kakaoNativeLogin } from "../api/auth";

// 구글 로그인 설정 — 모듈 로드 시 1회. webClientId는 idToken 발급에 필수(웹 OAuth 클라이언트 ID).
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

// 카카오 SDK 초기화 — 모듈 로드 시 1회. 네이티브 앱 키로 SDK 활성화.
initializeKakaoSDK(process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY as string);

type Mode = "select" | "email";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("select");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // 타이틀 타이핑 애니메이션 (웹 버전 이식)
  const fullText = "물에 잠긴 한국을 항해하다";
  const [displayText, setDisplayText] = useState("");
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 80);
    return () => clearInterval(timer);
  }, []);

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

  // 구글 로그인 — SDK로 idToken 받아 백엔드(socialLogin)로 보내 우리 JWT 획득
  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) {
        Alert.alert("구글 로그인 실패", "인증 토큰을 받지 못했어요.");
        return;
      }
      console.log("[구글] socialLogin 호출 시작 → 백엔드로 idToken 전송");
      const result = await socialLogin(idToken);
      console.log("[구글] socialLogin 응답 받음:", JSON.stringify(result));
      await AsyncStorage.setItem("accessToken", result.accessToken);
      await AsyncStorage.setItem("refreshToken", result.refreshToken);
      router.replace("/mode-select");
    } catch (e) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) return; // 사용자가 취소
        if (e.code === statusCodes.IN_PROGRESS) return;
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert("구글 로그인 불가", "이 기기에서 Google Play 서비스를 사용할 수 없어요.");
          return;
        }
      }
      console.error("구글 로그인 실패:", e);
      Alert.alert("구글 로그인 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // 카카오 로그인 — SDK로 accessToken 받아 백엔드(kakaoNativeLogin)로 보내 우리 JWT 획득
  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    setKakaoLoading(true);
    try {
      // 카카오톡 설치 시 톡으로, 없으면 카카오계정(CustomTabs)으로 인증
      const token = await kakaoSDKLogin();
      const kakaoAccessToken = token.accessToken;
      if (!kakaoAccessToken) {
        Alert.alert("카카오 로그인 실패", "인증 토큰을 받지 못했어요.");
        return;
      }
      console.log("[카카오] kakaoNativeLogin 호출 시작 → 백엔드로 accessToken 전송");
      const result = await kakaoNativeLogin(kakaoAccessToken);
      console.log("[카카오] kakaoNativeLogin 응답 받음:", JSON.stringify(result));
      await AsyncStorage.setItem("accessToken", result.accessToken);
      await AsyncStorage.setItem("refreshToken", result.refreshToken);
      router.replace("/mode-select");
    } catch (e: any) {
      // 사용자가 로그인 취소한 경우 — 카카오 SDK는 에러로 던짐
      const msg = String(e?.message ?? "");
      if (msg.includes("cancel") || msg.includes("Cancel") || e?.code === "Cancelled") {
        return;
      }
      console.error("카카오 로그인 실패:", e);
      Alert.alert("카카오 로그인 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setKakaoLoading(false);
    }
  };

  const notReady = (label: string) =>
    Alert.alert("준비 중", `${label}은(는) 추후 지원될 예정이에요.`);

  return (
    // TODO: OceanBackground → 3D 항해 씬 WebView 배경 (별도 단계). 지금은 단색
    <View className="flex-1 items-center justify-center bg-[#07111d] px-6">
      {/* 브랜드 헤더 — 스플래시 톤 */}
      <View className="items-center mb-10">
        <Text className="text-[#7ab8c8]/40 text-[10px] tracking-[3px] mb-2">
          {displayText}
        </Text>
        <Text className="text-[#b4d2da]/90 text-4xl font-light tracking-[8px]">
          DriftLog
        </Text>
        <Text className="text-[#7ab8c8]/40 text-[10px] tracking-[3px] mt-3">
          가족을 찾아, 도시에서 도시로
        </Text>
      </View>

      {mode === "select" ? (
        // ── 1단계: 로그인 방법 선택 ──
        <View className="w-full max-w-xs gap-3">
          {/* 카카오 */}
          <Pressable
            onPress={handleKakaoLogin}
            disabled={kakaoLoading}
            className="flex-row items-center justify-center gap-2 bg-[#FEE500] py-3.5 rounded-md active:opacity-80"
          >
            <KakaoGlyph />
            <Text className="text-[#191600] text-sm font-medium tracking-[1px]">
              {kakaoLoading ? "로그인 중..." : "카카오로 로그인"}
            </Text>
          </Pressable>

          {/* 구글 */}
          <Pressable
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            className="flex-row items-center justify-center gap-2 bg-white py-3.5 rounded-md active:opacity-80"
          >
            <GoogleGlyph />
            <Text className="text-[#1f1f1f] text-sm font-medium tracking-[1px]">
              {googleLoading ? "로그인 중..." : "Google로 로그인"}
            </Text>
          </Pressable>

          {/* 이메일(로컬) 로그인 */}
          <Pressable
            onPress={() => setMode("email")}
            className="flex-row items-center justify-center gap-2 border border-[#7ab8c8]/40 py-3.5 rounded-md active:bg-[#7ab8c8]/10"
          >
            <MailGlyph />
            <Text className="text-[#b4d2da]/90 text-sm tracking-[1px]">이메일로 로그인</Text>
          </Pressable>

          {/* 회원가입 */}
          <Pressable onPress={() => notReady("회원가입")} className="py-3 active:opacity-70">
            <Text className="text-center text-[#7ab8c8]/40 text-xs">
              처음이신가요? <Text className="text-[#7ab8c8]/70 underline">회원가입</Text>
            </Text>
          </Pressable>
        </View>
      ) : (
        // ── 2단계: 이메일 입력 폼 ──
        <View className="w-full max-w-xs border border-[#7ab8c8]/20 bg-[#060e16]/85 p-7 gap-5">
          <View className="gap-1">
            <Text className="text-[#7ab8c8]/50 text-xs tracking-[2px]">이메일</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-[#7ab8c8]/5 border border-[#7ab8c8]/20 text-[#b4d2da] px-3 py-2.5 text-sm"
              placeholderTextColor="#7ab8c855"
            />
          </View>

          <View className="gap-1">
            <Text className="text-[#7ab8c8]/50 text-xs tracking-[2px]">비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="bg-[#7ab8c8]/5 border border-[#7ab8c8]/20 text-[#b4d2da] px-3 py-2.5 text-sm"
              placeholderTextColor="#7ab8c855"
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="border border-[#7ab8c8]/40 py-3 active:bg-[#7ab8c8]/10"
          >
            <Text className="text-[#b4d2da]/80 text-xs tracking-[2px] text-center">
              {loading ? "..." : "출항"}
            </Text>
          </Pressable>

          {/* 뒤로 — 방법 선택으로 */}
          <Pressable onPress={() => setMode("select")} className="active:opacity-70">
            <Text className="text-center text-[#7ab8c8]/40 text-xs">‹ 다른 방법으로 로그인</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── 아이콘 (단색 SVG) ───
function KakaoGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Path
        d="M12 3C6.9 3 3 6.3 3 10.3c0 2.6 1.8 4.9 4.4 6.1-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.7-1.8 3.8-2.6.4 0 .8.1 1.2.1 5.1 0 9-3.3 9-7.3S17.1 3 12 3Z"
        fill="#191600"
      />
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

function MailGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16v12H4z" stroke="#b4d2da" strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="m4 7 8 6 8-6" stroke="#b4d2da" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}