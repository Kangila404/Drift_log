import { useEffect, useState, useRef } from "react";
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  useWindowDimensions, StyleSheet, PanResponder,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { getVoyageLogs, saveVoyageNote, getUserProfile, type VoyageLog, type VoyageEvent } from "../../../api/voyage";
import { CITY_META, assetUrl } from "../../../api/config";
import { nativeBgm } from "../../../api/nativeBgm";

const BLUR = "L03[?bof00ay~qj[ayj@00fQ_3fk";

type MonthGroup = { key: string; label: string; logs: VoyageLog[] };

function groupByDate(logs: VoyageLog[]): { date: string; logs: VoyageLog[] }[] {
  const map = new Map<string, VoyageLog[]>();
  for (const log of logs) {
    if (!map.has(log.date)) map.set(log.date, []);
    map.get(log.date)!.push(log);
  }
  return Array.from(map).map(([date, list]) => ({ date, logs: list }));
}

export default function LogPanel() {
  const { width: SCREEN_W } = useWindowDimensions();
  const [logs, setLogs] = useState<VoyageLog[]>([]);
  const [visitedIds, setVisitedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  const [detail, setDetail] = useState<VoyageLog | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);

  useEffect(() => {
    Promise.all([getVoyageLogs(), getUserProfile()])
      .then(([l, p]) => { setLogs(l); setVisitedIds(p.visitedCityIds); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const urls = visitedIds.map((id) => assetUrl(CITY_META[id]?.img)).filter(Boolean) as string[];
    if (urls.length) Image.prefetch(urls, { cachePolicy: "memory-disk" });
  }, [visitedIds]);

  const visited = visitedIds.filter((id) => CITY_META[id]);

  const monthGroups: MonthGroup[] = (() => {
    const map = new Map<string, VoyageLog[]>();
    for (const log of logs) {
      const d = new Date(log.ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return Array.from(map).map(([key, list]) => {
      const [y, m] = key.split("-");
      return { key, label: `${y}년 ${Number(m)}월`, logs: list };
    });
  })();

  const isCollapsed = (key: string, idx: number) => collapsed[key] ?? idx !== 0;
  const toggleMonth = (key: string, idx: number) =>
    setCollapsed((p) => ({ ...p, [key]: !(p[key] ?? idx !== 0) }));

  // 날짜(하루) 접기 — 기본 펼침
  const isDateCollapsed = (key: string) => collapsedDates[key] ?? false;
  const toggleDate = (key: string) =>
    setCollapsedDates((p) => ({ ...p, [key]: !(p[key] ?? false) }));

  if (loading) return <View style={s.center}><ActivityIndicator color="#4a9abb" /></View>;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      {visited.length > 0 && (
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setPhotoOpen(true); }} style={s.bigBtn}>
          <Text style={s.bigBtnText}>지나온 도시 사진 보기 ({visited.length})</Text>
        </Pressable>
      )}
      {visited.length > 0 && (
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setMusicOpen(true); }} style={s.bigBtn}>
          <Text style={s.bigBtnText}>지나온 도시 음악 듣기 ({visited.length})</Text>
        </Pressable>
      )}

      {logs.length === 0 && <Text style={s.empty}>— 아직 항해 기록이 없습니다</Text>}

      {monthGroups.map((group, gIdx) => {
        const c = isCollapsed(group.key, gIdx);
        return (
          <View key={group.key}>
            <Pressable onPress={() => toggleMonth(group.key, gIdx)} style={s.monthHead}>
              <Text style={s.monthLabel}>{group.label}</Text>
              <Text style={s.monthCount}>{group.logs.length}건 {c ? "›" : "⌄"}</Text>
            </Pressable>
            {!c && (
              <View style={s.monthBody}>
                {groupByDate(group.logs).map((dateGroup) => {
                  const dKey = `${group.key}-${dateGroup.date}`;
                  const dc = isDateCollapsed(dKey);
                  return (
                    <View key={dateGroup.date} style={s.dateBlock}>
                      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); toggleDate(dKey); }} style={s.dateHead}>
                        <View style={s.dateDot} />
                        <Text style={s.dateLabel}>{dateGroup.date}</Text>
                        <View style={s.dateLine} />
                        <Text style={s.dateNum}>{dateGroup.logs.length}건 {dc ? "›" : "⌄"}</Text>
                      </Pressable>
                      {!dc && (
                        <View style={s.dateLogs}>
                          {dateGroup.logs.map((log) => (
                            <Pressable
                              key={log.id}
                              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setDetail(log); }}
                              style={({ pressed }) => [s.logCard, pressed && s.logCardPressed]}
                            >
                              <View style={s.logHead}>
                                <Text style={s.logRoute} numberOfLines={1}>{log.from} → {log.to}</Text>
                                <Text style={s.logChevron}>›</Text>
                              </View>
                              {log.events.length > 0 && (
                                <View style={s.thumbRow}>
                                  {log.events.map((ev, i) => (
                                    <Image key={i} source={ev.imageUrl} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" transition={150} placeholder={BLUR} />
                                  ))}
                                </View>
                              )}
                              <Text style={log.note ? s.logNote : s.logNoteEmpty} numberOfLines={2}>
                                {log.note || "기록 없음 · 눌러서 작성"}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {/* 상세 모달 */}
      <LogDetailModal
        log={detail}
        onClose={() => setDetail(null)}
        onSaved={(id, note) => {
          setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, note } : l)));
          setDetail((prev) => (prev ? { ...prev, note } : prev));
        }}
      />

      {/* 사진 모달 (그리드 + 풀스크린을 한 모달 안에서 전환 — 중첩 X) */}
      <PhotoModal visible={photoOpen} visited={visited} screenW={SCREEN_W} onClose={() => setPhotoOpen(false)} />

      {/* 음악 모달 */}
      <MusicModal visible={musicOpen} visited={visited} onClose={() => setMusicOpen(false)} />
    </ScrollView>
  );
}

// ─── 사진 모달 (그리드 ↔ 풀스크린 단일 모달) ───
function PhotoModal({ visible, visited, screenW, onClose }: {
  visible: boolean; visited: number[]; screenW: number; onClose: () => void;
}) {
  const [full, setFull] = useState<number | null>(null);

  // 모달 닫힐 때 풀스크린 상태 초기화 (다음에 열 때 확대부터 뜨는 버그 방지)
  useEffect(() => { if (!visible) setFull(null); }, [visible]);

  const close = () => {
    if (full !== null) setFull(null);  // 풀스크린이면 그리드로 복귀
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {full !== null && CITY_META[full] ? (
        // ── 풀스크린 ──
        <Pressable style={s.fullWrap} onPress={() => setFull(null)}>
          <Image source={assetUrl(CITY_META[full].img)} style={s.fullImg} contentFit="cover" cachePolicy="memory-disk" transition={150} placeholder={BLUR} />
          <View style={s.fullTextWrap} pointerEvents="none">
            <Text style={s.fullName}>{CITY_META[full].name}</Text>
            <Text style={s.fullDesc}>{CITY_META[full].desc}</Text>
            <Text style={s.fullHint}>탭하여 닫기</Text>
          </View>
        </Pressable>
      ) : (
        // ── 그리드 ──
        <View style={s.overlay}>
          <Text style={s.overlayTitle}>지나온 도시</Text>
          <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
            {visited.map((id) => {
              const c = CITY_META[id];
              return (
                <Pressable key={id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setFull(id); }} style={[s.gridCell, { width: (screenW - 56) / 2 }]}>
                  <Image source={assetUrl(c.img)} style={s.gridImg} contentFit="cover" cachePolicy="memory-disk" transition={200} placeholder={BLUR} />
                  <View style={s.gridLabelWrap}><Text style={s.gridLabel}>{c.name}</Text></View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={s.closeBtn}><Text style={s.closeText}>닫기</Text></Pressable>
        </View>
      )}
    </Modal>
  );
}

// ─── 항해록 상세 모달 ───
function LogDetailModal({ log, onClose, onSaved }: {
  log: VoyageLog | null; onClose: () => void; onSaved: (id: number, note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<VoyageEvent | null>(null);

  useEffect(() => { if (log) { setEditing(false); setNote(log.note); setEvent(null); } }, [log]);

  const save = async () => {
    if (!log || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSaving(true);
    try { await saveVoyageNote(log.id, note); onSaved(log.id, note); setEditing(false); }
    catch {} finally { setSaving(false); }
  };

  return (
    <Modal visible={!!log} transparent animationType="fade" onRequestClose={onClose}>
      {log && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.detailOverlay}>
          {/* 이벤트 상세를 같은 모달 안에서 전환 (중첩 X) */}
          {event ? (
            <Pressable style={s.eventFull} onPress={() => setEvent(null)}>
              <View style={s.eventCard}>
                {event.imageUrl && <Image source={event.imageUrl} style={s.eventBig} contentFit="cover" cachePolicy="memory-disk" transition={150} placeholder={BLUR} />}
                <View style={{ padding: 20, gap: 10 }}>
                  <Text style={s.sectionLabel}>항해 중 마주친 것</Text>
                  <Text style={s.eventName}>{event.name}</Text>
                  <Text style={s.eventText}>{event.text}</Text>
                  <Text style={s.fullHint}>탭하여 닫기</Text>
                </View>
              </View>
            </Pressable>
          ) : (
            <>
              <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
              <View style={s.detailCard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={s.detailHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailDate}>{log.date}</Text>
                    <Text style={s.detailRoute}>{log.from} <Text style={{ color: "#3a6880" }}>→</Text> {log.to}</Text>
                  </View>
                  <Pressable onPress={onClose} style={s.detailClose}><Text style={s.detailCloseX}>✕</Text></Pressable>
                </View>

                {!!log.autoText && (
                  <View style={s.autoBox}>
                    <Text style={s.sectionLabel}>항해 기록</Text>
                    <Text style={s.autoText}>{log.autoText}</Text>
                  </View>
                )}

                {log.events.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={s.sectionLabel}>항해 중 마주친 것</Text>
                    <View style={s.eventRow}>
                      {log.events.map((ev, i) => (
                        <Pressable key={i} onPress={() => setEvent(ev)} style={s.eventThumb}>
                          <Image source={ev.imageUrl} style={s.eventThumbImg} contentFit="cover" cachePolicy="memory-disk" transition={150} placeholder={BLUR} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                <View style={s.noteSection}>
                  <View style={s.noteSectionHead}>
                    <Text style={s.sectionLabel}>나의 한 줄</Text>
                    {!editing && <Text style={s.editHint}>{log.note ? "수정" : "작성"} ›</Text>}
                  </View>
                  {editing ? (
                    <View style={{ gap: 10, marginTop: 8 }}>
                      <TextInput value={note} onChangeText={setNote} maxLength={100} multiline autoFocus placeholder="오늘의 항해를 기록하세요..." placeholderTextColor="#1a3a50" style={s.noteInput} />
                      <View style={s.noteBtnRow}>
                        <Text style={s.noteCount}>{note.length}/100</Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable onPress={() => setEditing(false)} style={s.cancelBtn}><Text style={s.cancelText}>취소</Text></Pressable>
                          <Pressable onPress={save} disabled={saving} style={s.saveBtn}><Text style={s.saveText}>{saving ? "저장 중" : "저장"}</Text></Pressable>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Pressable onPress={() => { setEditing(true); setNote(log.note); }} style={s.noteView}>
                      <Text style={log.note ? s.noteText : s.notePlaceholder}>
                        {log.note || "아직 기록이 없습니다. 눌러서 한 줄을 남겨보세요."}
                      </Text>
                      <Text style={s.noteEditIcon}>✎</Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

// ─── 음악 모달 ───
function MusicModal({ visible, visited, onClose }: {
  visible: boolean; visited: number[]; onClose: () => void;
}) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  // 재생 모드: off=한 곡 후 정지, one=한 곡 반복, all=목록 순환
  const [repeatMode, setRepeatMode] = useState<"off" | "one" | "all">("off");
  const player = useAudioPlayer();
  const durRef = useRef(0);
  durRef.current = dur;

  // 곡 끝 감지용 ref (최신 값 클로저 회피)
  const playingIdRef = useRef<number | null>(null);
  playingIdRef.current = playingId;
  const repeatRef = useRef(repeatMode);
  repeatRef.current = repeatMode;
  // 현재 배속 — replace로 곡 바꿀 때마다 재적용해야 해서 ref로 추적
  const rateRef = useRef(1);
  rateRef.current = rate;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => {});
  }, []);

  // 배속 적용 헬퍼 — expo-audio 1.1.1: player.setPlaybackRate(rate, pitchCorrectionQuality)
  // pitch 보정을 위해 shouldCorrectPitch도 같이 켠다. 소스 로드 직후엔 무시될 수 있어 약간 지연 재적용.
  const applyRate = (r: number) => {
    try { (player as any).shouldCorrectPitch = true; } catch {}
    try { player.setPlaybackRate(r, "high"); } catch {
      // 혹시 시그니처가 다르면 프로퍼티로 폴백
      try { (player as any).playbackRate = r; } catch {}
    }
  };

  // 재생 진행도 폴링 + 곡 끝 감지
  useEffect(() => {
    if (playingId === null) return;
    let ended = false;
    const t = setInterval(() => {
      if (seeking) return;
      try {
        const cur = player.currentTime ?? 0;
        const total = player.duration ?? 0;
        setPos(cur);
        setDur(total);
        // 끝 감지: 총 길이 있고 거의 끝까지 도달
        if (!ended && total > 1 && cur >= total - 0.5) {
          ended = true;
          handleTrackEnd();
        } else if (cur < total - 1) {
          ended = false;
        }
      } catch {}
    }, 300);
    return () => clearInterval(t);
  }, [playingId, seeking]);

  // 곡이 끝났을 때 — 모드에 따라
  const handleTrackEnd = () => {
    const id = playingIdRef.current;
    const mode = repeatRef.current;
    if (id === null) return;

    if (mode === "one") {
      // 한 곡 반복 — 배속 유지
      try { player.seekTo(0); player.play(); } catch {}
      applyRate(rateRef.current);
      setPos(0); setPaused(false);
      return;
    }
    if (mode === "all") {
      // 다음 곡 (목록 끝이면 처음으로) — 배속 유지
      const idx = visited.indexOf(id);
      const next = visited[(idx + 1) % visited.length];
      playTrack(next, true);
      return;
    }
    // off — 한 곡 끝나면 정지
    stopAll();
  };

  const cycleRepeat = () => {
    Haptics.selectionAsync().catch(() => {});
    setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"));
  };

  const stopAll = () => {
    try { player.pause(); } catch {}
    setPlayingId(null); setPaused(false); setPos(0); setDur(0);
    nativeBgm.duck(false);  // 게임 BGM 복귀
  };

  // 특정 곡 재생 (내부 공용). keepRate=true면 현재 배속 유지, false면 1배속으로 초기화.
  const playTrack = (id: number, keepRate = false) => {
    const url = assetUrl(CITY_META[id].bgm);
    if (!url) return;
    nativeBgm.duck(true);
    const r = keepRate ? rateRef.current : 1;
    // 화면 표시값과 ref를 먼저 동기화 (applyRate가 항상 최신 r을 쓰도록)
    if (!keepRate) { setRate(1); rateRef.current = 1; }
    player.replace({ uri: url });
    player.play();
    // replace로 새 소스가 로드되면 이전 곡의 배속이 player에 남아있을 수 있어,
    // 표시값과 실제 재생속도가 어긋나지 않도록 r을 즉시 + 지연으로 강제 재적용.
    applyRate(r);
    setTimeout(() => applyRate(r), 120);
    setTimeout(() => applyRate(r), 350);
    setPlayingId(id); setPaused(false); setPos(0); setDur(0);
  };

  // 리스트 행 탭: 다른 곡이면 새로 재생, 같은 곡이면 완전 정지
  const toggle = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (playingId === id) { stopAll(); return; }
    playTrack(id);
  };

  // 플레이어 바 버튼: 일시정지/재생만 (탭 안 닫힘)
  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      if (paused) { player.play(); applyRate(rateRef.current); setPaused(false); }
      else { player.pause(); setPaused(true); }
    } catch {}
  };

  // 10초 앞/뒤로
  const skip = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const target = Math.max(0, Math.min(durRef.current || 0, (player.currentTime ?? 0) + delta));
    try { player.seekTo(target); } catch {}
    setPos(target);
  };

  // 배속 순환 1 → 1.25 → 1.5 → 2 → 0.75 → 1
  const RATES = [1, 1.25, 1.5, 2, 0.75];
  const cycleRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const idx = RATES.indexOf(rate);
    const next = RATES[(idx + 1) % RATES.length];
    setRate(next);
    rateRef.current = next;  // 즉시 동기화 (연타·곡전환 시 어긋남 방지)
    applyRate(next);
  };

  const close = () => { stopAll(); onClose(); };

  // 모달 닫히면 BGM 복귀 보장
  useEffect(() => { if (!visible) { try { player.pause(); } catch {} setPlayingId(null); setPaused(false); nativeBgm.duck(false); } }, [visible]);

  const fmt = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s2 = Math.floor(sec % 60);
    return `${m}:${String(s2).padStart(2, "0")}`;
  };
  const nowCity = playingId !== null ? CITY_META[playingId] : null;
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;

  // ── 시크바 드래그 (PanResponder, locationX 기반 — Expo Go 호환) ──
  const barWidth = useRef(0);

  const seekFromLocation = (locationX: number): number | null => {
    const w = barWidth.current;
    if (w <= 0 || durRef.current <= 0) return null;
    const ratio = Math.max(0, Math.min(1, locationX / w));
    return ratio * durRef.current;
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setSeeking(true);
        const t = seekFromLocation(e.nativeEvent.locationX);
        if (t !== null) setPos(t);
      },
      onPanResponderMove: (e) => {
        const t = seekFromLocation(e.nativeEvent.locationX);
        if (t !== null) setPos(t);
      },
      onPanResponderRelease: (e) => {
        const t = seekFromLocation(e.nativeEvent.locationX);
        if (t !== null) { try { player.seekTo(t); } catch {} setPos(t); }
        setSeeking(false);
      },
      onPanResponderTerminate: () => setSeeking(false),
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        <Text style={s.overlayTitle}>지나온 도시의 음악</Text>

        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 10 }} style={{ width: "100%", flex: 1 }} showsVerticalScrollIndicator={false}>
          {visited.map((id) => {
            const c = CITY_META[id];
            const playing = playingId === id;
            return (
              <Pressable key={id} onPress={() => toggle(id)} style={[s.musicRow, playing && s.musicRowOn]}>
                <Image source={assetUrl(c.img)} style={s.musicThumb} contentFit="cover" cachePolicy="memory-disk" transition={150} placeholder={BLUR} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.musicName}>{c.name}</Text>
                  <Text style={s.musicSub}>{playing ? "재생 중..." : "미리듣기"}</Text>
                </View>
                <View style={[s.musicIcon, playing && s.musicIconOn]}>
                  <Text style={playing ? s.musicIconTextOn : s.musicIconText}>{playing ? "Ⅱ" : "▶"}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 재생 중일 때만 플레이어 바 */}
        {nowCity && (
          <View style={s.playerBar}>
            {/* 상단: 썸네일 + 제목 + 배속 */}
            <View style={s.playerTop}>
              <Image source={assetUrl(nowCity.img)} style={s.playerThumb} contentFit="cover" cachePolicy="memory-disk" placeholder={BLUR} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.playerName} numberOfLines={1}>{nowCity.name}</Text>
                <Text style={s.playerNowLabel}>NOW PLAYING</Text>
              </View>
              <Pressable onPress={cycleRate} style={s.rateBtn}>
                <Text style={s.rateText}>{rate}×</Text>
              </Pressable>
            </View>

            {/* 시크바 */}
            <View
              style={s.seekHit}
              {...pan.panHandlers}
              onLayout={(e) => { barWidth.current = e.nativeEvent.layout.width; }}
            >
              <View style={s.seekTrackWrap}>
                <View style={s.seekTrack}>
                  <View style={[s.seekFill, { width: `${pct}%` }]} />
                </View>
                <View pointerEvents="none" style={[s.seekThumb, { left: `${pct}%` }]} />
              </View>
            </View>

            {/* 시간 */}
            <View style={s.timeRow}>
              <Text style={s.timeText}>{fmt(pos)}</Text>
              <Text style={s.timeText}>{fmt(dur)}</Text>
            </View>

            {/* 컨트롤: 반복 / 10초뒤 / 재생 / 10초앞 */}
            <View style={s.controlRow}>
              <Pressable onPress={cycleRepeat} style={s.repeatBtn} hitSlop={8}>
                <Text style={[s.repeatText, repeatMode !== "off" && s.repeatTextOn]}>
                  {repeatMode === "one" ? "↻1" : "↻"}
                </Text>
              </Pressable>
              <Pressable onPress={() => skip(-10)} style={s.skipBtn} hitSlop={8}>
                <Text style={s.skipText}>«10</Text>
              </Pressable>
              <Pressable onPress={togglePause} style={s.playBtn}>
                <Text style={s.playBtnText}>{paused ? "▶" : "Ⅱ"}</Text>
              </Pressable>
              <Pressable onPress={() => skip(10)} style={s.skipBtn} hitSlop={8}>
                <Text style={s.skipText}>10»</Text>
              </Pressable>
              <View style={s.repeatBtn} />
            </View>
            {repeatMode !== "off" && (
              <Text style={s.repeatLabel}>
                {repeatMode === "one" ? "한 곡 반복" : "목록 자동 재생"}
              </Text>
            )}
          </View>
        )}

        <Pressable onPress={close} style={s.closeBtn}><Text style={s.closeText}>닫기</Text></Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  list: { paddingBottom: 40, gap: 12 },
  center: { paddingVertical: 40, alignItems: "center" },
  empty: { color: "#1a3a50", fontSize: 12, fontStyle: "italic" },

  bigBtn: { paddingVertical: 13, borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 8, backgroundColor: "rgba(7,24,38,0.4)", alignItems: "center" },
  bigBtnText: { color: "#7eb8d4", fontSize: 13, letterSpacing: 1 },

  monthHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#0d2233" },
  monthLabel: { color: "#4a7a94", fontSize: 12, letterSpacing: 1, fontFamily: "monospace" },
  monthCount: { color: "#2a5a74", fontSize: 11, fontFamily: "monospace" },
  monthBody: { gap: 18, paddingTop: 14 },

  dateBlock: { gap: 10 },
  dateHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#4a9abb" },
  dateLabel: { color: "#7eb8d4", fontSize: 12, fontFamily: "monospace", letterSpacing: 1 },
  dateLine: { flex: 1, height: 1, backgroundColor: "#0d2233" },
  dateNum: { color: "#2a5a74", fontSize: 10, fontFamily: "monospace" },
  dateLogs: { gap: 12 },

  logCard: { backgroundColor: "rgba(7,24,38,0.45)", borderWidth: 1, borderColor: "rgba(26,74,100,0.35)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  logCardPressed: { backgroundColor: "rgba(10,34,51,0.7)", borderColor: "rgba(74,154,187,0.6)" },
  logHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  logRoute: { color: "#a8d4e8", fontSize: 14, fontWeight: "500", flex: 1 },
  logChevron: { color: "#2a5a74", fontSize: 16, marginLeft: "auto" },
  thumbRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  thumb: { width: 40, height: 40, borderRadius: 5, borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", backgroundColor: "#040d16" },
  logNote: { color: "#5a8aa4", fontSize: 13, lineHeight: 20 },
  logNoteEmpty: { color: "#1a3a50", fontSize: 12, fontStyle: "italic" },

  detailOverlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.9)", alignItems: "center", justifyContent: "center", padding: 20 },
  detailCard: { width: "100%", maxHeight: "85%", backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 14, padding: 22 },
  detailHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  detailDate: { color: "#2a5a74", fontSize: 10, letterSpacing: 2, fontFamily: "monospace" },
  detailRoute: { color: "#a8d4e8", fontSize: 18, fontWeight: "500", marginTop: 4 },
  detailClose: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "#1a3a50", alignItems: "center", justifyContent: "center" },
  detailCloseX: { color: "#3a6880", fontSize: 14 },

  autoBox: { borderLeftWidth: 2, borderLeftColor: "rgba(26,74,100,0.5)", paddingLeft: 12 },
  sectionLabel: { color: "#2a5a74", fontSize: 9, letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 6 },
  autoText: { color: "#5a8aa4", fontSize: 13, lineHeight: 22 },

  eventRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  eventThumb: { width: 56, height: 56, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)" },
  eventThumbImg: { width: "100%", height: "100%" },

  eventFull: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  eventCard: { width: "100%", maxWidth: 420, backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 14, overflow: "hidden" },
  eventBig: { width: "100%", aspectRatio: 16 / 9 },
  eventName: { color: "#a8d4e8", fontSize: 16, fontWeight: "500" },
  eventText: { color: "#7eb8d4", fontSize: 13, lineHeight: 22 },

  noteSection: { borderTopWidth: 1, borderTopColor: "#0d2233", paddingTop: 16, marginTop: 16 },
  noteSectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editHint: { color: "#3a6880", fontSize: 10, fontFamily: "monospace" },
  noteEditIcon: { position: "absolute", right: 4, top: 6, color: "#2a5a74", fontSize: 13 },
  noteInput: { backgroundColor: "#040d16", borderWidth: 1, borderColor: "#1a3a50", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#cce8f5", fontSize: 14, minHeight: 90, textAlignVertical: "top" },
  noteBtnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteCount: { color: "#1a3a50", fontSize: 10, fontFamily: "monospace" },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  cancelText: { color: "#3a6880", fontSize: 11, letterSpacing: 1 },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(74,154,187,0.5)", borderRadius: 8 },
  saveText: { color: "#4a9abb", fontSize: 11, letterSpacing: 1 },
  noteView: { marginTop: 8, paddingVertical: 4 },
  noteText: { color: "#7eb8d4", fontSize: 14, lineHeight: 22 },
  notePlaceholder: { color: "#1a3a50", fontSize: 12, fontStyle: "italic" },

  overlay: { flex: 1, backgroundColor: "#020610", paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20, alignItems: "center" },
  overlayTitle: { color: "#7eb8d4", fontSize: 13, letterSpacing: 4, fontFamily: "monospace", marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", paddingBottom: 20 },
  gridCell: { aspectRatio: 3 / 2, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)" },
  gridImg: { width: "100%", height: "100%" },
  gridLabelWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 8, backgroundColor: "rgba(2,6,14,0.7)" },
  gridLabel: { color: "#cce8f5", fontSize: 15, textAlign: "center", letterSpacing: 3 },

  fullWrap: { flex: 1, backgroundColor: "#000" },
  fullImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  fullTextWrap: { flex: 1, justifyContent: "flex-end", alignItems: "center", padding: 40, paddingBottom: 80 },
  fullName: { color: "#cce8f5", fontSize: 32, letterSpacing: 6, marginBottom: 16, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 12 },
  fullDesc: { color: "#cce8f5", fontSize: 15, lineHeight: 26, textAlign: "center", maxWidth: 600, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 8 },
  fullHint: { color: "#4a7a94", fontSize: 10, letterSpacing: 4, marginTop: 14 },

  musicRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", backgroundColor: "rgba(7,24,38,0.5)" },
  musicRowOn: { borderColor: "rgba(74,154,187,0.7)", backgroundColor: "rgba(10,34,51,0.8)" },
  musicThumb: { width: 52, height: 52, borderRadius: 6, borderWidth: 1, borderColor: "#0d2233", backgroundColor: "#040d16" },
  musicName: { color: "#cce8f5", fontSize: 15, letterSpacing: 2 },
  musicSub: { color: "#3a6880", fontSize: 10, fontFamily: "monospace", marginTop: 2 },
  musicIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "rgba(26,74,100,0.6)", alignItems: "center", justifyContent: "center" },
  musicIconOn: { borderColor: "rgba(126,184,212,0.7)" },
  musicIconText: { color: "rgba(126,184,212,0.7)", fontSize: 13 },
  musicIconTextOn: { color: "#cce8f5", fontSize: 13 },

  closeBtn: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(26,74,100,0.6)", borderRadius: 8 },
  closeText: { color: "#7eb8d4", fontSize: 12, letterSpacing: 2 },

  playerBar: { width: "100%", marginTop: 14, backgroundColor: "#091622", borderWidth: 1, borderColor: "rgba(74,154,187,0.35)", borderRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 12 },
  playerTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  playerThumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#040d16" },
  playerName: { color: "#e0f0fb", fontSize: 17, fontWeight: "600", letterSpacing: 0.5 },
  playerNowLabel: { color: "#3a6880", fontSize: 9, letterSpacing: 3, fontFamily: "monospace", marginTop: 4 },
  rateBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "rgba(74,154,187,0.4)", backgroundColor: "rgba(10,34,51,0.5)" },
  rateText: { color: "#7eb8d4", fontSize: 13, fontFamily: "monospace", fontWeight: "600" },

  seekHit: { width: "100%", height: 28, justifyContent: "center", marginTop: 2 },
  seekTrackWrap: { width: "100%", justifyContent: "center" },
  seekTrack: { height: 4, borderRadius: 2, backgroundColor: "#10283a", overflow: "hidden" },
  seekFill: { height: "100%", borderRadius: 2, backgroundColor: "#5ab0d8" },
  seekThumb: { position: "absolute", top: "50%", width: 15, height: 15, borderRadius: 8, marginTop: -7.5, marginLeft: -7.5, backgroundColor: "#cce8f5", borderWidth: 2, borderColor: "#091622" },

  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  timeText: { color: "#4a7a94", fontSize: 11, fontFamily: "monospace" },

  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, marginTop: 2 },
  repeatBtn: { width: 44, height: 40, alignItems: "center", justifyContent: "center" },
  repeatText: { color: "#3a6880", fontSize: 18, fontWeight: "600" },
  repeatTextOn: { color: "#5ab0d8" },
  repeatLabel: { color: "#5ab0d8", fontSize: 10, textAlign: "center", letterSpacing: 1, marginTop: -2 },
  skipBtn: { width: 48, height: 40, alignItems: "center", justifyContent: "center" },
  skipText: { color: "#7eb8d4", fontSize: 14, fontFamily: "monospace", letterSpacing: 0.5 },
  playBtn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "#5ab0d8" },
  playBtnText: { color: "#04111c", fontSize: 20, fontWeight: "700" },
});