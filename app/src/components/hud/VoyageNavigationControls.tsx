import { Pressable, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { createVoyageNavigationController } from "../../services/voyageNavigation";

export default function VoyageNavigationControls({ controller, canSteer }: {
  controller: ReturnType<typeof createVoyageNavigationController>;
  canSteer: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.controls, { bottom: insets.bottom + 96, left: insets.left + 20 }]}
      pointerEvents="box-none">
      {([-1, 1] as const).map((direction) => (
        <Pressable
          key={direction}
          accessibilityRole="button"
          accessibilityLabel={direction === -1 ? "왼쪽으로 조종" : "오른쪽으로 조종"}
          accessibilityState={{ disabled: !canSteer }}
          disabled={!canSteer}
          onPressIn={() => controller.hold(direction)}
          onPressOut={() => controller.release(direction)}
          onTouchCancel={() => controller.release(direction)}
          onBlur={() => controller.release(direction)}
          pressRetentionOffset={0}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, !canSteer && styles.disabled]}
        >
          <Feather name={direction === -1 ? "arrow-left" : "arrow-right"} size={22} color="#7eb8d4" />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="카메라 초기화"
        onPress={controller.resetCamera}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Feather name="rotate-ccw" size={20} color="#7eb8d4" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { position: "absolute", width: 46, gap: 8 },
  button: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(7,18,30,0.8)",
    borderWidth: 1, borderColor: "rgba(40,90,120,0.45)",
  },
  pressed: { backgroundColor: "rgba(94,176,216,0.15)", borderColor: "rgba(94,176,216,0.6)" },
  disabled: { opacity: 0.35 },
});
