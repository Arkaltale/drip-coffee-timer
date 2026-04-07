import ActivityKit
import Foundation
import React

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

@objc(IosLiveActivity)
class IosLiveActivity: NSObject {
  private static var currentActivity: Activity<DripTimerActivityAttributes>?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @available(iOS 16.2, *)
  private func getCurrentActivity() -> Activity<DripTimerActivityAttributes>? {
    if let currentActivity = IosLiveActivity.currentActivity {
      return currentActivity
    }

    return Activity<DripTimerActivityAttributes>.activities.first
  }

  private func makeError(_ code: String, _ message: String) -> NSError {
    NSError(domain: "IosLiveActivity", code: 0, userInfo: [
      NSLocalizedDescriptionKey: "[\(code)] \(message)",
    ])
  }

  private func parseStringArray(_ value: Any?) -> [String] {
    guard let rawValues = value as? [Any] else {
      return []
    }

    return rawValues.compactMap { $0 as? String }
  }

  private func parseIntArray(_ value: Any?) -> [Int] {
    guard let rawValues = value as? [Any] else {
      return []
    }

    return rawValues.compactMap {
      if let number = $0 as? NSNumber {
        return number.intValue
      }
      if let intValue = $0 as? Int {
        return intValue
      }
      return nil
    }
  }

  private func buildRunningState(from payload: NSDictionary) throws -> DripTimerActivityAttributes.ContentState {
    guard let title = payload["title"] as? String, !title.isEmpty else {
      throw makeError("E_INVALID_TITLE", "title is required")
    }

    let stepLabels = parseStringArray(payload["stepLabels"])
    let stepEndTimes = parseIntArray(payload["stepEndTimes"])
    let totalSeconds = (payload["totalSeconds"] as? NSNumber)?.intValue ?? 0
    let rawElapsedSeconds = (payload["elapsedSeconds"] as? NSNumber)?.intValue ?? 0
    let elapsedSeconds = max(0, min(rawElapsedSeconds, totalSeconds))
    let isPaused = payload["isPaused"] as? Bool ?? false

    if totalSeconds <= 0 {
      throw makeError("E_INVALID_DURATION", "totalSeconds must be greater than 0")
    }

    return DripTimerActivityAttributes.ContentState(
      title: title,
      stepLabels: stepLabels,
      stepEndTimes: stepEndTimes,
      totalSeconds: totalSeconds,
      elapsedSeconds: elapsedSeconds,
      isPaused: isPaused,
      anchorDateMs: Date().timeIntervalSince1970 * 1000,
      statusMessage: nil
    )
  }

  private func buildFinalState(from payload: NSDictionary) -> DripTimerActivityAttributes.ContentState {
    let finalTitle = payload["finalTitle"] as? String ?? "브루잉 타이머 종료"
    let finalSubtitle = payload["finalSubtitle"] as? String

    return DripTimerActivityAttributes.ContentState(
      title: finalTitle,
      stepLabels: [],
      stepEndTimes: [],
      totalSeconds: 0,
      elapsedSeconds: 0,
      isPaused: true,
      anchorDateMs: Date().timeIntervalSince1970 * 1000,
      statusMessage: finalSubtitle
    )
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
      return
    }

    resolve(false)
  }

  @objc(startActivity:resolver:rejecter:)
  func startActivity(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      resolve(false)
      return
    }

    Task {
      do {
        let contentState = try buildRunningState(from: payload)

        if let currentActivity = getCurrentActivity() {
          await currentActivity.end(
            ActivityContent(state: buildFinalState(from: [:] as NSDictionary), staleDate: nil),
            dismissalPolicy: .immediate
          )
        }

        let activity = try Activity.request(
          attributes: DripTimerActivityAttributes(name: "DripTimer"),
          content: ActivityContent(state: contentState, staleDate: nil),
          pushType: nil
        )

        IosLiveActivity.currentActivity = activity
        resolve(true)
      } catch {
        reject("E_IOS_LIVE_ACTIVITY_START", error.localizedDescription, error)
      }
    }
  }

  @objc(updateActivity:resolver:rejecter:)
  func updateActivity(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    Task {
      do {
        guard let currentActivity = getCurrentActivity() else {
          resolve(false)
          return
        }

        let contentState = try buildRunningState(from: payload)
        await currentActivity.update(ActivityContent(state: contentState, staleDate: nil))
        IosLiveActivity.currentActivity = currentActivity
        resolve(true)
      } catch {
        reject("E_IOS_LIVE_ACTIVITY_UPDATE", error.localizedDescription, error)
      }
    }
  }

  @objc(endActivity:resolver:rejecter:)
  func endActivity(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    Task {
      guard let currentActivity = getCurrentActivity() else {
        resolve(false)
        return
      }

      let finalState = buildFinalState(from: payload)
      await currentActivity.end(
        ActivityContent(state: finalState, staleDate: nil),
        dismissalPolicy: .immediate
      )
      IosLiveActivity.currentActivity = nil
      resolve(true)
    }
  }
}
