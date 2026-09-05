package com.calltest.tester.ui.navigation

import android.widget.Toast
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.calltest.tester.data.models.NotificationItem
import com.calltest.tester.data.network.CallTestApiClient
import com.calltest.tester.data.network.SessionManager
import com.calltest.tester.i18n.AppLanguage
import com.calltest.tester.i18n.CallTestTranslations
import com.calltest.tester.i18n.LanguageManager
import com.calltest.tester.i18n.LocalAppLanguage
import com.calltest.tester.i18n.LocalAppStrings
import com.calltest.tester.ui.auth.LoginScreen
import com.calltest.tester.ui.campaigns.TesterMissionItem
import com.calltest.tester.ui.devtools.DevToolsScreen
import com.calltest.tester.ui.home.AvailableCampaign
import com.calltest.tester.ui.onboarding.OnboardingRoleScreen
import com.calltest.tester.ui.home.HomeScreen
import com.calltest.tester.ui.home.TesterParticipationSummary
import com.calltest.tester.ui.inbox.DailyInboxScreen
import com.calltest.tester.ui.inbox.MissionDetailScreen
import com.calltest.tester.ui.myapp.AssignedTesterItem
import com.calltest.tester.ui.myapp.DeveloperAppCampaign
import com.calltest.tester.ui.myapp.MyAppScreen
import com.calltest.tester.ui.myapp.TesterFeedbackItem
import com.calltest.tester.ui.notifications.NotificationsScreen
import com.calltest.tester.ui.notifications.NotificationsUiState
import com.calltest.tester.ui.profile.ProfileScreen
import com.calltest.tester.ui.progression.ProgressionScreen
import kotlinx.coroutines.launch

enum class MainTabDestination(val label: String, val iconText: String) {
    HOME("Inicio", "🏠"),
    MISSIONS("Misiones", "📋"),
    MY_APP("Mi App", "🚀"),
    PROGRESSION("Progreso", "📈")
}

@Composable
fun MainAppNavigation(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var currentLanguage by remember { mutableStateOf(LanguageManager.getSavedLanguage(context)) }
    val currentStrings = remember(currentLanguage) { CallTestTranslations.getStrings(currentLanguage) }

    CompositionLocalProvider(
        LocalAppLanguage provides currentLanguage,
        LocalAppStrings provides currentStrings
    ) {
        MainAppNavigationContent(
            currentLanguage = currentLanguage,
            currentStrings = currentStrings,
            onLanguageSelected = { newLang -> currentLanguage = newLang },
            modifier = modifier
        )
    }
}

@Composable
private fun MainAppNavigationContent(
    currentLanguage: AppLanguage,
    currentStrings: com.calltest.tester.i18n.AppStrings,
    onLanguageSelected: (AppLanguage) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isAuthenticated by remember { mutableStateOf(SessionManager.isLoggedIn(context)) }
    var isOnboardingDone by remember { mutableStateOf(SessionManager.isOnboardingCompleted(context)) }
    var userRole by remember { mutableStateOf(SessionManager.getSelectedRole(context)) }
    var currentTab by remember { mutableStateOf(MainTabDestination.HOME) }
    var selectedMission by remember { mutableStateOf<TesterMissionItem?>(null) }
    var isProfileOpen by remember { mutableStateOf(false) }
    var isNotificationsOpen by remember { mutableStateOf(false) }
    var isDevToolsOpen by remember { mutableStateOf(false) }
    var currentStreakDays by remember { mutableStateOf(6) }

    var isPublishWizardOpen by remember { mutableStateOf(false) }
    val myPublishedApps = remember {
        mutableStateListOf<DeveloperAppCampaign>()
    }

    // Mock initial missions per campaign (Enfoque motivador orientado a beneficios)
    val fintechMissions = remember {
        listOf(
            TesterMissionItem(
                id = "m-1",
                title = "Día 1: Registra tu primer gasto en 5 seg ⏱️",
                objective = "Abre la app y registra un gasto de prueba (ej. Café $3.50) para ver tu balance actualizado al instante.",
                difficulty = "NORMAL",
                estimatedMinutes = 3,
                requiresEvidence = true,
                evidenceInstructions = "Captura de pantalla donde se aprecie tu primer gasto registrado.",
                attemptStatus = "AVAILABLE"
            ),
            TesterMissionItem(
                id = "m-2",
                title = "Día 2: Crea tu presupuesto y ahorra 💰",
                objective = "Establece un límite de gasto mensual para descubrir cuánto dinero puedes ahorrar.",
                difficulty = "NORMAL",
                estimatedMinutes = 3,
                requiresEvidence = false,
                attemptStatus = "UPCOMING"
            ),
            TesterMissionItem(
                id = "m-3",
                title = "Día 3: Organiza tus categorías favoritas 🏷️",
                objective = "Personaliza iconos y etiquetas de gastos para adaptar la app a tu estilo de vida.",
                difficulty = "NORMAL",
                estimatedMinutes = 3,
                requiresEvidence = true,
                evidenceInstructions = "Captura de la sección de categorías personalizadas.",
                attemptStatus = "UPCOMING"
            )
        )
    }

    val habitMissions = remember {
        listOf(
            TesterMissionItem(
                id = "hm-1",
                title = "Día 1: Configura tu hábito y empieza tu racha 🔥",
                objective = "Crea un hábito positivo (ej. Beber 2L de agua o leer 10 min) para iniciar tu racha de constancia.",
                difficulty = "NORMAL",
                estimatedMinutes = 3,
                requiresEvidence = true,
                evidenceInstructions = "Captura del hábito creado con éxito.",
                attemptStatus = "AVAILABLE"
            ),
            TesterMissionItem(
                id = "hm-2",
                title = "Día 2: Marca tu hábito y mira tu progreso 📈",
                objective = "Completa tu tarea de hoy y visualiza tu porcentaje de éxito en las gráficas.",
                difficulty = "NORMAL",
                estimatedMinutes = 3,
                requiresEvidence = false,
                attemptStatus = "UPCOMING"
            ),
            TesterMissionItem(
                id = "hm-3",
                title = "Día 3: Activa un recordatorio inteligente ⏰",
                objective = "Programa una alarma personalizada para no olvidar tu rutina diaria.",
                difficulty = "NORMAL",
                estimatedMinutes = 3,
                requiresEvidence = false,
                attemptStatus = "UPCOMING"
            )
        )
    }

    val missionsByCampaign = remember {
        mapOf(
            "camp-v1-001" to fintechMissions,
            "camp-v1-002" to habitMissions,
            "camp-v1-003" to fintechMissions
        )
    }

    val availableApps = remember {
        mutableStateListOf(
            AvailableCampaign(
                id = "camp-v1-001",
                appId = "app-001",
                name = "Fintech Tracker V1",
                appName = "Fintech Tracker",
                packageName = "com.fintech.tracker",
                developerName = "Fintech Apps Inc.",
                appDescription = "App de finanzas personales para tracking de gastos y presupuestos mensuales.",
                googleGroupUrl = "https://groups.google.com/g/calltest-testers",
                playStoreWebUrl = "https://play.google.com/apps/testing/com.fintech.tracker",
                playStoreAppUrl = "https://play.google.com/store/apps/details?id=com.fintech.tracker",
                status = "ACTIVE",
                durationDays = 14,
                targetTesters = 12,
                activeTestersCount = 4,
                featureTags = listOf("📊 Control de Gastos", "💡 Ahorro Mensual", "🔒 100% Privado")
            ),
            AvailableCampaign(
                id = "camp-v1-002",
                appId = "app-002",
                name = "Habit Hero Daily",
                appName = "Habit Hero",
                packageName = "com.habithero.app",
                developerName = "Habit Labs",
                appDescription = "Seguimiento de hábitos diarios, recordatorios inteligentes y estadísticas de racha.",
                googleGroupUrl = "https://groups.google.com/g/calltest-testers",
                playStoreWebUrl = "https://play.google.com/apps/testing/com.habithero.app",
                playStoreAppUrl = "https://play.google.com/store/apps/details?id=com.habithero.app",
                status = "ACTIVE",
                durationDays = 14,
                targetTesters = 12,
                activeTestersCount = 7,
                featureTags = listOf("🔥 Contador de Racha", "⏰ Alarmas Inteligentes", "📈 Progreso Semanal")
            ),
            AvailableCampaign(
                id = "camp-v1-003",
                appId = "app-003",
                name = "Crypto Vault Secure",
                appName = "Crypto Vault",
                packageName = "com.cryptovault.wallet",
                developerName = "Vault Security Co.",
                appDescription = "Billetera digital con autenticación biométrica y cotizaciones en vivo.",
                googleGroupUrl = "https://groups.google.com/g/calltest-testers",
                playStoreWebUrl = "https://play.google.com/apps/testing/com.cryptovault.wallet",
                playStoreAppUrl = "https://play.google.com/store/apps/details?id=com.cryptovault.wallet",
                status = "ACTIVE",
                durationDays = 14,
                targetTesters = 12,
                activeTestersCount = 2,
                featureTags = listOf("⚡ Cotizaciones en Vivo", "🛡️ Biometría", "💼 Portafolio Fácil")
            )
        )
    }

    val participatingApps = remember {
        mutableStateListOf(
            TesterParticipationSummary(
                participationId = "part-sample-1",
                campaignId = "camp-v1-001",
                appId = "app-001",
                campaignName = "Fintech Tracker V1",
                appName = "Fintech Tracker",
                packageName = "com.fintech.tracker",
                developerName = "Fintech Apps Inc.",
                status = "ACTIVE",
                dayOfParticipation = 1,
                totalDurationDays = 14,
                missionsCompleted = 0,
                totalMissions = 14,
                featureTags = listOf("📊 Control de Gastos", "💡 Ahorro Mensual", "🔒 100% Privado")
            )
        )
    }

    if (!isAuthenticated) {
        LoginScreen(
            onLoginSuccess = { _ ->
                isAuthenticated = true
            },
            modifier = modifier
        )
    } else if (isPublishWizardOpen) {
        MyAppScreen(
            publishedApps = emptyList(),
            currentStreakDays = currentStreakDays,
            initialWizardOpen = true,
            onCreateAppCampaign = { name, pkg, category, desc, group, ownTesters, missions ->
                scope.launch {
                    CallTestApiClient.createNewApp(
                        context = context,
                        name = name,
                        packageName = pkg,
                        category = category,
                        description = desc,
                        googleGroupUrl = group
                    )
                }
                val newApp = DeveloperAppCampaign(
                    id = "dev-${System.currentTimeMillis()}",
                    appName = name,
                    packageName = pkg,
                    category = category,
                    description = desc,
                    currentDay = 1,
                    totalDays = 14,
                    activeTestersCount = 1,
                    targetTesters = 12,
                    externalTestersCount = ownTesters,
                    generatedMissions = missions,
                    status = "ACTIVE",
                    assignedTesters = listOf(
                        AssignedTesterItem(
                            id = "t-1",
                            alias = "Tester Comunitario 1",
                            tier = "ACTIVO",
                            deviceModel = "Xiaomi Redmi Note 13 (Android 14)",
                            daysCompleted = 1,
                            totalDays = 14,
                            todayMinutes = 3.2,
                            totalMinutes = 3.2,
                            isTodayCompleted = true,
                            isSdkMeasured = true
                        )
                    )
                )
                myPublishedApps.add(newApp)
                userRole = "DEVELOPER"
                SessionManager.updateSelectedRole(context, "DEVELOPER")
                isPublishWizardOpen = false
                currentTab = MainTabDestination.MY_APP
                Toast.makeText(context, "¡$name publicada con éxito! La pestaña 'Mi App' ya está desbloqueada.", Toast.LENGTH_LONG).show()
            },
            onOpenProfile = { isProfileOpen = true },
            onOpenNotifications = { isNotificationsOpen = true },
            onCancelWizard = { isPublishWizardOpen = false },
            modifier = modifier
        )
    } else if (!isOnboardingDone) {
        OnboardingRoleScreen(
            onRoleSelected = { role ->
                userRole = role
                isOnboardingDone = true
                SessionManager.setOnboardingCompleted(context, role)
                currentTab = MainTabDestination.HOME
            },
            modifier = modifier
        )
    } else if (selectedMission != null) {
        MissionDetailScreen(
            mission = selectedMission!!,
            appName = "Fintech Tracker",
            packageName = "com.fintech.tracker",
            hasCallTestSdk = false,
            onSubmitAttempt = { missionId ->
                scope.launch {
                    CallTestApiClient.submitTestingSession(
                        context = context,
                        campaignId = missionId,
                        durationSeconds = 180,
                        rating = 5,
                        feedback = "Misión de prueba de 3 min completada con éxito."
                    )
                }
                selectedMission = null
            },
            onBack = {
                selectedMission = null
            }
        )
    } else if (isDevToolsOpen) {
        DevToolsScreen(
            currentStreakDays = currentStreakDays,
            onUpdateStreak = { newStreak -> currentStreakDays = newStreak },
            onBack = {
                isDevToolsOpen = false
                isProfileOpen = true
            }
        )
    } else if (isProfileOpen) {
        ProfileScreen(
            testerId = "tester-v1-verified",
            country = "México (MX)",
            deviceModel = "Xiaomi 2412DPC0AG",
            userRole = userRole,
            onUpdateRole = { newRole ->
                userRole = newRole
                SessionManager.updateSelectedRole(context, newRole)
                if (newRole == "TESTER" && currentTab == MainTabDestination.MY_APP) {
                    currentTab = MainTabDestination.HOME
                }
            },
            onLanguageSelected = onLanguageSelected,
            onOpenDevTools = {
                isProfileOpen = false
                isDevToolsOpen = true
            },
            onBack = { isProfileOpen = false },
            onLogout = {
                SessionManager.clearSession(context)
                isProfileOpen = false
                isAuthenticated = false
                currentTab = MainTabDestination.HOME
            }
        )
    } else if (isNotificationsOpen) {
        NotificationsScreen(
            state = NotificationsUiState(
                notifications = listOf(
                    NotificationItem(
                        id = "notif-1",
                        userId = "tester-v1-verified",
                        type = "MISSION_ASSIGNED",
                        title = "🎯 Nueva misión disponible",
                        body = "Tu misión para Fintech Tracker está lista para ser completada hoy.",
                        status = "UNREAD",
                        priority = "HIGH",
                        channel = "IN_APP",
                        createdAt = "Hoy a las 09:00"
                    )
                ),
                unreadCount = 1
            ),
            onMarkAsRead = {},
            onMarkAllAsRead = {},
            onToggleFilter = {},
            onBack = { isNotificationsOpen = false }
        )
    } else {
        Scaffold(
            bottomBar = {
                val isDeveloperMode = userRole == "DEVELOPER"
                val visibleTabs = if (isDeveloperMode) {
                    MainTabDestination.entries.toList()
                } else {
                    listOf(MainTabDestination.HOME, MainTabDestination.MISSIONS, MainTabDestination.PROGRESSION)
                }

                NavigationBar {
                    visibleTabs.forEach { destination ->
                        val hasPendingAction = when (destination) {
                            MainTabDestination.MISSIONS -> true // Tiene misiones pendientes de validar hoy
                            MainTabDestination.MY_APP -> true    // Tiene nuevas opiniones/evidencias por revisar
                            else -> false
                        }

                        NavigationBarItem(
                            selected = currentTab == destination,
                            onClick = { currentTab = destination },
                            icon = {
                                BadgedBox(
                                    badge = {
                                        if (hasPendingAction) {
                                            Badge(
                                                containerColor = MaterialTheme.colorScheme.error,
                                                modifier = Modifier.size(8.dp)
                                            )
                                        }
                                    }
                                ) {
                                    Text(text = destination.iconText, fontSize = 20.sp)
                                }
                            },
                            label = {
                                val labelText = when (destination) {
                                    MainTabDestination.HOME -> currentStrings.navHome
                                    MainTabDestination.MISSIONS -> currentStrings.navMissions
                                    MainTabDestination.MY_APP -> currentStrings.navMyApp
                                    MainTabDestination.PROGRESSION -> currentStrings.navProgression
                                }
                                Text(
                                    text = labelText,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    fontSize = 11.sp,
                                    softWrap = false
                                )
                            }
                        )
                    }
                }
            },
            modifier = modifier.fillMaxSize()
        ) { innerPadding ->
            val isDev = userRole == "DEVELOPER"
            when (currentTab) {
                MainTabDestination.HOME -> HomeScreen(
                    availableCampaigns = availableApps,
                    isDeveloperMode = isDev,
                    onPublishAppClick = {
                        isPublishWizardOpen = true
                    },
                    onJoinCampaign = { app ->
                        val alreadyJoined = participatingApps.any { it.campaignId == app.id }
                        if (!alreadyJoined) {
                            participatingApps.add(
                                TesterParticipationSummary(
                                    participationId = "part-${app.id}",
                                    campaignId = app.id,
                                    appId = app.appId,
                                    campaignName = app.name,
                                    appName = app.appName,
                                    packageName = app.packageName,
                                    developerName = app.developerName,
                                    status = "ACTIVE",
                                    dayOfParticipation = 1,
                                    totalDurationDays = app.durationDays,
                                    missionsCompleted = 0,
                                    totalMissions = 14,
                                    featureTags = app.featureTags
                                )
                            )
                        }
                    },
                    onOpenProfile = {
                        isProfileOpen = true
                    },
                    onOpenNotifications = {
                        isNotificationsOpen = true
                    },
                    modifier = Modifier.padding(innerPadding)
                )
                MainTabDestination.MISSIONS -> DailyInboxScreen(
                    myCampaigns = participatingApps,
                    missionsByCampaign = missionsByCampaign,
                    onSelectMission = { mission ->
                        selectedMission = mission
                    },
                    onNavigateToExplore = {
                        currentTab = MainTabDestination.HOME
                    },
                    onOpenProfile = {
                        isProfileOpen = true
                    },
                    onOpenNotifications = {
                        isNotificationsOpen = true
                    },
                    modifier = Modifier.padding(innerPadding)
                )
                MainTabDestination.MY_APP -> MyAppScreen(
                    publishedApps = myPublishedApps,
                    currentStreakDays = currentStreakDays,
                    onCreateAppCampaign = { name, pkg, category, desc, group, ownTesters, missions ->
                        scope.launch {
                            CallTestApiClient.createNewApp(
                                context = context,
                                name = name,
                                packageName = pkg,
                                category = category,
                                description = desc,
                                googleGroupUrl = group
                            )
                        }
                        val newApp = DeveloperAppCampaign(
                            id = "dev-${System.currentTimeMillis()}",
                            appName = name,
                            packageName = pkg,
                            category = category,
                            description = desc,
                            currentDay = 1,
                            totalDays = 14,
                            activeTestersCount = 1,
                            targetTesters = 12,
                            externalTestersCount = ownTesters,
                            generatedMissions = missions,
                            status = "ACTIVE"
                        )
                        myPublishedApps.add(newApp)
                    },
                    onOpenProfile = {
                        isProfileOpen = true
                    },
                    onOpenNotifications = {
                        isNotificationsOpen = true
                    },
                    modifier = Modifier.padding(innerPadding)
                )
                MainTabDestination.PROGRESSION -> ProgressionScreen(
                    tier = "ACTIVE",
                    reliabilityScore = 95.0,
                    activityScore = 100.0,
                    matchingMultiplier = 1.15,
                    completedCampaigns = 1,
                    onOpenProfile = {
                        isProfileOpen = true
                    },
                    onOpenNotifications = {
                        isNotificationsOpen = true
                    },
                    modifier = Modifier.padding(innerPadding)
                )
            }
        }
    }
}
