"use client";

import { useCallback } from "react";
import { GOOGLE_PAY_INTEGRATOR_ID } from "@/lib/google/config";
import type {
	CardNetwork,
	OnFailurePayload,
	OnSuccessPayload,
	PaymentCredentials,
	TokenServiceProvider,
} from "@/lib/google/google-pay-types";
import type { PomeloCardResponse } from "@/lib/pomelo/cards";
import { requestGooglePayOpcs } from "@/lib/pomelo/push-provisioning";
import { getUserAddress } from "@/lib/pomelo/user";

export type ProvisioningFailureReason =
	| "popup-blocked"
	| "cancelled"
	| "device-not-supported"
	| "error";

export interface ProvisioningFailure {
	reason: ProvisioningFailureReason;
	payload?: OnFailurePayload;
}

export interface GooglePayProvisioningCallbacks {
	onSuccess?: (payload: OnSuccessPayload) => void;
	onFailure?: (failure: ProvisioningFailure) => void;
}

function base64ToUint8Array(base64: string): Uint8Array {
	return new TextEncoder().encode(base64);
}

function getCardNetwork(provider: "VISA" | "MASTERCARD"): CardNetwork {
	return provider === "VISA" ? "CARD_NETWORK_VISA" : "CARD_NETWORK_MASTERCARD";
}

function getTokenServiceProvider(
	provider: "VISA" | "MASTERCARD",
): TokenServiceProvider {
	return provider === "VISA" ? "TOKEN_PROVIDER_VISA" : "TOKEN_PROVIDER_MASTERCARD";
}

export function useGooglePayProvisioning(
	card: PomeloCardResponse,
	callbacks?: GooglePayProvisioningCallbacks,
) {
	const start = useCallback(() => {
		if (!window.googlepay) {
			console.error("Google Pay library not loaded");
			callbacks?.onFailure?.({ reason: "error" });
			return;
		}

		try {
			window.googlepay.openAppWindow({
				integratorId: GOOGLE_PAY_INTEGRATOR_ID,
				tokenSetting: 1,
				cardSetting: 1,
				hl: "es-419",
				onSessionCreated: async (payload) => {
					const [userAddress, opcs] = await Promise.all([
						getUserAddress(),
						requestGooglePayOpcs({
							cardId: card.data.id,
							cardProvider: card.data.provider,
							serverSessionId: payload.serverSessionId,
							deviceId: payload.publicDeviceId,
							walletAccountId: payload.publicWalletId,
						}),
					]);

					const paymentCredentials: PaymentCredentials = {
						displayName: card.data.name_on_card,
						lastDigits: card.data.last_four,
						userAddress,
					};

					if (payload.tokenSetting === 1) {
						paymentCredentials.tokenCredentials = {
							cardNetwork: getCardNetwork(card.data.provider),
							tokenServiceProvider: getTokenServiceProvider(
								card.data.provider,
							),
							opaquePaymentCard: base64ToUint8Array(opcs.opc),
						};
					}

					if (payload.cardSetting === 1) {
						paymentCredentials.cardCredentials = {
							googleOpaquePaymentCard: base64ToUint8Array(opcs.google_opc),
						};
					}

					window.googlepay?.pushPaymentCredentials(paymentCredentials);
				},
				onSuccess: (payload) => {
					callbacks?.onSuccess?.(payload);
				},
				onFailure: (payload) => {
					const firstError = payload.errors[0]?.errorCode;
					callbacks?.onFailure?.({
						reason: firstError === "E008" ? "device-not-supported" : "error",
						payload,
					});
				},
				onCancel: () => {
					callbacks?.onFailure?.({ reason: "cancelled" });
				},
			});
		} catch (error) {
			console.error("Failed to open Google Pay window:", error);
			callbacks?.onFailure?.({ reason: "popup-blocked" });
		}
	}, [card, callbacks]);

	return { start };
}
