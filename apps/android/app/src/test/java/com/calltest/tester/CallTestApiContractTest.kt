package com.calltest.tester

import com.calltest.tester.data.network.CallTestApiClient
import com.calltest.tester.data.network.LoginRequest
import com.calltest.tester.data.network.RegisterRequest
import kotlinx.serialization.encodeToString
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CallTestApiContractTest {
    @Test
    fun loginUsesBackendPasswordField() {
        val body = CallTestApiClient.json.encodeToString(
            LoginRequest(email = "tester@example.com", password = "secret123")
        )

        assertTrue(body.contains("\"password\""))
        assertFalse(body.contains("passwordHash"))
    }

    @Test
    fun registrationUsesBackendDisplayNameField() {
        val body = CallTestApiClient.json.encodeToString(
            RegisterRequest(
                email = "tester@example.com",
                password = "secret123",
                displayName = "Tester Demo"
            )
        )

        assertTrue(body.contains("\"displayName\""))
        assertFalse(body.contains("\"name\""))
    }
}
