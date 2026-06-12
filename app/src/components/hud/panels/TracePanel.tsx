import { useEffect, useState } from "react";
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, Modal, StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import Svg, { Path, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { getTraces, TOTAL_TRACES, type Trace } from "../../../api/voyage";
import OpeningSequence from "../../sequence/OpeningSequence";
import EndingSequence from "../../sequence/EndingSequence";

const BLUR = "L03[?bof00ay~qj[ayj@00fQ_3fk";

function LockGlyph({ color = "#5a8aa4" }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={1.5} stroke={color} strokeWidth={1.6} />
      <Path d="M8 11 V8 a4 4 0 0 1 8 0 v3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

const FAMILY_COLOR: Record<string, string> = {
  엄마: "#d48aa8", 아빠: "#7eb8d4", 아들: "#8ad4b8", 딸: "#d4c48a",
  형제: "#9a8ad4", 자매: "#d49a8a", 형제자매: "#9a8ad4",
  할아버지: "#8ab0d4", 할머니: "#c48ad4",
};
const colorOf = (label: string) => FAMILY_COLOR[label] ?? "#7eb8d4";

export default function TracePanel() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Trace | null>(null);
  const [replay, setReplay] = useState<null | "opening" | "ending">(null);

  useEffect(() => {
    getTraces().then(setTraces).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#4a9abb" /></View>;

  const found = traces.length;
  const locked = Math.max(0, TOTAL_TRACES - found);
  const reunited = found >= TOTAL_TRACES;

  const openReplay = (which: "opening" | "ending") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setReplay(which);
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      {/* 진행도 */}
      <View style={s.progressHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.progressTitle}>가족의 흔적</Text>
          <Text style={s.progressSub}>{found}개의 흔적을 발견했습니다</Text>
        </View>
        <View style={s.progressBadge}>
          <Text style={s.progressNum}>{found}</Text>
          <Text style={s.progressTotal}>/ {TOTAL_TRACES}</Text>
        </View>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${(found / TOTAL_TRACES) * 100}%` }]} />
      </View>

      {/* 흔적 목록 */}
      <View style={s.section}>
        {traces.map((t, i) => {
          const c = colorOf(t.familyLabel);
          return (
            <Pressable
              key={`found-${i}`}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSelected(t); }}
              style={({ pressed }) => [s.card, { borderLeftColor: c }, pressed && s.cardPressed]}
            >
              <View style={s.cardRow}>
                {t.imageUrl ? (
                  <Image source={t.imageUrl} style={s.thumb} contentFit="cover" cachePolicy="memory-disk" transition={150} placeholder={BLUR} />
                ) : (
                  <View style={[s.thumb, s.thumbEmpty]}><Text style={s.thumbEmptyText}>흔적</Text></View>
                )}
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={s.cardTop}>
                    <View style={[s.familyBadge, { backgroundColor: c + "22", borderColor: c + "55" }]}>
                      <Text style={[s.familyBadgeText, { color: c }]}>{t.familyLabel}</Text>
                    </View>
                    <Text style={s.cardCity}>{t.cityName}</Text>
                    <Text style={s.cardDate}>{t.date}</Text>
                  </View>
                  <Text style={s.cardName} numberOfLines={1}>{t.traceName}</Text>
                  <Text style={s.cardPreview} numberOfLines={2}>{t.content}</Text>
                  <Text style={[s.cardCta, { color: c }]}>흔적 보기 ›</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        {Array.from({ length: locked }).map((_, i) => (
          <View key={`locked-${i}`} style={s.lockCard}>
            <View style={s.lockLeft}>
              <View style={s.lockBadge}><Text style={s.lockBadgeText}>? ? ?</Text></View>
              <Text style={s.lockName}>아직 발견하지 못한 흔적</Text>
            </View>
            <View style={s.lockDot} />
          </View>
        ))}
      </View>

      {/* 다시보기 — 분리된 박스 2개 */}
      <Text style={s.replayLabel}>다시보기</Text>

      <Pressable onPress={() => openReplay("opening")}>
        <View style={s.box}>
          <Text style={s.boxMark}>✦</Text>
          <Text style={s.boxText}>인트로 다시 보기</Text>
        </View>
      </Pressable>

      <View style={{ height: 10 }} />

      <Pressable onPress={() => reunited && openReplay("ending")}>
        <View style={[s.box, !reunited && s.boxLocked]}>
          {reunited ? <Text style={s.boxMark}>✦</Text> : <LockGlyph />}
          <Text style={[s.boxText, !reunited && s.boxTextLocked]}>엔딩 다시 보기</Text>
        </View>
      </Pressable>

      {!reunited && <Text style={s.boxNote}>가족을 모두 찾으면 엔딩이 열립니다</Text>}

      <View style={{ height: 24 }} />

      {/* 풀스크린 시퀀스 */}
      <Modal visible={replay !== null} animationType="fade" onRequestClose={() => setReplay(null)} statusBarTranslucent>
        {replay === "opening" && <OpeningSequence onFinish={() => setReplay(null)} />}
        {replay === "ending" && <EndingSequence onFinish={() => setReplay(null)} />}
      </Modal>

      {/* 흔적 상세 */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={s.detailOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
            <View style={s.detailCard} pointerEvents="box-none">
              <View style={s.detailInner}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {selected.imageUrl && (
                    <Image source={selected.imageUrl} style={s.detailImg} contentFit="cover" cachePolicy="memory-disk" transition={150} placeholder={BLUR} />
                  )}
                  <View style={s.detailBody}>
                    <View style={[s.familyBadge, { alignSelf: "flex-start", backgroundColor: colorOf(selected.familyLabel) + "22", borderColor: colorOf(selected.familyLabel) + "55" }]}>
                      <Text style={[s.familyBadgeText, { color: colorOf(selected.familyLabel) }]}>{selected.familyLabel}의 흔적</Text>
                    </View>
                    <Text style={s.detailName}>{selected.traceName}</Text>
                    <View style={s.detailMeta}>
                      <Text style={s.detailCity}>{selected.cityName}</Text>
                      <Text style={s.detailDate}>{selected.date}</Text>
                    </View>
                    <View style={s.detailDivider} />
                    <Text style={s.detailContent}>{selected.content}</Text>
                  </View>
                </ScrollView>
                <Pressable onPress={() => setSelected(null)} style={s.detailClose}>
                  <Text style={s.detailCloseText}>닫기</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  list: { paddingBottom: 40 },
  center: { paddingVertical: 40, alignItems: "center" },

  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 },
  progressTitle: { color: "#a8d4e8", fontSize: 17, fontWeight: "600", letterSpacing: 1 },
  progressSub: { color: "#2a5a74", fontSize: 11, marginTop: 5 },
  progressBadge: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  progressNum: { color: "#7eb8d4", fontSize: 24, fontWeight: "700" },
  progressTotal: { color: "#2a5a74", fontSize: 14 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: "#0d2233", overflow: "hidden", marginTop: 10 },
  barFill: { height: "100%", borderRadius: 2, backgroundColor: "#4a9abb" },

  section: { gap: 14, marginTop: 22 },
  card: { backgroundColor: "rgba(7,24,38,0.55)", borderWidth: 1, borderColor: "rgba(26,74,100,0.4)", borderLeftWidth: 3, borderRadius: 12, padding: 16 },
  cardPressed: { backgroundColor: "rgba(10,34,51,0.85)" },
  cardRow: { flexDirection: "row", gap: 14 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#040d16", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)" },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  thumbEmptyText: { color: "#2a5a74", fontSize: 10, fontFamily: "monospace" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  familyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 11, borderWidth: 1 },
  familyBadgeText: { fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  cardCity: { color: "#4a7a94", fontSize: 12, fontFamily: "monospace" },
  cardDate: { color: "#2a5a74", fontSize: 10, fontFamily: "monospace", marginLeft: "auto" },
  cardName: { color: "#cce8f5", fontSize: 15, fontWeight: "500" },
  cardPreview: { color: "#5a8aa4", fontSize: 12, lineHeight: 20 },
  cardCta: { fontSize: 11, fontWeight: "600", letterSpacing: 1, marginTop: 2 },

  lockCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(5,14,24,0.4)", borderWidth: 1, borderColor: "#0d2233", borderStyle: "dashed", borderRadius: 12, paddingVertical: 18, paddingHorizontal: 16 },
  lockLeft: { gap: 10 },
  lockBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 11, borderWidth: 1, borderColor: "#1a3a50" },
  lockBadgeText: { color: "#1a3a50", fontSize: 10, letterSpacing: 2 },
  lockName: { color: "#1a3a50", fontSize: 12, fontStyle: "italic" },
  lockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1a3a50" },

  // ── 다시보기 박스 ──
  replayLabel: { color: "#3a6880", fontSize: 11, letterSpacing: 4, fontFamily: "monospace", marginTop: 30, marginBottom: 12, marginLeft: 2 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#4a8aa8",
    backgroundColor: "rgba(12,34,51,0.6)",
  },
  boxLocked: { borderColor: "#2a4a5e", backgroundColor: "rgba(10,24,38,0.4)" },
  boxPressed: { backgroundColor: "rgba(18,46,66,0.9)" },
  boxMark: { color: "#5ab0d8", fontSize: 15 },
  boxText: { color: "#cce8f5", fontSize: 14, fontWeight: "600", letterSpacing: 2 },
  boxTextLocked: { color: "#5a8aa4" },
  boxNote: { color: "#3a6880", fontSize: 11, textAlign: "center", marginTop: 10, fontFamily: "monospace" },

  detailOverlay: { flex: 1, backgroundColor: "rgba(2,6,14,0.82)", alignItems: "center", justifyContent: "center", padding: 20 },
  detailCard: { width: "100%", maxWidth: 440, maxHeight: "85%" },
  detailInner: { backgroundColor: "#050e18", borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", borderRadius: 16, overflow: "hidden" },
  detailImg: { width: "100%", aspectRatio: 16 / 10, backgroundColor: "#040d16" },
  detailBody: { padding: 22, gap: 12 },
  detailName: { color: "#cce8f5", fontSize: 18, fontWeight: "600" },
  detailMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailCity: { color: "#4a7a94", fontSize: 12, fontFamily: "monospace" },
  detailDate: { color: "#2a5a74", fontSize: 12, fontFamily: "monospace" },
  detailDivider: { height: 1, backgroundColor: "#0d2233", marginVertical: 2 },
  detailContent: { color: "rgba(160,200,220,0.82)", fontSize: 14, lineHeight: 26 },
  detailClose: { paddingVertical: 15, alignItems: "center", borderTopWidth: 1, borderTopColor: "#0d2233" },
  detailCloseText: { color: "#7eb8d4", fontSize: 13, letterSpacing: 2 },
});