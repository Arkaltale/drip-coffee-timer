import ActivityKit
import SwiftUI
import WidgetKit

struct LiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: DripTimerActivityAttributes.self) { context in
      DripTimerLiveActivityView(contentState: context.state)
        .activityBackgroundTint(Color.black)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let derivedState = deriveDripTimerState(contentState: context.state, now: timeline.date)

            VStack(alignment: .leading, spacing: 4) {
              Text(derivedState.title)
                .font(.headline)
                .foregroundStyle(.white)
                .lineLimit(1)

              if !derivedState.stepSummary.isEmpty {
                Text(derivedState.stepSummary)
                  .font(.caption)
                  .foregroundStyle(.white.opacity(0.82))
              }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
        }

        DynamicIslandExpandedRegion(.trailing) {
          TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let derivedState = deriveDripTimerState(contentState: context.state, now: timeline.date)

            DripTimerCountdownText(
              derivedState: derivedState,
              now: timeline.date,
              font: .system(size: 20)
            )
            .foregroundStyle(.white)
          }
        }

        DynamicIslandExpandedRegion(.bottom) {
          TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let derivedState = deriveDripTimerState(contentState: context.state, now: timeline.date)

            VStack(alignment: .leading, spacing: 6) {
              if !derivedState.statusLine.isEmpty {
                Text(derivedState.statusLine)
                  .font(.caption)
                  .foregroundStyle(.white.opacity(0.75))
                  .lineLimit(1)
              }

              ProgressView(value: derivedState.progress)
                .tint(.orange)
            }
          }
        }
      } compactLeading: {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
          let derivedState = deriveDripTimerState(contentState: context.state, now: timeline.date)

          Text(derivedState.stepSummary.isEmpty ? "Drip" : "S\(derivedState.currentStepIndex + 1)")
            .font(.caption2)
            .foregroundStyle(.white)
        }
      } compactTrailing: {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
          let derivedState = deriveDripTimerState(contentState: context.state, now: timeline.date)

          DripTimerCountdownText(
            derivedState: derivedState,
            now: timeline.date,
            font: .system(size: 13)
          )
          .foregroundStyle(.white)
        }
      } minimal: {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
          let derivedState = deriveDripTimerState(contentState: context.state, now: timeline.date)

          Text(derivedState.stepSummary.isEmpty ? "D" : "\(derivedState.currentStepIndex + 1)")
            .font(.caption2)
            .foregroundStyle(.white)
        }
      }
    }
  }
}
