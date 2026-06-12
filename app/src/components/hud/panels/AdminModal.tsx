import { useEffect, useState } from "react";
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  getDashboard, getUserList, getUserDetail, banUser, activateUser,
  getVersion, updateVersion,
  getAdminInquiries, writeAnswer, updateAnswer, deleteAnswer,
  getAdminNotices, writeNotice, updateNotice, deleteNotice,
  type Dashboard, type UserRow, type UserDetail, type Inquiry, type Notice,
} from "../../../api/adminApi";

const fmtDate = (str: string | null) => {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

type Tab = "dashboard" | "users" | "support" | "version";

export default function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.topBar}>
          <Text style={s.topTitle}>DriftLog · Admin</Text>
          <Pressable onPress={onClose} style={s.closeBtn}><Text style={s.closeText}>닫기</Text></Pressable>
        </View>

        <View style={s.tabBar}>
          {([["dashboard", "대시보드"], ["users", "유저"], ["support", "고객센터"], ["version", "버전"]] as const).map(([id, label]) => (
            <Pressable key={id} onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(id); }} style={[s.tab, tab === id && s.tabActive]}>
              <Text style={[s.tabText, tab === id && s.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[s.body, { paddingBottom: insets.bottom }]}>
          {tab === "dashboard" && <DashboardTab />}
          {tab === "users" && <UserTab />}
          {tab === "support" && <SupportTab />}
          {tab === "version" && <VersionTab />}
        </View>
      </View>
    </Modal>
  );
}

// ─── 대시보드 ───
function DashboardTab() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => { getDashboard().then(setData).catch(() => setErr(true)); }, []);

  if (err) return <Text style={s.errText}>대시보드를 불러오지 못했습니다.</Text>;
  if (!data) return <ActivityIndicator color="#4a9abb" style={{ marginTop: 30 }} />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingVertical: 4 }}>
      <View style={s.statRow}>
        <StatCard label="총 유저" value={data.totalUser} accent />
        <StatCard label="오늘 가입" value={data.todayUser} />
        <StatCard label="엔딩 도달" value={data.clearUser} />
      </View>

      <View style={{ gap: 12 }}>
        <Text style={s.sectionLabel}>엔딩 피드백</Text>
        {data.feedbackList.length === 0 ? (
          <Text style={s.empty}>— 아직 피드백이 없습니다</Text>
        ) : (
          data.feedbackList.map((f, i) => (
            <View key={i} style={s.fbCard}>
              <View style={s.fbHead}>
                <Text style={s.fbName}>{f.userName}</Text>
                <Text style={s.fbDate}>{fmtDate(f.createdAt)}</Text>
              </View>
              <Text style={s.fbContent}>{f.content}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, accent && { color: "#4a9abb" }]}>{value}</Text>
    </View>
  );
}

// ─── 유저 ───
function UserTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { getUserList().then(setUsers).catch(() => setErr(true)); }, []);

  const toggleStatus = (u: UserRow) => {
    if (busyId) return;
    const willBan = u.userStatus === "ACTIVE";
    const action = willBan ? "정지" : "활성화";
    Alert.alert(`계정 ${action}`, `${u.name} (${u.email})\n${action}하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: action, style: willBan ? "destructive" : "default",
        onPress: async () => {
          setBusyId(u.userId);
          try {
            if (willBan) await banUser(u.userId); else await activateUser(u.userId);
            setUsers((prev) => prev.map((x) => x.userId === u.userId ? { ...x, userStatus: willBan ? "SUSPENDED" : "ACTIVE" } : x));
          } catch { Alert.alert("실패", `${action} 처리에 실패했습니다.`); }
          finally { setBusyId(null); }
        },
      },
    ]);
  };

  if (err) return <Text style={s.errText}>유저 목록을 불러오지 못했습니다.</Text>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      <Text style={s.sectionLabel}>{users.length}명의 유저</Text>
      {users.map((u) => {
        const suspended = u.userStatus === "SUSPENDED";
        const isAdmin = u.userRole === "ADMIN";
        return (
          <View key={u.userId} style={s.userRow}>
            <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => setSelectedId(u.userId)}>
              <View style={s.userTop}>
                <Text style={s.userName} numberOfLines={1}>{u.name}</Text>
                {isAdmin && <View style={s.adminBadge}><Text style={s.adminBadgeText}>ADMIN</Text></View>}
                <Text style={[s.userStatus, suspended ? s.statusBan : s.statusOk]}>{suspended ? "정지" : "활성"}</Text>
              </View>
              <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
            </Pressable>
            {!isAdmin && (
              <Pressable onPress={() => toggleStatus(u)} disabled={busyId === u.userId} style={[s.userBtn, suspended ? s.userBtnActivate : s.userBtnBan]}>
                <Text style={[s.userBtnText, suspended ? s.userBtnTextActivate : s.userBtnTextBan]}>{suspended ? "활성화" : "정지"}</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {selectedId && <UserDetailModal userId={selectedId} onClose={() => setSelectedId(null)} />}
    </ScrollView>
  );
}

function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => { getUserDetail(userId).then(setDetail).catch(() => setErr(true)); }, [userId]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.detailCard} pointerEvents="box-none">
          <View style={s.detailInner}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, gap: 18 }}>
              {err && <Text style={s.errText}>상세 정보를 불러오지 못했습니다.</Text>}
              {!detail && !err && <ActivityIndicator color="#4a9abb" />}
              {detail && (
                <>
                  <View style={{ gap: 12 }}>
                    <View style={s.detailHeadRow}>
                      <Text style={s.detailName}>{detail.name}</Text>
                      <Text style={[s.userStatus, detail.userStatus === "SUSPENDED" ? s.statusBan : s.statusOk]}>
                        {detail.userStatus === "SUSPENDED" ? "정지됨" : "활성"}
                      </Text>
                    </View>
                    <View style={s.fieldGrid}>
                      <Field label="이메일" value={detail.email} />
                      <Field label="권한" value={detail.userRole} />
                      <Field label="가입 유형" value={detail.authType} />
                      <Field label="최근 로그인" value={fmtDate(detail.lastLoginAt)} />
                      <Field label="엔딩 도달" value={detail.isStoryClear ? "완료" : "미완료"} />
                    </View>
                  </View>

                  {detail.endingFeedback && (
                    <View style={s.detailSection}>
                      <Text style={s.sectionLabel}>엔딩 피드백</Text>
                      <Text style={s.fbContent}>{detail.endingFeedback}</Text>
                    </View>
                  )}

                  <View style={s.detailSection}>
                    <View style={s.fbHead}>
                      <Text style={s.sectionLabel}>항해 기록</Text>
                      <Text style={s.fbDate}>{detail.voyageLogInfo.length}건</Text>
                    </View>
                    {detail.voyageLogInfo.length === 0 ? (
                      <Text style={s.empty}>— 항해 기록 없음</Text>
                    ) : (
                      detail.voyageLogInfo.map((v, i) => (
                        <View key={i} style={s.logItem}>
                          <Text style={s.logRoute}>{v.fromCity} → {v.toCity} · {v.weatherTheme}</Text>
                          <Text style={s.logAuto}>{v.autoText}</Text>
                          {v.userText && <Text style={s.logUser}>“{v.userText}”</Text>}
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}
            </ScrollView>
            <Pressable onPress={onClose} style={s.detailClose}><Text style={s.detailCloseText}>닫기</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── 고객센터 (공지/문의 관리) ───
function SupportTab() {
  const [sub, setSub] = useState<"notice" | "inquiry">("notice");
  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={s.subTabRow}>
        {([["notice", "공지 관리"], ["inquiry", "문의 관리"]] as const).map(([id, label]) => (
          <Pressable key={id} onPress={() => setSub(id)} style={[s.subTab, sub === id && s.subTabActive]}>
            <Text style={[s.subTabText, sub === id && s.subTabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {sub === "notice" ? <AdminNoticeManage /> : <AdminInquiryManage />}
    </View>
  );
}

function AdminNoticeManage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => getAdminNotices().then((n) => { setNotices(n); setLoaded(true); }).catch(() => setErr(true));
  useEffect(() => { load(); }, []);

  const handleDelete = (n: Notice) => {
    if (busyId) return;
    Alert.alert("공지 삭제", `"${n.title}" 공지를 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          setBusyId(n.noticeId);
          try { await deleteNotice(n.noticeId); setNotices((p) => p.filter((x) => x.noticeId !== n.noticeId)); }
          catch { Alert.alert("실패", "삭제에 실패했습니다."); }
          finally { setBusyId(null); }
        },
      },
    ]);
  };

  if (err) return <Text style={s.errText}>공지 목록을 불러오지 못했습니다.</Text>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      <View style={s.fbHead}>
        <Text style={s.sectionLabel}>{notices.length}개의 공지</Text>
        <Pressable onPress={() => setCreating(true)} style={s.addBtn}><Text style={s.addBtnText}>+ 새 공지</Text></Pressable>
      </View>

      {loaded && notices.length === 0 && <Text style={s.empty}>— 등록된 공지가 없습니다</Text>}

      {notices.map((n) => (
        <View key={n.noticeId} style={s.manageCard}>
          <View style={s.fbHead}>
            <Text style={s.manageTitle} numberOfLines={1}>{n.title}</Text>
            <Text style={s.fbDate}>{n.authorName} · {fmtDate(n.createdAt)}</Text>
          </View>
          <Text style={s.managePreview} numberOfLines={2}>{n.content}</Text>
          <View style={s.actionRow}>
            <Pressable onPress={() => setEditing(n)} style={s.editBtn}><Text style={s.editBtnText}>수정</Text></Pressable>
            <Pressable onPress={() => handleDelete(n)} disabled={busyId === n.noticeId} style={s.delBtn}><Text style={s.delBtnText}>삭제</Text></Pressable>
          </View>
        </View>
      ))}

      {(creating || editing) && (
        <NoticeFormModal notice={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setLoaded(false); load(); }} />
      )}
    </ScrollView>
  );
}

function AdminInquiryManage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    getAdminInquiries()
      .then((list) => { setInquiries([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())); setLoaded(true); })
      .catch(() => setErr(true));
  useEffect(() => { load(); }, []);

  const openInquiry = (n: Inquiry) => {
    setExpandedId(expandedId === n.inquiryId ? null : n.inquiryId);
    setAnswerDraft(n.answerContent ?? "");
  };

  const submitAnswer = async (n: Inquiry) => {
    if (!answerDraft.trim() || busy) return;
    setBusy(true);
    try {
      if (n.answerContent) await updateAnswer(n.inquiryId, answerDraft.trim());
      else await writeAnswer(n.inquiryId, answerDraft.trim());
      await load();
    } catch { Alert.alert("실패", "답변 저장에 실패했습니다."); }
    finally { setBusy(false); }
  };

  const removeAnswer = (n: Inquiry) => {
    if (busy) return;
    Alert.alert("답변 삭제", "답변을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          setBusy(true);
          try { await deleteAnswer(n.inquiryId); await load(); setAnswerDraft(""); }
          catch { Alert.alert("실패", "답변 삭제에 실패했습니다."); }
          finally { setBusy(false); }
        },
      },
    ]);
  };

  if (err) return <Text style={s.errText}>문의 목록을 불러오지 못했습니다.</Text>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        <Text style={s.sectionLabel}>{inquiries.length}개의 문의</Text>
        {loaded && inquiries.length === 0 && <Text style={s.empty}>— 등록된 문의가 없습니다</Text>}

        {inquiries.map((n) => {
          const isOpen = expandedId === n.inquiryId;
          const answered = n.inquiryStatus === "ANSWERED";
          return (
            <View key={n.inquiryId} style={s.manageCard}>
              <Pressable onPress={() => openInquiry(n)} style={s.inqHead}>
                <View style={[s.badge, answered ? s.badgeDone : s.badgeWait]}>
                  <Text style={[s.badgeText, answered ? s.badgeTextDone : s.badgeTextWait]}>{answered ? "답변완료" : "대기중"}</Text>
                </View>
                <Text style={s.manageTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={s.fbDate}>{fmtDate(n.createdAt)}</Text>
              </Pressable>

              {isOpen && (
                <View style={s.inqBody}>
                  <Text style={s.inqContent}>{n.content}</Text>
                  <Text style={s.answerLabel}>{n.answerContent ? "답변 수정" : "답변 작성"}</Text>
                  <TextInput value={answerDraft} onChangeText={setAnswerDraft} multiline placeholder="답변 내용" placeholderTextColor="#1a3a50" style={s.answerInput} />
                  <View style={s.actionRow}>
                    {n.answerContent && (
                      <Pressable onPress={() => removeAnswer(n)} disabled={busy} style={s.delBtn}><Text style={s.delBtnText}>답변 삭제</Text></Pressable>
                    )}
                    <Pressable onPress={() => submitAnswer(n)} disabled={busy || !answerDraft.trim()} style={s.editBtn}>
                      <Text style={s.editBtnText}>{busy ? "저장 중" : n.answerContent ? "답변 수정" : "답변 등록"}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NoticeFormModal({ notice, onClose, onSaved }: {
  notice: Notice | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!notice;
  const [title, setTitle] = useState(notice?.title ?? "");
  const [content, setContent] = useState(notice?.content ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    try {
      if (isEdit) await updateNotice(notice!.noticeId, { title: title.trim(), content: content.trim() });
      else await writeNotice({ title: title.trim(), content: content.trim() });
      onSaved(); onClose();
    } catch { Alert.alert("실패", "저장에 실패했습니다."); setSaving(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.formCard} pointerEvents="box-none">
          <View style={s.formInner}>
            <Text style={s.formTitle}>{isEdit ? "공지 수정" : "새 공지 작성"}</Text>
            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>제목</Text>
              <TextInput value={title} onChangeText={setTitle} maxLength={200} placeholder="공지 제목" placeholderTextColor="#1a3a50" style={s.input} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>내용</Text>
              <TextInput value={content} onChangeText={setContent} multiline placeholder="공지 내용" placeholderTextColor="#1a3a50" style={[s.input, { minHeight: 140, textAlignVertical: "top" }]} />
            </View>
            <View style={s.actionRow}>
              <Pressable onPress={onClose} style={s.cancelBtn}><Text style={s.cancelText}>취소</Text></Pressable>
              <Pressable onPress={save} disabled={saving || !title.trim() || !content.trim()} style={s.editBtn}>
                <Text style={s.editBtnText}>{saving ? "저장 중" : isEdit ? "수정" : "작성"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── 버전 ───
function VersionTab() {
  const [current, setCurrent] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [err, setErr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getVersion().then((d) => { setCurrent(d.version); setInput(d.version); }).catch(() => setErr(true));
  }, []);

  const trimmed = input.trim();
  const dirty = trimmed !== "" && trimmed !== current;
  const tooLong = trimmed.length > 50;

  const save = async () => {
    if (!dirty || tooLong || saving) return;
    setSaving(true); setSaved(false);
    try { await updateVersion(trimmed); setCurrent(trimmed); setSaved(true); }
    catch { Alert.alert("실패", "버전 저장에 실패했습니다."); }
    finally { setSaving(false); }
  };

  if (err) return <Text style={s.errText}>버전 정보를 불러오지 못했습니다.</Text>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingVertical: 4 }}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>현재 버전</Text>
          <Text style={[s.statValue, { color: "#4a9abb" }]}>{current === null ? "..." : current}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={s.sectionLabel}>버전 수정</Text>
          <TextInput value={input} onChangeText={(t) => { setInput(t); setSaved(false); }} placeholder="v1.1.0" placeholderTextColor="#1a3a50" style={s.input} />
          <View style={s.fbHead}>
            {tooLong ? <Text style={s.errText}>50자를 초과할 수 없습니다</Text> : saved ? <Text style={s.savedText}>저장됨</Text> : <Text> </Text>}
            <Pressable onPress={save} disabled={!dirty || tooLong || saving} style={s.editBtn}>
              <Text style={s.editBtnText}>{saving ? "저장 중" : "저장"}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#040d16" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  topTitle: { color: "#7eb8d4", fontSize: 13, letterSpacing: 4, fontFamily: "monospace" },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 8 },
  closeText: { color: "#5a8aa4", fontSize: 11, letterSpacing: 1 },

  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0d2233" },
  tab: { flex: 1, paddingVertical: 13, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#4a9abb" },
  tabText: { color: "#1a3a50", fontSize: 12, letterSpacing: 1 },
  tabTextActive: { color: "#7eb8d4" },

  body: { flex: 1, paddingHorizontal: 18, paddingTop: 16 },

  sectionLabel: { color: "#2a5a74", fontSize: 10, letterSpacing: 2, fontFamily: "monospace" },
  empty: { color: "#1a3a50", fontSize: 11, fontStyle: "italic" },
  errText: { color: "rgba(200,100,100,0.7)", fontSize: 11, fontFamily: "monospace" },
  savedText: { color: "#3a8a6a", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },

  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: "#050e18", borderWidth: 1, borderColor: "#0d2233", borderRadius: 10, padding: 16, gap: 8 },
  statLabel: { color: "#2a5a74", fontSize: 9, letterSpacing: 2, fontFamily: "monospace" },
  statValue: { color: "#a8d4e8", fontSize: 26, fontFamily: "monospace" },

  fbCard: { borderWidth: 1, borderColor: "#0d2233", borderRadius: 8, backgroundColor: "rgba(5,14,24,0.6)", padding: 14, gap: 8 },
  fbHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fbName: { color: "#7eb8d4", fontSize: 11, letterSpacing: 1, fontFamily: "monospace" },
  fbDate: { color: "#2a5a74", fontSize: 9, fontFamily: "monospace" },
  fbContent: { color: "#4a7a94", fontSize: 12, lineHeight: 20 },

  userRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(13,34,51,0.6)" },
  userTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { color: "#a8d4e8", fontSize: 13, fontFamily: "monospace", flexShrink: 1 },
  userEmail: { color: "#4a7a94", fontSize: 10, fontFamily: "monospace", marginTop: 2 },
  userStatus: { fontSize: 9, letterSpacing: 1, fontFamily: "monospace" },
  statusOk: { color: "#3a8a6a" },
  statusBan: { color: "rgba(200,100,100,0.7)" },
  adminBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, backgroundColor: "rgba(74,154,187,0.15)" },
  adminBadgeText: { color: "#4a9abb", fontSize: 8, letterSpacing: 1 },
  userBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  userBtnBan: { borderColor: "rgba(120,40,40,0.5)" },
  userBtnActivate: { borderColor: "rgba(26,74,100,0.6)" },
  userBtnText: { fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },
  userBtnTextBan: { color: "rgba(200,100,100,0.7)" },
  userBtnTextActivate: { color: "#7eb8d4" },

  overlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.82)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  detailCard: { width: "100%", maxWidth: 480, maxHeight: "85%" },
  detailInner: { backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 16, overflow: "hidden" },
  detailHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailName: { color: "#a8d4e8", fontSize: 17, fontWeight: "600" },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  field: { width: "44%", gap: 3 },
  fieldLabel: { color: "#1a3a50", fontSize: 8, letterSpacing: 1.5, fontFamily: "monospace" },
  fieldValue: { color: "#7eb8d4", fontSize: 12, fontFamily: "monospace" },
  detailSection: { borderTopWidth: 1, borderTopColor: "#0d2233", paddingTop: 16, gap: 10 },
  logItem: { borderLeftWidth: 1, borderLeftColor: "#0d2233", paddingLeft: 12, paddingVertical: 3, gap: 3 },
  logRoute: { color: "#3a6880", fontSize: 10, fontFamily: "monospace" },
  logAuto: { color: "#2a5a74", fontSize: 11, lineHeight: 17 },
  logUser: { color: "#4a7a94", fontSize: 11, fontStyle: "italic" },
  detailClose: { paddingVertical: 14, alignItems: "center", borderTopWidth: 1, borderTopColor: "#0d2233" },
  detailCloseText: { color: "#7eb8d4", fontSize: 12, letterSpacing: 2 },

  subTabRow: { flexDirection: "row", gap: 8 },
  subTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)" },
  subTabActive: { borderColor: "rgba(74,154,187,0.7)", backgroundColor: "rgba(10,34,51,0.6)" },
  subTabText: { color: "#3a6880", fontSize: 11, letterSpacing: 1, fontFamily: "monospace" },
  subTabTextActive: { color: "#cce8f5" },

  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", borderRadius: 8 },
  addBtnText: { color: "#4a9abb", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },

  manageCard: { borderWidth: 1, borderColor: "#0d2233", borderRadius: 8, backgroundColor: "rgba(5,14,24,0.6)", padding: 14, gap: 8 },
  manageTitle: { flex: 1, color: "#cce8f5", fontSize: 14 },
  managePreview: { color: "#4a7a94", fontSize: 11, lineHeight: 18 },

  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 2 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", borderRadius: 6 },
  editBtnText: { color: "#4a9abb", fontSize: 11, letterSpacing: 1 },
  delBtn: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(120,40,40,0.5)", borderRadius: 6 },
  delBtnText: { color: "rgba(200,100,100,0.8)", fontSize: 11, letterSpacing: 1 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  cancelText: { color: "#3a6880", fontSize: 12, letterSpacing: 1 },

  inqHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  inqBody: { gap: 10, borderTopWidth: 1, borderTopColor: "rgba(26,74,100,0.3)", paddingTop: 12, marginTop: 4 },
  inqContent: { color: "#7eb8d4", fontSize: 12, lineHeight: 20 },
  answerLabel: { color: "#4a9abb", fontSize: 9, letterSpacing: 1, fontFamily: "monospace" },
  answerInput: { backgroundColor: "#040d16", borderWidth: 1, borderColor: "#1a3a50", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#cce8f5", fontSize: 13, minHeight: 90, textAlignVertical: "top" },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeDone: { backgroundColor: "rgba(26,74,58,0.6)" },
  badgeWait: { backgroundColor: "rgba(58,58,26,0.6)" },
  badgeText: { fontSize: 9, letterSpacing: 1 },
  badgeTextDone: { color: "#5abb8a" },
  badgeTextWait: { color: "#bbaa5a" },

  formCard: { width: "100%", maxWidth: 480 },
  formInner: { backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 16, padding: 22, gap: 16 },
  formTitle: { color: "#7eb8d4", fontSize: 12, letterSpacing: 3, fontFamily: "monospace" },
  input: { backgroundColor: "#040d16", borderWidth: 1, borderColor: "#1a3a50", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, color: "#cce8f5", fontSize: 14 },
});