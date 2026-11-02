package com.example.example_google_upp.a2a.models

import com.example.example_google_upp.model.Brand
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import java.util.Base64

/**
 * Payload de Mastercard para App-to-App Verification (A2A).
 *
 * Google Wallet invoca la Activity con un Intent que contiene el payload de Mastercard en formato
 * JSON codificado en Base64 estándar en el campo [android.content.Intent.EXTRA_TEXT].
 *
 * Campos:
 * - [paymentAppProviderId]: identificador único global de la wallet.
 * - [paymentAppInstanceId]: identificador opcional del dispositivo/instancia de la wallet.
 * - [tokenUniqueReference]: referencia única del token (TUR) asignada por Mastercard (MDES).
 * - [accountPanSuffix]: últimos 4 dígitos del PAN.
 * - [accountExpiry]: vencimiento del PAN en formato MMYY.
 *
 * Docs:
 * https://developers.google.com/pay/issuers/tsp-integration/app-to-app-idv
 */
data class MastercardA2aPayload(
    @SerializedName("paymentAppProviderId")
    val paymentAppProviderId: String? = null,
    @SerializedName("paymentAppInstanceId")
    val paymentAppInstanceId: String? = null,
    @SerializedName("tokenUniqueReference")
    val tokenUniqueReference: String? = null,
    @SerializedName("accountPanSuffix")
    val accountPanSuffix: String? = null,
    @SerializedName("accountExpiry")
    val accountExpiry: String? = null,
) {
    companion object {
        /**
         * Parsea el payload de Mastercard desde el string Base64 recibido en Intent.EXTRA_TEXT.
         *
         * Usa Java Base64 que está disponible tanto en Android (API 26+) como en JVM de tests.
         *
         * @param extraText El valor de Intent.EXTRA_TEXT (JSON en Base64 estándar), o null si no está presente.
         * @param gson Instancia de Gson para el parseo (por defecto crea una nueva).
         * @return El [MastercardA2aPayload] parseado, o null si el input es inválido o nulo.
         */
        fun fromExtraText(extraText: String?, gson: Gson = Gson()): MastercardA2aPayload? {
            if (extraText.isNullOrBlank()) {
                return null
            }

            return try {
                // Usar Java Base64 decoder estándar (disponible en Android API 26+ y JVM)
                val decoded = Base64.getDecoder().decode(extraText)
                val json = String(decoded, Charsets.UTF_8)
                gson.fromJson(json, MastercardA2aPayload::class.java)
            } catch (e: IllegalArgumentException) {
                // Base64 inválido
                null
            } catch (e: Exception) {
                // JSON malformado u otros errores
                null
            }
        }
    }
}

/**
 * Mapea el payload de Mastercard al modelo neutral [A2aCard].
 *
 * @return La [A2aCard], o null si falta la `tokenUniqueReference` (no se puede activar sin ella).
 */
fun MastercardA2aPayload.toA2aCard(): A2aCard? {
    val tokenId = tokenUniqueReference?.takeIf { it.isNotBlank() } ?: return null
    return A2aCard(
        tokenId = tokenId,
        lastFour = accountPanSuffix ?: "••••",
        brand = Brand.MASTERCARD,
    )
}
