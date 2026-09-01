package com.calltest.tester.ui.home

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.PickVisualMediaRequest
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.calltest.tester.ui.components.CallTestHeaderBar
import com.calltest.tester.ui.components.AppIconView
import com.calltest.tester.ui.components.EmptyStateView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    availableCampaigns: List<AvailableCampaign>,
    onJoinCampaign: (AvailableCampaign) -> Unit,
    isDeveloperMode: Boolean = true,
    onPublishAppClick: () -> Unit = {},
    onOpenProfile: () -> Unit,
    onOpenNotifications: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedAppForDownload by remember { mutableStateOf<AvailableCampaign?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var reportingLinkType by remember { mutableStateOf<String?>(null) }
    var reportErrorComment by remember { mutableStateOf("") }
    var reportErrorImageUri by remember { mutableStateOf<Uri?>(null) }
    var reportErrorImageName by remember { mutableStateOf<String?>(null) }

    val reportPhotoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        onResult = { uri ->
            if (uri != null) {
                reportErrorImageUri = uri
                reportErrorImageName = "error_${System.currentTimeMillis()}.jpg"
                Toast.makeText(context, "Captura del error adjuntada 📷✓", Toast.LENGTH_SHORT).show()
            }
        }
    )

    Scaffold(
        topBar = {
            CallTestHeaderBar(
                tier = "ACTIVE",
                onOpenProfile = onOpenProfile,
                onOpenNotifications = onOpenNotifications,
                unreadNotifications = 1
            )
        },
        modifier = modifier
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header Title unificado y claro
            item {
                Spacer(modifier = Modifier.height(2.dp))
                Column {
                    Text(
                        text = "Explorar Apps para Probar 🚀",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Prueba apps de la comunidad durante 14 días y acumula testers activos para publicar tu propia aplicación en Google Play.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Banner para Testers que quieran publicar su propia app
            if (!isDeveloperMode) {
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(text = "🚀", fontSize = 24.sp)
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "¿Creaste tu propia app Android?",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "Consigue 12 a 15 evaluadores para cumplir los 14 días de Google Play.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                            Button(
                                onClick = onPublishAppClick,
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text("Publicar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            if (availableCampaigns.isEmpty()) {
                item {
                    EmptyStateView(
                        title = "No hay nuevas apps disponibles",
                        description = "Vuelve a consultar más tarde para unirte a nuevos ciclos de prueba.",
                        icon = "⏳",
                        modifier = Modifier.padding(top = 20.dp)
                    )
                }
            } else {
                items(availableCampaigns) { app ->
                    ExploreAppCard(
                        app = app,
                        onViewLinks = { selectedAppForDownload = app }
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(20.dp))
            }
        }

        // ==========================================
        // MODAL BOTTOM SHEET: ENLACES DE DESCARGA
        // ==========================================
        if (selectedAppForDownload != null) {
            val app = selectedAppForDownload!!
            ModalBottomSheet(
                onDismissRequest = { selectedAppForDownload = null },
                sheetState = sheetState,
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
            ) {
                DownloadLinksModalContent(
                    app = app,
                    onOpenGroup = { url -> openExternalUrl(context, url) },
                    onOpenPlayStore = { url -> openExternalUrl(context, url) },
                    onLaunchApp = { packageName, appName -> launchExternalApp(context, packageName, appName) },
                    onReportLink = { linkType ->
                        reportErrorComment = ""
                        reportErrorImageUri = null
                        reportErrorImageName = null
                        reportingLinkType = linkType
                    },
                    onAutoJoinInstalled = {
                        onJoinCampaign(app)
                        selectedAppForDownload = null
                        Toast.makeText(context, "¡App detectada! Te has unido automáticamente a la prueba de ${app.appName}. Ve a 'Misiones' para tu tarea de hoy.", Toast.LENGTH_LONG).show()
                    },
                    onClose = { selectedAppForDownload = null }
                )
            }
        }

        // ==========================================
        // DIÁLOGO DE REPORTE DE ENLACES CON FOTO Y COMENTARIO
        // ==========================================
        if (reportingLinkType != null) {
            val linkName = reportingLinkType!!
            AlertDialog(
                onDismissRequest = { reportingLinkType = null },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🚩", fontSize = 22.sp)
                        Text(
                            text = "Reportar Enlace ($linkName)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                text = {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Cuéntanos qué problema tuviste al intentar abrir este enlace para que el desarrollador lo solucione:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        OutlinedTextField(
                            value = reportErrorComment,
                            onValueChange = { reportErrorComment = it },
                            placeholder = { Text("Describe el error (ej: 'Acceso denegado en el grupo' o 'No disponible en Play Store')...", fontSize = 12.sp) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(110.dp),
                            shape = RoundedCornerShape(10.dp),
                            textStyle = MaterialTheme.typography.bodyMedium
                        )

                        if (reportErrorImageName != null) {
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
                                            text = "📎 $reportErrorImageName",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                        Text(
                                            text = "Captura de pantalla adjuntada ✓",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                    TextButton(
                                        onClick = {
                                            reportPhotoPickerLauncher.launch(
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
                                    reportPhotoPickerLauncher.launch(
                                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                    )
                                },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(text = "📷 Adjuntar Captura del Error (Opcional)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val target = reportingLinkType ?: "enlace"
                            reportingLinkType = null
                            Toast.makeText(
                                context,
                                "✓ Reporte de $target enviado con éxito. El equipo y el desarrollador lo verificarán.",
                                Toast.LENGTH_LONG
                            ).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Text("Enviar Reporte 🚩", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { reportingLinkType = null }) {
                        Text("Cancelar")
                    }
                }
            )
        }
    }
}

@Composable
fun ExploreAppCard(
    app: AvailableCampaign,
    onViewLinks: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onViewLinks() }
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                AppIconView(
                    packageName = app.packageName,
                    fallbackEmoji = if (app.appName.contains("Fintech")) "📊" else if (app.appName.contains("Habit")) "🔥" else if (app.appName.contains("Zen")) "⏱️" else "📲",
                    modifier = Modifier.size(48.dp)
                )

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = app.appName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = app.developerName.ifEmpty { "Desarrollador Verificado" },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Cycle Days Badge
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "14 DÍAS",
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = app.appDescription ?: "Prueba de 14 días para Google Play Closed Beta con misiones diarias guiadas.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Quedan ${app.targetTesters - app.activeTestersCount} lugares",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f, fill = false),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Button(
                    onClick = onViewLinks,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(
                        text = "Descargar 📥",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
fun DownloadLinksModalContent(
    app: AvailableCampaign,
    onOpenGroup: (String) -> Unit,
    onOpenPlayStore: (String) -> Unit,
    onLaunchApp: (String, String) -> Unit,
    onReportLink: (String) -> Unit,
    onAutoJoinInstalled: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val googleGroupUrl = app.googleGroupUrl ?: "https://groups.google.com/g/calltest-testers"
    val playStoreUrl = app.playStoreAppUrl ?: app.playStoreWebUrl ?: "https://play.google.com/apps/testing/${app.packageName}"

    var isAppInstalledOnDevice by remember { mutableStateOf(checkIfAppIsInstalled(context, app.packageName)) }

    // Re-check installation whenever user returns from Play Store back to CallTest and AUTO-JOIN
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                val installed = checkIfAppIsInstalled(context, app.packageName)
                isAppInstalledOnDevice = installed
                if (installed) {
                    onAutoJoinInstalled()
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp)
    ) {
        // App header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text(text = "📲", fontSize = 26.sp)
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = app.appName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Prueba de 14 Días • Google Play",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "14 DÍAS",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "Pasos obligatorios de Google Play para Closed Beta:",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Paso 1: Grupo de Google
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "Paso 1: Unirse al Grupo de Google 👥",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Google Play requiere pertenecer al grupo de evaluadores autorizados.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { onOpenGroup(googleGroupUrl) },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(text = "1. Abrir Grupo 🔗", maxLines = 1)
                    }
                    TextButton(
                        onClick = { onReportLink("Grupo de Google") }
                    ) {
                        Text(
                            text = "⚠️ Reportar",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error,
                            maxLines = 1
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Paso 2: Google Play Store
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isAppInstalledOnDevice) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surfaceVariant
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isAppInstalledOnDevice) "Paso 2: Aplicación Instalada ✓" else "Paso 2: Descargar en Google Play 🛒",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (isAppInstalledOnDevice) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                    )
                    if (isAppInstalledOnDevice) {
                        Surface(
                            color = MaterialTheme.colorScheme.primary,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = "INSTALADA",
                                color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Text(
                    text = if (isAppInstalledOnDevice) "¡App detectada! Entrando a la prueba automáticamente..." else "Acepta la invitación en Play Store y descarga la aplicación. Al instalarse, entrarás a la prueba automáticamente.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(10.dp))

                if (isAppInstalledOnDevice) {
                    // Si ya está instalada, botón de unirse de inmediato
                    Button(
                        onClick = onAutoJoinInstalled,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "✓ Comenzar Prueba Ahora 🚀", fontWeight = FontWeight.Bold)
                    }
                } else {
                    // Si no está instalada, botón para abrir Play Store
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = { onOpenPlayStore(playStoreUrl) },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(text = "2. Abrir Play Store 📥", maxLines = 1)
                        }
                        TextButton(
                            onClick = { onReportLink("Play Store") }
                        ) {
                            Text(
                                text = "⚠️ Reportar",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
    }
}

fun checkIfAppIsInstalled(context: Context, packageName: String): Boolean {
    return try {
        context.packageManager.getPackageInfo(packageName, 0)
        true
    } catch (e: PackageManager.NameNotFoundException) {
        false
    } catch (e: Exception) {
        false
    }
}

private fun openExternalUrl(context: Context, url: String) {
    try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    } catch (e: Exception) {
        Toast.makeText(context, "No se pudo abrir el enlace: $url", Toast.LENGTH_SHORT).show()
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
