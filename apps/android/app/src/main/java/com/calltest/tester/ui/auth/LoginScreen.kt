package com.calltest.tester.ui.auth

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.calltest.tester.BuildConfig
import com.calltest.tester.data.network.CallTestApiClient
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(onLoginSuccess: (String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }

    fun signInWithGoogle() {
        if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isBlank()) {
            Toast.makeText(context, "El acceso con Google aún no está configurado.", Toast.LENGTH_LONG).show()
            return
        }
        isLoading = true
        scope.launch {
            try {
                val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID).build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                val credential = CredentialManager.create(context)
                    .getCredential(context = context, request = request).credential
                if (credential !is CustomCredential ||
                    credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    error("Google no devolvió una cuenta válida.")
                }
                val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val result = CallTestApiClient.loginWithGoogle(context, googleCredential.idToken)
                if (result.isFailure) throw result.exceptionOrNull() ?: error("No se pudo iniciar sesión.")
                val email = result.getOrNull()?.user?.email.orEmpty()
                Toast.makeText(context, "Sesión iniciada.", Toast.LENGTH_SHORT).show()
                onLoginSuccess(email)
            } catch (error: Exception) {
                Toast.makeText(
                    context,
                    error.message ?: "No se pudo abrir el selector de cuentas de Google.",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(modifier = modifier.fillMaxSize()) { innerPadding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(innerPadding).padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(Modifier.height(30.dp))
            Box(
                modifier = Modifier.size(84.dp).clip(RoundedCornerShape(24.dp)).background(
                    Brush.linearGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.tertiary))
                ),
                contentAlignment = Alignment.Center
            ) { Text("CT", color = Color.White, fontWeight = FontWeight.Black, fontSize = 34.sp) }
            Spacer(Modifier.height(16.dp))
            Text("CallTest", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text(
                "Comunidad de evaluadores para Google Play",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(24.dp))
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Iniciar sesión", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Elige una cuenta de Google para entrar o crear tu cuenta de CallTest.")
                    Text(
                        "Al continuar, aceptas los Términos de uso y la Política de privacidad.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Row(Modifier.fillMaxWidth()) {
                        TextButton(onClick = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://calltest-api.onrender.com/terms")))
                        }) { Text("Ver términos") }
                        TextButton(onClick = {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://calltest-api.onrender.com/privacy")))
                        }) { Text("Ver privacidad") }
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            Button(
                onClick = { signInWithGoogle() }, enabled = !isLoading,
                shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                if (isLoading) CircularProgressIndicator(Modifier.size(24.dp), color = Color.White)
                else {
                    Text("G", fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Spacer(Modifier.size(10.dp))
                    Text("Continuar con Google", fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(14.dp))
            Text(
                "CallTest nunca recibe ni guarda tu contraseña de Google.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}
