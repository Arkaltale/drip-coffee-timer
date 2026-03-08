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

  @ReactMethod
  fun startTimer(options: ReadableMap, promise: Promise) {
    try {
      val remainingMs = if (options.hasKey("remainingMs")) {
        options.getDouble("remainingMs").toLong()
      } else {
        0L
      }

      if (remainingMs <= 0L) {
        promise.reject("E_INVALID_REMAINING", "remainingMs must be > 0")
        return
      }

      val title = if (options.hasKey("title")) options.getString("title") else null
      val subtitle = if (options.hasKey("subtitle")) options.getString("subtitle") else null

      val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_START
        putExtra(TimerForegroundService.EXTRA_REMAINING_MS, remainingMs)
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
      val title = if (options.hasKey("title")) options.getString("title") else null
      val subtitle = if (options.hasKey("subtitle")) options.getString("subtitle") else null

      val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
        action = TimerForegroundService.ACTION_UPDATE
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
        putDouble("remainingMs", state.remainingMs.toDouble())
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
