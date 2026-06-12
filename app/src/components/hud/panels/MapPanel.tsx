import { useEffect, useRef, useState } from "react";
import {
  View, Text, ActivityIndicator, ScrollView, Animated, Easing,
  useWindowDimensions, StyleSheet,
} from "react-native";
import Svg, { Path, Circle, G, Line, Text as SvgText } from "react-native-svg";
import { getVoyageMap, type VoyageMap } from "../../../api/voyage";
import { KOREA_PATH, JEJU_PATH, CITY_COORDS } from "../../../api/config";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function SeaGrid() {
  const lines = [];
  for (let i = 0; i <= 100; i += 5) {
    lines.push(<Line key={`v${i}`} x1={i} y1={0} x2={i} y2={100} stroke="#0a1f2e" strokeWidth={0.25} />);
    lines.push(<Line key={`h${i}`} x1={0} y1={i} x2={100} y2={i} stroke="#0a1f2e" strokeWidth={0.25} />);
  }
  return <G opacity={0.6}>{lines}</G>;
}

// 탭한 자리에 파동 링이 연속으로 퍼짐
function TapRipple({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    a1.setValue(0);
    a2.setValue(0);
    const mk = (v: Animated.Value, delay: number) =>
      Animated.timing(v, { toValue: 1, duration: 900, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });

    Animated.parallel([mk(a1, 0), mk(a2, 300)]).start(() => onDone());
  }, [x, y]);

  const ring = (a: Animated.Value) => ({
    r: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 13] }),
    opacity: a.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.85, 0] }),
  });
  const r1 = ring(a1);
  const r2 = ring(a2);

  return (
    <>
      <AnimatedCircle cx={x} cy={y} r={r1.r} fill="none" stroke="#9ee6ff" strokeWidth={0.6} opacity={r1.opacity} />
      <AnimatedCircle cx={x} cy={y} r={r2.r} fill="none" stroke="#7eb8d4" strokeWidth={0.5} opacity={r2.opacity} />
    </>
  );
}

// 펄스 — 현재 위치/정박지용
function Pulse({ x, y }: { x: number; y: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const r = anim.interpolate({ inputRange: [0, 1], outputRange: [1.4, 5] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  return (
    <>
      <AnimatedCircle cx={x} cy={y} r={r} fill="none" stroke="#7eb8d4" strokeWidth={0.4} opacity={opacity} />
      <Circle cx={x} cy={y} r={2.4} fill="none" stroke="#a8d4e8" strokeWidth={0.3} opacity={0.5} />
      <Circle cx={x} cy={y} r={1.4} fill="#7eb8d4" stroke="#a8d4e8" strokeWidth={0.4} />
    </>
  );
}

export default function MapPanel() {
  const { width: SCREEN_W } = useWindowDimensions();
  const [data, setData] = useState<VoyageMap | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVoyageMap().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <View style={s.center}><ActivityIndicator color="#4a9abb" /></View>;
  }

  const mapSize = Math.min(SCREEN_W - 40, 360);
  const visitedNames = data.maps.map((m) => m.cityName);

  const sailing = data.voyageState === "SAILING" || data.voyageState === "PAUSED";
  const anchoredId = !sailing ? data.currentCity?.cityId ?? null : null;

  const fromC = sailing && data.departedCity ? CITY_COORDS[data.departedCity.cityId] : null;
  const toC = sailing && data.destinationCity ? CITY_COORDS[data.destinationCity.cityId] : null;
  const prog = Math.max(0, Math.min(1, data.progress ?? 0));
  const sailPos =
    fromC && toC ? { x: fromC.x + (toC.x - fromC.x) * prog, y: fromC.y + (toC.y - fromC.y) * prog } : null;

  // 탭 좌표(px) → viewBox(0~100) → G transform 역변환
  const handleTap = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    const box = mapSize - 24; // padding 12*2
    // px → viewBox 0~100
    const vbX = (locationX / box) * 100;
    const vbY = (locationY / (mapSize * 1.15 - 24)) * 100;
    // G transform: translate(10 2) scale(0.78) → 역변환
    const gx = (vbX - 10) / 0.78;
    const gy = (vbY - 2) / 0.78;
    setRipple({ x: gx, y: gy, key: Date.now() });
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      <View
        style={[s.mapBox, { height: mapSize * 1.15 }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTap}
      >
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          <Path d="M0 0 H100 V100 H0 Z" fill="#040d16" />
          <SeaGrid />

          <G transform="translate(10 2) scale(0.78)">
            <Path d={KOREA_PATH} fill="#071826" stroke="#1a3a50" strokeWidth={0.65} />
            <Path d={KOREA_PATH} fill="none" stroke="#4a9abb" strokeWidth={0.22} opacity={0.5} />
            <Path d={JEJU_PATH} fill="#071826" stroke="#1a3a50" strokeWidth={0.45} />
            <Path d={JEJU_PATH} fill="none" stroke="#4a9abb" strokeWidth={0.18} opacity={0.45} />

            {/* 도시 점 */}
            {Object.entries(CITY_COORDS).map(([idStr, city]) => {
              const id = Number(idStr);
              if (id === anchoredId) return null;
              return (
                <G key={id}>
                  <Circle cx={city.x} cy={city.y} r={1.0} fill="#2a5a74" stroke="#3a6880" strokeWidth={0.35} />
                  <SvgText x={city.x + 2} y={city.y + 0.8} fontSize={2.4} fill="#4a7a94" fontFamily="monospace">
                    {city.name}
                  </SvgText>
                </G>
              );
            })}

            {/* 정박지 펄스 + 이름 */}
            {anchoredId !== null && CITY_COORDS[anchoredId] && (
              <>
                <Pulse x={CITY_COORDS[anchoredId].x} y={CITY_COORDS[anchoredId].y} />
                <SvgText
                  x={CITY_COORDS[anchoredId].x + 2.6} y={CITY_COORDS[anchoredId].y + 0.8}
                  fontSize={2.8} fill="#cce8f5" fontFamily="monospace" fontWeight="bold"
                >
                  {CITY_COORDS[anchoredId].name}
                </SvgText>
              </>
            )}

            {/* 항해 중 경로 + 진행 펄스 */}
            {sailing && fromC && toC && sailPos && (
              <>
                <Line x1={fromC.x} y1={fromC.y} x2={toC.x} y2={toC.y} stroke="#4a9abb" strokeWidth={0.4} strokeDasharray="1.2 1.2" opacity={0.5} />
                <Line x1={fromC.x} y1={fromC.y} x2={sailPos.x} y2={sailPos.y} stroke="#7eb8d4" strokeWidth={0.5} opacity={0.8} />
                <Circle cx={toC.x} cy={toC.y} r={1.6} fill="none" stroke="#5ab0d8" strokeWidth={0.4} opacity={0.7} />
                <Pulse x={sailPos.x} y={sailPos.y} />
              </>
            )}

            {/* 탭 리플 — 누른 자리에 크게 퍼짐 */}
            {ripple && (
              <TapRipple key={ripple.key} x={ripple.x} y={ripple.y} onDone={() => setRipple(null)} />
            )}
          </G>
        </Svg>
      </View>

      {/* 상태 안내 */}
      {sailing && data.departedCity && data.destinationCity ? (
        <Text style={s.statusNote}>
          {data.departedCity.cityName} → {data.destinationCity.cityName} · {Math.round(prog * 100)}%
          {data.voyageState === "PAUSED" ? " 정지" : " 항해 중"}
        </Text>
      ) : data.currentCity ? (
        <Text style={s.statusNote}>{data.currentCity.cityName}에 정박 중</Text>
      ) : null}

      {/* 범례 */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#7eb8d4" }]} />
          <Text style={s.legendText}>현재 위치</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#2a5a74" }]} />
          <Text style={s.legendText}>도시</Text>
        </View>
      </View>

      <Text style={s.count}>다녀온 도시 {visitedNames.length}곳</Text>

      <View style={s.chips}>
        {visitedNames.map((name) => (
          <View key={name} style={s.chip}>
            <Text style={s.chipText}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  list: { paddingBottom: 40, alignItems: "center", gap: 14 },
  center: { paddingVertical: 40, alignItems: "center", justifyContent: "center" },

  mapBox: {
    width: "100%", backgroundColor: "#040d16",
    borderWidth: 1, borderColor: "rgba(26,74,100,0.5)",
    borderRadius: 12, padding: 12, marginTop: 4,
  },

  statusNote: { color: "#5ab0d8", fontSize: 12, fontFamily: "monospace", letterSpacing: 0.5, textAlign: "center" },

  legend: { flexDirection: "row", gap: 16, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: "#1a3a50" },
  legendText: { color: "#2a5a74", fontSize: 10, fontFamily: "monospace" },

  count: { color: "#2a5a74", fontSize: 12, fontFamily: "monospace" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(26,74,100,0.5)", backgroundColor: "rgba(7,24,38,0.6)",
  },
  chipText: { color: "#7eb8d4", fontSize: 11, fontFamily: "monospace", letterSpacing: 1 },
});