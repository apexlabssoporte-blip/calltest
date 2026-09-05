package com.calltest.tester.ui.auth

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.calltest.tester.BuildConfig
import com.calltest.tester.data.network.CallTestApiClient
import com.calltest.tester.data.network.SessionManager
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }
    var isRegistering by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }

    fun submitCredentials() {
        val cleanEmail = email.trim()
        val cleanName = displayName.trim()
        if (!cleanEmail.contains("@")) {
            Toast.makeText(context, "Escribe un correo válido.", Toast.LENGTH_SHORT).show()
            return
        }
        if (password.length < 8) {
            Toast.makeText(context, "La contraseña debe tener al menos 8 caracteres.", Toast.LENGTH_SHORT).show()
            return
        }
        if (isRegistering && cleanName.length < 2) {
            Toast.makeText(context, "Escribe tu nombre.", Toast.LENGTH_SHORT).show()
            return
        }

        isLoading = true
        scope.launch {
            val result = if (isRegistering) {
                CallTestApiClient.register(context, cleanEmail, password, cleanName)
            } else {
                CallTestApiClient.login(context, cleanEmail, password)
            }
            isLoading = false
            if (result.isSuccess) {
                Toast.makeText(
                    context,
                    if (isRegistering) "Cuenta creada correctamente." else "Sesión iniciada.",
                    Toast.LENGTH_SHORT
                ).show()
                onLoginSuccess(cleanEmail)
            } else {
                Toast.makeText(
                    context,
                    result.exceptionOrNull()?.message ?: "No se pudo iniciar sesión.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(30.dp))
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.tertiary)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text("CT", color = Color.White, fontWeight = FontWeight.Black, fontSize = 34.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text("CallTest", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text(
                "Comunidad de evaluadores para Google Play",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            if (BuildConfig.CALLTEST_DEMO_MODE) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "MODO DEMOSTRACIÓN · Los perfiles y campañas pueden ser simulados",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.tertiary,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        if (isRegistering) "Crear cuenta" else "Iniciar sesión",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    if (isRegistering) {
                        OutlinedTextField(
                            value = displayName,
                            onValueChange = { displayName = it },
                            label = { Text("Nombre") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Correo electrónico") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Contraseña") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))
            Button(
                onClick = { submitCredentials() },
                enabled = !isLoading,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                } else {
                    Text(
                        if (isRegistering) "Crear mi cuenta" else "Entrar",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            TextButton(onClick = { isRegistering = !isRegistering }, enabled = !isLoading) {
                Text(if (isRegistering) "Ya tengo una cuenta" else "Crear una cuenta nueva")
            }

            if (BuildConfig.CALLTEST_DEMO_MODE) {
                OutlinedButton(
                    onClick = {
                        SessionManager.saveSession(
                            context,
                            "mock-demo-jwt-token",
                            email = "demo@calltest.local",
                            name = "Usuario de demostración"
                        )
                        onLoginSuccess("demo@calltest.local")
                    },
                    enabled = !isLoading,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🧪")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Entrar al modo demostración")
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "Al continuar, aceptas los Términos de uso y la Política de privacidad de CallTest.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
