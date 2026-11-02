package com.example.example_google_upp.a2a.models

import com.example.example_google_upp.model.Brand

/**
 * Datos de la tarjeta que necesitan el ViewModel y la pantalla compartidos del flujo de
 * App-to-App Verification, independientes de la marca.
 *
 * Cada Activity (Visa, Mastercard) parsea su propio payload y lo mapea a este modelo, de modo que
 * la lógica específica de cada marca no se mezcla con el flujo común.
 *
 * @property tokenId Identificador del token a activar en Pomelo.
 * @property lastFour Últimos 4 dígitos del PAN, para mostrar en pantalla.
 * @property brand Marca de la tarjeta.
 */
data class A2aCard(
    val tokenId: String,
    val lastFour: String,
    val brand: Brand,
)
