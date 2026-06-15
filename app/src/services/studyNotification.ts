import { Platform } from "react-native";
import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native";
import * as Notifications from "expo-notifications";
import {
  startStudyActivity,
  updateStudyActivity,
  endStudyActivity,
} from "../../modules/study-activity";

const CHANNEL_ID = "study-session-v2";
const NOTIF_ID = "study-timer";
const ACCENT = "#7ec0d2";

let registered = false;
let iosActive = false;

function ensureForegroundService() {
  if (registered) return;
  registered = true;
  notifee.registerForegroundService(() => {
    return new Promise(() => {});
  });
}

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "공부 세션",
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PUBLIC,
    vibration: false,
    lights: false,
  });
}

const fmt = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

type StudyNotifInput = {
  subject: string;
  elapsedSec: number;
  goalMin: number;
};

function buildParts({ subject, elapsedSec, goalMin }: StudyNotifInput) {
  const goalSec = goalMin * 60;
  const remainMin = Math.max(0, Math.ceil((goalSec - elapsedSec) / 60));
  const label = subject?.trim() ? subject.trim() : "집중하는 중";
  const progress = Math.max(0, Math.min(1, elapsedSec / goalSec));
  return {
    label,
    elapsedLabel: fmt(elapsedSec),
    goalLabel: fmt(goalSec),
    remainMin,
    progress,
  };
}

function buildAndroid(input: StudyNotifInput) {
  const { label, elapsedLabel, goalLabel, remainMin, progress } = buildParts(input);
  return {
    title: "DriftLog · 항해 중",
    body: `${label} — ${elapsedLabel} / ${goalLabel}`,
    bigText: `${label}\n${elapsedLabel} / ${goalLabel} · 목표까지 ${remainMin}분`,
    progress: Math.round(progress * 100),
  };
}

export async function requestStudyNotifPermission() {
  if (Platform.OS === "android") {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return;
    await Notifications.requestPermissionsAsync();
  }
  // iOS Live Activity는 별도 권한 팝업 없음 (설정에서 사용자가 끌 수 있음)
}

export async function startStudyNotification(input: StudyNotifInput) {
  if (Platform.OS === "ios") {
    try {
      const { label, elapsedLabel, goalLabel, remainMin, progress } = buildParts(input);
      await startStudyActivity(label, elapsedLabel, goalLabel, remainMin, progress);
      iosActive = true;
    } catch (e) {
      // Live Activity 미지원 기기/버전이면 조용히 무시
    }
    return;
  }

  // Android
  await ensureChannel();
  ensureForegroundService();
  const { title, body, bigText, progress } = buildAndroid(input);
  await notifee.displayNotification({
    id: NOTIF_ID,
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      onlyAlertOnce: true,
      color: ACCENT,
      smallIcon: "notification_icon",
      visibility: AndroidVisibility.PUBLIC,
      style: { type: 1, text: bigText } as any,
      progress: { max: 100, current: progress, indeterminate: false },
      pressAction: { id: "default", launchActivity: "default" },
    },
  });
}

export async function updateStudyNotification(input: StudyNotifInput) {
  if (Platform.OS === "ios") {
    try {
      if (!iosActive) return;
      const { label, elapsedLabel, goalLabel, remainMin, progress } = buildParts(input);
      await updateStudyActivity(label, elapsedLabel, goalLabel, remainMin, progress);
    } catch (e) {}
    return;
  }

  // Android
  const { title, body, bigText, progress } = buildAndroid(input);
  await notifee.displayNotification({
    id: NOTIF_ID,
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      onlyAlertOnce: true,
      color: ACCENT,
      smallIcon: "notification_icon",
      visibility: AndroidVisibility.PUBLIC,
      style: { type: 1, text: bigText } as any,
      progress: { max: 100, current: progress, indeterminate: false },
      pressAction: { id: "default", launchActivity: "default" },
    },
  });
}

export async function stopStudyNotification() {
  if (Platform.OS === "ios") {
    try {
      await endStudyActivity();
    } catch (e) {}
    iosActive = false;
    return;
  }

  // Android
  try {
    await notifee.stopForegroundService();
  } catch {}
  try {
    await notifee.cancelNotification(NOTIF_ID);
  } catch {}
}