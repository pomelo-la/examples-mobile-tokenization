package com.example.example_google_upp.a2a

import android.content.Intent
import com.example.example_google_upp.a2a.models.StepUpResult

/**
 * Traduce el resultado del flujo de App-to-App Verification en el Intent que Google Wallet
 * espera recibir de una app emisora para Mastercard.
 *
 * El Intent lleva los extras `issuerMobileAppAuthResponse` (`APPROVED`, `DECLINED` o `FAILURE`, en
 * mayúsculas) y `tokenUniqueReference`.
 *
 * No se envía `TAV` (la activación la hace el backend de Pomelo vía API) ni se usa
 * `REQUIRE_ACTIVATION`.
 *
 * Docs:
 * https://developers.google.com/pay/issuers/tsp-integration/app-to-app-idv
 */
object MastercardAuthResultResolver {
    private const val AUTH_RESPONSE_EXTRA = "issuerMobileAppAuthResponse"
    private const val TOKEN_UNIQUE_REFERENCE_EXTRA = "tokenUniqueReference"

    /**
     * Convierte un [StepUpResult] en un Intent con los extras que espera Google Wallet.
     *
     * Para el caso de payload inválido o ausente se puede usar
     * `toResultIntent(StepUpResult.Declined, null)`.
     *
     * @param result El resultado del flujo A2A.
     * @param tokenUniqueReference La TUR recibida en el payload, o null si no hay payload válido.
     * @return Un Intent con los extras configurados.
     */
    fun toResultIntent(result: StepUpResult, tokenUniqueReference: String?): Intent =
        Intent().apply {
            putExtra(AUTH_RESPONSE_EXTRA, result.toAuthResponseValue())
            putExtra(TOKEN_UNIQUE_REFERENCE_EXTRA, tokenUniqueReference)
        }

    private fun StepUpResult.toAuthResponseValue(): String = when (this) {
        StepUpResult.Approved -> "APPROVED"
        StepUpResult.Declined -> "DECLINED"
        is StepUpResult.Failure -> "FAILURE"
    }
}
