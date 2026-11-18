"use server";

// Lado backend del emisor en el flujo de Web Push Provisioning.
//
// Este módulo corre solo en el servidor: llama a Pomelo con las credenciales OAuth del emisor,
// que nunca deben llegar al navegador. El sitio lo invoca desde `onSessionCreated`, una vez que
// Google creó la sesión de provisioning y sabe qué se va a hacer (tokenizar, guardar la tarjeta
// o ambas) y, si corresponde, qué dispositivo va a recibir el token.

import { getAccessToken } from "@/lib/pomelo/auth";
import type { CardProvider } from "@/lib/pomelo/cards";

/**
 * Qué OPC(s) tiene que generar Pomelo, según lo que Google confirmó en `onSessionCreated`:
 * - `TSP_OPC`: solo la TSP OPC, para tokenizar. Requiere `deviceId` y
 *   `walletAccountId`.
 * - `GOOGLE_OPC`: solo la Google OPC, para guardar la tarjeta (FPAN) en la cuenta de Google.
 *   Requiere `serverSessionId`.
 * - `ALL`: ambas. Requiere todos los identificadores.
 */
export type ProvisioningTarget = "TSP_OPC" | "GOOGLE_OPC" | "ALL";

/**
 * Credenciales de pago encriptadas (Opaque Payment Cards) generadas por la API de Pomelo.
 *
 * Ambas son opacas para el emisor: son blobs encriptados que el emisor no puede leer,
 * por lo que pueden pasar por el navegador de forma segura y enviarse a `pushPaymentCredentials`.
 * Solo vienen las que se pidieron en `provisioningTarget`.
 */
export interface GooglePayOpcs {
	/**
	 * TSP OPC como string base64. Se usa para tokenizar y se envía en
	 * `PaymentCredentials.tokenCredentials.opaquePaymentCard`. Presente con `TSP_OPC` o `ALL`.
	 */
	opc?: string;
	/**
	 * Google OPC como string base64. Se usa para guardar la tarjeta (FPAN) en la cuenta de Google
	 * y se envía en `PaymentCredentials.cardCredentials.googleOpaquePaymentCard`. Presente con
	 * `GOOGLE_OPC` o `ALL`.
	 */
	google_opc?: string;
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

interface RequestOpcsParams {
	/** ID de la tarjeta de Pomelo a provisionar. */
	cardId: string;
	/** Marca de la tarjeta: define qué endpoint de Pomelo se usa. */
	cardProvider: CardProvider;
	/** Qué OPC(s) generar. */
	provisioningTarget: ProvisioningTarget;
	/** `serverSessionId` de `onSessionCreated`. Pomelo lo embebe en la Google OPC. */
	serverSessionId: string;
	/** `publicDeviceId` de `onSessionCreated`. Dispositivo que va a recibir el token. */
	deviceId?: string;
	/** `publicWalletId` de `onSessionCreated`. Wallet de Google Pay en ese dispositivo. */
	walletAccountId?: string;
	/** ID opcional del usuario de Pomelo dueño de la tarjeta. */
	userId?: string;
}

/**
 * Pide a Pomelo las OPCs (Opaque Payment Cards) de Google Pay.
 *
 * La API de Pomelo genera la TSP OPC (para tokenizar) y/o la Google OPC (para guardar la
 * tarjeta), según `provisioningTarget`. Visa y Mastercard reciben los mismos parámetros; solo
 * cambia el endpoint.
 *
 * Los identificadores del dispositivo (`deviceId` / `walletAccountId`) solo los envía Google
 * cuando va a tokenizar, por eso son obligatorios únicamente si se pide la TSP OPC.
 *
 * Docs:
 * https://developers.pomelo.la/api-reference/tokenization/push-provisioning/provisioning-visa-in-google-pay-upp
 */
export async function requestGooglePayOpcs(
	params: RequestOpcsParams,
): Promise<GooglePayOpcs> {
	const baseUrl = requireEnv("POMELO_BASE_URL");
	const token = await getAccessToken();

	// Un endpoint por red.
	const endpoint =
		params.cardProvider === "VISA"
			? "/token-provisioning/v2/visa/google-pay"
			: "/token-provisioning/v2/mastercard/google-pay";

	const body: Record<string, string> = {
		card_id: params.cardId,
		provisioning_target: params.provisioningTarget,
		server_session_id: params.serverSessionId,
	};

	if (params.userId) {
		body.user_id = params.userId;
	}

	// La TSP OPC se pide con `TSP_OPC` o `ALL`, es decir, siempre que se va a tokenizar.
	const shouldRequestTspOpc = params.provisioningTarget !== "GOOGLE_OPC";

	// La TSP OPC se genera para un dispositivo y una wallet concretos: sin esos
	// identificadores no se puede tokenizar, así que se falla antes de llamar a Pomelo.
	if (shouldRequestTspOpc) {
		if (!params.deviceId || !params.walletAccountId) {
			throw new Error(
				`${params.provisioningTarget} requires both deviceId and walletAccountId`,
			);
		}
		body.device_id = params.deviceId;
		body.wallet_account_id = params.walletAccountId;
	}

	const response = await fetch(`${baseUrl}${endpoint}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(
			`Pomelo OPC request failed: ${response.status} ${response.statusText}`,
		);
	}

	const result = (await response.json()) as { data: GooglePayOpcs };
	return result.data;
}
