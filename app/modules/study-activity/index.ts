import { requireNativeModule } from "expo-modules-core";

const StudyActivity = requireNativeModule("StudyActivity");

export async function startStudyActivity(
  subject: string,
  startEpoch: number,
  goalLabel: string,
  remainMin: number,
  progress: number
): Promise<string> {
  return await StudyActivity.start(subject, startEpoch, goalLabel, remainMin, progress);
}

export async function updateStudyActivity(
  subject: string,
  startEpoch: number,
  goalLabel: string,
  remainMin: number,
  progress: number
): Promise<void> {
  await StudyActivity.update(subject, startEpoch, goalLabel, remainMin, progress);
}

export async function endStudyActivity(): Promise<void> {
  await StudyActivity.end();
}