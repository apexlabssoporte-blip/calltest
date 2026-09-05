package com.calltest.tester.ui.inbox

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import com.calltest.tester.ui.campaigns.TesterMissionItem
import com.calltest.tester.ui.components.AppIconView
import com.calltest.tester.ui.components.CallTestHeaderBar
import com.calltest.tester.ui.components.EmptyStateView
import com.calltest.tester.ui.components.StatusBadge
import com.calltest.tester.ui.home.TesterParticipationSummary

@Composable
fun DailyInboxScreen(
    myCampaigns: List<TesterParticipationSummary>,
    missionsByCampaign: Map<String, List<TesterMissionItem>>,
    onSelectMission: (TesterMissionItem) -> Unit,
    onNavigateToExplore: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenNotifications: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedCampaignId by remember { mutableStateOf<String?>(null) }
    var selectedFilter by remember { mutableStateOf("ALL") }

    val activeCampaign = remember(selectedCampaignId, myCampaigns) {
        myCampaigns.firstOrNull { it.campaignId == selectedCampaignId }
    }

    val currentMissions = remember(selectedCampaignId, missionsByCampaign) {
        if (selectedCampaignId != null) {
            missionsByCampaign[selectedCampaignId] ?: emptyList()
        } else {
            emptyList()
        }
    }

    val filteredMissions = remember(currentMissions, selectedFilter) {
        when (selectedFilter) {
            "AVAILABLE" -> currentMissions.filter { it.attemptStatus == "AVAILABLE" || it.attemptStatus == null || it.attemptStatus == "PENDING" }
            "COMPLETED" -> currentMissions.filter { it.attemptStatus == "VALIDATED" || it.attemptStatus == "COMPLETED" }
            "UPCOMING" -> currentMissions.filter { it.attemptStatus == "UPCOMING" }
            else -> currentMissions
        }
    }

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
        if (activeCampaign != null) {
            // ==========================================
            // VISTA 2: TIMELINE DE 14 DÍAS DE LA APP SELECCIONADA
            // ==========================================
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                // Top navigation back to my apps
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    IconButton(onClick = { selectedCampaignId = null }) {
                        Text(text = "←", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = activeCampaign.appName.ifEmpty { activeCampaign.campaignName },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Ciclo de 14 Días • Día ${activeCampaign.dayOfParticipation} en curso",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text(
                            text = "⏰ 14h restantes",
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                // Filter chips
                val availableCount = currentMissions.count { it.attemptStatus == "AVAILABLE" || it.attemptStatus == null || it.attemptStatus == "PENDING" }
                val completedCount = currentMissions.count { it.attemptStatus == "VALIDATED" || it.attemptStatus == "COMPLETED" }

                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FilterChip(
                            selected = selectedFilter == "ALL",
                            onClick = { selectedFilter = "ALL" },
                            label = { Text("Todas (${currentMissions.size})") },
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedFilter == "AVAILABLE",
                            onClick = { selectedFilter = "AVAILABLE" },
                            label = { Text("Disponibles ($availableCount)") },
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedFilter == "COMPLETED",
                            onClick = { selectedFilter = "COMPLETED" },
                            label = { Text("Completadas ($completedCount)") },
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedFilter == "UPCOMING",
                            onClick = { selectedFilter = "UPCOMING" },
                            label = { Text("Próximos Días") },
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (filteredMissions.isEmpty()) {
                    EmptyStateView(
                        title = "Sin misiones en esta categoría",
                        description = "Selecciona otro filtro para ver el resto del ciclo.",
                        icon = "📋"
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filteredMissions) { mission ->
                            DailyMissionTimelineCard(
                                mission = mission,
                                hasCallTestSdk = activeCampaign.hasCallTestSdk,
                                onClick = { onSelectMission(mission) }
                            )
                        }
                        item {
                            Spacer(modifier = Modifier.height(20.dp))
                        }
                    }
                }
            }
        } else {
            // ==========================================
            // VISTA 1: LISTA DE MIS APPS INSTALADAS
            // ==========================================
                        // ==========================================
            // AVISO DÍA 5: REASIGNACIÓN DE EVALUADORES
            // ==========================================
            var showDay5Notice by remember { mutableStateOf(false) }

            if (showDay5Notice) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(text = "🔄", fontSize = 24.sp)
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Evaluadores Reasignados (Inactividad 5 Días)",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                                Text(
                                    text = "Tus evaluadores fueron reasignados a otras apps activas para proteger su tiempo y racha.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surface,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "¿Por qué pasó esto?",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.labelMedium
                                )
                                Text(
                                    text = "Por la regla de reciprocidad (1x1), si pasas 5 días continuos sin realizar tu prueba de 3 min en otra app, tus 12 evaluadores se reasignan.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 11.sp
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "¡Tu campaña está segura en el mismo día! Realiza tu prueba de 3 min hoy para convocar un nuevo equipo de 12 evaluadores al instante.",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Button(
                            onClick = {
                                showDay5Notice = false
                                Toast.makeText(context, "¡Bienvenido de vuelta! Realiza tu prueba para reactivar tus evaluadores.", Toast.LENGTH_SHORT).show()
                            },
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("⚡ Realizar mi prueba y convocar evaluadores", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Spacer(modifier = Modifier.height(2.dp))
                    Column {
                        Text(
                            text = "Mis Apps en Prueba 📋",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Selecciona una app para ver y completar tus misiones diarias",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                if (myCampaigns.isEmpty()) {
                    item {
                        EmptyStateView(
                            title = "No tienes apps instaladas",
                            description = "Ve a la pestaña 'Inicio' para descubrir y descargar tu primera app para probar.",
                            icon = "📲",
                            actionLabel = "Explorar Apps Disponibles",
                            onAction = onNavigateToExplore,
                            modifier = Modifier.padding(top = 40.dp)
                        )
                    }
                } else {
                    items(myCampaigns) { campaign ->
                        val missionsForThisApp = missionsByCampaign[campaign.campaignId] ?: emptyList()
                        val hasPendingToday = missionsForThisApp.any { it.attemptStatus == "AVAILABLE" || it.attemptStatus == null || it.attemptStatus == "PENDING" }

                        InstalledAppCard(
                            campaign = campaign,
                            hasPendingToday = hasPendingToday,
                            onOpenMissions = { selectedCampaignId = campaign.campaignId }
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(20.dp))
                }
            }
        }
    }
}

@Composable
fun InstalledAppCard(
    campaign: TesterParticipationSummary,
    hasPendingToday: Boolean,
    onOpenMissions: () -> Unit,
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
            .clickable { onOpenMissions() }
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "📱", fontSize = 24.sp)
                    }

                    Column {
                        Text(
                            text = campaign.appName.ifEmpty { campaign.campaignName },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(3.dp))
                        Surface(
                            color = Color(0xFFFF6D00).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Color(0xFFFF6D00).copy(alpha = 0.4f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(text = "🔥", fontSize = 11.sp)
                                Text(
                                    text = "Racha en esta app: ${campaign.dayOfParticipation} días",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFE65100),
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }

                // Daily status badge
                if (hasPendingToday) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "⚡ Misión Pendiente",
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                } else {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "✓ Al Día",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            if (campaign.featureTags.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(campaign.featureTags) { tag ->
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = tag,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Progress bar
            val progress = if (campaign.totalDurationDays > 0) {
                campaign.dayOfParticipation.toFloat() / campaign.totalDurationDays.toFloat()
            } else 0f

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Día ${campaign.dayOfParticipation} de ${campaign.totalDurationDays}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${campaign.missionsCompleted}/${campaign.totalMissions.coerceAtLeast(14)} misiones",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            LinearProgressIndicator(
                progress = { progress.coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Spacer(modifier = Modifier.height(14.dp))

            Button(
                onClick = onOpenMissions,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = if (hasPendingToday) "Comenzar Misión de Hoy 🚀" else "Ver Calendario de 14 Días 📋",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

@Composable
fun DailyMissionTimelineCard(
    mission: TesterMissionItem,
    hasCallTestSdk: Boolean = false,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val status = mission.attemptStatus ?: "AVAILABLE"
    val isAvailable = status == "AVAILABLE" || status == "PENDING"
    val isCompleted = status == "COMPLETED" || status == "VALIDATED"
    val isUpcoming = status == "UPCOMING"

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isAvailable) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isAvailable) 2.dp else 0.dp),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(
                        when {
                            isCompleted -> MaterialTheme.colorScheme.primaryContainer
                            isAvailable -> MaterialTheme.colorScheme.primary
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = when {
                        isCompleted -> "✓"
                        isAvailable -> "⚡"
                        status == "BLOCKED_BY_AVAILABILITY" -> "⚠️"
                        else -> "🔒"
                    },
                    color = if (isAvailable) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = mission.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    StatusBadge(status = status)
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = if (isUpcoming) "🔒 Se desbloquea automáticamente al iniciar el día correspondiente." else mission.objective,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (hasCallTestSdk) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "⚡ Auto (SDK)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        } else if (mission.requiresEvidence) {
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "📷 Captura Requerida",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = getMissionPointsBadge(mission.title),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Text(
                            text = "⏱ ~${mission.estimatedMinutes} min",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
