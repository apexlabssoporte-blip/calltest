# NOTIFICATION SYSTEM ARCHITECTURE — CALLTEST V1

## 1. Visión General y Principio Fundamental

El **Notification System** es el subsistema de comunicación omnicanal y gestión de eventos de CallTest. Diseñado bajo el principio de **desacoplamiento total de la lógica de negocio**:

```text
Domain Event
      ↓
Notification Event
      ↓
Notification Policy Service
      ↓
Persistence (Idempotent & Deduplicated)
      ↓
In-App Notification
      ↓
Push Notification Provider (FCM / Noop)
```

Ningún controlador o servicio de negocio construye ni despacha notificaciones directamente. Toda notificación se deriva de políticas de dominio ejecutadas tras eventos auditables.

---

## 2. Modelos de Dominio y Base de Datos

### 2.1 Modelo `Notification`
```prisma
model Notification {
  id                 String               @id @default(uuid()) @db.Uuid
  userId             String               @db.Uuid
  type               NotificationType
  title              String
  body               String
  data               Json?
  status             NotificationStatus   @default(PENDING)
  priority           NotificationPriority @default(NORMAL)
  channel            NotificationChannel  @default(IN_APP)
  provider           String?              @default("in_app")
  providerMessageId  String?
  deduplicationKey   String?              @unique
  readAt             DateTime?
  scheduledAt        DateTime?
  sentAt             DateTime?
  failedAt           DateTime?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  user               User                 @relation("UserNotifications", fields: [userId], references: [id], onDelete: Restrict)
}
```

### 2.2 Modelo `NotificationPreference`
Permite a cada usuario activar o desactivar selectivamente categorías de notificación:
* `campaignNotifications`: Notificaciones relacionadas con campañas y estado de salud.
* `missionNotifications`: Nuevas misiones, validaciones y recordatorios.
* `trustNotifications`: Actualizaciones de rango y reputación.
* `systemNotifications`: Avisos generales y del sistema.
* `pushNotifications`: Habilitación del canal Push externo.

### 2.3 Modelo `DevicePushToken`
Almacena tokens de dispositivos móviles vinculados de forma segura a la identidad del usuario autenticado (nunca a identificadores anónimos).

---

## 3. Estados y Canales de Notificación

### 3.1 Estados (`NotificationStatus`)
* `PENDING`: En cola de despacho o evaluación.
* `SENT`: Despachada exitosamente por el backend hacia los canales destino.
* `DELIVERED`: Confirmada por el proveedor o entregada al dispositivo.
* `READ`: Marcada explícitamente como leída por el usuario.
* `FAILED`: Error de entrega o proveedor.
* `CANCELLED`: Cancelada antes de emisión.

### 3.2 Prioridades (`NotificationPriority`)
* `LOW`: Recordatorios de misión o agradecimientos.
* `NORMAL`: Nuevas misiones, nuevos testers incorporados, objetivo de 12 testers alcanzado.
* `HIGH`: Advertencias de salud (`WARNING`), testers marcados como abandonados.
* `CRITICAL`: Alertas de salud crítica (`CRITICAL`).

---

## 4. Deduplicación e Idempotencia

El motor genera claves determinísticas `deduplicationKey` para garantizar que reintentos o recálculos de salud no generen notificaciones duplicadas:
* Para `CAMPAIGN_TARGET_REACHED`: `CAMPAIGN_TARGET_REACHED_${campaignId}_12_active`.
* Para eventos con `sourceEventId`: `${type}_${userId}_${sourceEventId}`.
* Para recordatorios diarios: `${type}_${userId}_${YYYY-MM-DD}`.

---

## 5. Abstracción del Proveedor Push (`PushNotificationProvider`)

Se implementa la interfaz `PushNotificationProvider` con un proveedor inicial `NoopPushProvider` para entornos de desarrollo y pruebas, preparado para la integración nativa con Firebase Cloud Messaging (FCM).

---

## 6. Endpoints REST In-App

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Autenticado | Notificaciones paginadas del usuario (`limit <= 100`). |
| `GET` | `/notifications/unread-count` | Autenticado | Conteo de notificaciones no leídas (`{ unreadCount }`). |
| `POST` | `/notifications/:id/read` | Autenticado | Marcar notificación como leída (Protección IDOR estricta). |
| `POST` | `/notifications/read-all` | Autenticado | Marcar todas las notificaciones del usuario como leídas. |
| `GET` | `/notifications/preferences` | Autenticado | Consultar preferencias de notificación del usuario. |
| `PATCH` | `/notifications/preferences` | Autenticado | Actualizar preferencias de notificación. |
| `POST` | `/notifications/device-token` | Autenticado | Registrar token FCM / Android para notificaciones Push. |
