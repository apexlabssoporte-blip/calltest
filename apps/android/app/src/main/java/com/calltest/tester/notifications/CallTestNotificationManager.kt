package com.calltest.tester.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.calltest.tester.MainActivity

object CallTestNotificationManager {

    const val CHANNEL_DAILY_REMINDERS = "channel_daily_reminders"
    const val CHANNEL_DEVELOPER_UPDATES = "channel_developer_updates"
    const val CHANNEL_COMMUNITY_REWARDS = "channel_community_rewards"

    private const val NOTIF_ID_DAILY_REMINDER = 1001
    private const val NOTIF_ID_DEV_UPDATE = 1002
    private const val NOTIF_ID_FEEDBACK = 1003
    private const val NOTIF_ID_SLOT_UNLOCKED = 1004
    private const val NOTIF_ID_TEST = 1099

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Canal 1: Recordatorios de Misiones Diarias y Racha (Alta Prioridad)
            val dailyChannel = NotificationChannel(
                CHANNEL_DAILY_REMINDERS,
                "Recordatorios de Misiones y Racha",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alertas diarias para completar tus 3 min de prueba y proteger tu racha."
                enableVibration(true)
            }

            // Canal 2: Actualizaciones de Desarrollador (Mis Apps)
            val devChannel = NotificationChannel(
                CHANNEL_DEVELOPER_UPDATES,
                "Actualizaciones de Mis Apps",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notificaciones sobre evaluadores, estado de campaña y cumplimiento de 14 días."
            }

            // Canal 3: Logros y Desbloqueos de la Comunidad
            val communityChannel = NotificationChannel(
                CHANNEL_COMMUNITY_REWARDS,
                "Logros y Desbloqueos de Ranuras",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Alertas de subida de nivel, feedback recibido y nuevas ranuras de apps."
            }

            notificationManager.createNotificationChannels(
                listOf(dailyChannel, devChannel, communityChannel)
            )
        }
    }

    private fun getMainActivityPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getActivity(context, 0, intent, flags)
    }

    /**
     * Notificación diaria para recordar al tester que haga sus 3 minutos
     */
    fun sendDailyReminder(
        context: Context,
        appName: String = "Fintech Tracker",
        streakDays: Int = 6,
        minutesRequired: Int = 3
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DAILY_REMINDERS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🔥 ¡Protege tu racha de $streakDays días en CallTest!")
            .setContentText("Tienes una misión de $minutesRequired min pendiente hoy en $appName.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Tienes una misión de $minutesRequired minutos pendiente hoy en $appName. Pruébala ahora para mantener tu racha activa y sumar puntos de confiabilidad.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DAILY_REMINDER, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación para el creador: 12 evaluadores reunidos o ciclo de 14 días activo
     */
    fun sendDeveloperCampaignUpdate(
        context: Context,
        appName: String,
        title: String,
        message: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DEVELOPER_UPDATES)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DEV_UPDATE, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación cuando un tester deja una reseña con estrellas
     */
    fun sendFeedbackReceived(
        context: Context,
        appName: String,
        testerName: String,
        rating: Int,
        comment: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)
        val stars = "⭐".repeat(rating.coerceIn(1, 5))

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("$stars Nueva reseña en $appName")
            .setContentText("$testerName: $comment")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$testerName evaluó tu app con $rating estrellas:\n\"$comment\"")
            )
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_FEEDBACK, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación de desbloqueo de ranura de app por racha
     */
    /**
     * Notificación cuando se desbloquea un nuevo evaluador de respaldo por racha
     */
    fun sendBackupTesterUnlocked(
        context: Context,
        streakDays: Int,
        totalTesters: Int
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🛡️ ¡Desbloqueaste el Tester de Respaldo #$totalTesters!")
            .setContentText("Tu racha de $streakDays días activó un nuevo evaluador de respaldo y tienes 1 nueva app disponible.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("¡Felicidades por tu racha de $streakDays días! Tu app ahora cuenta con $totalTesters evaluadores activos para proteger tus 14 días de Google Play y se ha desbloqueado una nueva app recomendada en tu Inicio.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_SLOT_UNLOCKED + totalTesters, notification)
        } catch (_: SecurityException) {}
    }

    fun sendSlotUnlocked(
        context: Context,
        slotNumber: Int,
        message: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🔓 ¡Ranura $slotNumber Desbloqueada!")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_SLOT_UNLOCKED, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación instantánea de prueba para verificar funcionamiento
     */
    /**
     * Notificación de advertencia de desescalada (Día 3: Pausa del 50% de evaluadores)
     */
    /**
     * Notificación Día 2: Pausa del 1er Tester de Respaldo (#15)
     */
    fun sendDay2BackupTesterPausedNotice(
        context: Context,
        appName: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DEVELOPER_UPDATES)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🛡️ Tester de Respaldo en Pausa: $appName (Día 2)")
            .setContentText("A tu tester de respaldo #15 ya no le aparecerá tu app hoy. Realiza tus 3 min para reactivarlo.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Han pasado 24h sin registrar tu prueba diaria. Por reciprocidad, a tu 1er evaluador de respaldo ya no le aparecerá la misión de $appName. Tus 14 evaluadores restantes siguen activos. Completa tus 3 minutos para reactivarlo.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DEV_UPDATE + 2, notification)
        } catch (_: SecurityException) {}
    }

    fun sendDay3DeescalationWarning(
        context: Context,
        appName: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DEVELOPER_UPDATES)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("⚠️ Pausa de Respaldos y 50% Testers: $appName (Día 3)")
            .setContentText("A los 3 testers de respaldo y al 50% de evaluadores ya no les aparecerá tu app.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Día 3 sin registrar actividad: A tus 3 evaluadores de respaldo (#13, #14, #15) y a 6 de tus evaluadores base ya no les aparecerá la misión de tu app. Tienes 6 evaluadores activos hoy. Completa tus 3 min para reactivar al 100%.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DEV_UPDATE + 3, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación de pausa total (Día 4: 100% de evaluadores en pausa)
     */
    fun sendDay4DeescalationWarning(
        context: Context,
        appName: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DEVELOPER_UPDATES)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("⏸️ Pausa Total (100% de Testers): $appName (Día 4)")
            .setContentText("A ninguno de tus 15 evaluadores le aparecerá tu app hoy. Quedan 24h antes de reasignación.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Día 4 de inactividad: A ninguno de tus evaluadores le aparecerá la misión de tu app hoy (100% en pausa). Tienes 24 horas para hacer tus 3 minutos y reanudar todo tu equipo antes de la reasignación comunitaria.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DEV_UPDATE + 4, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación de reasignación comunitaria (Día 5)
     */
    fun sendDay5ReassignmentNotice(
        context: Context,
        appName: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DEVELOPER_UPDATES)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🔄 Evaluadores Reasignados: $appName (Día 5)")
            .setContentText("Tus evaluadores fueron reasignados. Google Play exige 14 días continuos. Iniciarás un nuevo ciclo al volver.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Tus evaluadores fueron reasignados por inactividad. Como Google Play exige 14 días continuos sin interrupciones, deberás iniciar un nuevo ciclo limpio de 14 días al volver. Haz tus 3 minutos para convocar un nuevo equipo.")
            )
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DEV_UPDATE + 5, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación cuando se cumplen los 14 días de prueba
     */
    /**
     * Notificación de motivación y descubrimiento de nuevas apps para Testers Voluntarios/Libres
     */
    fun sendNewAppDiscoveryForVoluntaryTesters(
        context: Context,
        appName: String,
        category: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("✨ ¡Nueva App Exclusiva: $appName!")
            .setContentText("Sé de los primeros en probar $appName ($category). ¡Toca para explorarla en Google Play!")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("¡Hay una nueva app esperando evaluadores! Sé de los primeros en el mundo en probar $appName ($category) antes de su lanzamiento global en Google Play.")
            )
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_SLOT_UNLOCKED + 200, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación semanal de descubrimiento de apps para Testers Voluntarios
     */
    fun sendWeeklyDiscoveryRecommendation(
        context: Context,
        newAppsCount: Int = 3
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🎮 ¡Nuevas apps para probar esta semana!")
            .setContentText("Hay $newAppsCount nuevas aplicaciones listas para ti en CallTest. ¡Explóralas ahora!")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Descubre las aplicaciones y herramientas más recientes de la comunidad. Pruébalas en Google Play y diviértete conociendo nuevos proyectos.")
            )
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_SLOT_UNLOCKED + 201, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación motivacional post-sesión cuando un tester termina de usar una app con SDK
     */
    fun sendPostSessionFeedbackPrompt(
        context: Context,
        appName: String,
        isPureTester: Boolean = false
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val title = if (isPureTester) "🌟 ¡Gracias por probar $appName!" else "🌟 ¡Excelente sesión en $appName!"
        val summary = if (isPureTester)
            "¡Tu apoyo como evaluador voluntario es increíble! ¿Qué te pareció la app hoy?"
        else
            "Tus 3 minutos de hoy se registraron con éxito ✓. ¿Qué te pareció la app?"

        val bigMessage = if (isPureTester)
            "¡Gracias por probar $appName! Tu opinión honesta como evaluador voluntario ayuda muchísimo al creador y hace crecer a la comunidad. Toca aquí para calificarla con estrellas y dejar tu sugerencia."
        else
            "¡Completaste tu prueba de hoy en $appName! Tu opinión honesta ayuda al creador a mejorar y a cumplir con Google Play. Toca aquí para dejarle tu valoración rápida."

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(summary)
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(bigMessage)
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_SLOT_UNLOCKED + 250, notification)
        } catch (_: SecurityException) {}
    }

    fun sendCycleCompleted14Days(
        context: Context,
        appName: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DEVELOPER_UPDATES)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🏆 ¡14 Días Completados con Éxito!")
            .setContentText("Tus 12 evaluadores cumplieron el ciclo en $appName. Solicita acceso a Producción en Play Console.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("¡Felicidades! Completaste los 14 días de prueba cerrada con tus 12 evaluadores activos en $appName. Ya puedes ir a Google Play Console y solicitar acceso a Producción.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DEV_UPDATE + 14, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación de celebración cuando el desarrollador confirma que Google Play aprobó su app
     */
    fun sendGooglePlayApprovedCelebration(
        context: Context,
        appName: String
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🎉 ¡$appName Aprobada en Google Play!")
            .setContentText("¡Tu app está oficialmente en Producción! Ganaste la insignia de Creador Verificado 🏆.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("¡Enhorabuena! $appName ha sido aprobada oficialmente para el público global en Google Play. Se ha liberado tu ranura de app y ganaste la insignia de Creador Verificado 🏆.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_DEV_UPDATE + 100, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación cuando el desarrollador desbloquea un tester de respaldo (#13, #14 o #15)
     * y se le asigna una nueva app recomendada para probar por reciprocidad.
     */
    fun sendBackupTesterUnlockedWithAppNotification(
        context: Context,
        testerNumber: Int = 13,
        recommendedAppName: String = "Habit Hero Daily"
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🛡️ ¡Tester de Respaldo #$testerNumber Desbloqueado!")
            .setContentText("Tienes una nueva app lista ($recommendedAppName). Descárgala para activar tu beneficio.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("¡Felicidades por tu racha! Se ha asignado el Tester #$testerNumber a tu aplicación. Por reciprocidad comunitaria, tienes una nueva app recomendada ($recommendedAppName) lista para probar 3 min/día en la pestaña Inicio.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_SLOT_UNLOCKED + testerNumber, notification)
        } catch (_: SecurityException) {}
    }

    /**
     * Notificación de felicitación al tester por completar las 14/14 misiones de una app
     */
    fun sendGoldTesterCelebrationNotification(
        context: Context,
        appName: String = "Fintech Tracker"
    ) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_COMMUNITY_REWARDS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🏅 ¡Medalla de Tester de Oro Ganada!")
            .setContentText("¡Completaste los 14 días de $appName! Ganaste Asignación Preferencial 🚀.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("¡Enhorabuena! Has completado las 14 misiones continuas en $appName. Ganaste la insignia de Tester de Oro 14/14, +100 puntos de Karma y Asignación Preferencial para cuando publiques tu app.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_SLOT_UNLOCKED + 50, notification)
        } catch (_: SecurityException) {}
    }

    fun sendTestNotification(context: Context) {
        createNotificationChannels(context)
        val pendingIntent = getMainActivityPendingIntent(context)

        val notification = NotificationCompat.Builder(context, CHANNEL_DAILY_REMINDERS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("🔔 ¡Notificaciones de CallTest Activas!")
            .setContentText("Todo está listo. Recibirás tus recordatorios diarios de 3 min a la hora elegida.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Todo está listo en CallTest. Te recordaremos puntualmente tus misiones diarias para que nunca pierdas tu racha ni tus 12 evaluadores de Google Play.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(NOTIF_ID_TEST, notification)
        } catch (_: SecurityException) {}
    }
}
