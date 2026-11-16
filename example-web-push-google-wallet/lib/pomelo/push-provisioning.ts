"use server";

import { getAccessToken } from "@/lib/pomelo/auth";
import type { CardProvider } from "@/lib/pomelo/cards";

export interface GooglePayOpcs {
	/** TSP OPC (VTS or MDES) as base64 string. */
	opc: string;
	/** Google OPC as base64 string. */
	google_opc: string;
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

interface RequestOpcsParams {
	cardId: string;
	cardProvider: CardProvider;
	serverSessionId: string;
	deviceId?: string;
	walletAccountId?: string;
	userId?: string;
}

/**
 * Requests Google Pay OPCs (Opaque Payment Cards) from Pomelo.
 *
 * For VISA, both deviceId and walletAccountId are required.
 * For MASTERCARD, only serverSessionId is required.
 *
 * Returns both the TSP OPC and the Google OPC as base64 strings.
 */
export async function requestGooglePayOpcs(
	params: RequestOpcsParams,
): Promise<GooglePayOpcs> {
	const baseUrl = requireEnv("POMELO_BASE_URL");
	const token = await getAccessToken();

	const endpoint =
		params.cardProvider === "VISA"
			? "/token-provisioning/v2/visa/google-pay"
			: "/token-provisioning/v2/mastercard/google-pay";

	const body: Record<string, string> = {
		card_id: params.cardId,
		server_session_id: params.serverSessionId,
	};

	if (params.userId) {
		body.user_id = params.userId;
	}

	if (params.cardProvider === "VISA") {
		if (!params.deviceId || !params.walletAccountId) {
			throw new Error(
				"VISA provisioning requires both deviceId and walletAccountId",
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
