package com.calltest.sdk

import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

class CallTestSdkTest {

    @Before
    fun setUp() {
        CallTestSdk.resetForTesting()
    }

    @Test
    fun testSdkInitializationAndSessionLifecycle() {
        val config = CallTestConfig(apiKey = "test_api_key_123")
        val sdk = CallTestSdk.init(config)

        assertNotNull(sdk)
        assertEquals(0, sdk.getQueuedEventsCount())

        val sessionId = sdk.startSession()
        assertNotNull(sessionId)
        assertEquals(1, sdk.getQueuedEventsCount())

        sdk.trackEvent("BUTTON_CLICK", "{\"buttonId\":\"login_btn\"}")
        assertEquals(2, sdk.getQueuedEventsCount())

        sdk.endSession()
        assertEquals(3, sdk.getQueuedEventsCount())
    }
}
