import {
  requestStudyNotifPermission,
  startStudyNotification,
  updateStudyNotification,
  stopStudyNotification,
} from "../../services/studyNotification";
import { useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput,
  Animated, PanResponder, useWindowDimensions, Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveStudyTime, getStudySummary, type StudySummary } from "../../api/study";
import { nativeNoise, type NoiseKey } from "../../api/nativeNoise";
import StudyLogTab from "./panels/StudyLogPanel";
import StudyProfilePanel from "./panels/StudyProfilePanel";

type Tab = "log" | "profile";
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "log", icon: "≡", label: "일지" },
  { id: "profile", icon: "○", label: "나" },
];

const PRESETS = [30, 60, 120];
const SUBJECT_SUGGESTIONS = ["스터디", "독서", "영어", "전공", "암기", "자격증"];
const START_KEY = "studyStartAt";
const GOAL_KEY = "studyGoalMin";
const SUBJ_KEY = "studySubject";

const fmtClock = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};
const fmtSummary = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
};

const NOISES: { key: NoiseKey; label: string }[] = [
  { key: "rain", label: "비" },
  { key: "wave", label: "파도" },
  { key: "fire", label: "장작" },
];

function NoiseGlyph({ k, color }: { k: NoiseKey; color: string }) {
  if (k === "rain") return <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M7 14l-1 4M12 14l-1 4M17 14l-1 4M5 11a4 4 0 0 1 1-7 5 5 0 0 1 9.5-1A4 4 0 0 1 18 11Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" /></Svg>;
  if (k === "wave") return <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" /></Svg>;
  return <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M12 3c1 3-1 4-1 6a3 3 0 0 0 6 0c0-1-.5-2-1-2.5C16 9 17 11 17 14a5 5 0 0 1-10 0c0-4 3-6 5-11Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export default function StudyNativeHud({
  onStudyingChange, onNoiseChange, onLeave, onSheetChange,
}: {
  onStudyingChange: (studying: boolean) => void;
  onNoiseChange: (key: string | null) => void;
  onLeave: () => void;
  onSheetChange?: (open: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const TAB_W = SCREEN_W / 2;
  const SHEET_H = SCREEN_H * 0.85;

  const [goalMin, setGoalMin] = useState(30);
  const [subject, setSubject] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<StudySummary>({ todaySeconds: 0, totalSeconds: 0 });
  const [saving, setSaving] = useState(false);

  const [setupOpen, setSetupOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);   // 공부 중 진행 상황 모달

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [mounted, setMounted] = useState<Record<Tab, boolean>>({ log: true, profile: false });
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  const [curNoise, setCurNoise] = useState<NoiseKey | null>(nativeNoise.getCurrent());
  const [muted, setMuted] = useState(nativeNoise.isMuted());

  const startAtRef = useRef<Date | null>(null);

  const barEnter = useRef(new Animated.Value(0)).current;
  const barHint = useRef(new Animated.Value(0)).current;
  const enteredRef = useRef(false);
  useEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    Animated.timing(barEnter, {
      toValue: 1, duration: 520, delay: 250,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Animated.sequence([
        Animated.timing(barHint, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(barHint, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 12 }),
      ]).start();
    }, 770);
    return () => clearTimeout(t);
  }, []);

  const refreshSummary = () => getStudySummary().then(setSummary).catch(() => {});
  useEffect(() => { refreshSummary(); }, []);

  // 언마운트(화면 이탈 포함) 시 Live Activity/위젯 종료
  useEffect(() => {
    return () => {
      stopStudyNotification().catch(() => {});
    };
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(START_KEY);
      if (!saved) return;
      const start = new Date(saved);
      const goal = Number(await AsyncStorage.getItem(GOAL_KEY)) || 30;
      const elapsedSec = Math.floor((Date.now() - start.getTime()) / 1000);
      if (elapsedSec >= goal * 60) { clearSession(); return; }
      startAtRef.current = start;
      setGoalMin(goal);
      setSubject((await AsyncStorage.getItem(SUBJ_KEY)) || "");
      setElapsed(elapsedSec);
      setRunning(true);
      onStudyingChange(true);
      startStudyNotification({ subject: (await AsyncStorage.getItem(SUBJ_KEY)) || "", elapsedSec, goalMin: goal }).catch(() => {});
    })();
  }, []);

  useEffect(() => {
    const unsub = nativeNoise.subscribe(() => {
      setCurNoise(nativeNoise.getCurrent());
      setMuted(nativeNoise.isMuted());
      onNoiseChange(nativeNoise.getCurrent());
    });
    return () => { unsub(); };
  }, []);

  const defaultNoiseSet = useRef(false);
  useEffect(() => {
    if (defaultNoiseSet.current) return;
    defaultNoiseSet.current = true;
    const t = setTimeout(() => { nativeNoise.select("wave"); }, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!running || !startAtRef.current) return;
    const id = setInterval(() => {
      const e = Math.floor((Date.now() - startAtRef.current!.getTime()) / 1000);
      setElapsed(e);
      updateStudyNotification({ subject, elapsedSec: e, goalMin }).catch(() => {});
      if (e >= goalMin * 60) { clearInterval(id); finish(); }
    }, 1000);
    return () => clearInterval(id);
  }, [running, goalMin, subject]);

  const clearSession = () => {
    AsyncStorage.removeItem(START_KEY);
    AsyncStorage.removeItem(GOAL_KEY);
    AsyncStorage.removeItem(SUBJ_KEY);
  };

  const startSession = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    const now = new Date();
    startAtRef.current = now;
    await AsyncStorage.setItem(START_KEY, now.toISOString());
    await AsyncStorage.setItem(GOAL_KEY, String(goalMin));
    await AsyncStorage.setItem(SUBJ_KEY, subject);
    setElapsed(0);
    setRunning(true);
    setSetupOpen(false);
    onStudyingChange(true);

    await requestStudyNotifPermission();
    await startStudyNotification({ subject, elapsedSec: 0, goalMin });
  };

  const finish = async () => {
    if (saving || !startAtRef.current) return;
    const start = startAtRef.current;
    startAtRef.current = null;
    setRunning(false);
    onStudyingChange(false);
    setProgressOpen(false);
    setSaving(true);
    await stopStudyNotification().catch(() => {});
    try {
      await saveStudyTime(start, new Date(), subject);
      await refreshSummary();
    } catch (e) {
      console.error("공부 기록 저장 실패:", e);
    } finally {
      clearSession();
      setElapsed(0);
      setSubject("");
      setSaving(false);
    }
  };

  const confirmFinish = () => { setConfirmOpen(false); finish(); };

  const leaveStudy = () => {
    startAtRef.current = null;
    setRunning(false);
    onStudyingChange(false);
    clearSession();
    setElapsed(0);
    stopStudyNotification().catch(() => {});
    onLeave();
  };

  const pickNoise = (key: NoiseKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    nativeNoise.select(key);
  };
  const noiseOff = () => nativeNoise.select(null);
  const toggleMute = () => setMuted(nativeNoise.toggleMute());

  const animateTo = (toValue: number, cb?: () => void) => {
    Animated.timing(translateY, { toValue, duration: 220, useNativeDriver: true }).start(cb);
  };
  const openSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSheetOpen(true);
    onSheetChange?.(true);
    translateY.setValue(SHEET_H);
    requestAnimationFrame(() => animateTo(0));
  };
  const closeSheet = () => animateTo(SHEET_H, () => { setSheetOpen(false); onSheetChange?.(false); });
  const selectTab = (id: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(id);
    if (!mounted[id]) setMounted((m) => ({ ...m, [id]: true }));
  };

  // 하단 바(타이머) 탭 — 공부 중이면 진행 상황 모달
  const onBarPress = () => {
    if (!running) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setProgressOpen(true);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 || g.vy > 0.5) animateTo(SHEET_H, () => setSheetOpen(false));
        else animateTo(0);
      },
    })
  ).current;

  const edgeGuard = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, g) => {
        const fromLeftEdge = e.nativeEvent.pageX - g.dx < 24;
        return fromLeftEdge && Math.abs(g.dx) > Math.abs(g.dy);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: () => {},
      onPanResponderRelease: () => {},
    })
  ).current;

  const liveToday = summary.todaySeconds + (running ? elapsed : 0);
  const progress = running ? Math.min(1, elapsed / (goalMin * 60)) : 0;
  const remainSec = running ? Math.max(0, goalMin * 60 - elapsed) : 0;

  const barTranslateY = Animated.add(
    barEnter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
    barHint.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }),
  );

  return (
    <>
      <Pressable onPress={() => setSoundOpen(true)} style={[s.soundBtn, { top: insets.top + 10 }]}>
        <Text style={s.soundIcon}>♫</Text>
      </Pressable>

      <Animated.View style={[s.bottomBar, { bottom: insets.bottom + 18, opacity: barEnter, transform: [{ translateY: barTranslateY }] }]}>
        <Pressable onPress={onBarPress} style={s.barInner}>
          <View style={s.todayCol}>
            <Text style={s.todayVal}>{fmtSummary(liveToday)}</Text>
            <Text style={s.todayLabel}>오늘 공부량</Text>
          </View>
          <View style={s.vline} />
          <View style={s.timerCol}>
            <View style={s.timerRow}>
              <Text style={s.timer}>{fmtClock(elapsed)}</Text>
              {running && <Text style={s.timerSub} numberOfLines={1}>{subject || "공부 중"} · 목표 {goalMin}분</Text>}
            </View>
            {running && (
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${progress * 100}%` }]} />
              </View>
            )}
          </View>
          {!running ? (
            <Pressable onPress={() => setSetupOpen(true)} style={s.startBtn}>
              <Text style={s.startText}>시작</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setConfirmOpen(true)} disabled={saving} style={s.stopBtn}>
              <Text style={s.stopText}>{saving ? "저장 중" : "종료"}</Text>
            </Pressable>
          )}
        </Pressable>
      </Animated.View>

      {!sheetOpen && (
        <View style={[s.fabWrap, { top: insets.top + 10 }]} pointerEvents="box-none">
          <Pressable onPress={openSheet} style={s.fab}>
            <Text style={s.fabIcon}>≡</Text>
          </Pressable>
        </View>
      )}

      {sheetOpen && (
        <View style={s.sheetOverlay} {...edgeGuard.panHandlers}>
          <Pressable style={s.backdrop} onPress={closeSheet} />
          <Animated.View style={[s.sheet, { height: SHEET_H, transform: [{ translateY }] }]}>
            <View {...pan.panHandlers}>
              <View style={s.handleWrap}><View style={s.handle} /></View>
              <View style={s.tabBar}>
                {TABS.map((t) => {
                  const active = activeTab === t.id;
                  return (
                    <Pressable key={t.id} onPress={() => selectTab(t.id)} style={[s.tab, { width: TAB_W }, active && s.tabActive]}>
                      <Text style={[s.tabIcon, active && s.tabTextActive]}>{t.icon}</Text>
                      <Text style={[s.tabLabel, active && s.tabTextActive]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={s.sheetContent}>
              {mounted.log && (
                <View style={[s.panel, activeTab !== "log" && s.hidden]}>
                  <StudyLogTab totalSeconds={summary.totalSeconds} onChanged={refreshSummary} />
                </View>
              )}
              {mounted.profile && (
                <View style={[s.panel, activeTab !== "profile" && s.hidden]}>
                  <StudyProfilePanel />
                </View>
              )}
            </View>

            <Pressable onPress={() => { closeSheet(); leaveStudy(); }} style={[s.leave, { paddingBottom: insets.bottom + 14 }]}>
              <Text style={s.leaveText}>‹ 모드 선택으로</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* 공부 설정 모달 */}
      <Modal visible={setupOpen} transparent animationType="fade" onRequestClose={() => setSetupOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setSetupOpen(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <Text style={s.modalTitle}>공부 설정</Text>
            <View style={s.goalWrap}>
              <Text style={s.goalNum}>{goalMin}<Text style={s.goalUnit}> 분</Text></Text>
              <Slider
                style={s.slider}
                minimumValue={5} maximumValue={180} step={5} value={goalMin}
                onValueChange={(v) => setGoalMin(Math.round(v))}
                minimumTrackTintColor="#4a9abb" maximumTrackTintColor="#0d2233" thumbTintColor="#a8d4e8"
              />
              <View style={s.sliderEnds}>
                <Text style={s.sliderEndText}>5분</Text>
                <Text style={s.sliderEndText}>180분</Text>
              </View>
              <View style={s.presetRow}>
                {PRESETS.map((g) => (
                  <Pressable key={g} onPress={() => setGoalMin(g)} style={[s.preset, goalMin === g && s.presetOn]}>
                    <Text style={[s.presetText, goalMin === g && s.presetTextOn]}>{g}분</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ gap: 10 }}>
              <Text style={s.fieldLabel}>무슨 공부 (선택)</Text>
              <TextInput value={subject} onChangeText={setSubject} maxLength={40}
                placeholder="직접 입력하거나 아래에서 선택" placeholderTextColor="#1a3a50" style={s.input} />
              <View style={s.suggestRow}>
                {SUBJECT_SUGGESTIONS.map((sug) => {
                  const on = subject === sug;
                  return (
                    <Pressable
                      key={sug}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSubject(on ? "" : sug); }}
                      style={[s.suggestChip, on && s.suggestChipOn]}
                    >
                      <Text style={[s.suggestText, on && s.suggestTextOn]}>{sug}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable onPress={startSession} style={s.modalStart}>
              <Text style={s.modalStartText}>시작하기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 공부 중 진행 상황 모달 */}
      <Modal visible={progressOpen} transparent animationType="fade" onRequestClose={() => setProgressOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setProgressOpen(false)}>
          <Pressable style={[s.modalCard, { maxWidth: 340, alignItems: "center" }]} onPress={() => {}}>
            <Text style={s.modalTitle}>공부 중</Text>
            {!!subject && <Text style={s.progSubject}>{subject}</Text>}
            <Text style={s.progClock}>{fmtClock(elapsed)}</Text>
            <View style={s.progBarTrack}>
              <View style={[s.progBarFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={s.progStatRow}>
              <View style={s.progStat}>
                <Text style={s.progStatVal}>{goalMin}분</Text>
                <Text style={s.progStatLabel}>목표</Text>
              </View>
              <View style={s.progStat}>
                <Text style={s.progStatVal}>{Math.round(progress * 100)}%</Text>
                <Text style={s.progStatLabel}>진행</Text>
              </View>
              <View style={s.progStat}>
                <Text style={s.progStatVal}>{fmtSummary(remainSec)}</Text>
                <Text style={s.progStatLabel}>남음</Text>
              </View>
            </View>
            <View style={s.progBtnRow}>
              <Pressable onPress={() => setProgressOpen(false)} style={s.progClose}>
                <Text style={s.progCloseText}>계속하기</Text>
              </Pressable>
              <Pressable onPress={() => { setProgressOpen(false); setConfirmOpen(true); }} style={s.progStop}>
                <Text style={s.progStopText}>종료</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setConfirmOpen(false)}>
          <Pressable style={[s.modalCard, { maxWidth: 320 }]} onPress={() => {}}>
            <Text style={s.modalTitle}>공부 종료</Text>
            <Text style={s.confirmTime}>{fmtClock(elapsed)}</Text>
            <Text style={s.confirmDesc}>{subject || "이번 공부"} 기록을 저장하고 종료할까요?</Text>
            <View style={s.confirmRow}>
              <Pressable onPress={() => setConfirmOpen(false)} style={s.cancelBtn}><Text style={s.cancelText}>취소</Text></Pressable>
              <Pressable onPress={confirmFinish} disabled={saving} style={s.okBtn}><Text style={s.okText}>확인</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={soundOpen} transparent animationType="fade" onRequestClose={() => setSoundOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setSoundOpen(false)}>
          <Pressable style={[s.modalCard, { maxWidth: 340 }]} onPress={() => {}}>
            <View style={s.soundHead}>
              <Text style={s.modalTitle}>백색소음</Text>
              <Pressable onPress={toggleMute}>
                <Text style={[s.muteToggle, muted && s.muteOn]}>{muted ? "음소거" : "소리"}</Text>
              </Pressable>
            </View>
            {NOISES.map((n) => {
              const active = curNoise === n.key;
              return (
                <Pressable key={n.key} onPress={() => pickNoise(n.key)} style={[s.noiseRow, active && s.noiseRowOn]}>
                  <View style={[s.noiseIcon, active && s.noiseIconOn]}>
                    <NoiseGlyph k={n.key} color={active ? "#cce8f5" : "#7eb8d4"} />
                  </View>
                  <Text style={[s.noiseLabel, active && s.noiseLabelOn]}>{n.label}</Text>
                  {active && !muted && <Text style={s.playing}>재생</Text>}
                </Pressable>
              );
            })}
            <Pressable onPress={noiseOff} style={[s.noiseOff, curNoise === null && s.noiseOffOn]}>
              <Text style={[s.noiseOffText, curNoise === null && s.noiseOffTextOn]}>소리 끄기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  soundBtn: {
    position: "absolute", right: 16, zIndex: 20,
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(5,14,24,0.7)", borderWidth: 1, borderColor: "rgba(26,74,100,0.6)",
  },
  soundIcon: { color: "#7eb8d4", fontSize: 20 },

  bottomBar: { position: "absolute", left: 16, right: 16, zIndex: 20, alignItems: "center" },
  barInner: {
    width: "100%", maxWidth: 640, flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 18,
    backgroundColor: "rgba(5,14,24,0.85)", borderWidth: 1, borderColor: "rgba(26,74,100,0.45)",
  },
  todayCol: { alignItems: "flex-start" },
  todayVal: { color: "#a8d4e8", fontSize: 14, fontFamily: "monospace" },
  todayLabel: { color: "#2a5a74", fontSize: 8, letterSpacing: 1.5, fontFamily: "monospace", marginTop: 3 },
  vline: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(26,58,80,0.5)" },
  timerCol: { flex: 1, gap: 6 },
  timerRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  timer: { color: "#cce8f5", fontSize: 26, fontFamily: "monospace", letterSpacing: 1 },
  timerSub: { color: "#4a7a94", fontSize: 10, fontFamily: "monospace", flexShrink: 1 },
  barTrack: { height: 3, borderRadius: 2, backgroundColor: "#0d2233", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2, backgroundColor: "#4a9abb" },
  startBtn: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)" },
  startText: { color: "#4a9abb", fontSize: 13, letterSpacing: 3, fontFamily: "monospace" },
  stopBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: "rgba(26,74,100,0.6)" },
  stopText: { color: "#7eb8d4", fontSize: 13, letterSpacing: 1.5, fontFamily: "monospace" },

  fabWrap: { position: "absolute", left: 16, alignItems: "flex-start", zIndex: 20 },
  fab: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(26,74,100,0.7)", backgroundColor: "rgba(10,24,40,0.9)",
  },
  fabIcon: { color: "#7eb8d4", fontSize: 22 },

  sheetOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 30 },
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,14,0.35)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(5,14,24,0.97)",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: "rgba(26,74,100,0.4)",
    overflow: "hidden", flexDirection: "column",
  },
  handleWrap: { alignItems: "center", paddingTop: 14, paddingBottom: 12 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#2a5a74" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0d2233" },
  tab: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#4a9abb" },
  tabIcon: { fontSize: 18, color: "#1a3a50" },
  tabLabel: { fontSize: 11, marginTop: 4, color: "#1a3a50" },
  tabTextActive: { color: "#7eb8d4" },
  sheetContent: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingHorizontal: 20, paddingTop: 12 },
  panel: { flex: 1 },
  hidden: { display: "none" },
  leave: { borderTopWidth: 1, borderTopColor: "#0d2233", paddingTop: 14, alignItems: "center" },
  leaveText: { color: "#3a6880", fontSize: 11, letterSpacing: 2, fontFamily: "monospace" },

  overlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 18, padding: 26, gap: 22 },
  modalTitle: { color: "#7eb8d4", fontSize: 12, letterSpacing: 4, fontFamily: "monospace", textAlign: "center" },

  goalWrap: { alignItems: "center", gap: 14 },
  goalNum: { color: "#cce8f5", fontSize: 38, fontFamily: "monospace" },
  goalUnit: { color: "#4a7a94", fontSize: 14 },
  slider: { width: "100%", height: 36 },
  sliderEnds: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: -8 },
  sliderEndText: { color: "#2a5a74", fontSize: 9, fontFamily: "monospace" },
  presetRow: { flexDirection: "row", gap: 8 },
  preset: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)" },
  presetOn: { borderColor: "rgba(74,154,187,0.7)", backgroundColor: "rgba(10,34,51,0.6)" },
  presetText: { color: "#3a6880", fontSize: 12, letterSpacing: 1, fontFamily: "monospace" },
  presetTextOn: { color: "#cce8f5" },

  fieldLabel: { color: "#2a5a74", fontSize: 9, letterSpacing: 1.5, fontFamily: "monospace" },
  input: { backgroundColor: "#040d16", borderWidth: 1, borderColor: "#1a3a50", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#cce8f5", fontSize: 14 },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  suggestChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: "rgba(26,74,100,0.45)", backgroundColor: "rgba(7,24,38,0.4)" },
  suggestChipOn: { borderColor: "rgba(74,154,187,0.7)", backgroundColor: "rgba(10,34,51,0.7)" },
  suggestText: { color: "#5a8aa4", fontSize: 12 },
  suggestTextOn: { color: "#cce8f5" },
  modalStart: { paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", alignItems: "center" },
  modalStartText: { color: "#4a9abb", fontSize: 13, letterSpacing: 3, fontFamily: "monospace" },

  // 진행 상황 모달
  progSubject: { color: "#a8d4e8", fontSize: 14, letterSpacing: 1, marginTop: -6 },
  progClock: { color: "#cce8f5", fontSize: 44, fontFamily: "monospace", letterSpacing: 2 },
  progBarTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "#0d2233", overflow: "hidden" },
  progBarFill: { height: "100%", borderRadius: 3, backgroundColor: "#4a9abb" },
  progStatRow: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  progStat: { alignItems: "center", gap: 4 },
  progStatVal: { color: "#a8d4e8", fontSize: 15, fontFamily: "monospace" },
  progStatLabel: { color: "#2a5a74", fontSize: 9, letterSpacing: 1.5, fontFamily: "monospace" },
  progBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
  progClose: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", alignItems: "center" },
  progCloseText: { color: "#4a9abb", fontSize: 12, letterSpacing: 2, fontFamily: "monospace" },
  progStop: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#1a3a50", alignItems: "center" },
  progStopText: { color: "#7eb8d4", fontSize: 12, letterSpacing: 2, fontFamily: "monospace" },

  confirmTime: { color: "#cce8f5", fontSize: 30, fontFamily: "monospace", textAlign: "center" },
  confirmDesc: { color: "#4a7a94", fontSize: 12, fontFamily: "monospace", textAlign: "center" },
  confirmRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: "#1a3a50", alignItems: "center" },
  cancelText: { color: "#3a6880", fontSize: 12, letterSpacing: 1.5, fontFamily: "monospace" },
  okBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", alignItems: "center" },
  okText: { color: "#4a9abb", fontSize: 12, letterSpacing: 1.5, fontFamily: "monospace" },

  soundHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muteToggle: { color: "#3a6880", fontSize: 10, letterSpacing: 1.5, fontFamily: "monospace" },
  muteOn: { color: "#4a9abb" },
  noiseRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)" },
  noiseRowOn: { borderColor: "rgba(74,154,187,0.7)", backgroundColor: "rgba(10,34,51,0.6)" },
  noiseIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(26,74,100,0.6)" },
  noiseIconOn: { borderColor: "rgba(126,184,212,0.7)" },
  noiseLabel: { color: "#4a7a94", fontSize: 13, letterSpacing: 2, fontFamily: "monospace" },
  noiseLabelOn: { color: "#cce8f5" },
  playing: { marginLeft: "auto", color: "#4a9abb", fontSize: 9, fontFamily: "monospace" },
  noiseOff: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", alignItems: "center" },
  noiseOffOn: { borderColor: "rgba(74,154,187,0.6)" },
  noiseOffText: { color: "#3a6880", fontSize: 10, letterSpacing: 1.5, fontFamily: "monospace" },
  noiseOffTextOn: { color: "#cce8f5" },
});