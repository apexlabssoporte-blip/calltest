# CallTest Android SDK 🚀

El SDK oficial de **CallTest** permite a los desarrolladores medir automáticamente las sesiones de prueba de 3 minutos requeridas por Google Play Console, con costo $0.00 y sin alterar el código de su aplicación.

---

## 📦 1. Instalación en Gradle

En el archivo `settings.gradle.kts` o `build.gradle.kts` raíz de tu app:
```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}
```

En el `build.gradle.kts` de tu módulo `:app`:
```kotlin
dependencies {
    implementation("com.github.calltest:sdk:1.0.0")
}
```

---

## ⚡ 2. Inicialización en 1 Línea

En tu clase `Application` (`MyApplication.kt`):
```kotlin
import android.app.Application
import com.calltest.sdk.CallTestSdk

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // 🚀 Inicialización automática de telemetría de 3 minutos
        CallTestSdk.install(this, apiKey = "TU_API_KEY_DE_CALLTEST")
    }
}
```

---

## 🛡️ ¿Qué hace automáticamente el SDK?
1. **Medición en Primer Plano:** Detecta cuándo la app se abre y se minimiza, calculando los minutos exactos de prueba de cada evaluador.
2. **Telemetría para Google Play:** Verifica que cada tester cumpla con los >3 minutos por día durante los 14 días.
3. **Monitor de Estabilidad:** Registra de forma anónima si ocurren caídas para el cálculo del 99.8% de estabilidad.
