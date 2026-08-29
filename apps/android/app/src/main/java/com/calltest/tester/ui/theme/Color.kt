package com.calltest.tester.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Primary Branding (Deep Tech Indigo / Modern Blue)
val PrimaryLight = Color(0xFF2563EB)
val OnPrimaryLight = Color(0xFFFFFFFF)
val PrimaryContainerLight = Color(0xFFEFF6FF)
val OnPrimaryContainerLight = Color(0xFF1D4ED8)

val PrimaryDark = Color(0xFF60A5FA)
val OnPrimaryDark = Color(0xFF0F172A)
val PrimaryContainerDark = Color(0xFF1E3A8A)
val OnPrimaryContainerDark = Color(0xFFDBEAFE)

// Secondary (Teal / Cyan Accent)
val SecondaryLight = Color(0xFF0EA5E9)
val OnSecondaryLight = Color(0xFFFFFFFF)
val SecondaryContainerLight = Color(0xFFF0F9FF)
val OnSecondaryContainerLight = Color(0xFF0369A1)

val SecondaryDark = Color(0xFF38BDF8)
val OnSecondaryDark = Color(0xFF082F49)
val SecondaryContainerDark = Color(0xFF0C4A6E)
val OnSecondaryContainerDark = Color(0xFFE0F2FE)

// Neutral Background & Surface
val BackgroundLight = Color(0xFFF8FAFC)
val OnBackgroundLight = Color(0xFF0F172A)
val SurfaceLight = Color(0xFFFFFFFF)
val OnSurfaceLight = Color(0xFF0F172A)
val SurfaceVariantLight = Color(0xFFF1F5F9)
val OnSurfaceVariantLight = Color(0xFF64748B)

val BackgroundDark = Color(0xFF0B0F19)
val OnBackgroundDark = Color(0xFFF8FAFC)
val SurfaceDark = Color(0xFF131B2E)
val OnSurfaceDark = Color(0xFFF8FAFC)
val SurfaceVariantDark = Color(0xFF1E293B)
val OnSurfaceVariantDark = Color(0xFF94A3B8)

// Semantic State Colors
val SuccessLight = Color(0xFF10B981)
val SuccessDark = Color(0xFF34D399)
val SuccessContainerLight = Color(0xFFECFDF5)
val SuccessContainerDark = Color(0xFF064E3B)

val WarningLight = Color(0xFFF59E0B)
val WarningDark = Color(0xFFFBBF24)
val WarningContainerLight = Color(0xFFFFFBEB)
val WarningContainerDark = Color(0xFF78350F)

val ErrorLight = Color(0xFFEF4444)
val ErrorDark = Color(0xFFF87171)
val ErrorContainerLight = Color(0xFFFEF2F2)
val ErrorContainerDark = Color(0xFF7F1D1D)

val InfoLight = Color(0xFF0284C7)
val InfoDark = Color(0xFF38BDF8)
val InfoContainerLight = Color(0xFFE0F2FE)
val InfoContainerDark = Color(0xFF0C4A6E)

val DisabledLight = Color(0xFFCBD5E1)
val DisabledDark = Color(0xFF475569)

// Hero Gradients
val HeroGradientPrimary = Brush.linearGradient(
    colors = listOf(Color(0xFF2563EB), Color(0xFF1D4ED8), Color(0xFF4F46E5))
)

val HeroGradientSuccess = Brush.linearGradient(
    colors = listOf(Color(0xFF059669), Color(0xFF10B981))
)

val GoldTierGradient = Brush.linearGradient(
    colors = listOf(Color(0xFFF59E0B), Color(0xFFD97706), Color(0xFFB45309))
)

val PurpleTierGradient = Brush.linearGradient(
    colors = listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9), Color(0xFF4C1D95))
)
