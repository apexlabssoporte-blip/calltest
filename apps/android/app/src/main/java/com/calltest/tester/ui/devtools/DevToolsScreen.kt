package com.calltest.tester.ui.devtools

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.calltest.tester.notifications.CallTestNotificationManager
import com.calltest.tester.ui.components.StandardDetailTopBar

@Composable
fun DevToolsScreen(
    currentStreakDays: Int,
    onUpdateStreak: (Int) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var simulatedStreak by remember { mutableStateOf(currentStreakDays) }

    Scaffold(
        topBar = {
            StandardDetailTopBar(
                title = "🛠️ Laboratorio de Pruebas",
                onBack = onBack
            )
        },
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(2.dp))

            // Hero Header
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "🧪", fontSize = 22.sp)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Sandbox de Pruebas CallTest",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Simula rachas, dispara notificaciones del sistema y valida el flujo completo.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            // ==========================================
            // SECCIÓN 1: SIMULADOR DE RACHAS Y DESBLOQUEOS
            // ==========================================
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "🔥 Simulador de Racha y Desbloqueos",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Cambia tu racha para ver cómo se desbloquean los evaluadores 13, 14 y 15 y las ranuras de apps:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = simulatedStreak == 1,
                            onClick = {
                                simulatedStreak = 1
                                onUpdateStreak(1)
                                Toast.makeText(context, "Racha cambiada a Día 1 (12 testers base)", Toast.LENGTH_SHORT).show()
                            },
                            label = { Text("Día 1 (12 Base)", fontSize = 10.sp) },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = simulatedStreak == 2,
                            onClick = {
                                simulatedStreak = 2
                                onUpdateStreak(2)
                                CallTestNotificationManager.sendBackupTesterUnlocked(context, 2, 13)
                                Toast.makeText(context, "🔥 Día 2: 13 testers + 1 App desbloqueada", Toast.LENGTH_SHORT).show()
                            },
                            label = { Text("Día 2 (13 Testers)", fontSize = 10.sp) },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = simulatedStreak == 5,
                            onClick = {
                                simulatedStreak = 5
                                onUpdateStreak(5)
                                CallTestNotificationManager.sendBackupTesterUnlocked(context, 5, 14)
                                Toast.makeText(context, "🔥 Día 5: 14 testers + Ranura 2 de App", Toast.LENGTH_SHORT).show()
                            },
                            label = { Text("Día 5 (14 Testers)", fontSize = 10.sp) },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = simulatedStreak == 10,
                            onClick = {
                                simulatedStreak = 10
                                onUpdateStreak(10)
                                CallTestNotificationManager.sendBackupTesterUnlocked(context, 10, 15)
                                Toast.makeText(context, "👑 Día 10: 15 testers + Ranura 3 de App", Toast.LENGTH_SHORT).show()
                            },
                            label = { Text("Día 10 (15 Testers)", fontSize = 10.sp) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // ==========================================
            // SECCIÓN 2: DISPARADOR DE TODAS LAS NOTIFICACIONES
            // ==========================================
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "📲 Disparador de Notificaciones Reales",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Prueba cómo llegan todas las alertas a la barra de estado de tu celular:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Notificación 1: Recordatorio Diario
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendDailyReminder(context, "Fintech Tracker", simulatedStreak, 3)
                            Toast.makeText(context, "🔔 Alerta de Recordatorio enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🔔 Recordatorio Diario (3 min pendientes)", fontSize = 12.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Notificación 2: Desbloqueo Tester de Respaldo
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendBackupTesterUnlocked(context, simulatedStreak, 13)
                            Toast.makeText(context, "🛡️ Alerta de Tester 13 enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🛡️ Desbloqueo Tester de Respaldo #13", fontSize = 12.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Notificación 3: Reseña Recibida
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendFeedbackReceived(
                                context = context,
                                appName = "Mi Super App",
                                testerName = "Elena M. (España 🇪🇸)",
                                rating = 5,
                                comment = "La app funciona perfecta en Android 15. ¡5 estrellas!"
                            )
                            Toast.makeText(context, "⭐ Alerta de Reseña enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("⭐ Nueva Reseña Recibida de Tester", fontSize = 12.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Spacer(modifier = Modifier.height(8.dp))

                    // Notificación Desescalada Día 2
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendDay2BackupTesterPausedNotice(context, "Mi Super App")
                            Toast.makeText(context, "🛡️ Alerta Día 2 (Pausa Tester Respaldo #15) enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🛡️ Desescalada Día 2 (1er Respaldo Pausado)", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    // Notificación Desescalada Día 3
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendDay3DeescalationWarning(context, "Mi Super App")
                            Toast.makeText(context, "⚠️ Alerta Día 3 (Pausa 50% testers) enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("⚠️ Desescalada Día 3 (50% Testers Pausados)", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Notificación Desescalada Día 4
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendDay4DeescalationWarning(context, "Mi Super App")
                            Toast.makeText(context, "⏸️ Alerta Día 4 (Pausa total 100%) enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("⏸️ Desescalada Día 4 (100% Testers Pausados)", color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 11.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Notificación Desescalada Día 5
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendDay5ReassignmentNotice(context, "Mi Super App")
                            Toast.makeText(context, "🔄 Alerta Día 5 (Reasignación comunitaria) enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🔄 Desescalada Día 5 (Reasignación Comunitaria)", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                    }

                    // Notificación 4: Actualización a los 12 Evaluadores
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendDeveloperCampaignUpdate(
                                context = context,
                                appName = "Mi Super App",
                                title = "🚀 Nueva Versión v1.2.0 Notificada",
                                message = "Tus 12 evaluadores recibirán la alerta para probar los cambios."
                            )
                            Toast.makeText(context, "🚀 Alerta de Nueva Versión enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🚀 Nueva Versión Notificada a los 12 Testers", color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Notificación para Testers Voluntarios: Nueva App Exclusiva
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendNewAppDiscoveryForVoluntaryTesters(
                                context = context,
                                appName = "Habit Hero 🌟",
                                category = "Productividad y Hábitos"
                            )
                            Toast.makeText(context, "✨ Alerta de Nueva App para Tester Voluntario enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("✨ Tester Voluntario: Nueva App Descubierta", color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Spacer(modifier = Modifier.height(8.dp))

                    // Notificación Post-Sesión SDK: Invitación a Dejar Opinión
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendPostSessionFeedbackPrompt(context, "Habit Hero 🌟")
                            Toast.makeText(context, "🌟 Alerta Post-Sesión (Feedback) enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🌟 Post-Sesión SDK: Pedir Opinión al Tester", color = MaterialTheme.colorScheme.onTertiaryContainer, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    // Notificación para Testers Voluntarios: Descubrimiento Semanal
                    Button(
                        onClick = {
                            CallTestNotificationManager.sendWeeklyDiscoveryRecommendation(context, 3)
                            Toast.makeText(context, "🎮 Alerta Semanal de Apps enviada", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("🎮 Tester Voluntario: Descubrimiento Semanal", color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
