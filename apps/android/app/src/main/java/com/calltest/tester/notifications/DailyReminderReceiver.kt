package com.calltest.tester.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class DailyReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        // Enviar la notificación de recordatorio diario
        CallTestNotificationManager.sendDailyReminder(
            context = context,
            appName = "Fintech Tracker",
            streakDays = 6,
            minutesRequired = 3
        )

        // Reprogramar para el día siguiente a la misma hora
        DailyReminderScheduler.rescheduleNextDay(context)
    }
}
