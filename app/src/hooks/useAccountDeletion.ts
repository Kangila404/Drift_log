import { useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteAccount, getUserProfile, type DeleteAccountRequest } from "../api/voyage";
import { nativeBgm } from "../api/nativeBgm";
import { nativeNoise } from "../api/nativeNoise";
import { stopStudyNotification } from "../services/studyNotification";

const ACCOUNT_KEYS = [
  "accessToken", "refreshToken", "studyStartAt", "studyGoalMin", "studySubject", "studyEndAt",
];

export function useAccountDeletion() {
  const router = useRouter();
  const busy = useRef(false);
  const [deleting, setDeleting] = useState(false);

  const performDeletion = async () => {
    if (busy.current) return;
    busy.current = true;
    setDeleting(true);
    try {
      const profile = await getUserProfile();
      let credentials: DeleteAccountRequest | undefined;
      if (profile.authType === "APPLE") {
        if (Platform.OS !== "ios" || !await AppleAuthentication.isAvailableAsync()) {
          throw new Error("APPLE_UNAVAILABLE");
        }
        const apple = await AppleAuthentication.signInAsync({ requestedScopes: [] });
        if (!apple.identityToken || !apple.authorizationCode) throw new Error("APPLE_CREDENTIALS_MISSING");
        credentials = { appleIdentityToken: apple.identityToken, appleAuthorizationCode: apple.authorizationCode };
      }
      await deleteAccount(credentials);
    } catch (error: unknown) {
      busy.current = false;
      setDeleting(false);
      const failure = error as { code?: string; response?: { status?: number; data?: { message?: string } } };
      if (failure.code === "ERR_REQUEST_CANCELED") return;
      if (failure.response?.status === 400 || failure.response?.status === 503) {
        Alert.alert("계정을 삭제하지 못했습니다", failure.response.data?.message ?? "잠시 후 다시 시도해 주세요.");
        return;
      }
      // A network timeout can occur after the server committed the deletion.
      Alert.alert("삭제 완료를 확인하지 못했습니다", "네트워크 연결을 확인하고 다시 시도해 주세요. 이미 삭제가 완료된 경우에는 다시 로그인할 수 없습니다.");
      return;
    }

    // The account is already deleted. Local cleanup failure is NOT API failure.
    const cleanup = await Promise.allSettled([
      Promise.resolve().then(() => AsyncStorage.multiRemove(ACCOUNT_KEYS)),
      Promise.resolve().then(() => stopStudyNotification()),
      Promise.resolve().then(() => nativeBgm.stop()),
      Promise.resolve().then(() => nativeNoise.stopAll()),
    ]);
    const incomplete = cleanup.some(result => result.status === "rejected");
    if (router.canDismiss()) router.dismissAll();
    router.replace("/login");
    Alert.alert("계정 삭제 완료", incomplete
      ? "계정과 서버의 기록이 영구 삭제되었습니다. 기기 정리를 마치려면 앱을 종료한 뒤 다시 열어 주세요."
      : "계정과 공부·항해 기록이 영구 삭제되었습니다.");
  };

  const removeAccount = () => {
    if (busy.current) return;
    Alert.alert("계정을 삭제할까요?", "계정 정보, 공부·항해 기록 및 작성한 문의가 영구 삭제됩니다.", [
      { text: "취소", style: "cancel" },
      { text: "계속", style: "destructive", onPress: () => {
        if (busy.current) return;
        Alert.alert("정말 삭제할까요?", "삭제 후에는 계정과 기록을 복구할 수 없습니다. Apple 가입 계정은 이어서 같은 Apple 계정으로 본인 확인을 진행합니다.", [
          { text: "취소", style: "cancel" },
          { text: "계정 삭제", style: "destructive", onPress: performDeletion },
        ]);
      } },
    ]);
  };

  return { deleting, removeAccount };
}
