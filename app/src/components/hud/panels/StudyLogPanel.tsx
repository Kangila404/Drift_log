import { useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, Modal, TextInput,
  StyleSheet, Animated, PanResponder, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { getStudyLogs, updateStudySubject, deleteStudyLog, type StudyLog } from "../../../api/study";

const fmtSummary = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
};
const fmtHM = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const fmtDate = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };
const logMinutes = (l: StudyLog) => Math.max(0, Math.round((new Date(l.studyEndTimeAt).getTime() - new Date(l.studyStartTimeAt).getTime()) / 60000));
const logSeconds = (l: StudyLog) => Math.max(0, Math.round((new Date(l.studyEndTimeAt).getTime() - new Date(l.studyStartTimeAt).getTime()) / 1000));

// ─── 스와이프 삭제 행 (iOS식 — 밀면 삭제 버튼 고정 노출) ───
const DELETE_W = 84;

function SwipeLog({ log, onOpen, onDelete }: { log: StudyLog; onOpen: () => void; onDelete: (close: () => void) => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);          // 현재 열림 상태
  const startX = useRef(0);               // 제스처 시작 시 x 값
  const moved = useRef(false);
  const locked = useRef(false);           // Move 중 확정되면 잠금

  const snapTo = (open: boolean) => {
    openRef.current = open;
    Animated.spring(x, {
      toValue: open ? -DELETE_W : 0,
      useNativeDriver: true, speed: 24, bounciness: 0,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        moved.current = false;
        locked.current = false;
        startX.current = openRef.current ? -DELETE_W : 0;
      },
      onPanResponderMove: (_, g) => {
        moved.current = true;
        if (locked.current) return;
        // 드래그 도중 임계점 넘으면 즉시 확정 (손 떼는 거 안 기다림 = 카톡 방식)
        if (!openRef.current && g.dx < -12) { locked.current = true; snapTo(true); return; }
        if (openRef.current && g.dx > 12) { locked.current = true; snapTo(false); return; }
        const next = Math.min(0, Math.max(-DELETE_W, startX.current + g.dx));
        x.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (locked.current) return;       // 이미 확정됨
        const cur = startX.current + g.dx;
        snapTo(cur < -DELETE_W / 2);
      },
      onPanResponderTerminate: () => { if (!locked.current) snapTo(openRef.current); },
    })
  ).current;

  const handlePress = () => {
    if (moved.current) return;
    if (openRef.current) { snapTo(false); return; }   // 열려있으면 닫기
    onOpen();
  };

  return (
    <View style={s.swipeWrap}>
      {/* 뒤에 고정된 삭제 버튼 */}
      <View style={s.deleteBg}>
        <Pressable onPress={() => onDelete(() => snapTo(false))} style={s.deleteHit}>
          <Text style={s.deleteText}>삭제</Text>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        <Pressable onPress={handlePress} style={s.logItem}>
          <View style={s.logTop}>
            <Text style={s.logTime}>{fmtHM(log.studyStartTimeAt)} ~ {fmtHM(log.studyEndTimeAt)}</Text>
            <View style={s.logRight}>
              <Text style={s.logMin}>{logMinutes(log)}분</Text>
              <Text style={s.logChev}>›</Text>
            </View>
          </View>
          <Text style={[s.logSubj, !log.subject && s.logSubjEmpty]} numberOfLines={1}>
            {log.subject || "내용을 추가하려면 눌러주세요"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── 일지 탭 (바텀시트 안에 들어가는 콘텐츠) ───
export default function StudyLogTab({ totalSeconds, onChanged }: { totalSeconds: number; onChanged: () => void }) {
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<StudyLog | null>(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const load = () => getStudyLogs().then((l) => { setLogs(l); setLoaded(true); }).catch(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const openDetail = (l: StudyLog) => { setSelected(l); setEditing(false); setEditVal(l.subject ?? ""); };
  const closeDetail = () => { setSelected(null); setEditing(false); };

  const saveEdit = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await updateStudySubject(selected.id, editVal);
      const next = editVal.trim() || null;
      setLogs((prev) => prev.map((l) => (l.id === selected.id ? { ...l, subject: next } : l)));
      setSelected((prev) => (prev ? { ...prev, subject: next } : prev));
      setEditing(false);
    } catch (e) { console.error("수정 실패:", e); }
    finally { setBusy(false); }
  };

  const removeById = (id: number, close: () => void) => {
    Alert.alert("기록 삭제", "이 기록을 삭제할까요?", [
      { text: "취소", style: "cancel", onPress: close },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          close();
          const target = logs.find((l) => l.id === id);
          setLogs((prev) => prev.filter((l) => l.id !== id));
          onChanged();
          try { await deleteStudyLog(id); }
          catch { if (target) { setLogs((prev) => [...prev, target]); onChanged(); } }
        },
      },
    ], { cancelable: true, onDismiss: close });
  };

  const removeSelected = () => {
    if (!selected) return;
    Alert.alert("기록 삭제", "이 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          const id = selected.id;
          setLogs((prev) => prev.filter((l) => l.id !== id));
          closeDetail();
          onChanged();
          try { await deleteStudyLog(id); } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  const sorted = [...logs].sort((a, b) => new Date(b.studyStartTimeAt).getTime() - new Date(a.studyStartTimeAt).getTime());

  const monthGroups = (() => {
    const mMap = new Map<string, StudyLog[]>();
    for (const l of sorted) {
      const d = new Date(l.studyStartTimeAt);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!mMap.has(mKey)) mMap.set(mKey, []);
      mMap.get(mKey)!.push(l);
    }
    return Array.from(mMap.entries()).map(([mKey, mLogs]) => {
      const [y, m] = mKey.split("-");
      const dMap = new Map<string, StudyLog[]>();
      for (const l of mLogs) {
        const d = new Date(l.studyStartTimeAt);
        const dKey = `${d.getDate()}`;
        if (!dMap.has(dKey)) dMap.set(dKey, []);
        dMap.get(dKey)!.push(l);
      }
      const days = Array.from(dMap.entries()).map(([dKey, dLogs]) => ({
        dKey: `${mKey}-${dKey}`, label: `${dKey}일`, logs: dLogs, totalSec: dLogs.reduce((s, l) => s + logSeconds(l), 0),
      }));
      return { mKey, label: `${y}년 ${Number(m)}월`, days, totalSec: mLogs.reduce((s, l) => s + logSeconds(l), 0) };
    });
  })();

  const isCollapsed = (key: string, idx: number) => collapsedMonths[key] ?? idx !== 0;
  const toggleMonth = (key: string, idx: number) => setCollapsedMonths((p) => ({ ...p, [key]: !(p[key] ?? idx !== 0) }));
  const isDayCollapsed = (key: string) => collapsedDays[key] ?? false;
  const toggleDay = (key: string) => setCollapsedDays((p) => ({ ...p, [key]: !(p[key] ?? false) }));

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      <View style={s.totalCard}>
        <Text style={s.totalVal}>{fmtSummary(totalSeconds)}</Text>
        <Text style={s.totalLabel}>총 공부량</Text>
      </View>

      {loaded && logs.length === 0 && <Text style={s.empty}>— 아직 기록이 없습니다</Text>}
      {!loaded && <ActivityIndicator color="#4a9abb" style={{ marginTop: 20 }} />}

      {monthGroups.map((mg, mIdx) => {
        const collapsed = isCollapsed(mg.mKey, mIdx);
        return (
          <View key={mg.mKey} style={{ marginTop: 6 }}>
            <Pressable onPress={() => toggleMonth(mg.mKey, mIdx)} style={s.monthHead}>
              <Text style={s.monthLabel}>{mg.label}</Text>
              <View style={s.monthRight}>
                <Text style={s.monthTotal}>월간 {fmtSummary(mg.totalSec)}</Text>
                <Text style={s.chev}>{collapsed ? "›" : "⌄"}</Text>
              </View>
            </Pressable>
            {!collapsed && mg.days.map((day) => {
              const dayCollapsed = isDayCollapsed(day.dKey);
              return (
                <View key={day.dKey} style={{ marginTop: 8, gap: 6 }}>
                  <Pressable onPress={() => toggleDay(day.dKey)} style={s.dayHead}>
                    <View style={s.dayLeft}>
                      <Text style={s.dayChev}>{dayCollapsed ? "›" : "⌄"}</Text>
                      <Text style={s.dayLabel}>{day.label}</Text>
                    </View>
                    <Text style={s.dayTotal}>일간 {fmtSummary(day.totalSec)}</Text>
                  </Pressable>
                  {!dayCollapsed && day.logs.map((l) => (
                    <SwipeLog key={l.id} log={l} onOpen={() => openDetail(l)} onDelete={(close) => removeById(l.id, close)} />
                  ))}
                </View>
              );
            })}
          </View>
        );
      })}

      {/* 상세 모달 */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeDetail}>
        {selected && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable style={s.overlay} onPress={closeDetail}>
              <Pressable style={s.detailCard} onPress={() => {}}>
                <View style={s.detailTop}>
                  <View>
                    <Text style={s.detailDate}>{fmtDate(selected.studyStartTimeAt)}</Text>
                    <Text style={s.detailRange}>{fmtHM(selected.studyStartTimeAt)} ~ {fmtHM(selected.studyEndTimeAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.detailMin}>{logMinutes(selected)}분</Text>
                    <Text style={s.detailMinLabel}>공부 시간</Text>
                  </View>
                </View>
                <View style={s.divider} />
                <Text style={s.fieldLabel}>무슨 공부</Text>
                {editing ? (
                  <View style={{ gap: 10 }}>
                    <TextInput value={editVal} onChangeText={setEditVal} maxLength={40} autoFocus
                      placeholder="예: 알고리즘 복습" placeholderTextColor="#1a3a50" style={s.input} />
                    <View style={s.editBtns}>
                      <Pressable onPress={() => setEditing(false)}><Text style={s.editCancel}>취소</Text></Pressable>
                      <Pressable onPress={saveEdit} disabled={busy} style={s.editSave}><Text style={s.editSaveText}>{busy ? "저장 중" : "저장"}</Text></Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => { setEditing(true); setEditVal(selected.subject ?? ""); }} style={s.subjBox}>
                    <Text style={selected.subject ? s.subjText : s.subjEmpty}>
                      {selected.subject || "눌러서 무슨 공부였는지 적어보세요"}
                    </Text>
                  </Pressable>
                )}
                <View style={s.divider} />
                <View style={s.detailBtns}>
                  <Pressable onPress={removeSelected}><Text style={s.deleteBtn}>삭제</Text></Pressable>
                  <Pressable onPress={closeDetail} style={s.closeBtn}><Text style={s.closeBtnText}>닫기</Text></Pressable>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  list: { paddingBottom: 30 },
  totalCard: { alignItems: "center", gap: 4, paddingVertical: 18, borderRadius: 12, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", backgroundColor: "rgba(7,24,38,0.4)" },
  totalVal: { color: "#cce8f5", fontSize: 22, fontFamily: "monospace" },
  totalLabel: { color: "#2a5a74", fontSize: 9, letterSpacing: 2, fontFamily: "monospace" },
  empty: { color: "#1a3a50", fontSize: 11, fontStyle: "italic", marginTop: 14 },

  monthHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d2233" },
  monthLabel: { color: "#4a7a94", fontSize: 11, letterSpacing: 2, fontFamily: "monospace" },
  monthRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthTotal: { color: "#4a9abb", fontSize: 9, fontFamily: "monospace" },
  chev: { color: "#2a5a74", fontSize: 12, fontFamily: "monospace" },

  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2, paddingVertical: 4 },
  dayLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  dayChev: { color: "#2a5a74", fontSize: 11, fontFamily: "monospace", width: 10 },
  dayLabel: { color: "#3a6880", fontSize: 10, letterSpacing: 2, fontFamily: "monospace" },
  dayTotal: { color: "#2a5a74", fontSize: 9, fontFamily: "monospace" },

  swipeWrap: { position: "relative", borderRadius: 8, overflow: "hidden" },
  deleteBg: { ...StyleSheet.absoluteFillObject, alignItems: "flex-end", justifyContent: "center" },
  deleteHit: { width: 84, height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(150,40,40,0.85)" },
  deleteText: { color: "#ffd9d9", fontSize: 12, letterSpacing: 2, fontFamily: "monospace" },
  logItem: { backgroundColor: "#050e18", borderLeftWidth: 1, borderLeftColor: "#0d2233", paddingLeft: 12, paddingRight: 10, paddingVertical: 9 },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logTime: { color: "#7eb8d4", fontSize: 11, fontFamily: "monospace" },
  logRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  logMin: { color: "#4a9abb", fontSize: 9, fontFamily: "monospace" },
  logChev: { color: "#1a3a50", fontSize: 11, fontFamily: "monospace" },
  logSubj: { color: "#4a7a94", fontSize: 11, marginTop: 3 },
  logSubjEmpty: { color: "#1a3a50", fontStyle: "italic" },

  overlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.9)", alignItems: "center", justifyContent: "center", padding: 24 },
  detailCard: { width: "100%", maxWidth: 380, backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 18, padding: 24, gap: 18 },
  detailTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  detailDate: { color: "#2a5a74", fontSize: 9, letterSpacing: 2, fontFamily: "monospace" },
  detailRange: { color: "#cce8f5", fontSize: 18, fontFamily: "monospace", marginTop: 4 },
  detailMin: { color: "#4a9abb", fontSize: 20, fontFamily: "monospace" },
  detailMinLabel: { color: "#2a5a74", fontSize: 8, letterSpacing: 1.5, fontFamily: "monospace" },
  divider: { height: 1, backgroundColor: "#0d2233" },
  fieldLabel: { color: "#2a5a74", fontSize: 8, letterSpacing: 1.5, fontFamily: "monospace" },
  subjBox: { borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 16, minHeight: 60, justifyContent: "center" },
  subjText: { color: "#cce8f5", fontSize: 15 },
  subjEmpty: { color: "#1a3a50", fontSize: 12, fontStyle: "italic" },
  input: { backgroundColor: "#040d16", borderWidth: 1, borderColor: "#1a3a50", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, color: "#cce8f5", fontSize: 14 },
  editBtns: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 14 },
  editCancel: { color: "#3a6880", fontSize: 11, letterSpacing: 1.5, fontFamily: "monospace" },
  editSave: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)" },
  editSaveText: { color: "#4a9abb", fontSize: 11, letterSpacing: 1.5, fontFamily: "monospace" },
  detailBtns: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deleteBtn: { color: "#3a6880", fontSize: 10, letterSpacing: 1.5, fontFamily: "monospace" },
  closeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: "#1a3a50" },
  closeBtnText: { color: "#7eb8d4", fontSize: 10, letterSpacing: 1.5, fontFamily: "monospace" },
});