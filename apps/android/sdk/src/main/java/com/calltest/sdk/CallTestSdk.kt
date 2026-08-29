package com.calltest.sdk

import android.app.Activity
import android.app.Application
import android.os.Bundle
import com.calltest.sdk.network.NetworkAdapter
import com.calltest.sdk.network.NoOpNetworkAdapter
import com.calltest.sdk.queue.EventQueue
import com.calltest.sdk.queue.InMemoryEventQueue
import com.calltest.sdk.queue.SdkEvent
import com.calltest.sdk.storage.InMemoryStorageAdapter
import com.calltest.sdk.storage.StorageAdapter
import java.util.UUID

class CallTestSdk private constructor(
    private val config: CallTestConfig,
    private val storage: StorageAdapter,
    private val network: NetworkAdapter,
    private val queue: EventQueue
) {
    private var isInitialized: Boolean = false
    private var currentSessionId: String? = null
    private var sessionStartTimeMs: Long = 0L

    fun initialize() {
        isInitialized = true
    }

    fun startSession(): String {
        checkInitialized()
        val sessionId = UUID.randomUUID().toString()
        currentSessionId = sessionId
        sessionStartTimeMs = System.currentTimeMillis()
        trackEvent("SESSION_START", "{\"sessionId\":\"$sessionId\",\"timestamp\":$sessionStartTimeMs}")
        return sessionId
    }

    fun endSession(): Long {
        checkInitialized()
        val durationMs = if (sessionStartTimeMs > 0) System.currentTimeMillis() - sessionStartTimeMs else 0L
        currentSessionId?.let {
            trackEvent("SESSION_END", "{\"sessionId\":\"$it\",\"durationMs\":$durationMs}")
            currentSessionId = null
        }
        sessionStartTimeMs = 0L
        return durationMs
    }

    fun trackEvent(eventType: String, payload: String): Boolean {
        checkInitialized()
        val event = SdkEvent(
            eventId = UUID.randomUUID().toString(),
            eventType = eventType,
            timestamp = System.currentTimeMillis(),
            payload = payload
        )
        return queue.enqueue(event)
    }

    fun reportInstallationDetected(installationId: String? = null): Boolean {
        checkInitialized()
        val payload = if (installationId != null) "{\"installationId\":\"$installationId\"}" else "{}"
        return trackEvent("INSTALL_DETECTED", payload)
    }

    fun reportFirstOpen(): Boolean {
        checkInitialized()
        return trackEvent("FIRST_OPEN", "{}")
    }

    fun getQueuedEventsCount(): Int = queue.size()

    private fun checkInitialized() {
        if (!isInitialized) {
            throw IllegalStateException("CallTestSdk must be initialized before use.")
        }
    }

    companion object {
        @Volatile
        private var instance: CallTestSdk? = null

        /**
         * Inicialización rápida en 1 línea para desarrolladores.
         * Registra automáticamente el ciclo de vida de la app para medir los 3 minutos diarios sin código extra.
         */
        @JvmStatic
        fun install(application: Application, apiKey: String): CallTestSdk {
            val config = CallTestConfig(
                apiKey = apiKey,
                endpointUrl = "https://api.calltest.dev",
                syncIntervalMs = 30000L
            )
            val sdk = init(config)

            var runningActivities = 0
            application.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
                override fun onActivityStarted(activity: Activity) {
                    if (runningActivities == 0) {
                        sdk.startSession()
                    }
                    runningActivities++
                }

                override fun onActivityStopped(activity: Activity) {
                    runningActivities--
                    if (runningActivities == 0) {
                        sdk.endSession()
                    }
                }

                override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
                override fun onActivityResumed(activity: Activity) {}
                override fun onActivityPaused(activity: Activity) {}
                override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
                override fun onActivityDestroyed(activity: Activity) {}
            })

            return sdk
        }

        fun init(
            config: CallTestConfig,
            storage: StorageAdapter = InMemoryStorageAdapter(),
            network: NetworkAdapter = NoOpNetworkAdapter(),
            queue: EventQueue = InMemoryEventQueue(config.maxQueueSize)
        ): CallTestSdk {
            return instance ?: synchronized(this) {
                instance ?: CallTestSdk(config, storage, network, queue).also {
                    it.initialize()
                    instance = it
                }
            }
        }

        fun getInstance(): CallTestSdk {
            return instance ?: throw IllegalStateException("CallTestSdk is not initialized. Call CallTestSdk.install() or init() first.")
        }

        internal fun resetForTesting() {
            instance = null
        }
    }
}
