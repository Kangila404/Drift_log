import { apiClient } from "./client";
import { assetUrl } from "./config";

// ─── 항해록 ───
export type VoyageEvent = { name: string; text: string; imageUrl?: string };
export type VoyageLog = {
  id: number;
  ts: number;
  date: string;
  from: string;
  to: string;
  note: string;
  autoText: string;
  events: VoyageEvent[];
};

export async function getVoyageLogs(): Promise<VoyageLog[]> {
  const res = await apiClient.get("/voyage-log");
  const mapped: VoyageLog[] = (res.data ?? []).map((l: any) => {
    const d = new Date(l.createdAt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return {
      id: l.logId,
      ts: d.getTime(),
      date: `${y}.${m}.${day}.`,
      from: l.fromCity,
      to: l.toCity,
      note: l.userText ?? "",
      autoText: l.autoText ?? "",
      events: (l.events ?? [])
        .filter((e: any) => e.imageUrl)
        .map((e: any) => ({ name: e.name, text: e.text, imageUrl: assetUrl(e.imageUrl) })),
    };
  });
  return mapped.sort((a, b) => b.ts - a.ts);
}

export async function saveVoyageNote(id: number, userText: string): Promise<void> {
  await apiClient.post(`/voyage-log/${id}`, { userText });
}

// ─── 프로필 ───
export type UserProfile = {
  name: string;
  email: string;
  joined: string;
  totalVoyages: number;
  visitedCities: number;
  visitedCityIds: number[];
  currentCityId: number | null;
  userRole: string;
  authType: string;
};

export async function getUserProfile(): Promise<UserProfile> {
  const res = await apiClient.get("/users/me");
  const d = res.data ?? {};
  return {
    name: d.name ?? "",
    email: d.email ?? "",
    joined: d.createdAt ? new Date(d.createdAt).toLocaleDateString("ko-KR") : "",
    totalVoyages: d.totalVoyages ?? 0,
    visitedCities: d.visitedCities ?? 0,
    visitedCityIds: d.visitedCityIds ?? [],
    currentCityId: d.currentCityId ?? null,
    userRole: d.userRole ?? "USER",
    authType: (d.authType ?? "LOCAL").toUpperCase(),
  };
}

export async function updateNickname(name: string): Promise<void> {
  await apiClient.patch("/users/me", { name });
}

export async function updatePassword(body: {
  currentPassword: string; newPassword: string; newPasswordConfirm: string;
}): Promise<void> {
  await apiClient.patch("/users/me/password", body);
}

// ─── 흔적 ───
export type Trace = {
  familyMember: string;
  familyLabel: string;
  traceName: string;
  cityName: string;
  content: string;
  imageUrl?: string;
  date: string;
};

const FAMILY_LABELS: Record<string, string> = {
  MOM: "엄마", DAD: "아빠", SON: "아들", DAUGHTER: "딸",
  BROTHER: "형제", SISTER: "자매", SIBLING: "동생",
  GRANDFATHER: "할아버지", GRANDMOTHER: "할머니",
};

export const TOTAL_TRACES = 5;

export async function getTraces(): Promise<Trace[]> {
  const res = await apiClient.get("/trace");
  const mapped: Trace[] = (res.data ?? []).map((t: any) => {
    const d = t.discoveredTime ? new Date(t.discoveredTime) : null;
    const date = d
      ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.`
      : "";
    return {
      familyMember: t.familyMember,
      familyLabel: FAMILY_LABELS[t.familyMember] ?? t.familyMember,
      traceName: t.traceName ?? "",
      cityName: t.cityName ?? "",
      content: t.content ?? "",
      imageUrl: assetUrl(t.imageUrl),
      date,
    };
  });
  return mapped.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ─── 지도 ───
export type VoyageMap = {
  voyageState: "ANCHORED" | "SAILING" | "PAUSED";
  maps: { cityId: number; cityName: string }[];
  currentCity: { cityId: number; cityName: string } | null;
  departedCity: { cityId: number; cityName: string } | null;
  destinationCity: { cityId: number; cityName: string } | null;
  progress: number | null;
  remainingSeconds: number | null;
};

export async function getVoyageMap(): Promise<VoyageMap> {
  const res = await apiClient.get("/map");
  const d = res.data ?? {};
  return {
    voyageState: d.voyageState ?? "ANCHORED",
    maps: d.maps ?? [],
    currentCity: d.currentCity ?? null,
    departedCity: d.departedCity ?? null,
    destinationCity: d.destinationCity ?? null,
    progress: d.progress ?? null,
    remainingSeconds: d.remainingSeconds ?? null,
  };
}