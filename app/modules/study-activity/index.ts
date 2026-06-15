import { requireNativeModule } from "expo-modules-core";

const StudyActivity = requireNativeModule("StudyActivity");

export async function startStudyActivity(
  subject: string,
  elapsedLabel: string,
  goalLabel: string,
  remainMin: number,
  progress: number
): Promise<string> {
  return await StudyActivity.start(subject, elapsedLabel, goalLabel, remainMin, progress);
}

export async function updateStudyActivity(
  subject: string,
  elapsedLabel: string,
  goalLabel: string,
  remainMin: number,
  progress: number
): Promise<void> {
  await StudyActivity.update(subject, elapsedLabel, goalLabel, remainMin, progress);
}

export async function endStudyActivity(): Promise<void> {
  await StudyActivity.end();
}