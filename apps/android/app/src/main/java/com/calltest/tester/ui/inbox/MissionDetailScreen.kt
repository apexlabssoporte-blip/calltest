package com.calltest.tester.ui.inbox

import android.content.Context
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.calltest.tester.ui.campaigns.TesterMissionItem
import com.calltest.tester.ui.components.CallTestTopBar
import com.calltest.tester.ui.components.PriorityBadge
import com.calltest.tester.ui.components.StatusBadge

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionDetailScreen(
    mission: TesterMissionItem,
    appName: String = "Fintech Tracker",
    packageName: String = "com.fintech.tracker",
    hasCallTestSdk: Boolean = false,
    onSubmitAttempt: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedEvidenceUri by remember { mutableStateOf<Uri?>(null) }
    var isReportModalOpen by remember { mutableStateOf(false) }
    var reportReason by remember { mutableStateOf("FOTO_PERSONAL") }
    var reportMissionComment by remember { mutableStateOf("") }
    var reportMissionImageUri by remember { mutableStateOf<Uri?>(null) }
    var reportMissionImageName by remember { mutableStateOf<String?>(null) }
    var selectedEvidenceName by remember { mutableStateOf<String?>(null) }

    val reportMissionPhotoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri ->
            if (uri != null) {
                reportMissionImageUri = uri
                reportMissionImageName = "reporte_mision_${System.currentTimeMillis()}.jpg"
                Toast.makeText(context, "Captura del problema adjuntada 📷✓", Toast.LENGTH_SHORT).show()
            }
        }
    )

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri ->
            if (uri != null) {
                selectedEvidenceUri = uri
                selectedEvidenceName = "captura_pantalla_${System.currentTimeMillis()}.jpg"
                Toast.makeText(context, "¡Captura seleccionada de tu galería! 📷✓", Toast.LENGTH_SHORT).show()
            }
        }
    )
    var isSubmitted by remember { mutableStateOf(mission.attemptStatus == "VALIDATED" || mission.attemptStatus == "COMPLETED") }
    var isFeedbackModalOpen by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Feedback state
    var rating by remember { mutableStateOf(0) }
    var feedbackComment by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            CallTestTopBar(
                title = "Misión de Hoy",
                subtitle = appName,
                onBack = onBack
            )
        },
        modifier = modifier
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = mission.title,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        StatusBadge(status = if (isSubmitted) "COMPLETED" else (mission.attemptStatus ?: "AVAILABLE"))
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PriorityBadge(priority = mission.difficulty)
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "⏱ 3 min de prueba requeridos",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        if (hasCallTestSdk) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "⚡ Verificación SDK",
                                    color = MaterialTheme.colorScheme.primary,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Card de Contador de Tiempo de Prueba: "Llevas X min de 3 min"
            var sessionMinutesCompleted by remember { mutableStateOf(2) } // Simulación de 2 de 3 min
            val targetMinutes = 3
            val isTargetTimeReached = sessionMinutesCompleted >= targetMinutes
            val timeProgress = (sessionMinutesCompleted.toFloat() / targetMinutes.toFloat()).coerceIn(0f, 1f)

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isTargetTimeReached) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(text = "⏱️", fontSize = 20.sp)
                            Text(
                                text = "Tiempo de prueba hoy",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Surface(
                            color = if (isTargetTimeReached) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "Llevas $sessionMinutesCompleted min de $targetMinutes min",
                                color = if (isTargetTimeReached) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    LinearProgressIndicator(
                        progress = { timeProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = if (isTargetTimeReached) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (isTargetTimeReached) "✓ ¡Excelente! Has cumplido los 3 minutos de prueba necesarios para Google Play." else "💡 Abre $appName y úsala al menos 3 minutos para registrar una prueba de alta calidad.",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isTargetTimeReached) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Direct Launch App Button
            Button(
                onClick = { launchExternalApp(context, packageName, appName) },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "🚀 Abrir $appName en mi teléfono",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelLarge
                )
            }

            // Objective & Instructions
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Objetivo de la Prueba",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = mission.objective,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    if (mission.evidenceInstructions != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Instrucciones del Desarrollador",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = mission.evidenceInstructions,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Verification Section (Conditional by SDK presence)
            if (hasCallTestSdk) {
                // CASO A: TIENE SDK (Verificación Automática)
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(text = "⚡", fontSize = 28.sp)
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Verificación Automática por SDK",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Text(
                                text = "No necesitas tomar ni subir capturas de pantalla. El SDK integrado en $appName validará automáticamente tu sesión y tiempo de uso.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else if (mission.requiresEvidence) {
                // CASO B: NO TIENE SDK (Requiere Captura Manual)
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Captura de Pantalla Requerida",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "📷 Manual",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Toma una captura completa de la app donde se aprecie la tarea realizada sin recortar los bordes (PNG/JPEG, máx 10 MB).",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        if (selectedEvidenceName != null) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "📎 $selectedEvidenceName",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                        Text(
                                            text = "Captura lista para enviar ✓",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                    TextButton(
                                        onClick = {
                                            photoPickerLauncher.launch(
                                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                            )
                                        }
                                    ) {
                                        Text("Cambiar 🔄", fontSize = 12.sp)
                                    }
                                }
                            }
                        } else {
                            Button(
                                onClick = {
                                    photoPickerLauncher.launch(
                                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                    )
                                },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(text = "📷 Abrir Galería y Seleccionar Captura", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Action button
            if (isSubmitted) {
                Button(
                    onClick = onBack,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(text = "Misión Completada — Regresar a Mis Apps ✓")
                }
            } else {
                Button(
                    onClick = {
                        isFeedbackModalOpen = true
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (hasCallTestSdk) "Confirmar y Validar por SDK ⚡" else "Completar Misión de Hoy 🚀",
                        fontWeight = FontWeight.Bold
                    )
                }
            }

                        if (!isSubmitted) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    TextButton(
                        onClick = { isReportModalOpen = true }
                    ) {
                        Text(
                            text = "Reportar Misión",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }

        // ==========================================
        // MODAL DE REPORTE DE PRIVACIDAD / MISIÓN / ENLACES CON FOTO Y COMENTARIO
        // ==========================================
        if (isReportModalOpen) {
            AlertDialog(
                onDismissRequest = { isReportModalOpen = false },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🚩", fontSize = 22.sp)
                        Text(text = "Reportar Misión o Enlace", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Describe el problema o error encontrado (ej: enlace caído, solicitud indebida, crash en la app):",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        OutlinedTextField(
                            value = reportMissionComment,
                            onValueChange = { reportMissionComment = it },
                            placeholder = { Text("Describe el error o motivo del reporte...", fontSize = 12.sp) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(100.dp),
                            shape = RoundedCornerShape(10.dp),
                            textStyle = MaterialTheme.typography.bodyMedium
                        )

                        if (reportMissionImageName != null) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "📎 $reportMissionImageName",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                        Text(
                                            text = "Captura de error adjuntada ✓",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                    TextButton(
                                        onClick = {
                                            reportMissionPhotoPickerLauncher.launch(
                                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                            )
                                        }
                                    ) {
                                        Text("Cambiar 🔄", fontSize = 11.sp)
                                    }
                                }
                            }
                        } else {
                            OutlinedButton(
                                onClick = {
                                    reportMissionPhotoPickerLauncher.launch(
                                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                    )
                                },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(text = "📷 Adjuntar Captura del Error (Opcional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        Text(
                            text = "🛡️ Al reportar, tu racha se mantendrá protegida con 3 minutos de uso libre.",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            isReportModalOpen = false
                            reportMissionComment = ""
                            reportMissionImageUri = null
                            reportMissionImageName = null
                            Toast.makeText(context, "🚩 Reporte enviado con éxito. Misión convertida a 3 min de uso libre.", Toast.LENGTH_LONG).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Text("Enviar Reporte 🚩", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { isReportModalOpen = false }) {
                        Text("Cancelar")
                    }
                }
            )
        }

        // ==========================================
        // MODAL POST-MISIÓN (CELEBRACIÓN Y FEEDBACK)
        // ==========================================
        if (isFeedbackModalOpen) {
            ModalBottomSheet(
                onDismissRequest = {
                    isFeedbackModalOpen = false
                    isSubmitted = true
                    onSubmitAttempt(mission.id)
                    onBack()
                },
                sheetState = sheetState,
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 16.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(text = "🎉", fontSize = 44.sp)

                    Text(
                        text = "¡Misión Completada con Éxito!",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = "Has registrado tu actividad del día en $appName.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "¿Cómo calificarías tu prueba de hoy?",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )

                    val currentLength = feedbackComment.trim().length
                    val isFeedbackValid = rating > 0 && currentLength >= 1

                    // Interactive Star Rating (Starts at 0 to motivate user choice)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        (1..5).forEach { star ->
                            Text(
                                text = if (star <= rating) "⭐" else "☆",
                                fontSize = 38.sp,
                                modifier = Modifier.clickable { rating = star }
                            )
                        }
                    }

                    Text(
                        text = when (rating) {
                            5 -> "🌟 ¡Excelente! App fluida y lista para publicar"
                            4 -> "🚀 Muy buena experiencia, detalles menores"
                            3 -> "👍 Aceptable / Regular"
                            2 -> "🛠️ Necesita mejoras en diseño o velocidad"
                            1 -> "⚠️ Encontré fallas graves o bloqueos"
                            else -> "Toca las estrellas según cómo sentiste la app hoy 👇"
                        },
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (rating > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    // Tarjeta de Impacto Comunitario
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(text = "💡", fontSize = 18.sp)
                            Text(
                                text = "Tu opinión sincera le permite al desarrollador saber qué mejorar antes de lanzar en Google Play.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontSize = 11.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    val dynamicPrompt = when (rating) {
                        5 -> "¿Qué fue lo que más te gustó o destacó al probar la app hoy?"
                        4 -> "¿Qué pequeño detalle crees que podría mejorar para ser perfecta?"
                        3 -> "¿Qué funciones sentiste incompletas o qué mejorarías?"
                        2, 1 -> "¿Qué error, fallo o lentitud encontraste al probar la app?"
                        else -> "Cuéntanos qué probaste hoy y tu opinión sincera..."
                    }

                    // Textarea for feedback (Obligatorio, sin respuestas automáticas prefabricadas)
                    OutlinedTextField(
                        value = feedbackComment,
                        onValueChange = { feedbackComment = it },
                        label = { Text("Escribe tu opinión sincera *") },
                        placeholder = { Text(dynamicPrompt) },
                        minLines = 3,
                        maxLines = 6,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (rating == 0) "⚠️ Toca las estrellas arriba" else if (currentLength < 1) "💬 Nos gustaría saber tu opinión" else "✓ Opinión lista para enviar",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isFeedbackValid) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp
                        )

                        Text(
                            text = "$currentLength letras",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 10.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Button(
                        onClick = {
                            if (isFeedbackValid) {
                                isFeedbackModalOpen = false
                                isSubmitted = true
                                onSubmitAttempt(mission.id)
                                Toast.makeText(context, "¡Gracias! Tu reseña fue enviada al desarrollador.", Toast.LENGTH_SHORT).show()
                                onBack()
                            }
                        },
                        enabled = isFeedbackValid,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "Guardar y Completar Misión ✓", fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

private fun launchExternalApp(context: Context, packageName: String, appName: String) {
    try {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        if (launchIntent != null) {
            context.startActivity(launchIntent)
        } else {
            Toast.makeText(context, "$appName no está instalada en tu dispositivo.", Toast.LENGTH_LONG).show()
        }
    } catch (e: Exception) {
        Toast.makeText(context, "No se pudo abrir $appName", Toast.LENGTH_SHORT).show()
    }
}
