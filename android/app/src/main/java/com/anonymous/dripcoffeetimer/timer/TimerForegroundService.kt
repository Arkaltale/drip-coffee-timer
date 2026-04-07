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
import kotlin.math.min

class TimerForegroundService : Service() {
  companion object {
    const val ACTION_START = "com.anonymous.dripcoffeetimer.timer.START"
    const val ACTION_UPDATE = "com.anonymous.dripcoffeetimer.timer.UPDATE"
    const val ACTION_PAUSE = "com.anonymous.dripcoffeetimer.timer.PAUSE"
    const val ACTION_STOP = "com.anonymous.dripcoffeetimer.timer.STOP"

    const val EXTRA_TOTAL_DURATION_MS = "extra_total_duration_ms"
    const val EXTRA_TOTAL_REMAINING_MS = "extra_total_remaining_ms"
    const val EXTRA_STEP_END_TIMES_MS = "extra_step_end_times_ms"
    const val EXTRA_CURRENT_STEP_INDEX = "extra_current_step_index"
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
  private var totalDurationMs: Long = 0L
  private var totalRemainingMs: Long = 0L
  private var stepEndTimesMs: LongArray = longArrayOf()
  private var currentStepIndex = 0
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

      totalRemainingMs = max(0L, endElapsedRealtimeMs - SystemClock.elapsedRealtime())
      recalculateCurrentStep()
      updateSnapshot(paused = false)
      notifyNow()

      if (totalRemainingMs <= 0L) {
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
    val nextTotalDurationMs = intent.getLongExtra(EXTRA_TOTAL_DURATION_MS, 0L)
    val nextTotalRemainingMs = intent.getLongExtra(EXTRA_TOTAL_REMAINING_MS, 0L)
    if (nextTotalDurationMs <= 0L || nextTotalRemainingMs <= 0L) {
      handleStop()
      return
    }

    title = intent.getStringExtra(EXTRA_TITLE) ?: title
    subtitle = intent.getStringExtra(EXTRA_SUBTITLE) ?: subtitle
    stepEndTimesMs = intent.getLongArrayExtra(EXTRA_STEP_END_TIMES_MS) ?: stepEndTimesMs
    totalDurationMs = nextTotalDurationMs
    totalRemainingMs = min(nextTotalRemainingMs, totalDurationMs)
    currentStepIndex = intent.getIntExtra(EXTRA_CURRENT_STEP_INDEX, currentStepIndex)
    recalculateCurrentStep()
    endElapsedRealtimeMs = SystemClock.elapsedRealtime() + totalRemainingMs
    isRunning = true

    val notification = buildNotification()
    startForeground(NOTIFICATION_ID, notification)

    handler.removeCallbacks(tickRunnable)
    handler.post(tickRunnable)
  }

  private fun handleUpdate(intent: Intent) {
    if (intent.hasExtra(EXTRA_TITLE)) {
      title = intent.getStringExtra(EXTRA_TITLE) ?: title
    }
    if (intent.hasExtra(EXTRA_SUBTITLE)) {
      subtitle = intent.getStringExtra(EXTRA_SUBTITLE) ?: subtitle
    }
    if (intent.hasExtra(EXTRA_STEP_END_TIMES_MS)) {
      stepEndTimesMs = intent.getLongArrayExtra(EXTRA_STEP_END_TIMES_MS) ?: stepEndTimesMs
    }
    if (intent.hasExtra(EXTRA_TOTAL_DURATION_MS)) {
      totalDurationMs = intent.getLongExtra(EXTRA_TOTAL_DURATION_MS, totalDurationMs)
    }
    if (intent.hasExtra(EXTRA_TOTAL_REMAINING_MS)) {
      totalRemainingMs = intent.getLongExtra(EXTRA_TOTAL_REMAINING_MS, totalRemainingMs)
      if (isRunning) {
        endElapsedRealtimeMs = SystemClock.elapsedRealtime() + totalRemainingMs
      }
    }
    if (intent.hasExtra(EXTRA_CURRENT_STEP_INDEX)) {
      currentStepIndex = intent.getIntExtra(EXTRA_CURRENT_STEP_INDEX, currentStepIndex)
    }

    recalculateCurrentStep()

    if (isRunning) {
      notifyNow()
    } else {
      updateSnapshot(paused = totalRemainingMs > 0L)
    }
  }

  private fun handlePause() {
    if (!isRunning) {
      updateSnapshot(paused = totalRemainingMs > 0L)
      return
    }

    totalRemainingMs = max(0L, endElapsedRealtimeMs - SystemClock.elapsedRealtime())
    recalculateCurrentStep()
    isRunning = false
    handler.removeCallbacks(tickRunnable)
    stopForeground(STOP_FOREGROUND_REMOVE)
    updateSnapshot(paused = totalRemainingMs > 0L)
    stopSelf()
  }

  private fun handleStop() {
    isRunning = false
    totalDurationMs = 0L
    totalRemainingMs = 0L
    stepEndTimesMs = longArrayOf()
    currentStepIndex = 0
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

    val currentStepRemainingMs = getCurrentStepRemainingMs()
    val nowMs = System.currentTimeMillis()
    val triggerMs = nowMs + currentStepRemainingMs

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(composeContentText(currentStepRemainingMs))
      .setStyle(NotificationCompat.BigTextStyle().bigText(composeContentText(currentStepRemainingMs)))
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
      setShortCriticalText(builder, shortRemainingText(currentStepRemainingMs))
    }

    return builder.build()
  }

  private fun composeContentText(currentStepRemainingMs: Long): String {
    val stepSummary = composeStepSummary()
    val remainingText = formatRemaining(currentStepRemainingMs)
    return if (subtitle.isBlank()) {
      "$stepSummary · $remainingText"
    } else {
      "$stepSummary · $remainingText · $subtitle"
    }
  }

  private fun shortRemainingText(currentStepRemainingMs: Long): String = formatRemaining(currentStepRemainingMs)

  private fun formatRemaining(milliseconds: Long): String {
    val secondsTotal = max(0L, milliseconds / 1000L)
    val minutes = secondsTotal / 60L
    val seconds = secondsTotal % 60L
    return String.format("%02d:%02d", minutes, seconds)
  }

  private fun composeStepSummary(): String {
    val totalSteps = getTotalSteps()
    if (totalSteps <= 0) {
      return "단계 0/0"
    }

    return "단계 ${currentStepIndex + 1}/$totalSteps"
  }

  private fun getTotalElapsedMs(): Long {
    return max(0L, totalDurationMs - totalRemainingMs)
  }

  private fun getTotalSteps(): Int = stepEndTimesMs.size

  private fun getCurrentStepEndMs(index: Int): Long {
    return stepEndTimesMs.getOrElse(index) { totalDurationMs }
  }

  private fun getCurrentStepRemainingMs(): Long {
    if (stepEndTimesMs.isEmpty()) {
      return totalRemainingMs
    }

    val currentStepEndMs = getCurrentStepEndMs(currentStepIndex)
    return max(0L, currentStepEndMs - getTotalElapsedMs())
  }

  private fun recalculateCurrentStep() {
    if (stepEndTimesMs.isEmpty()) {
      currentStepIndex = 0
      return
    }

    val elapsedMs = getTotalElapsedMs()
    var nextIndex = stepEndTimesMs.lastIndex

    for (index in stepEndTimesMs.indices) {
      if (elapsedMs < stepEndTimesMs[index]) {
        nextIndex = index
        break
      }
    }

    currentStepIndex = min(max(nextIndex, 0), stepEndTimesMs.lastIndex)
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
      totalDurationMs = totalDurationMs,
      totalRemainingMs = totalRemainingMs,
      currentStepRemainingMs = getCurrentStepRemainingMs(),
      currentStepIndex = currentStepIndex,
      totalSteps = getTotalSteps(),
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
  val totalDurationMs: Long = 0L,
  val totalRemainingMs: Long = 0L,
  val currentStepRemainingMs: Long = 0L,
  val currentStepIndex: Int = 0,
  val totalSteps: Int = 0,
  val endElapsedRealtimeMs: Long = 0L,
  val title: String = "",
  val subtitle: String = "",
  val promotionRequested: Boolean = false,
  val canPostPromoted: Boolean = false
)
