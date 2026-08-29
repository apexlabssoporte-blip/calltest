package com.calltest.tester

import android.app.Application
import com.calltest.tester.notifications.CallTestNotificationManager

class CallTestApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        CallTestNotificationManager.createNotificationChannels(this)
    }
}
