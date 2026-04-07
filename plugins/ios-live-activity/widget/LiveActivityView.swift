import ActivityKit
import SwiftUI

struct DripTimerActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var stepLabels: [String]
    var stepEndTimes: [Int]
    var totalSeconds: Int
    var elapsedSeconds: Int
    var isPaused: Bool
    var anchorDateMs: Double
    var statusMessage: String?
  }

  var name: String
}

struct DripTimerDerivedState {
  var title: String
  var stepSummary: String
  var statusLine: String
  var currentStepRemainingSeconds: Int
  var progress: Double
  var isPaused: Bool
  var isFinished: Bool
  var currentStepIndex: Int
}

private func formatCountdown(_ totalSeconds: Int) -> String {
  let minutes = totalSeconds / 60
  let seconds = totalSeconds % 60
  return String(format: "%02d:%02d", minutes, seconds)
}

private func combinedStatusLine(primary: String, secondary: String?) -> String {
  guard let secondary, !secondary.isEmpty else {
    return primary
  }

  guard !primary.isEmpty else {
    return secondary
  }

  return "\(primary) · \(secondary)"
}

func deriveDripTimerState(
  contentState: DripTimerActivityAttributes.ContentState,
  now: Date
) -> DripTimerDerivedState {
  let stepCount = contentState.stepEndTimes.count

  if stepCount == 0 || contentState.totalSeconds <= 0 {
    return DripTimerDerivedState(
      title: contentState.title,
      stepSummary: "",
      statusLine: contentState.statusMessage ?? "",
      currentStepRemainingSeconds: 0,
      progress: 1,
      isPaused: true,
      isFinished: true,
      currentStepIndex: 0
    )
  }

  let anchorDate = Date(timeIntervalSince1970: contentState.anchorDateMs / 1000)
  let elapsedSinceAnchor = max(0, Int(now.timeIntervalSince(anchorDate)))
  let rawElapsedSeconds = contentState.isPaused
    ? contentState.elapsedSeconds
    : contentState.elapsedSeconds + elapsedSinceAnchor
  let elapsedSeconds = min(max(0, rawElapsedSeconds), contentState.totalSeconds)
  let isFinished = elapsedSeconds >= contentState.totalSeconds

  var currentStepIndex = max(0, stepCount - 1)
  for index in contentState.stepEndTimes.indices {
    if elapsedSeconds < contentState.stepEndTimes[index] {
      currentStepIndex = index
      break
    }
  }

  let currentStepEnd = contentState.stepEndTimes[currentStepIndex]
  let currentStepStart = currentStepIndex > 0 ? contentState.stepEndTimes[currentStepIndex - 1] : 0
  let currentStepDuration = max(0, currentStepEnd - currentStepStart)
  let currentStepElapsed = isFinished
    ? currentStepDuration
    : max(0, min(currentStepDuration, elapsedSeconds - currentStepStart))
  let currentStepRemaining = isFinished ? 0 : max(0, currentStepEnd - elapsedSeconds)

  let primaryStatus = contentState.stepLabels.indices.contains(currentStepIndex)
    ? contentState.stepLabels[currentStepIndex]
    : ""
  let stepSummary = "단계 \(currentStepIndex + 1)/\(stepCount)"
  let pausedLabel = contentState.isPaused && !isFinished ? "일시정지" : nil

  return DripTimerDerivedState(
    title: contentState.title,
    stepSummary: stepSummary,
    statusLine: combinedStatusLine(primary: primaryStatus, secondary: pausedLabel),
    currentStepRemainingSeconds: currentStepRemaining,
    progress: currentStepDuration > 0 ? Double(currentStepElapsed) / Double(currentStepDuration) : 1,
    isPaused: contentState.isPaused,
    isFinished: isFinished,
    currentStepIndex: currentStepIndex
  )
}

struct DripTimerCountdownText: View {
  let derivedState: DripTimerDerivedState
  let now: Date
  let font: Font

  var body: some View {
    if derivedState.isPaused || derivedState.isFinished {
      Text(formatCountdown(derivedState.currentStepRemainingSeconds))
        .font(font.monospacedDigit())
        .fontWeight(.semibold)
    } else {
      Text(
        timerInterval: now ... now.addingTimeInterval(TimeInterval(max(1, derivedState.currentStepRemainingSeconds))),
        countsDown: true
      )
      .font(font.monospacedDigit())
      .fontWeight(.semibold)
    }
  }
}

struct DripTimerLiveActivityView: View {
  let contentState: DripTimerActivityAttributes.ContentState

  var body: some View {
    TimelineView(.periodic(from: .now, by: 1)) { timeline in
      let derivedState = deriveDripTimerState(contentState: contentState, now: timeline.date)

      VStack(alignment: .leading, spacing: 10) {
        Text(derivedState.title)
          .font(.headline)
          .foregroundStyle(.white)
          .lineLimit(1)

        if !derivedState.stepSummary.isEmpty {
          Text(derivedState.stepSummary)
            .font(.subheadline)
            .foregroundStyle(.white.opacity(0.85))
        }

        if !derivedState.statusLine.isEmpty {
          Text(derivedState.statusLine)
            .font(.caption)
            .foregroundStyle(.white.opacity(0.72))
            .lineLimit(1)
        }

        HStack(alignment: .firstTextBaseline) {
          DripTimerCountdownText(
            derivedState: derivedState,
            now: timeline.date,
            font: .system(size: 28)
          )
          .foregroundStyle(.white)

          Spacer(minLength: 12)

          if !derivedState.isFinished {
            Text("남은 단계 시간")
              .font(.caption2)
              .foregroundStyle(.white.opacity(0.72))
          }
        }

        ProgressView(value: derivedState.progress)
          .tint(.orange)
      }
      .padding(16)
    }
  }
}
