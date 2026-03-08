package com.anonymous.dripcoffeetimer.timer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.anonymous.dripcoffeetimer.MainActivity
import com.anonymous.dripcoffeetimer.R
import kotlin.math.max

class TimerForegroundService : Service() {
  companion object {
    const val ACTION_START = "com.anonymous.dripcoffeetimer.timer.START"
    const val ACTION_UPDATE = "com.anonymous.dripcoffeetimer.timer.UPDATE"
    const val ACTION_PAUSE = "com.anonymous.dripcoffeetimer.timer.PAUSE"
    const val ACTION_STOP = "com.anonymous.dripcoffeetimer.timer.STOP"

    const val EXTRA_REMAINING_MS = "extra_remaining_ms"
    const val EXTRA_TITLE = "extra_title"
    const val EXTRA_SUBTITLE = "extra_subtitle"

    private const val CHANNEL_ID = "drip_timer_channel"
    private const val CHANNEL_NAME = "Drip Timer"
    private const val NOTIFICATION_ID = 4101

    @Volatile
    var stateSnapshot = TimerSnapshot()
  }

  private val handler = Handler(Looper.getMainLooper())

  private var endElapsedRealtimeMs: Long = 0L
  private var remainingMs: Long = 0L
  private var isRunning = false
  private var title = "브루잉 타이머"
  private var subtitle = ""
  private var promotionRequested = false
  private var canPostPromoted = false

  private val tickRunnable = object : Runnable {
    override fun run() {
      if (!isRunning) {
        return
      }

      val nowElapsed = SystemClock.elapsedRealtime()
      remainingMs = max(0L, endElapsedRealtimeMs - nowElapsed)
      updateSnapshot(paused = false)
      notifyNow()

      if (remainingMs <= 0L) {
        isRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        updateSnapshot(paused = false)
        return
      }

      handler.postDelayed(this, 1000L)
    }
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> handleStart(intent)
      ACTION_UPDATE -> handleUpdate(intent)
      ACTION_PAUSE -> handlePause()
      ACTION_STOP -> handleStop()
      else -> {
        // no-op
      }
    }

    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    handler.removeCallbacksAndMessages(null)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun handleStart(intent: Intent) {
    val startRemainingMs = intent.getLongExtra(EXTRA_REMAINING_MS, 0L)
    if (startRemainingMs <= 0L) {
      handleStop()
      return
    }

    title = intent.getStringExtra(EXTRA_TITLE) ?: title
    subtitle = intent.getStringExtra(EXTRA_SUBTITLE) ?: subtitle

    remainingMs = startRemainingMs
    endElapsedRealtimeMs = SystemClock.elapsedRealtime() + remainingMs
    isRunning = true

    val notification = buildNotification()
    startForeground(NOTIFICATION_ID, notification)

    handler.removeCallbacks(tickRunnable)
    handler.post(tickRunnable)
  }

  private fun handleUpdate(intent: Intent) {
    title = intent.getStringExtra(EXTRA_TITLE) ?: title
    subtitle = intent.getStringExtra(EXTRA_SUBTITLE) ?: subtitle
    if (isRunning) {
      notifyNow()
    } else {
      updateSnapshot(paused = remainingMs > 0L)
    }
  }

  private fun handlePause() {
    if (!isRunning) {
      updateSnapshot(paused = remainingMs > 0L)
      return
    }

    remainingMs = max(0L, endElapsedRealtimeMs - SystemClock.elapsedRealtime())
    isRunning = false
    handler.removeCallbacks(tickRunnable)
    stopForeground(STOP_FOREGROUND_REMOVE)
    updateSnapshot(paused = remainingMs > 0L)
    stopSelf()
  }

  private fun handleStop() {
    isRunning = false
    remainingMs = 0L
    endElapsedRealtimeMs = 0L
    handler.removeCallbacks(tickRunnable)
    stopForeground(STOP_FOREGROUND_REMOVE)
    updateSnapshot(paused = false)
    stopSelf()
  }

  private fun notifyNow() {
    val manager = ContextCompat.getSystemService(this, NotificationManager::class.java)
    manager?.notify(NOTIFICATION_ID, buildNotification())
    updateSnapshot(paused = false)
  }

  private fun buildNotification(): Notification {
    val openIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }

    val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }

    val pendingIntent = PendingIntent.getActivity(this, 0, openIntent, pendingIntentFlags)

    val nowMs = System.currentTimeMillis()
    val triggerMs = nowMs + remainingMs

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(composeContentText())
      .setStyle(NotificationCompat.BigTextStyle().bigText(composeContentText()))
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setShowWhen(true)
      .setWhen(triggerMs)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)

    promotionRequested = requestPromotedOngoing(builder)
    canPostPromoted = canPostPromotedNotifications()

    if (promotionRequested) {
      setShortCriticalText(builder, shortRemainingText())
    }

    return builder.build()
  }

  private fun composeContentText(): String {
    val remainingText = formatRemaining(remainingMs)
    return if (subtitle.isBlank()) {
      "남은 시간: $remainingText"
    } else {
      "$subtitle · 남은 시간: $remainingText"
    }
  }

  private fun shortRemainingText(): String = formatRemaining(remainingMs)

  private fun formatRemaining(milliseconds: Long): String {
    val secondsTotal = max(0L, milliseconds / 1000L)
    val minutes = secondsTotal / 60L
    val seconds = secondsTotal % 60L
    return String.format("%02d:%02d", minutes, seconds)
  }

  private fun requestPromotedOngoing(builder: NotificationCompat.Builder): Boolean {
    return try {
      val method = builder.javaClass.getMethod("setRequestPromotedOngoing", Boolean::class.javaPrimitiveType)
      method.invoke(builder, true)
      true
    } catch (_: Throwable) {
      false
    }
  }

  private fun setShortCriticalText(builder: NotificationCompat.Builder, text: String) {
    try {
      val method = builder.javaClass.getMethod("setShortCriticalText", CharSequence::class.java)
      method.invoke(builder, text)
    } catch (_: Throwable) {
      // no-op on unsupported versions
    }
  }

  private fun canPostPromotedNotifications(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      try {
        val manager = getSystemService(NotificationManager::class.java)
        val method = NotificationManager::class.java.getMethod("canPostPromotedNotifications")
        (method.invoke(manager) as? Boolean) == true
      } catch (_: Throwable) {
        false
      }
    } else {
      false
    }
  }

  private fun updateSnapshot(paused: Boolean) {
    stateSnapshot = TimerSnapshot(
      isRunning = isRunning,
      isPaused = paused,
      remainingMs = remainingMs,
      endElapsedRealtimeMs = endElapsedRealtimeMs,
      title = title,
      subtitle = subtitle,
      promotionRequested = promotionRequested,
      canPostPromoted = canPostPromoted
    )
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }

    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "브루잉 타이머 진행 상태"
      setShowBadge(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }

    manager.createNotificationChannel(channel)
  }
}

data class TimerSnapshot(
  val isRunning: Boolean = false,
  val isPaused: Boolean = false,
  val remainingMs: Long = 0L,
  val endElapsedRealtimeMs: Long = 0L,
  val title: String = "",
  val subtitle: String = "",
  val promotionRequested: Boolean = false,
  val canPostPromoted: Boolean = false
)
