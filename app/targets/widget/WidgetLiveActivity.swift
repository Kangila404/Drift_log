import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Attributes
struct WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var subject: String
        var startDate: Date     // 세션 시작 시각 — 위젯이 자동 카운트
        var goalLabel: String
        var remainMin: Int
        var progress: Double
    }
    var name: String
}

// MARK: - 잠금화면 / 배너
struct StudyLockScreenView: View {
    let state: WidgetAttributes.ContentState

    private var label: String {
        let t = state.subject.trimmingCharacters(in: .whitespaces)
        return t.isEmpty ? "집중 세션" : t
    }

    var body: some View {
        HStack(spacing: 16) {
            // 진행 링 + 아이콘
            ZStack {
                Circle()
                    .stroke(Color.primary.opacity(0.10), lineWidth: 5)
                Circle()
                    .trim(from: 0, to: max(0.001, state.progress))
                    .stroke(
                        Color.accentColor,
                        style: StrokeStyle(lineWidth: 5, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                Image(systemName: "book.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Color.accentColor)
            }
            .frame(width: 52, height: 52)

            // 텍스트
            VStack(alignment: .leading, spacing: 3) {
                Text(label)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Text(state.startDate, style: .timer)
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.primary)

                Text("목표 \(state.goalLabel) · \(state.remainMin)분 남음")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .activityBackgroundTint(nil)
    }
}

// MARK: - Widget
struct WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WidgetAttributes.self) { context in
            StudyLockScreenView(state: context.state)
        } dynamicIsland: { context in
            DynamicIsland {
                // 확장 — 좌: 아이콘 + 과목
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(context.state.subject.isEmpty ? "집중" : context.state.subject)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                    } icon: {
                        Image(systemName: "book.fill")
                            .foregroundStyle(Color.accentColor)
                    }
                }
                // 확장 — 우: 남은 시간
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.remainMin)분 남음")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.secondary)
                }
                // 확장 — 하단: 타이머 + 진행바
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        Text(context.state.startDate, style: .timer)
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.primary)
                            .frame(maxWidth: .infinity)

                        ProgressView(value: max(0.001, context.state.progress))
                            .tint(Color.accentColor)
                    }
                    .padding(.top, 2)
                }
            } compactLeading: {
                Image(systemName: "book.fill")
                    .foregroundStyle(Color.accentColor)
            } compactTrailing: {
                Text(context.state.startDate, style: .timer)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                    .frame(width: 44)
            } minimal: {
                Image(systemName: "book.fill")
                    .foregroundStyle(Color.accentColor)
            }
            .keylineTint(Color.accentColor)
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
            subject: "수학",
            startDate: Date().addingTimeInterval(-754),
            goalLabel: "50:00",
            remainMin: 37,
            progress: 0.25
        )
    }
}

#Preview("Live Activity", as: .content, using: WidgetAttributes.preview) {
    WidgetLiveActivity()
} contentStates: {
    WidgetAttributes.ContentState.sample
}