import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Attributes (공부 세션 Live Activity 데이터 계약)
struct WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var subject: String       // 과목/집중 라벨
        var elapsedLabel: String  // 경과 "12:34"
        var goalLabel: String     // 목표 "05:00"
        var remainMin: Int        // 목표까지 N분
        var progress: Double      // 0.0 ~ 1.0
    }
    var name: String
}

// MARK: - 달빛 청록 팔레트
private enum Palette {
    static let teal      = Color(red: 0.494, green: 0.753, blue: 0.824) // #7ec0d2
    static let tealBright = Color(red: 0.624, green: 0.863, blue: 0.910) // #9fdce8
    static let text      = Color(red: 0.831, green: 0.933, blue: 0.961) // #d4eef5
    static let sub       = Color(red: 0.624, green: 0.722, blue: 0.769) // #9fb8c4
    static let bgTop     = Color(red: 0.039, green: 0.078, blue: 0.125) // #0a1420
    static let bgBottom  = Color(red: 0.051, green: 0.133, blue: 0.200) // #0d2233
}

// MARK: - 잠금화면 / 배너 뷰
struct StudyLockScreenView: View {
    let state: WidgetAttributes.ContentState

    private var label: String {
        let trimmed = state.subject.trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty ? "집중하는 중" : trimmed
    }

    var body: some View {
        VStack(spacing: 12) {
            // 상단: 아이콘 + 라벨 + 경과시간
            HStack(spacing: 10) {
                Image(systemName: "sailboat.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.teal)

                Text(label)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Palette.sub)
                    .lineLimit(1)

                Spacer()

                Text(state.elapsedLabel)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.text)
            }

            // 진행 바
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.08))
                        .frame(height: 5)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [Palette.teal, Palette.tealBright],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: max(6, geo.size.width * state.progress), height: 5)
                }
            }
            .frame(height: 5)

            // 하단: 목표 / 남은 시간
            HStack {
                Text("목표 \(state.goalLabel)")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.sub)
                Spacer()
                Text("\(state.remainMin)분 남음")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.teal)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [Palette.bgTop, Palette.bgBottom],
                startPoint: .top, endPoint: .bottom
            )
        )
    }
}

// MARK: - Widget
struct WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WidgetAttributes.self) { context in
            StudyLockScreenView(state: context.state)
                .activitySystemActionForegroundColor(Palette.teal)
        } dynamicIsland: { context in
            DynamicIsland {
                // 확장형 — 좌측: 아이콘 + 라벨
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Image(systemName: "sailboat.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Palette.teal)
                        Text(context.state.subject.isEmpty ? "집중" : context.state.subject)
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.sub)
                            .lineLimit(1)
                    }
                    .padding(.leading, 4)
                }
                // 확장형 — 우측: 경과 / 목표
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.elapsedLabel)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Palette.text)
                        Text("/ \(context.state.goalLabel)")
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.sub)
                    }
                    .padding(.trailing, 4)
                }
                // 확장형 — 하단: 진행 바 + 남은 시간
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 6) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.white.opacity(0.08))
                                    .frame(height: 5)
                                Capsule()
                                    .fill(
                                        LinearGradient(
                                            colors: [Palette.teal, Palette.tealBright],
                                            startPoint: .leading, endPoint: .trailing
                                        )
                                    )
                                    .frame(width: max(6, geo.size.width * context.state.progress), height: 5)
                            }
                        }
                        .frame(height: 5)

                        Text("목표까지 \(context.state.remainMin)분")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.teal)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 2)
                }
            } compactLeading: {
                Image(systemName: "sailboat.fill")
                    .foregroundStyle(Palette.teal)
            } compactTrailing: {
                Text(context.state.elapsedLabel)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.text)
            } minimal: {
                Image(systemName: "sailboat.fill")
                    .foregroundStyle(Palette.teal)
            }
            .keylineTint(Palette.teal)
        }
    }
}

// MARK: - Preview
extension WidgetAttributes {
    fileprivate static var preview: WidgetAttributes {
        WidgetAttributes(name: "DriftLog")
    }
}

extension WidgetAttributes.ContentState {
    fileprivate static var sample: WidgetAttributes.ContentState {
        WidgetAttributes.ContentState(
            subject: "수학", elapsedLabel: "12:34",
            goalLabel: "50:00", remainMin: 37, progress: 0.25
        )
    }
}

#Preview("Live Activity", as: .content, using: WidgetAttributes.preview) {
    WidgetLiveActivity()
} contentStates: {
    WidgetAttributes.ContentState.sample
}