import ExpoModulesCore
import ActivityKit

// ⚠️ 위젯 타깃(WidgetLiveActivity.swift)의 WidgetAttributes와
// 이름·필드가 정확히 일치해야 ActivityKit이 같은 Activity로 인식한다.
// 위젯 타깃과 메인 앱은 코드를 공유하지 않으므로 동일 구조를 여기서도 선언한다.
struct WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var subject: String
        var elapsedLabel: String
        var goalLabel: String
        var remainMin: Int
        var progress: Double
    }
    var name: String
}

public class StudyActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("StudyActivity")

        // 시작 — 반환: activity id (없으면 빈 문자열)
        AsyncFunction("start") { (subject: String, elapsedLabel: String, goalLabel: String, remainMin: Int, progress: Double) -> String in
            if #available(iOS 16.2, *) {
                // 중복 방지: 기존 활동 모두 종료
                for activity in Activity<WidgetAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                let attributes = WidgetAttributes(name: "DriftLog")
                let state = WidgetAttributes.ContentState(
                    subject: subject, elapsedLabel: elapsedLabel,
                    goalLabel: goalLabel, remainMin: remainMin, progress: progress
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

        // 업데이트
        AsyncFunction("update") { (subject: String, elapsedLabel: String, goalLabel: String, remainMin: Int, progress: Double) in
            if #available(iOS 16.2, *) {
                let state = WidgetAttributes.ContentState(
                    subject: subject, elapsedLabel: elapsedLabel,
                    goalLabel: goalLabel, remainMin: remainMin, progress: progress
                )
                for activity in Activity<WidgetAttributes>.activities {
                    await activity.update(.init(state: state, staleDate: nil))
                }
            }
        }

        // 종료
        AsyncFunction("end") {
            if #available(iOS 16.2, *) {
                for activity in Activity<WidgetAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
        }
    }
}