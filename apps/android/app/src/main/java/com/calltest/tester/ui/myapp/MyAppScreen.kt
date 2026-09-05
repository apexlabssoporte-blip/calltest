package com.calltest.tester.ui.myapp

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.toMutableStateList
import com.calltest.tester.i18n.AppLanguage
import com.calltest.tester.i18n.LanguageManager
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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.calltest.tester.i18n.LocalAppStrings
import com.calltest.tester.notifications.CallTestNotificationManager
import com.calltest.tester.ui.components.CallTestHeaderBar
import com.calltest.tester.ui.campaigns.TesterMissionItem

enum class DevSubTab(val icon: String) {
    SUMMARY("📊"),
    TESTERS("👥"),
    REVIEWS("💬")
}

enum class TesterFilter {
    ALL,
    TODAY_COMPLETED,
    TODAY_PENDING
}

data class AssignedTesterItem(
    val id: String,
    val alias: String,
    val tier: String,
    val deviceModel: String,
    val daysCompleted: Int,
    val totalDays: Int = 14,
    val todayMinutes: Double,
    val totalMinutes: Double,
    val isTodayCompleted: Boolean,
    val isSdkMeasured: Boolean = true
)

data class TesterFeedbackItem(
    val id: String,
    val testerAlias: String,
    val rating: Int,
    val comment: String,
    val translatedComment: String = "",
    val originalLanguage: String = "EN",
    val deviceModel: String,
    val date: String
)

data class DeveloperAppCampaign(
    val id: String,
    val appName: String,
    val packageName: String,
    val category: String = "Productividad ⚡",
    val description: String = "",
    val currentDay: Int = 1,
    val totalDays: Int = 14,
    val activeTestersCount: Int = 0,
    val targetTesters: Int = 12,
    val externalTestersCount: Int = 0,
    val generatedMissions: List<TesterMissionItem> = emptyList(),
    val feedbackList: List<TesterFeedbackItem> = emptyList(),
    val status: String = "ACTIVE",
    val assignedTesters: List<AssignedTesterItem> = emptyList()
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyAppScreen(
    publishedApps: List<DeveloperAppCampaign>,
    currentStreakDays: Int = 6,
    initialWizardOpen: Boolean = false,
    onCreateAppCampaign: (String, String, String, String, String, Int, List<TesterMissionItem>) -> Unit,
    onOpenProfile: () -> Unit,
    onOpenNotifications: () -> Unit,
    onCancelWizard: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val strings = LocalAppStrings.current
    var isPublishModalOpen by remember(initialWizardOpen) { mutableStateOf(initialWizardOpen) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var selectedAppId by remember(publishedApps) {
        mutableStateOf(publishedApps.firstOrNull()?.id)
    }

    val selectedApp = remember(selectedAppId, publishedApps) {
        publishedApps.find { it.id == selectedAppId } ?: publishedApps.firstOrNull()
    }

    var activeSubTab by remember { mutableStateOf(DevSubTab.SUMMARY) }
    var activeTesterFilter by remember { mutableStateOf(TesterFilter.ALL) }
    var isBackupInfoModalOpen by remember { mutableStateOf(false) }
    var isEditNameModalOpen by remember { mutableStateOf(false) }
    var editedAppNameInput by remember { mutableStateOf("") }
    var isApprovalModalOpen by remember { mutableStateOf(false) }
    var isRequestMoreTestsModalOpen by remember { mutableStateOf(false) }

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
        if (publishedApps.isEmpty()) {
            // Empty State: Primera Publicación
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "🚀", fontSize = 38.sp)
                }

                Spacer(modifier = Modifier.height(18.dp))

                Text(
                    text = strings.appDashboardTitle,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = strings.appDashboardSubtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(28.dp))

                Button(
                    onClick = { isPublishModalOpen = true },
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = strings.publishFirstAppBtn,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        } else {
            val developerApp = selectedApp ?: publishedApps.first()
            val completedTodayCount = developerApp.assignedTesters.count { it.isTodayCompleted }
            val pendingTodayCount = developerApp.assignedTesters.size - completedTodayCount

            val filteredTesters = when (activeTesterFilter) {
                TesterFilter.ALL -> developerApp.assignedTesters
                TesterFilter.TODAY_COMPLETED -> developerApp.assignedTesters.filter { it.isTodayCompleted }
                TesterFilter.TODAY_PENDING -> developerApp.assignedTesters.filter { !it.isTodayCompleted }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    Spacer(modifier = Modifier.height(4.dp))

                    // ==========================================
                    // CABECERA CON NOMBRE Y SELECTOR DE RANURAS
                    // ==========================================
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = developerApp.appName,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Black
                                )
                                IconButton(
                                    onClick = {
                                        editedAppNameInput = developerApp.appName
                                        isEditNameModalOpen = true
                                    },
                                    modifier = Modifier.size(26.dp)
                                ) {
                                    Text(text = "✏️", fontSize = 14.sp)
                                }
                            }
                            Text(
                                text = developerApp.packageName,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = "🟢 EN PRUEBA",
                                color = MaterialTheme.colorScheme.primary,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                // ==========================================
                // SELECTOR DE RANURAS DE APLICACIONES (SLOTS)
                // ==========================================
                item {
                    val maxSlotsUnlocked = if (currentStreakDays >= 10) 3 else if (currentStreakDays >= 5) 2 else 1

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Tus Aplicaciones en Prueba (${publishedApps.size}/$maxSlotsUnlocked ranuras)",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            // Ranuras ocupadas
                            items(publishedApps) { app ->
                                val isSelected = app.id == (selectedApp?.id ?: publishedApps.first().id)
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                                    ),
                                    elevation = CardDefaults.cardElevation(defaultElevation = if (isSelected) 3.dp else 1.dp),
                                    modifier = Modifier
                                        .width(170.dp)
                                        .clickable { selectedAppId = app.id }
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Surface(
                                                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Text(
                                                    text = "🟢 Activa",
                                                    color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                                    style = MaterialTheme.typography.labelSmall,
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                            Text(text = "Día ${app.currentDay}/14", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                        }

                                        Spacer(modifier = Modifier.height(6.dp))

                                        Text(
                                            text = app.appName,
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = "${app.activeTestersCount}/${app.targetTesters} testers",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontSize = 10.sp
                                        )
                                    }
                                }
                            }

                            // Ranura Disponible para Publicar
                            if (publishedApps.size < maxSlotsUnlocked) {
                                item {
                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                                        ),
                                        modifier = Modifier
                                            .width(170.dp)
                                            .clickable { isPublishModalOpen = true }
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(12.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.Center
                                        ) {
                                            Text(text = "➕", fontSize = 20.sp)
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "Ranura ${publishedApps.size + 1} Disponible",
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            Text(
                                                text = "Toca para publicar",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                fontSize = 9.sp
                                            )
                                        }
                                    }
                                }
                            }

                            // Ranuras Bloqueadas por Racha
                            val totalPossibleSlots = 3
                            for (slotIdx in (maxSlotsUnlocked + 1)..totalPossibleSlots) {
                                item {
                                    val reqDays = if (slotIdx == 2) 5 else 10
                                    Card(
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                                        ),
                                        modifier = Modifier.width(160.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(text = "Ranura $slotIdx", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                Text(text = "🔒", fontSize = 12.sp)
                                            }
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "Bloqueada",
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                            Text(
                                                text = "Racha de $reqDays días",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.primary,
                                                fontSize = 9.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ==========================================
                // 1. PANEL DE 3 KPIS GIGANTES
                // ==========================================
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // KPI 1: DÍA
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(text = "📅 DÍA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "${developerApp.currentDay}/${developerApp.totalDays}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "${((developerApp.currentDay.toFloat() / developerApp.totalDays) * 100).toInt()}% listo",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.secondary,
                                    fontSize = 10.sp
                                )
                            }
                        }

                        val maxUnlockedTesters = if (currentStreakDays >= 10) 15 else if (currentStreakDays >= 5) 14 else if (currentStreakDays >= 2) 13 else 12
                        val shieldLabel = if (currentStreakDays >= 10) "🛡️ 15 Testers (Máx)" else if (currentStreakDays >= 5) "🛡️ 14 Testers" else if (currentStreakDays >= 2) "🛡️ 13 Testers" else "12 Base"

                        // KPI 2: TESTERS ACTIVOS HOY
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(text = "👥 HOY", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "$completedTodayCount/$maxUnlockedTesters",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Black,
                                    color = if (completedTodayCount >= 12) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary
                                )
                                Text(
                                    text = shieldLabel,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 9.sp
                                )
                            }
                        }

                        // KPI 3: PROMEDIO POR SESIÓN
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(text = "⏱️ SESIÓN", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "3.8 min",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "Meta: >3.0 min",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }

                // ==========================================
                // TARJETA DE ESCUDO DE TESTERS DE RESPALDO
                // ==========================================
                item {
                    val maxUnlockedTesters = if (currentStreakDays >= 10) 15 else if (currentStreakDays >= 5) 14 else if (currentStreakDays >= 2) 13 else 12
                    val backupCount = (maxUnlockedTesters - 12).coerceAtLeast(0)

                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
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
                                    Text(text = "🛡️", fontSize = 22.sp)
                                    Column {
                                        Text(
                                            text = "Escudo de Testers de Respaldo",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "$backupCount de 3 respaldos activos ($maxUnlockedTesters testers en total)",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }

                                Surface(
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        text = if (backupCount == 3) "👑 Máximo" else "Nivel $backupCount",
                                        color = MaterialTheme.colorScheme.primary,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            LinearProgressIndicator(
                                progress = { maxUnlockedTesters / 15f },
                                modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                color = MaterialTheme.colorScheme.primary,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TextButton(onClick = { isBackupInfoModalOpen = true }) {
                                    Text("ℹ️ ¿Cómo desbloquear más respaldos?", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }


                            }
                        }
                    }
                }

                // ==========================================
                // 2. TARJETA DE ESTADO INTELIGENTE DEL DÍA
                // ==========================================
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(text = if (pendingTodayCount == 0) "🎉" else "⏳", fontSize = 22.sp)
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (pendingTodayCount == 0) "¡Excelente ritmo hoy!" else "Recordatorios programados",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = if (pendingTodayCount == 0)
                                        "Todos tus evaluadores ya completaron su sesión diaria de 3 min."
                                    else
                                        "$completedTodayCount evaluadores listos hoy. Los $pendingTodayCount restantes recibirán alerta automática.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                // ==========================================
                // 3. SELECTOR DE 3 SUB-PESTAÑAS
                // ==========================================
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        DevSubTab.entries.forEach { tab ->
                            val isSelected = activeSubTab == tab
                            val title = when (tab) {
                                DevSubTab.SUMMARY -> strings.subTabSummary
                                DevSubTab.TESTERS -> strings.subTabTesters
                                DevSubTab.REVIEWS -> strings.subTabReviews
                            }
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSelected) MaterialTheme.colorScheme.surface else Color.Transparent,
                                shadowElevation = if (isSelected) 2.dp else 0.dp,
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { activeSubTab = tab }
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 10.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = tab.icon, fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = title,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        fontSize = 10.5.sp,
                                        softWrap = false
                                    )
                                }
                            }
                        }
                    }
                }

                // ==========================================
                // SUB-PESTAÑA 1: RESUMEN Y SALUD GOOGLE PLAY
                // ==========================================
                if (activeSubTab == DevSubTab.SUMMARY) {
                    item {
                        // Termómetro con Anillo Visual
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(18.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = "🛡️", fontSize = 20.sp)
                                        Text(
                                            text = strings.healthCardTitle,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    Surface(
                                        color = MaterialTheme.colorScheme.primaryContainer,
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(
                                            text = strings.healthCardStatus,
                                            color = MaterialTheme.colorScheme.primary,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                // Checklist de Requisitos
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = "✓", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        Text(text = strings.healthCheckGroup, style = MaterialTheme.typography.bodySmall)
                                    }
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = "✓", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        Text(text = "${developerApp.currentDay}/14 ${strings.healthCheckDays}", style = MaterialTheme.typography.bodySmall)
                                    }
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = "✓", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        Text(text = strings.healthCheckSession, style = MaterialTheme.typography.bodySmall)
                                    }
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = "✓", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        Text(text = strings.healthCheckCrashes, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }

                    // Matriz de Dispositivos y Estabilidad
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(text = "📱 ${strings.deviceMatrixTitle}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(text = "• Samsung (4)\n• Xiaomi (3)\n• Motorola (3)\n• Pixel (2)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }

                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(text = "⚡ ${strings.stabilityTitle}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(text = strings.stabilityRate, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                    Text(text = "0 caídas en 72 sesiones", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    // Botón de Notificar Nueva Versión
                    item {
                        Button(
                            onClick = {
                                CallTestNotificationManager.sendDeveloperCampaignUpdate(
                                    context = context,
                                    appName = developerApp.appName,
                                    title = "🚀 Nueva Versión Notificada",
                                    message = "Tus 12 evaluadores recibirán la alerta para probar la versión actualizada de ${developerApp.appName}."
                                )
                                Toast.makeText(context, strings.notifyUpdateSuccess, Toast.LENGTH_LONG).show()
                            },
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(text = strings.notifyUpdateBtn, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(vertical = 4.dp))
                        }
                    }
                }

                // ==========================================
                // SUB-PESTAÑA 2: 12 EVALUADORES (SDK)
                // ==========================================
                else if (activeSubTab == DevSubTab.TESTERS) {
                    item {
                        // Filtros rápidos
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            FilterChip(
                                selected = activeTesterFilter == TesterFilter.ALL,
                                onClick = { activeTesterFilter = TesterFilter.ALL },
                                label = { Text("Todos (${developerApp.assignedTesters.size})", fontSize = 11.sp) }
                            )
                            FilterChip(
                                selected = activeTesterFilter == TesterFilter.TODAY_COMPLETED,
                                onClick = { activeTesterFilter = TesterFilter.TODAY_COMPLETED },
                                label = { Text("✓ Hoy ($completedTodayCount)", fontSize = 11.sp) }
                            )
                            FilterChip(
                                selected = activeTesterFilter == TesterFilter.TODAY_PENDING,
                                onClick = { activeTesterFilter = TesterFilter.TODAY_PENDING },
                                label = { Text("⏳ Pendientes ($pendingTodayCount)", fontSize = 11.sp) }
                            )
                        }
                    }



                    items(filteredTesters) { tester ->
                        val daysProgress = tester.daysCompleted.toFloat() / tester.totalDays.coerceAtLeast(1)

                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(MaterialTheme.colorScheme.primaryContainer),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(text = tester.alias.take(1), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                        }

                                        Column {
                                            Text(text = tester.alias, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                            Text(text = tester.deviceModel, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }

                                    Surface(
                                        color = if (tester.isTodayCompleted) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(
                                            text = if (tester.isTodayCompleted) "${strings.todayCompleted}: ${tester.todayMinutes} min" else strings.todayPending,
                                            color = if (tester.isTodayCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(text = "${strings.daysProgressLabel}: ${tester.daysCompleted}/${tester.totalDays}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                                    Text(text = "⏱️ ${tester.totalMinutes} min ${strings.totalMinutesLabel}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                LinearProgressIndicator(
                                    progress = { daysProgress },
                                    modifier = Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)),
                                    color = if (tester.isTodayCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )

                                Spacer(modifier = Modifier.height(6.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(text = if (tester.isSdkMeasured) strings.sdkMeasuredLabel else strings.manualCaptureLabel, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(text = "Rango: ${tester.tier}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }

                // ==========================================
                // SUB-PESTAÑA 3: OPINIONES Y SUGERENCIAS (CON TRADUCCIÓN I18N)
                // ==========================================
                else if (activeSubTab == DevSubTab.REVIEWS) {
                    val mockFeedback = listOf(
                        TesterFeedbackItem(
                            id = "fb-1",
                            testerAlias = "John S. (USA 🇺🇸)",
                            rating = 5,
                            comment = "The app is super smooth and the navigation feels native. Tested on Pixel 8 without any crash.",
                            translatedComment = "La aplicación es súper fluida y la navegación se siente nativa. Probado en Pixel 8 sin ninguna caída.",
                            originalLanguage = "EN",
                            deviceModel = "Google Pixel 8",
                            date = "Hoy 10:30"
                        ),
                        TesterFeedbackItem(
                            id = "fb-2",
                            testerAlias = "Elena M. (España 🇪🇸)",
                            rating = 5,
                            comment = "Todo funcionó excelente en Android 15. El botón de guardar responde muy rápido.",
                            translatedComment = "Todo funcionó excelente en Android 15. El botón de guardar responde muy rápido.",
                            originalLanguage = "ES",
                            deviceModel = "Samsung Galaxy S23",
                            date = "Hoy 09:15"
                        ),
                        TesterFeedbackItem(
                            id = "fb-3",
                            testerAlias = "Lucas B. (Brasil 🇧🇷)",
                            rating = 4,
                            comment = "Ótimo aplicativo. Sugiro adicionar suporte a modo escuro automático.",
                            translatedComment = "Excelente aplicación. Sugiero agregar soporte para modo oscuro automático.",
                            originalLanguage = "PT",
                            deviceModel = "Motorola Edge 40",
                            date = "Ayer 18:40"
                        )
                    )

                    items(mockFeedback) { fb ->
                        var isTranslated by remember { mutableStateOf(false) }

                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(text = fb.testerAlias, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                                        Surface(
                                            color = MaterialTheme.colorScheme.surfaceVariant,
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                text = fb.originalLanguage,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Text(text = "⭐".repeat(fb.rating), fontSize = 13.sp)
                                }

                                Text(text = "${fb.deviceModel} • ${fb.date}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                
                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = if (isTranslated && fb.translatedComment.isNotEmpty()) fb.translatedComment else fb.comment,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface
                                )

                                if (isTranslated && fb.originalLanguage != "ES") {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "✨ Traducido automáticamente por CallTest i18n",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontSize = 10.sp
                                    )
                                }

                                if (fb.originalLanguage != "ES") {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.End
                                    ) {
                                        OutlinedButton(
                                            onClick = { isTranslated = !isTranslated },
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.height(32.dp)
                                        ) {
                                            Text(
                                                text = if (isTranslated) "🌐 Ver Original (${fb.originalLanguage})" else "🌐 Traducir al Español",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(20.dp))
                }
            }
        }

        // ==========================================
        // MODAL DIALOG PARA EDITAR/CORREGIR NOMBRE DE LA APP
        // ==========================================
        if (isEditNameModalOpen) {
            val developerApp = selectedApp ?: publishedApps.first()
            AlertDialog(
                onDismissRequest = { isEditNameModalOpen = false },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "✏️", fontSize = 22.sp)
                        Text(text = "Corregir Nombre de la App", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "Actualiza el nombre público que verán tus 12 evaluadores en sus misiones:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            value = editedAppNameInput,
                            onValueChange = { editedAppNameInput = it },
                            label = { Text("Nombre de la Aplicación") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (editedAppNameInput.trim().isNotBlank()) {
                                val idx = publishedApps.indexOfFirst { it.id == developerApp.id }
                                if (idx != -1) {
                                    // Name updated

                                }
                                isEditNameModalOpen = false
                                Toast.makeText(context, "Nombre actualizado: ${editedAppNameInput.trim()}", Toast.LENGTH_SHORT).show()
                            }
                        },
                        enabled = editedAppNameInput.trim().isNotBlank()
                    ) {
                        Text("Guardar ✓", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { isEditNameModalOpen = false }) {
                        Text("Cancelar")
                    }
                }
            )
        }

        // ==========================================
        // MODAL DIALOG PARA EXTENDER O REINICIAR PRUEBAS TRAS OBSERVACIÓN DE GOOGLE PLAY
        // ==========================================
        if (isRequestMoreTestsModalOpen) {
            val developerApp = selectedApp ?: publishedApps.first()
            AlertDialog(
                onDismissRequest = { isRequestMoreTestsModalOpen = false },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🔄", fontSize = 24.sp)
                        Text(text = "Extender Pruebas para Google Play", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Si Google Play te envió un correo solicitando más actividad o días antes de otorgarte Producción, elige cómo deseas continuar:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(text = "Opción 1: Iniciar Nuevo Ciclo Limpio de 14 Días", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                                Text(text = "Mantiene toda la configuración de tu app y convoca a 12 evaluadores para un ciclo continuo de 14 días desde el Día 1.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Button(
                                    onClick = {
                                        val idx = publishedApps.indexOfFirst { it.id == developerApp.id }
                                        if (idx != -1) {
                                            // Restarted 14 days

                                        }
                                        isRequestMoreTestsModalOpen = false
                                        Toast.makeText(context, "Nuevo ciclo de 14 días iniciado con éxito. ¡Vamos por la aprobación!", Toast.LENGTH_LONG).show()
                                    },
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("⚡ Iniciar Nuevo Ciclo de 14 Días", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(text = "Opción 2: Extender 7 Días Adicionales (+7 Días)", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                                Text(text = "Suma 7 días más a tu campaña actual para acumular más horas de prueba y telemetría continua.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                Button(
                                    onClick = {
                                        val idx = publishedApps.indexOfFirst { it.id == developerApp.id }
                                        if (idx != -1) {
                                            // Extended 7 days

                                        }
                                        isRequestMoreTestsModalOpen = false
                                        Toast.makeText(context, "Campaña extendida 7 días más. Evaluadores notificados.", Toast.LENGTH_LONG).show()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("➕ Extender 7 Días Adicionales", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                },
                confirmButton = {},
                dismissButton = {
                    TextButton(onClick = { isRequestMoreTestsModalOpen = false }) {
                        Text("Cerrar")
                    }
                }
            )
        }

        // ==========================================
        // MODAL DIALOG DE CONFIRMACIÓN DE APROBACIÓN DE GOOGLE PLAY
        // ==========================================
        if (isApprovalModalOpen) {
            val developerApp = selectedApp ?: publishedApps.first()
            AlertDialog(
                onDismissRequest = { isApprovalModalOpen = false },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🎉", fontSize = 24.sp)
                        Text(text = "¡Felicitaciones por tu Aprobación!", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "Al confirmar que Google Play aprobó tu aplicación para Producción:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(text = "🏆 Insignia de Creador Verificado en tu perfil", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                                Text(text = "💤 Kill-Switch Remoto activado (el SDK deja de enviar tráfico)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                Text(text = "🔓 Ranura de app liberada para tu próximo proyecto", fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                Text(text = "💌 Notificación de agradecimiento a tus 12 evaluadores", fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val idx = publishedApps.indexOfFirst { it.id == developerApp.id }
                            if (idx != -1) {
                                // Approved in production

                            }
                            CallTestNotificationManager.sendGooglePlayApprovedCelebration(context, developerApp.appName)
                            isApprovalModalOpen = false
                            Toast.makeText(context, "🎉 ¡Felicidades! Tu app está registrada como Aprobada en Google Play.", Toast.LENGTH_LONG).show()
                        }
                    ) {
                        Text("¡Confirmar y Celebrar! 🚀", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { isApprovalModalOpen = false }) {
                        Text("Aún no")
                    }
                }
            )
        }

        // ==========================================
        // MODAL DIALOG EXPLICATIVO DE TESTERS DE RESPALDO
        // ==========================================
        if (isBackupInfoModalOpen) {
            AlertDialog(
                onDismissRequest = { isBackupInfoModalOpen = false },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🛡️", fontSize = 24.sp)
                        Text(text = "¿Cómo funcionan los Testers de Respaldo?", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    }
                },
                text = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Google Play exige 12 evaluadores activos durante 14 días. Para que nunca te falte ninguno, CallTest te asigna evaluadores de respaldo según tu racha:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(text = "📅 Día 1: Base de Google Play", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                                Text(text = "• 12 Evaluadores Titulares\n• Ranura 1 de App", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(text = "🔥 Día 2 de Racha: 1er Respaldo", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                                Text(text = "• 13 Evaluadores (+1 Respaldo)\n• +1 Nueva App recomendada para probar", fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(text = "🔥 Día 5 de Racha: 2do Respaldo", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                                Text(text = "• 14 Evaluadores (+2 Respaldos)\n• 🚀 Ranura 2 de App desbloqueada", fontSize = 11.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.tertiaryContainer,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(text = "👑 Día 10 de Racha: Escudo Máximo (15 Testers)", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.tertiary)
                                Text(text = "• 15 Evaluadores (+3 Respaldos)\n• 🚀 Ranura 3 de App desbloqueada", fontSize = 11.sp, color = MaterialTheme.colorScheme.onTertiaryContainer)
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(onClick = { isBackupInfoModalOpen = false }) {
                        Text("¡Entendido! ✓")
                    }
                }
            )
        }

        // ==========================================
        // MODAL WIZARD DE 3 PASOS PARA PUBLICAR APP
        // ==========================================
        if (isPublishModalOpen) {
            ModalBottomSheet(
                onDismissRequest = { isPublishModalOpen = false },
                sheetState = sheetState,
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
            ) {
                PublishAppWizardModalContent(
                    onSubmit = { name, pkg, category, desc, group, ownTesters, missions ->
                        onCreateAppCampaign(name, pkg, category, desc, group, ownTesters, missions)
                        isPublishModalOpen = false
                        Toast.makeText(context, "¡Campaña para $name creada con éxito!", Toast.LENGTH_LONG).show()
                    },
                    onClose = { isPublishModalOpen = false }
                )
            }
        }
    }
}

@Composable
fun PublishAppWizardModalContent(
    onSubmit: (String, String, String, String, String, Int, List<TesterMissionItem>) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    var currentStep by remember { mutableStateOf(1) }

    // Paso 1: Datos de la App
    var appName by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("") }
    var appDescription by remember { mutableStateOf("") }

    val categories = listOf(
        "Finanzas 💰",
        "Productividad ⚡",
        "Salud y Deporte 🏃",
        "Herramientas 🛠️",
        "Juegos 🎮",
        "Educación 📚",
        "Social 💬",
        "Estilo de Vida 🌟"
    )

    // Paso 2: Enlaces y Testers
    var googleGroupUrl by remember { mutableStateOf("") }
    var playStoreUrl by remember { mutableStateOf("") }
    var ownTestersCount by remember { mutableStateOf("0") }

    val autoExtractedPackageName = remember(playStoreUrl) {
        extractPackageNameFromUrl(playStoreUrl)
    }

    // Paso 3: Misiones Generadas
    val generatedMissions = remember { mutableStateListOf<TesterMissionItem>() }
    var missionToEdit by remember { mutableStateOf<TesterMissionItem?>(null) }
    var editMissionTitle by remember { mutableStateOf("") }
    var editMissionObjective by remember { mutableStateOf("") }

    // Modal de Prompt para IA (Bilingüe e Inteligente según idioma/país)
    val currentAppLang = remember { LanguageManager.getSavedLanguage(context) }
    val defaultPromptLang = remember(currentAppLang) {
        if (currentAppLang == AppLanguage.ES || java.util.Locale.getDefault().language.equals("es", ignoreCase = true)) {
            "ES"
        } else {
            "EN"
        }
    }
    var isAiPromptModalOpen by remember { mutableStateOf(false) }
    var aiPromptLanguage by remember { mutableStateOf(defaultPromptLang) }

    val spanishPrompt = """Actúa como un desarrollador experto en Android. Por favor, integra el SDK oficial de CallTest en mi proyecto Android para medir automáticamente los 3 minutos diarios de los 12 evaluadores de Google Play:

1. En el archivo `build.gradle.kts` (o `build.gradle`) de mi módulo `:app`, agrega la dependencia:
   implementation("com.github.calltest:sdk:1.0.0")

2. En `settings.gradle.kts`, asegúrate de incluir el repositorio JitPack si no está:
   maven { url = uri("https://jitpack.io") }

3. En mi clase `Application` (o crea `MyApplication.kt` y regístrala en el `AndroidManifest.xml` si aún no tengo una), inicializa el SDK en `onCreate()` con:
   CallTestSdk.install(this, apiKey = "calltest-app-key")

Revisa mi código actual y muéstrame exactamente los cambios que debo hacer."""

    val englishPrompt = """Act as an expert Android developer. Please integrate the official CallTest SDK into my Android project to automatically track the required 3 daily testing minutes across the 12 Google Play closed beta testers:

1. In the `build.gradle.kts` (or `build.gradle`) file of my `:app` module, add the dependency:
   implementation("com.github.calltest:sdk:1.0.0")

2. In `settings.gradle.kts`, ensure the JitPack repository is included:
   maven { url = uri("https://jitpack.io") }

3. In my `Application` class (or create `MyApplication.kt` and register it in `AndroidManifest.xml` if not already present), initialize the SDK in `onCreate()` with:
   CallTestSdk.install(this, apiKey = "calltest-app-key")

Please inspect my current codebase and provide the exact modified code."""

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Step Indicator Header (4 Pasos Divididos y Claros)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = when (currentStep) {
                        1 -> "Paso 1 de 4: Tu App 📱"
                        2 -> "Paso 2 de 4: Enlaces de Google Play 🔗"
                        3 -> "Paso 3 de 4: Misiones de 14 Días 📋"
                        else -> "Paso 4 de 4: Integración del SDK ⚡"
                    },
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = when (currentStep) {
                        1 -> "Datos y categoría de tu aplicación"
                        2 -> "Enlaces de tu Grupo y Google Play"
                        3 -> "Revisa las 14 misiones diarias para tus evaluadores"
                        else -> "Telemetría automática opcional de 3 minutos"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        LinearProgressIndicator(
            progress = { currentStep / 4f },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = Color(0xFF1E88E5),
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )

        Spacer(modifier = Modifier.height(4.dp))

        // ==========================================
        // CONTENIDO DEL PASO 1 (VALIDACIÓN DE CATEGORÍA Y DESCRIPCIÓN)
        // ==========================================
        if (currentStep == 1) {
            val isNameValid = appName.trim().isNotBlank()
            val isCategoryValid = selectedCategory.isNotBlank()
            val isDescriptionValid = appDescription.trim().isNotBlank()
            val isStep1Complete = isNameValid && isCategoryValid && isDescriptionValid

            OutlinedTextField(
                value = appName,
                onValueChange = { appName = it },
                label = { Text("Nombre de la Aplicación *") },
                placeholder = { Text("Ej. Mi Super App") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Categoría de la App: *",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                if (!isCategoryValid) {
                    Text(
                        text = "👆 Por favor selecciona una categoría",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp
                    )
                }
            }

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(categories) { cat ->
                    val isCatSelected = selectedCategory == cat
                    FilterChip(
                        selected = isCatSelected,
                        onClick = { selectedCategory = cat },
                        label = {
                            Text(
                                text = if (isCatSelected) "✓ $cat" else cat,
                                fontWeight = if (isCatSelected) FontWeight.Bold else FontWeight.Normal,
                                color = if (isCatSelected) Color.White else MaterialTheme.colorScheme.onSurface
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF1E88E5), // Azul vibrante claramente visible
                            selectedLabelColor = Color.White
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = isCatSelected,
                            borderColor = if (isCatSelected) Color(0xFF1565C0) else MaterialTheme.colorScheme.outline
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                OutlinedTextField(
                    value = appDescription,
                    onValueChange = { appDescription = it },
                    label = { Text("¿Qué hace tu app y qué funciones tiene? *") },
                    placeholder = { Text("Describe las funciones clave para autogenerar las 14 misiones...") },
                    minLines = 4,
                    maxLines = 8,
                    modifier = Modifier.fillMaxWidth()
                )
                if (!isDescriptionValid) {
                    Text(
                        text = "✨ Cuéntanos qué hace tu app para crear las mejores misiones para tus 12 evaluadores",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Button(
                onClick = {
                    if (isStep1Complete) {
                        currentStep = 2
                    } else {
                        Toast.makeText(context, "Por favor completa el nombre, categoría y al menos una palabra en la descripción.", Toast.LENGTH_SHORT).show()
                    }
                },
                enabled = isStep1Complete,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(text = "Continuar a Enlaces ➔", fontWeight = FontWeight.Bold)
            }
        }

        // ==========================================
        // CONTENIDO DEL PASO 2
        // ==========================================
        else if (currentStep == 2) {
            OutlinedTextField(
                value = googleGroupUrl,
                onValueChange = { googleGroupUrl = it },
                label = { Text("Enlace del Grupo de Google (Opt-In)") },
                placeholder = { Text("https://groups.google.com/g/mis-evaluadores") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = playStoreUrl,
                onValueChange = { playStoreUrl = it },
                label = { Text("Enlace de Google Play (Web o App)") },
                placeholder = { Text("https://play.google.com/apps/testing/...") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(text = "¿Tienes evaluadores propios ya en tu grupo? (Opcional)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = "Indica cuántos tienes para que CallTest solo reclute los que te falten.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = ownTestersCount,
                        onValueChange = { ownTestersCount = it.filter { ch -> ch.isDigit() }.take(2) },
                        label = { Text("Testers Propios") },
                        placeholder = { Text("0") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            val ownTesters = ownTestersCount.toIntOrNull() ?: 0

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = { currentStep = 1 },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(text = "← Atrás")
                }

                Button(
                    onClick = {
                        generatedMissions.clear()
                        val effectiveName = if (appName.isBlank()) "Mi App en Prueba" else appName
                        val effectiveDesc = if (appDescription.isBlank()) "Funciones principales y flujos de usuario" else appDescription
                        generatedMissions.addAll(generate14DaysMissions(effectiveName, selectedCategory, effectiveDesc))
                        currentStep = 3
                    },
                    enabled = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1.5f)
                ) {
                    Text(text = "Ver Misiones ➔", fontWeight = FontWeight.Bold)
                }
            }
        }

        // ==========================================
        // CONTENIDO DEL PASO 3: MISIONES DE 14 DÍAS (SOLO MISIONES)
        // ==========================================
        else if (currentStep == 3) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "Calendario de 14 Días para tus Testers 📋",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Misiones guiadas autogeneradas para que tus 12 evaluadores exploren tu app diariamente:",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            generatedMissions.forEachIndexed { index, mission ->
                val isFirstMission = index == 0
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isFirstMission) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = if (isFirstMission) 0.dp else 1.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(enabled = !isFirstMission) {
                            missionToEdit = mission
                            editMissionTitle = mission.title
                            editMissionObjective = mission.objective
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            color = if (isFirstMission) MaterialTheme.colorScheme.outline else Color(0xFF1E88E5),
                            shape = CircleShape,
                            modifier = Modifier.size(28.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(text = "${index + 1}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(text = mission.title, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                if (isFirstMission) {
                                    Surface(
                                        color = MaterialTheme.colorScheme.surfaceVariant,
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = "🔒 Fija (Obligatoria)",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                            Text(text = mission.objective, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                        }
                        Text(text = if (isFirstMission) "🔒" else "✏️", fontSize = 14.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { currentStep = 2 }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f)) {
                    Text(text = "← Enlaces")
                }
                Button(
                    onClick = { currentStep = 4 },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1.5f)
                ) {
                    Text(text = "Siguiente: SDK ➔", fontWeight = FontWeight.Bold)
                }
            }
        }

        // ==========================================
        // CONTENIDO DEL PASO 4: SDK Y BENEFICIOS (VENTANA DEDICADA)
        // ==========================================
        else if (currentStep == 4) {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(text = "⚡", fontSize = 24.sp)
                        Column {
                            Text(text = "SDK de Telemetría (Muy Recomendado)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF1E88E5))
                            Text(text = "Mide los 3 min/día automáticamente en los 12 celulares sin pedir capturas.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Comparativa Limpia
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(text = "⚡ CON SDK", fontWeight = FontWeight.Black, color = Color(0xFF1E88E5), fontSize = 12.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(text = "• 100% Automático\n• +95% Retención\n• Salud 98/100 Play Store", fontSize = 11.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }

                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(text = "📷 SIN SDK", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(text = "• Capturas diarias\n• Riesgo de abandono\n• Validación manual", fontSize = 11.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Bloque 1: Gradle con botón Copiar
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(text = "// build.gradle.kts:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(text = "implementation(\"com.github.calltest:sdk:1.0.0\")", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF1E88E5))
                            }
                            OutlinedButton(
                                onClick = {
                                    clipboardManager.setText(AnnotatedString("implementation(\"com.github.calltest:sdk:1.0.0\")"))
                                    Toast.makeText(context, "Línea Gradle copiada 📋", Toast.LENGTH_SHORT).show()
                                },
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Copiar", fontSize = 11.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Bloque 2: Application.onCreate() con botón Copiar
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(text = "// Application.onCreate():", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(text = "CallTestSdk.install(this, \"API_KEY\")", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF1E88E5))
                            }
                            OutlinedButton(
                                onClick = {
                                    clipboardManager.setText(AnnotatedString("CallTestSdk.install(this, \"API_KEY\")"))
                                    Toast.makeText(context, "Línea Application copiada 📋", Toast.LENGTH_SHORT).show()
                                },
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Copiar", fontSize = 11.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Botón para abrir el Modal de Prompt para IA
                    Button(
                        onClick = { isAiPromptModalOpen = true },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(text = "🤖 Ver Prompt para IA (Cursor / Claude / ChatGPT)", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onTertiary, fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            val ownTesters = ownTestersCount.toIntOrNull() ?: 0
            val pkg = autoExtractedPackageName ?: if (appName.isNotBlank()) "com.ejemplo.${appName.lowercase().filter { it.isLetterOrDigit() }}" else "com.ejemplo.app"

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { currentStep = 3 }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f)) {
                    Text(text = "← Misiones")
                }
                Button(
                    onClick = {
                        onSubmit(
                            if (appName.isBlank()) "Mi App en Prueba" else appName,
                            pkg,
                            selectedCategory,
                            if (appDescription.isBlank()) "App en prueba" else appDescription,
                            googleGroupUrl,
                            ownTesters,
                            generatedMissions.toList()
                        )
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(2f)
                ) {
                    Text(text = "Lanzar Campaña 🚀", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
    }

    // ==========================================
    // MODAL DIALOG DEL PROMPT PARA IA (BILINGÜE)
    // ==========================================
    if (isAiPromptModalOpen) {
        val currentPromptText = if (aiPromptLanguage == "ES") spanishPrompt else englishPrompt

        AlertDialog(
            onDismissRequest = { isAiPromptModalOpen = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "🤖 Prompt para IA", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        FilterChip(
                            selected = aiPromptLanguage == "ES",
                            onClick = { aiPromptLanguage = "ES" },
                            label = { Text("🇪🇸 ES", fontSize = 10.sp) }
                        )
                        FilterChip(
                            selected = aiPromptLanguage == "EN",
                            onClick = { aiPromptLanguage = "EN" },
                            label = { Text("🇺🇸 EN", fontSize = 10.sp) }
                        )
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Copia este prompt y pégalo directamente en Cursor, ChatGPT o Claude para que configure el SDK en tu proyecto por ti:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = currentPromptText,
                            style = MaterialTheme.typography.bodySmall,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        clipboardManager.setText(AnnotatedString(currentPromptText))
                        Toast.makeText(context, "🤖 ¡Prompt copiado en ${if (aiPromptLanguage == "ES") "Español" else "Inglés"}! Pégalo en tu IA.", Toast.LENGTH_LONG).show()
                        isAiPromptModalOpen = false
                    },
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("📋 Copiar Prompt al Portapapeles", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { isAiPromptModalOpen = false }) {
                    Text("Cerrar")
                }
            }
        )
    }

    // Modal de Edición de Misión Individual
    if (missionToEdit != null) {
        val target = missionToEdit!!
        AlertDialog(
            onDismissRequest = { missionToEdit = null },
            title = { Text(text = "Editar Misión del Día", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = editMissionTitle,
                        onValueChange = { editMissionTitle = it },
                        label = { Text("Título de la Misión") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = editMissionObjective,
                        onValueChange = { editMissionObjective = it },
                        label = { Text("Objetivo para el Evaluador") },
                        minLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val idx = generatedMissions.indexOfFirst { it.id == target.id }
                        if (idx != -1) {
                            generatedMissions[idx] = target.copy(
                                title = editMissionTitle,
                                objective = editMissionObjective
                            )
                        }
                        missionToEdit = null
                    }
                ) {
                    Text("Guardar Cambios ✓")
                }
            },
            dismissButton = {
                TextButton(onClick = { missionToEdit = null }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

/**
 * Extracción inteligente y automática del Package Name a partir de links de Google Play
 */
fun extractPackageNameFromUrl(url: String): String? {
    if (url.isBlank()) return null
    val trimmed = url.trim()

    if (trimmed.contains("id=")) {
        val extracted = trimmed.substringAfter("id=").substringBefore("&").substringBefore(" ").trim()
        if (extracted.contains(".") && extracted.length >= 3) {
            return extracted
        }
    }

    if (trimmed.contains("/testing/")) {
        val extracted = trimmed.substringAfter("/testing/").substringBefore("?").substringBefore("/").substringBefore(" ").trim()
        if (extracted.contains(".") && extracted.length >= 3) {
            return extracted
        }
    }

    if (trimmed.contains(".") && !trimmed.contains("/") && !trimmed.contains(" ")) {
        return trimmed
    }

    return null
}

/**
 * Generador inteligente de 14 misiones progresivas según nombre, categoría y descripción
 */
fun generate14DaysMissions(
    appName: String,
    category: String,
    description: String
): List<TesterMissionItem> {
    val cleanName = if (appName.isBlank()) "la aplicación" else appName
    return listOf(
        TesterMissionItem(id = "m-1", title = "Día 1: Instalación y Primer Inicio", objective = "Instala $cleanName desde Google Play, ábrela por primera vez y explora la pantalla de bienvenida."),
        TesterMissionItem(id = "m-2", title = "Día 2: Registro y Perfil de Usuario", objective = "Crea una cuenta o inicia sesión en $cleanName y revisa la configuración inicial."),
        TesterMissionItem(id = "m-3", title = "Día 3: Navegación Principal y Menús", objective = "Recorre cada una de las pestañas principales de $cleanName comprobando fluidez."),
        TesterMissionItem(id = "m-4", title = "Día 4: Función Principal (Core Feature)", objective = "Prueba la funcionalidad estrella de $cleanName ($category) durante al menos 3 minutos."),
        TesterMissionItem(id = "m-5", title = "Día 5: Creación y Guardado de Datos", objective = "Ingresa nuevos datos o crea un registro en $cleanName y verifica que se guarde correctamente."),
        TesterMissionItem(id = "m-6", title = "Día 6: Ajustes y Preferencias", objective = "Modifica opciones en los ajustes de $cleanName (tema, notificaciones o idioma)."),
        TesterMissionItem(id = "m-7", title = "Día 7: Reseña de Primera Semana", objective = "Envía una opinión sincera sobre tu experiencia durante estos primeros 7 días con $cleanName."),
        TesterMissionItem(id = "m-8", title = "Día 8: Prueba en Segundo Plano", objective = "Minimiza $cleanName, abre otra app y regresa para verificar que no se cierre ni pierda datos."),
        TesterMissionItem(id = "m-9", title = "Día 9: Flujo Secundario y Filtros", objective = "Prueba las búsquedas, filtros o herramientas secundarias dentro de $cleanName."),
        TesterMissionItem(id = "m-10", title = "Día 10: Rendimiento y Batería", objective = "Usa $cleanName por más de 3 minutos continuos verificando que no sobrecaliente tu teléfono."),
        TesterMissionItem(id = "m-11", title = "Día 11: Modo Oscuro y Rotación", objective = "Prueba $cleanName cambiando entre modo claro/oscuro o girando la pantalla."),
        TesterMissionItem(id = "m-12", title = "Día 12: Búsqueda de Errores o Bugs", objective = "Intenta forzar errores ingresando datos inesperados o navegando rápidamente."),
        TesterMissionItem(id = "m-13", title = "Día 13: Verificación de Notificaciones", objective = "Comprueba si las alertas o notificaciones de $cleanName llegan a tiempo a tu barra de estado."),
        TesterMissionItem(id = "m-14", title = "Día 14: Feedback Final para Google Play", objective = "Completa tu última sesión de 3 minutos y deja una valoración global con sugerencias finales.")
    )
}
