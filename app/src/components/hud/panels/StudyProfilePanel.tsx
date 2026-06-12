import { useEffect, useState } from "react";
import {
  View, Text, Pressable, TextInput, ScrollView, ActivityIndicator,
  Modal, KeyboardAvoidingView, Linking, Platform, Alert, StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle } from "react-native-svg";
import { getUserProfile, updateNickname, updatePassword, type UserProfile } from "../../../api/voyage";
import { getStudySummary, type StudySummary } from "../../../api/study";
import CustomerCenter from "./CustomerCenter";
import AdminModal from "./AdminModal";

const KAKAO_PAY_URL = "https://qr.kakaopay.com/FHjo39K0L";
type EditTab = "nickname" | "password";

// 단색 시계 글리프 (이모지 대체 — 정렬 확실)
function ClockGlyph({ size = 22, color = "#4a9abb" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.5} />
      <Path d="M12 7.5 V12 L15 14" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const fmtSummary = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
};

export default function StudyProfilePanel() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<StudySummary>({ todaySeconds: 0, totalSeconds: 0 });
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getUserProfile().then(setProfile).catch(() => {}),
      getStudySummary().then(setSummary).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#4a9abb" /></View>;
  if (!profile) return <View style={s.center}><Text style={s.empty}>프로필을 불러오지 못했습니다</Text></View>;

  const isLocal = profile.authType === "LOCAL";
  const isAdmin = (profile.userRole ?? "").toUpperCase() === "ADMIN";

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      <View style={s.profileRow}>
        <View style={s.avatar}><ClockGlyph size={24} /></View>
        <View style={s.profileInfo}>
          <Text style={s.name} numberOfLines={1}>{profile.name}</Text>
          <Text style={s.email} numberOfLines={1}>{profile.email}</Text>
          <Text style={s.joined}>가입 {profile.joined}</Text>
        </View>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setEditOpen(true); }} style={s.editBtn}>
          <Text style={s.editBtnText}>수정</Text>
        </Pressable>
      </View>

      <View style={s.statRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{fmtSummary(summary.todaySeconds)}</Text>
          <Text style={s.statLabel}>오늘 공부량</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{fmtSummary(summary.totalSeconds)}</Text>
          <Text style={s.statLabel}>총 공부량</Text>
        </View>
      </View>

      <View style={s.divider} />

      <CustomerCenter />

      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setDonateOpen(true); }} style={s.menuBtn}>
        <Text style={s.menuText}>개발자 후원하기</Text>
      </Pressable>

      {isAdmin && (
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setAdminOpen(true); }} style={s.menuBtn}>
          <Text style={s.menuText}>관리자 페이지</Text>
        </Pressable>
      )}

      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        isLocal={isLocal}
        currentName={profile.name}
        onNameSaved={(name) => setProfile((p) => (p ? { ...p, name } : p))}
      />

      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />

      <Modal visible={donateOpen} transparent animationType="fade" onRequestClose={() => setDonateOpen(false)}>
        <Pressable style={s.donateOverlay} onPress={() => setDonateOpen(false)}>
          <Pressable style={s.donateCard} onPress={() => {}}>
            <View style={s.donateIcon}><ClockGlyph size={20} color="#7eb8d4" /></View>
            <Text style={s.donateLabel}>SUPPORT</Text>
            <Text style={s.donateMsg}>본 서비스는 사용자 경험을 위해{"\n"}광고 없이 운영됩니다.</Text>
            <Text style={s.donateSub}>한 분 한 분{"\n"}모두 기억하겠습니다.</Text>
            <Pressable onPress={() => Linking.openURL(KAKAO_PAY_URL)} style={s.kakaoBtn}>
              <Text style={s.kakaoText}>카카오페이로 후원하기</Text>
            </Pressable>
            <Pressable onPress={() => setDonateOpen(false)} style={s.donateCloseBtn} hitSlop={12}>
              <Text style={s.donateClose}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ─── 수정 중앙 카드 모달 ───
function EditModal({ open, onClose, isLocal, currentName, onNameSaved }: {
  open: boolean; onClose: () => void; isLocal: boolean; currentName: string;
  onNameSaved: (name: string) => void;
}) {
  const [tab, setTab] = useState<EditTab>("nickname");
  const [nickname, setNickname] = useState(currentName);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    if (open) { setTab("nickname"); setNickname(currentName); setPwCurrent(""); setPwNext(""); setPwConfirm(""); setShowPw(false); setDone(""); }
  }, [open]);

  const saveNick = async () => {
    const name = nickname.trim();
    if (!name || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSaving(true);
    try { await updateNickname(name); onNameSaved(name); setDone("닉네임이 변경되었습니다"); setTimeout(onClose, 800); }
    catch { Alert.alert("실패", "닉네임을 변경하지 못했습니다."); }
    finally { setSaving(false); }
  };

  const savePw = async () => {
    if (saving) return;
    if (!pwCurrent) return Alert.alert("확인", "현재 비밀번호를 입력하세요");
    if (pwNext.length < 8) return Alert.alert("확인", "새 비밀번호는 8자 이상이어야 합니다");
    if (pwNext !== pwConfirm) return Alert.alert("확인", "새 비밀번호가 일치하지 않습니다");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSaving(true);
    try {
      await updatePassword({ currentPassword: pwCurrent, newPassword: pwNext, newPasswordConfirm: pwConfirm });
      setPwCurrent(""); setPwNext(""); setPwConfirm("");
      setDone("비밀번호가 변경되었습니다"); setTimeout(onClose, 800);
    } catch { Alert.alert("실패", "비밀번호 변경에 실패했습니다."); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={s.editCard} pointerEvents="box-none">
          <View style={s.editInner}>
            <View style={s.header}>
              <Text style={s.title}>프로필 수정</Text>
              <Pressable onPress={onClose} style={s.closeX}><Text style={s.closeXText}>✕</Text></Pressable>
            </View>

            {isLocal && (
              <View style={s.tabBar}>
                {([["nickname", "닉네임"], ["password", "비밀번호"]] as const).map(([id, label]) => (
                  <Pressable key={id} onPress={() => { setTab(id); setDone(""); }} style={[s.tab, tab === id && s.tabActive]}>
                    <Text style={[s.tabText, tab === id && s.tabTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={s.editBody}>
              {(!isLocal || tab === "nickname") ? (
                <View style={{ gap: 12 }}>
                  <Text style={s.label}>새 닉네임</Text>
                  <TextInput value={nickname} onChangeText={setNickname} maxLength={20} placeholder="새 닉네임" placeholderTextColor="#1a3a50" style={s.input} />
                  <View style={s.rowBetween}>
                    <Text style={done ? s.doneText : s.count}>{done || `${nickname.length}/20`}</Text>
                    <Pressable onPress={saveNick} disabled={saving || !nickname.trim()} style={s.submitBtn}>
                      <Text style={s.submitText}>{saving ? "저장 중" : "저장"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={s.pwHeadRow}>
                    <Text style={s.label}>비밀번호 변경</Text>
                    <Pressable onPress={() => setShowPw((v) => !v)}>
                      <Text style={s.pwToggle}>{showPw ? "가리기" : "표시"}</Text>
                    </Pressable>
                  </View>
                  <TextInput value={pwCurrent} onChangeText={setPwCurrent} secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false} placeholder="현재 비밀번호" placeholderTextColor="#1a3a50" style={s.input} />
                  <TextInput value={pwNext} onChangeText={setPwNext} secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false} placeholder="새 비밀번호 (8자 이상)" placeholderTextColor="#1a3a50" style={s.input} />
                  <TextInput value={pwConfirm} onChangeText={setPwConfirm} secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false} placeholder="새 비밀번호 확인" placeholderTextColor="#1a3a50" style={s.input} />
                  <View style={s.rowBetween}>
                    <Text style={done ? s.doneText : s.count}>{done}</Text>
                    <Pressable onPress={savePw} disabled={saving} style={s.submitBtn}>
                      <Text style={s.submitText}>{saving ? "변경 중" : "변경"}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  list: { paddingBottom: 40, gap: 16 },
  center: { paddingVertical: 40, alignItems: "center", justifyContent: "center" },
  empty: { color: "#1a3a50", fontSize: 13, fontStyle: "italic" },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: "#0d2233", backgroundColor: "#050e18", alignItems: "center", justifyContent: "center" },
  profileInfo: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: "#a8d4e8", fontSize: 17, fontWeight: "500" },
  email: { color: "#2a5a74", fontSize: 12 },
  joined: { color: "#1a3a50", fontSize: 10 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 8, backgroundColor: "rgba(7,24,38,0.4)" },
  editBtnText: { color: "#5a8aa4", fontSize: 11, letterSpacing: 1 },

  statRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: "#050e18", borderWidth: 1, borderColor: "#0d2233", borderRadius: 12, paddingVertical: 18, alignItems: "center" },
  statValue: { color: "#4a9abb", fontSize: 20, fontWeight: "500" },
  statLabel: { color: "#2a5a74", fontSize: 11, marginTop: 4 },

  divider: { height: 1, backgroundColor: "#0d2233" },

  menuBtn: { paddingVertical: 13, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", borderRadius: 10, alignItems: "center" },
  menuText: { color: "#5a8aa4", fontSize: 13, letterSpacing: 2 },

  overlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.82)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  editCard: { width: "100%", maxWidth: 460 },
  editInner: { backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 18, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  title: { flex: 1, color: "#7eb8d4", fontSize: 14, letterSpacing: 3, fontFamily: "monospace" },
  closeX: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "#1a3a50", alignItems: "center", justifyContent: "center" },
  closeXText: { color: "#3a6880", fontSize: 13 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0d2233" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#4a9abb" },
  tabText: { color: "#1a3a50", fontSize: 12, letterSpacing: 2 },
  tabTextActive: { color: "#7eb8d4" },
  editBody: { paddingHorizontal: 20, paddingVertical: 20 },
  label: { color: "#4a7a94", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },
  pwHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pwToggle: { color: "#4a9abb", fontSize: 11, letterSpacing: 1 },
  input: { backgroundColor: "#040d16", borderWidth: 1, borderColor: "#1a3a50", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, color: "#cce8f5", fontSize: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  count: { color: "#1a3a50", fontSize: 11, fontFamily: "monospace" },
  doneText: { color: "#4a9abb", fontSize: 12 },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", borderRadius: 8 },
  submitText: { color: "#4a9abb", fontSize: 12, letterSpacing: 1 },

  donateOverlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.82)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  donateCard: { width: "100%", maxWidth: 340, borderRadius: 20, paddingVertical: 32, paddingHorizontal: 28, alignItems: "center", backgroundColor: "#0a1828", borderWidth: 1, borderColor: "rgba(74,154,187,0.25)" },
  donateIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 18, backgroundColor: "rgba(126,184,212,0.1)", borderWidth: 1, borderColor: "rgba(126,184,212,0.25)" },
  donateLabel: { color: "#4a9abb", fontSize: 10, letterSpacing: 4, fontFamily: "monospace", marginBottom: 18 },
  donateMsg: { color: "#cce8f5", fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 12 },
  donateSub: { color: "#5a8aa4", fontSize: 12, lineHeight: 20, textAlign: "center", marginBottom: 26 },
  kakaoBtn: { width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "#FEE500" },
  kakaoText: { color: "#3C1E1E", fontSize: 15, fontWeight: "700" },
  donateCloseBtn: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 28, alignSelf: "center" },
  donateClose: { color: "#3a6880", fontSize: 12, letterSpacing: 2 },
});