import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signup } from "../api/auth";
import { getTodayWeather } from "../api/weather";

type Field = "name" | "email" | "password" | "passwordConfirm";

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [focused, setFocused] = useState<Field | null>(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<string | null>(null);

  const fullText = "새로운 항해자 등록";
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

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  const formY = rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwValid = password.length >= 8;
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const canSubmit = name.trim().length > 0 && emailValid && pwValid && pwMatch && !loading;

  const handleSignup = async () => {
    if (!canSubmit) {
      if (!name.trim()) return Alert.alert("입력 확인", "이름을 입력해주세요.");
      if (!emailValid) return Alert.alert("입력 확인", "올바른 이메일을 입력해주세요.");
      if (!pwValid) return Alert.alert("입력 확인", "비밀번호는 8자 이상이어야 해요.");
      if (!pwMatch) return Alert.alert("입력 확인", "비밀번호가 일치하지 않아요.");
      return;
    }
    setLoading(true);
    try {
      const result = await signup({ email, name, password, passwordConfirm });
      await AsyncStorage.setItem("accessToken", result.accessToken);
      await AsyncStorage.setItem("refreshToken", result.refreshToken);
      router.replace("/mode-select");
    } catch (e) {
      console.error("회원가입 실패:", e);
      Alert.alert("회원가입 실패", "이미 가입된 이메일이거나 일시적인 오류예요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const borderFor = (f: Field, valid?: boolean) => {
    if (focused === f) return "#c88a7a";
    if (valid) return "rgba(200,150,160,0.4)";
    return "rgba(150,140,160,0.25)";
  };

  return (
    <LinearGradient
      colors={["#0c1622", "#121a28", "#1e1a2a", "#281a28", "#331d28"]}
      locations={[0, 0.3, 0.55, 0.8, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* 상단 청록 달빛 글로우 — 길게 페이드 */}
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
          <View style={st.header}>
            <Text style={st.headTyping}>{displayText}</Text>
            <Text style={st.brand}>DriftLog</Text>
            <Text style={st.headSub}>가족을 찾아, 도시에서 도시로</Text>
          </View>

          <Animated.View style={{ opacity: fade, transform: [{ translateY: formY }], width: "100%", maxWidth: 320, gap: 16 }}>
            <View style={st.fieldWrap}>
              <Text style={st.label}>이름</Text>
              <TextInput
                value={name} onChangeText={setName}
                onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
                maxLength={20} placeholder="항해자 이름" placeholderTextColor="#5a4a52"
                style={[st.input, { borderColor: borderFor("name", name.trim().length > 0) }]}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>이메일</Text>
              <TextInput
                value={email} onChangeText={setEmail}
                onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                autoCapitalize="none" keyboardType="email-address"
                placeholder="you@example.com" placeholderTextColor="#5a4a52"
                style={[st.input, { borderColor: borderFor("email", emailValid) }]}
              />
              {email.length > 0 && !emailValid && <Text style={st.hint}>이메일 형식이 올바르지 않아요</Text>}
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>비밀번호</Text>
              <TextInput
                value={password} onChangeText={setPassword}
                onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                secureTextEntry placeholder="8자 이상" placeholderTextColor="#5a4a52"
                style={[st.input, { borderColor: borderFor("password", pwValid) }]}
              />
              {password.length > 0 && !pwValid && <Text style={st.hint}>8자 이상 입력해주세요</Text>}
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>비밀번호 확인</Text>
              <View>
                <TextInput
                  value={passwordConfirm} onChangeText={setPasswordConfirm}
                  onFocus={() => setFocused("passwordConfirm")} onBlur={() => setFocused(null)}
                  secureTextEntry placeholder="다시 입력" placeholderTextColor="#5a4a52"
                  style={[st.input, { borderColor: borderFor("passwordConfirm", pwMatch), paddingRight: 36 }]}
                />
                {passwordConfirm.length > 0 && (
                  <View style={st.checkIcon}>
                    {pwMatch ? (
                      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke="#c88a7a" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    ) : (
                      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke="#9a4a4a" strokeWidth={2} fill="none" strokeLinecap="round" /></Svg>
                    )}
                  </View>
                )}
              </View>
            </View>

            <Pressable onPress={handleSignup} disabled={!canSubmit} style={[st.submit, canSubmit ? st.submitOn : st.submitOff]}>
              <Text style={[st.submitText, canSubmit && st.submitTextOn]}>
                {loading ? "등록 중..." : "출항 준비"}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.replace("/login")} style={{ paddingVertical: 8 }}>
              <Text style={st.loginLink}>
                이미 항해자이신가요? <Text style={st.loginLinkAccent}>로그인</Text>
              </Text>
            </Pressable>
          </Animated.View>

          {weather && (
            <Text style={st.weatherText}>오늘의 바다 · {weather}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 520 },
  duskGlow: { position: "absolute", bottom: 0, left: 0, right: 0, height: 480 },

  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, paddingTop: 60, paddingBottom: 120 },

  header: { alignItems: "center", marginBottom: 30 },
  headTyping: { color: "rgba(200,170,180,0.5)", fontSize: 10, letterSpacing: 3, marginBottom: 8, fontFamily: "monospace" },
  brand: { color: "rgba(225,210,215,0.92)", fontSize: 34, fontWeight: "300", letterSpacing: 8 },
  headSub: { color: "rgba(200,170,180,0.5)", fontSize: 10, letterSpacing: 3, marginTop: 10, fontFamily: "monospace" },

  fieldWrap: { gap: 6 },
  label: { color: "rgba(200,170,180,0.55)", fontSize: 11, letterSpacing: 2, fontFamily: "monospace" },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: "#e1d2d7", fontSize: 14 },
  hint: { color: "rgba(190,110,110,0.85)", fontSize: 10, fontFamily: "monospace", marginTop: 2 },
  checkIcon: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },

  submit: { marginTop: 6, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  submitOn: { borderColor: "rgba(200,150,160,0.5)", backgroundColor: "rgba(255,255,255,0.05)" },
  submitOff: { borderColor: "rgba(150,140,160,0.2)" },
  submitText: { fontSize: 13, letterSpacing: 4, fontFamily: "monospace", color: "rgba(200,170,180,0.4)" },
  submitTextOn: { color: "#e1d2d7" },

  loginLink: { textAlign: "center", color: "rgba(200,170,180,0.5)", fontSize: 12 },
  loginLinkAccent: { color: "rgba(225,190,180,0.85)", textDecorationLine: "underline" },

  weatherText: { color: "rgba(200,180,185,0.35)", fontSize: 10, letterSpacing: 3, fontFamily: "monospace", textAlign: "center", marginTop: 24 },
});