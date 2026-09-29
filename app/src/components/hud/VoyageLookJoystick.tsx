import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, PanResponder, StyleSheet, View, type GestureResponderEvent } from "react-native";
import type { VoyageNavigationCommand } from "../../services/voyageNavigation";

const RADIUS = 46;
const KNOB = 26;

export default function VoyageLookJoystick({ send, enabled }: {
  send: (command: VoyageNavigationCommand) => void;
  enabled: boolean;
}) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const knob = useRef(new Animated.ValueXY()).current;
  const input = useRef({ x: 0, y: 0 });
  const heartbeat = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const dragging = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const sendRef = useRef(send);
  sendRef.current = send;

  const stop = useCallback(() => {
    dragging.current = false;
    if (heartbeat.current !== undefined) clearInterval(heartbeat.current);
    heartbeat.current = undefined;
    input.current = { x: 0, y: 0 };
    knob.setValue({ x: 0, y: 0 });
    setOrigin(null);
    sendRef.current({ type: "voyage-control", action: "look", x: 0, y: 0 });
  }, [knob]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") stop(); });
    return () => { subscription.remove(); stop(); };
  }, [stop]);
  useEffect(() => { if (!enabled) stop(); }, [enabled, stop]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (event) => enabledRef.current && event.nativeEvent.touches.length === 1,
    onStartShouldSetPanResponderCapture: (event) => enabledRef.current && event.nativeEvent.touches.length === 1,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      stop();
      if (!enabledRef.current || event.nativeEvent.touches.length !== 1) return;
      dragging.current = true;
      setOrigin({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
      heartbeat.current = setInterval(() => sendRef.current({ type: "voyage-control", action: "look", ...input.current }), 80);
    },
    onPanResponderStart: event => { if (event.nativeEvent.touches.length !== 1) stop(); },
    onPanResponderMove: (event, gesture) => {
      if (!dragging.current) return;
      if (!enabledRef.current || event.nativeEvent.touches.length !== 1) { stop(); return; }
      const distance = Math.hypot(gesture.dx, gesture.dy);
      const scale = distance > RADIUS ? RADIUS / distance : 1;
      const x = gesture.dx * scale;
      const y = gesture.dy * scale;
      input.current = distance < 4 ? { x: 0, y: 0 } : { x: x / RADIUS, y: y / RADIUS };
      knob.setValue({ x, y });
      sendRef.current({ type: "voyage-control", action: "look", ...input.current });
    },
    onPanResponderRelease: stop,
    onPanResponderTerminate: stop,
    onPanResponderReject: stop,
    onPanResponderTerminationRequest: () => true,
  }), [knob, stop]);

  return (
    <View {...pan.panHandlers} pointerEvents={enabled ? "auto" : "none"} style={StyleSheet.absoluteFill}>
      {origin && <View pointerEvents="none" style={[s.base, { left: origin.x - RADIUS, top: origin.y - RADIUS }]}>
        <Animated.View style={[s.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
      </View>}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    position: "absolute", width: RADIUS * 2, height: RADIUS * 2, borderRadius: RADIUS,
    backgroundColor: "rgba(180, 220, 235, 0.10)", borderWidth: 1,
    borderColor: "rgba(205, 240, 250, 0.28)", alignItems: "center", justifyContent: "center",
  },
  knob: {
    width: KNOB * 2, height: KNOB * 2, borderRadius: KNOB,
    backgroundColor: "rgba(210, 240, 248, 0.28)", borderWidth: 1,
    borderColor: "rgba(230, 250, 255, 0.42)",
  },
});
