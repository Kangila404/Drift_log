import ExpoModulesCore
import ActivityKit

struct WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var subject: String
        var startDate: Date
        var goalLabel: String
        var remainMin: Int
        var progress: Double
    }
    var name: String
}

public class StudyActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("StudyActivity")

        // 시작 — startEpoch: 세션 시작 시각(ms). 반환: activity id
        AsyncFunction("start") { (subject: String, startEpoch: Double, goalLabel: String, remainMin: Int, progress: Double) -> String in
            if #available(iOS 16.2, *) {
                for activity in Activity<WidgetAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                let attributes = WidgetAttributes(name: "DriftLog")
                let state = WidgetAttributes.ContentState(
                    subject: subject,
                    startDate: Date(timeIntervalSince1970: startEpoch / 1000.0),
                    goalLabel: goalLabel,
                    remainMin: remainMin,
                    progress: progress
                )
                do {
                    let activity = try Activity.request(
                        attributes: attributes,
                        content: .init(state: state, staleDate: nil)
                    )
                    return activity.id
                } catch {
                    return ""
                }
            }
            return ""
        }

        // 업데이트 — 진행률/남은시간/과목만 갱신 (타이머는 위젯이 자동)
        AsyncFunction("update") { (subject: String, startEpoch: Double, goalLabel: String, remainMin: Int, progress: Double) in
            if #available(iOS 16.2, *) {
                let state = WidgetAttributes.ContentState(
                    subject: subject,
                    startDate: Date(timeIntervalSince1970: startEpoch / 1000.0),
                    goalLabel: goalLabel,
                    remainMin: remainMin,
                    progress: progress
                )
                for activity in Activity<WidgetAttributes>.activities {
                    await activity.update(.init(state: state, staleDate: nil))
                }
            }
        }

        AsyncFunction("end") {
            if #available(iOS 16.2, *) {
                for activity in Activity<WidgetAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
        }
    }
}