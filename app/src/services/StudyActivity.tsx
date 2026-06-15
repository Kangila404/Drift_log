import { Image, Text, VStack, HStack, Spacer } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

export type StudyActivityProps = {
  subject: string;      // 과목
  elapsedLabel: string; // 경과 시간 "12:34"
  goalLabel: string;    // 목표 "05:00"
  remainMin: number;    // 목표까지 N분
  progress: number;     // 0~1
};

const TEAL = "#7ec0d2";
const TEXT = "#d4eef5";
const SUB = "#9fb8c4";

const StudyActivity = (props: StudyActivityProps) => {
  "widget";

  const label = props.subject?.trim() ? props.subject.trim() : "집중하는 중";

  return {
    // 잠금화면 / 알림센터 배너
    banner: (
      <VStack modifiers={[padding({ all: 14 })]}>
        <HStack>
          <Image systemName="sailboat.fill" color={TEAL} />
          <Text modifiers={[font({ weight: "semibold", size: 14 }), foregroundStyle(SUB)]}>
            {label}
          </Text>
          <Spacer />
          <Text modifiers={[font({ weight: "bold", size: 16 }), foregroundStyle(TEXT)]}>
            {props.elapsedLabel}
          </Text>
        </HStack>
        <HStack modifiers={[padding({ top: 6 })]}>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(SUB)]}>
            목표 {props.goalLabel}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 12 }), foregroundStyle(TEAL)]}>
            {props.remainMin}분 남음
          </Text>
        </HStack>
      </VStack>
    ),

    // 다이나믹 아일랜드 — 축소형 (좌)
    compactLeading: <Image systemName="sailboat.fill" color={TEAL} />,
    // 다이나믹 아일랜드 — 축소형 (우)
    compactTrailing: (
      <Text modifiers={[font({ weight: "semibold", size: 13 }), foregroundStyle(TEXT)]}>
        {props.elapsedLabel}
      </Text>
    ),
    // 다이나믹 아일랜드 — 최소형
    minimal: <Image systemName="sailboat.fill" color={TEAL} />,

    // 다이나믹 아일랜드 — 확장형 (좌)
    expandedLeading: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Image systemName="sailboat.fill" color={TEAL} />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(SUB)]}>{label}</Text>
      </VStack>
    ),
    // 다이나믹 아일랜드 — 확장형 (우)
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ weight: "bold", size: 20 }), foregroundStyle(TEXT)]}>
          {props.elapsedLabel}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(SUB)]}>
          / {props.goalLabel}
        </Text>
      </VStack>
    ),
    // 다이나믹 아일랜드 — 확장형 (하단)
    expandedBottom: (
      <VStack modifiers={[padding({ horizontal: 12, bottom: 8 })]}>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(TEAL)]}>
          목표까지 {props.remainMin}분
        </Text>
      </VStack>
    ),
  };
};

export default createLiveActivity("StudyActivity", StudyActivity);