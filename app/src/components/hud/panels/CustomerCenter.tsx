import { useEffect, useState } from "react";
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  getNotices, type Notice,
  getMyInquiries, writeInquiry, updateInquiry, deleteInquiry, type Inquiry,
} from "../../../api/support";

const fmtDate = (str: string) => {
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

type CenterTab = "notice" | "inquiry";

export default function CustomerCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CenterTab>("notice");

  const openModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTab("notice");
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={openModal} style={s.entryBtn}>
        <Text style={s.entryText}>고객센터</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
          {/* 뒤 검은 영역 — 탭하면 닫힘 */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />

          <View style={s.card} pointerEvents="box-none">
            <View style={s.cardInner}>
              <View style={s.header}>
                <Text style={s.title}>고객센터</Text>
                <Pressable onPress={() => setOpen(false)} style={s.closeX}><Text style={s.closeXText}>✕</Text></Pressable>
              </View>
              <View style={s.tabBar}>
                {([["notice", "공지사항"], ["inquiry", "문의"]] as const).map(([id, label]) => (
                  <Pressable key={id} onPress={() => setTab(id)} style={[s.tab, tab === id && s.tabActive]}>
                    <Text style={[s.tabText, tab === id && s.tabTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.body}>
                {tab === "notice" ? <NoticeTab /> : <InquiryTab />}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── 공지 ───
function NoticeTab() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getNotices()
      .then((n) => setNotices([...n].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <ActivityIndicator color="#4a9abb" style={{ marginVertical: 24 }} />;
  if (notices.length === 0) return <Text style={s.empty}>— 등록된 공지가 없습니다</Text>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
      {notices.map((n) => {
        const isOpen = expanded === n.noticeId;
        return (
          <Pressable key={n.noticeId} onPress={() => setExpanded(isOpen ? null : n.noticeId)} style={[s.item, isOpen && s.itemOpen]}>
            <View style={s.itemHead}>
              <Text style={s.itemTitle} numberOfLines={isOpen ? undefined : 1}>{n.title}</Text>
              <Text style={s.itemDate}>{fmtDate(n.createdAt)}</Text>
            </View>
            {isOpen && (
              <View style={s.itemBody}>
                <Text style={s.itemAuthor}>{n.authorName}</Text>
                <Text style={s.itemContent}>{n.content}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── 문의 ───
function InquiryTab() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Inquiry | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () =>
    getMyInquiries()
      .then((list) => setInquiries([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => { load(); }, []);

  const handleDelete = (n: Inquiry) => {
    if (busyId) return;
    Alert.alert("문의 삭제", "이 문의를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          setBusyId(n.inquiryId);
          try { await deleteInquiry(n.inquiryId); setInquiries((p) => p.filter((x) => x.inquiryId !== n.inquiryId)); }
          catch { Alert.alert("실패", "삭제하지 못했습니다."); }
          finally { setBusyId(null); }
        },
      },
    ]);
  };

  if (composing || editing) {
    return (
      <InquiryForm
        inquiry={editing}
        onClose={() => { setComposing(false); setEditing(null); }}
        onSaved={() => { setComposing(false); setEditing(null); setLoaded(false); load(); }}
      />
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setComposing(true); }} style={s.writeBtn}>
        <Text style={s.writeText}>+ 문의 작성</Text>
      </Pressable>

      {!loaded && <ActivityIndicator color="#4a9abb" style={{ marginTop: 12 }} />}
      {loaded && inquiries.length === 0 && <Text style={s.empty}>— 작성한 문의가 없습니다</Text>}

      {inquiries.map((n) => {
        const isOpen = expanded === n.inquiryId;
        const answered = n.inquiryStatus === "ANSWERED";
        return (
          <Pressable key={n.inquiryId} onPress={() => setExpanded(isOpen ? null : n.inquiryId)} style={[s.item, isOpen && s.itemOpen]}>
            <View style={s.itemHead}>
              <View style={[s.badge, answered ? s.badgeDone : s.badgeWait]}>
                <Text style={[s.badgeText, answered ? s.badgeTextDone : s.badgeTextWait]}>{answered ? "답변완료" : "대기중"}</Text>
              </View>
              <Text style={s.itemTitle} numberOfLines={1}>{n.title}</Text>
              <Text style={s.itemDate}>{fmtDate(n.createdAt)}</Text>
            </View>
            {isOpen && (
              <View style={s.itemBody}>
                <Text style={s.itemContent}>{n.content}</Text>
                {n.answerContent ? (
                  <View style={s.answerBox}>
                    <Text style={s.answerLabel}>↳ 관리자 답변</Text>
                    <Text style={s.answerText}>{n.answerContent}</Text>
                  </View>
                ) : (
                  <Text style={s.noAnswer}>아직 답변이 등록되지 않았습니다</Text>
                )}
                {!answered && (
                  <View style={s.actionRow}>
                    <Pressable onPress={() => setEditing(n)} style={s.editBtn}><Text style={s.editBtnText}>수정</Text></Pressable>
                    <Pressable onPress={() => handleDelete(n)} disabled={busyId === n.inquiryId} style={s.delBtn}><Text style={s.delBtnText}>삭제</Text></Pressable>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── 문의 작성/수정 ───
function InquiryForm({ inquiry, onClose, onSaved }: {
  inquiry: Inquiry | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!inquiry;
  const [title, setTitle] = useState(inquiry?.title ?? "");
  const [content, setContent] = useState(inquiry?.content ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !content.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSaving(true);
    try {
      if (isEdit) await updateInquiry(inquiry!.inquiryId, { title: title.trim(), content: content.trim() });
      else await writeInquiry({ title: title.trim(), content: content.trim() });
      onSaved();
    } catch { Alert.alert("저장 실패", "잠시 후 다시 시도해주세요."); setSaving(false); }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
      <Pressable onPress={onClose}><Text style={s.backText}>‹ 목록</Text></Pressable>
      <Text style={s.formTitle}>{isEdit ? "문의 수정" : "새 문의"}</Text>
      <View style={{ gap: 6 }}>
        <Text style={s.formLabel}>제목</Text>
        <TextInput value={title} onChangeText={setTitle} maxLength={100} placeholder="문의 제목" placeholderTextColor="#1a3a50" style={s.input} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={s.formLabel}>내용</Text>
        <TextInput value={content} onChangeText={setContent} multiline placeholder="문의 내용을 입력하세요" placeholderTextColor="#1a3a50" style={[s.input, s.textarea]} />
      </View>
      <View style={s.formBtnRow}>
        <Pressable onPress={onClose} style={s.cancelBtn}><Text style={s.cancelText}>취소</Text></Pressable>
        <Pressable onPress={save} disabled={saving || !title.trim() || !content.trim()} style={s.submitBtn}>
          <Text style={s.submitText}>{saving ? "저장 중" : isEdit ? "수정" : "작성"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  entryBtn: { paddingVertical: 13, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", borderRadius: 10, alignItems: "center" },
  entryText: { color: "#5a8aa4", fontSize: 13, letterSpacing: 2 },

  overlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.82)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  card: { width: "100%", maxWidth: 520, maxHeight: "82%" },
  cardInner: { backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 18, overflow: "hidden" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  title: { flex: 1, color: "#7eb8d4", fontSize: 14, letterSpacing: 3, fontFamily: "monospace" },
  closeX: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "#1a3a50", alignItems: "center", justifyContent: "center" },
  closeXText: { color: "#3a6880", fontSize: 13 },

  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0d2233" },
  tab: { flex: 1, paddingVertical: 13, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#4a9abb" },
  tabText: { color: "#1a3a50", fontSize: 12, letterSpacing: 2 },
  tabTextActive: { color: "#7eb8d4" },

  body: { padding: 18 },
  empty: { color: "#1a3a50", fontSize: 12, fontStyle: "italic", textAlign: "center", marginVertical: 24 },

  item: { borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", borderRadius: 8, backgroundColor: "rgba(7,24,38,0.5)", padding: 14 },
  itemOpen: { borderColor: "rgba(74,154,187,0.6)", backgroundColor: "rgba(10,34,51,0.5)" },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { flex: 1, color: "#cce8f5", fontSize: 14 },
  itemDate: { color: "#2a5a74", fontSize: 10, fontFamily: "monospace" },
  itemBody: { marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: "rgba(26,74,100,0.3)", paddingTop: 12 },
  itemAuthor: { color: "#2a5a74", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },
  itemContent: { color: "#7eb8d4", fontSize: 13, lineHeight: 21 },

  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeDone: { backgroundColor: "rgba(26,74,58,0.6)" },
  badgeWait: { backgroundColor: "rgba(58,58,26,0.6)" },
  badgeText: { fontSize: 9, letterSpacing: 1 },
  badgeTextDone: { color: "#5abb8a" },
  badgeTextWait: { color: "#bbaa5a" },

  answerBox: { borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", borderRadius: 8, backgroundColor: "rgba(5,14,24,0.6)", padding: 12, gap: 6 },
  answerLabel: { color: "#4a9abb", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },
  answerText: { color: "#a8d4e8", fontSize: 12, lineHeight: 20 },
  noAnswer: { color: "#1a3a50", fontSize: 11, fontStyle: "italic" },

  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(26,74,100,0.6)", borderRadius: 6 },
  editBtnText: { color: "#7eb8d4", fontSize: 11, letterSpacing: 1 },
  delBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(120,40,40,0.5)", borderRadius: 6 },
  delBtnText: { color: "rgba(200,100,100,0.8)", fontSize: 11, letterSpacing: 1 },

  writeBtn: { paddingVertical: 12, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", borderRadius: 8, alignItems: "center" },
  writeText: { color: "#4a9abb", fontSize: 12, letterSpacing: 2 },

  backText: { color: "#3a6880", fontSize: 12, letterSpacing: 1 },
  formTitle: { color: "#7eb8d4", fontSize: 13, letterSpacing: 2 },
  formLabel: { color: "#2a5a74", fontSize: 10, letterSpacing: 1, fontFamily: "monospace" },
  input: { backgroundColor: "#040d16", borderWidth: 1, borderColor: "#1a3a50", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, color: "#cce8f5", fontSize: 14 },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  formBtnRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 9 },
  cancelText: { color: "#3a6880", fontSize: 12, letterSpacing: 1 },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", borderRadius: 8 },
  submitText: { color: "#4a9abb", fontSize: 12, letterSpacing: 1 },
});