package com.anonymous.dripcoffeetimer.timer

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap

class TimerForegroundModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "TimerForeground"

  private fun parseStepEndTimes(options: ReadableMap): LongArray {
    if (!options.hasKey("stepEndTimesMs")) {
      return longArrayOf()
    }

    val rawArray = options.getArray("stepEndTimesMs") ?: return longArrayOf()
    return LongArray(rawArray.size()) { index ->
      rawArray.getDouble(index).toLong()
    }
  }

  @ReactMethod
  fun startTimer(options: ReadableMap, promise: Promise) {
    try {
      val totalDurationMs = if (options.hasKey("totalDurationMs")) {
        options.getDouble("totalDurationMs").toLong()
      } else {
        0L
      }
      val totalRemainingMs = if (options.hasKey("totalRemainingMs")) {
        options.getDouble("totalRemainingMs").toLong()
      } else {
        0L
      }
      val currentStepIndex = if (options.hasKey("currentStepIndex")) {
        options.getInt("currentStepIndex")
      } else {
        0
      }
      val stepEndTimesMs = parseStepEndTimes(options)

      if (totalDurationMs <= 0L) {
        promise.reject("E_INVALID_DURATION", "totalDurationMs must be > 0")
        return
      }

      if (totalRemainingMs <= 0L) {
        promise.reject("E_INVALID_REMAINING", "totalRemainingMs must be > 0")
        return
      }

      val title = if (options.hasKey("title")) options.getString("title") else null
      val subtitle = if (options.hasKey("subtitle")) options.getString("subtitle") else null

      val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_START
        putExtra(TimerForegroundService.EXTRA_TOTAL_DURATION_MS, totalDurationMs)
        putExtra(TimerForegroundService.EXTRA_TOTAL_REMAINING_MS, totalRemainingMs)
        putExtra(TimerForegroundService.EXTRA_CURRENT_STEP_INDEX, currentStepIndex)
        putExtra(TimerForegroundService.EXTRA_STEP_END_TIMES_MS, stepEndTimesMs)
        if (!title.isNullOrBlank()) {
          putExtra(TimerForegroundService.EXTRA_TITLE, title)
        }
        if (!subtitle.isNullOrBlank()) {
          putExtra(TimerForegroundService.EXTRA_SUBTITLE, subtitle)
        }
      }

      ContextCompat.startForegroundService(reactContext, intent)
      promise.resolve(true)
    } catch (e: Throwable) {
      promise.reject("E_TIMER_START", e)
    }
  }

  @ReactMethod
  fun updateTimer(options: ReadableMap, promise: Promise) {
    try {
      val hasTotalDurationMs = options.hasKey("totalDurationMs")
      val hasTotalRemainingMs = options.hasKey("totalRemainingMs")
      val hasCurrentStepIndex = options.hasKey("currentStepIndex")
      val hasStepEndTimesMs = options.hasKey("stepEndTimesMs")
      val title = if (options.hasKey("title")) options.getString("title") else null
      val subtitle = if (options.hasKey("subtitle")) options.getString("subtitle") else null

      val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_UPDATE
        if (hasTotalDurationMs) {
          putExtra(TimerForegroundService.EXTRA_TOTAL_DURATION_MS, options.getDouble("totalDurationMs").toLong())
        }
        if (hasTotalRemainingMs) {
          putExtra(TimerForegroundService.EXTRA_TOTAL_REMAINING_MS, options.getDouble("totalRemainingMs").toLong())
        }
        if (hasCurrentStepIndex) {
          putExtra(TimerForegroundService.EXTRA_CURRENT_STEP_INDEX, options.getInt("currentStepIndex"))
        }
        if (hasStepEndTimesMs) {
          putExtra(TimerForegroundService.EXTRA_STEP_END_TIMES_MS, parseStepEndTimes(options))
        }
        if (!title.isNullOrBlank()) {
          putExtra(TimerForegroundService.EXTRA_TITLE, title)
        }
        if (!subtitle.isNullOrBlank()) {
          putExtra(TimerForegroundService.EXTRA_SUBTITLE, subtitle)
        }
      }

      reactContext.startService(intent)
      promise.resolve(true)
    } catch (e: Throwable) {
      promise.reject("E_TIMER_UPDATE", e)
    }
  }

  @ReactMethod
  fun pauseTimer(promise: Promise) {
    try {
      val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_PAUSE
      }
      reactContext.startService(intent)
      promise.resolve(true)
    } catch (e: Throwable) {
      promise.reject("E_TIMER_PAUSE", e)
    }
  }

  @ReactMethod
  fun stopTimer(promise: Promise) {
    try {
      val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_STOP
      }
      reactContext.startService(intent)
      promise.resolve(true)
    } catch (e: Throwable) {
      promise.reject("E_TIMER_STOP", e)
    }
  }

  @ReactMethod
  fun getState(promise: Promise) {
    try {
      val state = TimerForegroundService.stateSnapshot
      val map = WritableNativeMap().apply {
        putBoolean("isRunning", state.isRunning)
        putBoolean("isPaused", state.isPaused)
        putDouble("totalDurationMs", state.totalDurationMs.toDouble())
        putDouble("totalRemainingMs", state.totalRemainingMs.toDouble())
        putDouble("currentStepRemainingMs", state.currentStepRemainingMs.toDouble())
        putInt("currentStepIndex", state.currentStepIndex)
        putInt("totalSteps", state.totalSteps)
        putDouble("endElapsedRealtimeMs", state.endElapsedRealtimeMs.toDouble())
        putString("title", state.title)
        putString("subtitle", state.subtitle)
        putBoolean("promotionRequested", state.promotionRequested)
        putBoolean("canPostPromoted", state.canPostPromoted)
      }
      promise.resolve(map)
    } catch (e: Throwable) {
      promise.reject("E_TIMER_STATE", e)
    }
  }
}
