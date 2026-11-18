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
import {
	type ProvisioningTarget,
	requestGooglePayOpcs,
} from "@/lib/pomelo/push-provisioning";
import { getUserAddress } from "@/lib/pomelo/user";

/**
 * Resultado simplificado de un intento de provisioning fallido, para que la UI pueda mostrar un
 * mensaje claro sin tener que conocer los códigos de error de Google.
 *
 * - `popup-blocked`: `openAppWindow` lanzó una excepción (errores E4xx de la librería, típicamente
 *   porque el navegador bloqueó la ventana de Google Pay).
 * - `cancelled`: el usuario cerró la ventana de Google Pay antes de llegar a un estado final.
 * - `error`: cualquier otro fallo, ya sea reportado por Google en `onFailure` o al pedir las OPCs.
 */
export type ProvisioningFailureReason =
	| "popup-blocked"
	| "cancelled"
	| "error";

export interface ProvisioningFailure {
	reason: ProvisioningFailureReason;
	/** Payload original de `onFailure` de Google, se conserva para logging/debugging. */
	payload?: OnFailurePayload;
}

export interface GooglePayProvisioningCallbacks {
	onSuccess?: (payload: OnSuccessPayload) => void;
	onFailure?: (failure: ProvisioningFailure) => void;
}

/**
 * Convierte la OPC en base64 que devuelve Pomelo al formato que espera Google.
 *
 * Google NO espera los bytes decodificados de la OPC. Espera un `Uint8Array` cuyos elementos sean
 * los códigos ASCII del propio string base64 (base64 estándar, RFC 4648 §4, no URL-safe).
 * Pomelo ya devuelve las OPCs en ese alfabeto, así que alcanza con codificar el string como texto.
 *
 * Docs:
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#quick_start
 */
function base64ToUint8Array(base64: string): Uint8Array {
	return new TextEncoder().encode(base64);
}

/**
 * Mapea la marca de la tarjeta de Pomelo al valor `cardNetwork` de `TokenCredentials`.
 *
 * Docs:
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#accepted_cardnetwork_values
 */
function getCardNetwork(provider: "VISA" | "MASTERCARD"): CardNetwork {
	return provider === "VISA" ? "CARD_NETWORK_VISA" : "CARD_NETWORK_MASTERCARD";
}

/**
 * Mapea la marca de la tarjeta de Pomelo al valor `tokenServiceProvider` de `TokenCredentials`.
 * Para tarjetas de Pomelo el token service provider siempre coincide con la red de la tarjeta.
 *
 * Docs:
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#accepted_tokenserviceprovider_values
 */
function getTokenServiceProvider(
	provider: "VISA" | "MASTERCARD",
): TokenServiceProvider {
	return provider === "VISA" ? "TOKEN_PROVIDER_VISA" : "TOKEN_PROVIDER_MASTERCARD";
}

/**
 * Decide qué OPC(s) pedirle a Pomelo:
 * - Tokenizar y guardar la tarjeta → `ALL`.
 * - Solo tokenizar → `TSP_OPC`.
 * - Solo guardar la tarjeta → `GOOGLE_OPC`.
 * - Ninguna → `null` (no hay nada que pedir).
 */
function getProvisioningTarget(
	shouldTokenize: boolean,
	shouldSaveCard: boolean,
): ProvisioningTarget | null {
	if (shouldTokenize && shouldSaveCard) return "ALL";
	if (shouldTokenize) return "TSP_OPC";
	if (shouldSaveCard) return "GOOGLE_OPC";
	return null;
}

/**
 * Ejecuta el flujo de Google Pay Web Push Provisioning para una tarjeta de Pomelo.
 *
 * Se piden ambas cosas (tokenizar y guardar la tarjeta), pero el flujo se adapta a lo que Google
 * confirme: token + FPAN, solo token o solo FPAN.
 *
 * Flujo:
 * 1. El usuario hace click en "Agregar a Google Pay" y `start` llama a `openAppWindow` de forma
 *    sincrónica. Google abre su propia ventana, donde el usuario inicia sesión en su cuenta de
 *    Google y elige el dispositivo Android que va a recibir el token.
 * 2. Google crea una sesión de provisioning y llama a `onSessionCreated` con los settings finales
 *    y los identificadores de la sesión y del dispositivo (`serverSessionId`, `publicDeviceId`,
 *    `publicWalletId`).
 * 3. Con esos datos, el backend del emisor le pide a Pomelo las credenciales de pago encriptadas
 *    (OPCs) que correspondan. Los datos de la tarjeta nunca pasan en claro por el navegador.
 * 4. El sitio arma el payload `PaymentCredentials` y se lo entrega a Google con
 *    `pushPaymentCredentials`.
 * 5. Google completa la tokenización en el dispositivo elegido y/o guarda la tarjeta en la cuenta
 *    de Google, y reporta el resultado vía `onSuccess`, `onFailure` u `onCancel`.
 *
 * Docs:
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api
 */
export function useGooglePayProvisioning(
	card: PomeloCardResponse,
	callbacks?: GooglePayProvisioningCallbacks,
) {
	const start = useCallback(() => {
		/**
		 * Cierra la ventana de Google y reporta el fallo.
		 *
		 * Después de `closeAppWindow` Google ya no llama a ningún callback (ni `onCancel`), así que
		 * el fallo se reporta acá.
		 *
		 * Docs:
		 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#closeAppWindow
		 */
		const cancelFlow = (reason: ProvisioningFailureReason) => {
			window.googlepay?.closeAppWindow();
			callbacks?.onFailure?.({ reason });
		};

		// La librería (`integration-1.6.min.js`) crea `window.googlepay` al cargarse. Si no está, no
		// hay nada que abrir, así que se falla rápido en lugar de lanzar una excepción en el click.
		if (!window.googlepay) {
			console.error("Google Pay library not loaded");
			callbacks?.onFailure?.({ reason: "error" });
			return;
		}

		try {
			// IMPORTANTE: `openAppWindow` tiene que ser lo primero que se ejecute después del click
			// del usuario. Cualquier request de red o trabajo pesado antes hace que el navegador
			// trate la nueva ventana como un popup no solicitado y la bloquee. Por eso las OPCs NO se
			// piden acá, sino más tarde, dentro de `onSessionCreated`.
			window.googlepay.openAppWindow({
				// Merchant ID asignado por Google en la Issuer Console. Google lo valida junto con el
				// origin de la página contra una allowlist (E101 / E102 si no coinciden).
				integratorId: GOOGLE_PAY_INTEGRATOR_ID,
				// 1 => pedir provisionar un token en el dispositivo.
				tokenSetting: 1,
				// 1 => pedir además guardar la tarjeta (FPAN) en la cuenta de Google del usuario.
				// Requiere haber completado el formulario de Google indicando que Pomelo es el
				// program manager (si no, E114).
				cardSetting: 1,
				// Idioma con el que se muestra la ventana de Google Pay (IETF BCP 47).
				hl: "es-419",
				// Callback obligatorio. Las credenciales de pago se DEBEN enviar después de que se
				// dispare este callback; si no, la ventana de Google queda en un loader hasta que
				// expira (E302).
				onSessionCreated: async (payload) => {
					// Hay que usar los settings FINALES del payload, no los que se pidieron en
					// `openAppWindow`: Google puede degradarlos. Por ejemplo, si el usuario no tiene
					// un Android que soporte pagos tokenizados, `tokenSetting` llega en 0 y el flujo
					// sigue como "solo guardar tarjeta".
					//
					// - `shouldTokenize`: Google va a provisionar un token en el dispositivo, así que
					//   necesita la TSP OPC.
					// - `shouldSaveCard`: Google va a guardar la tarjeta (FPAN) en la cuenta de
					//   Google, así que necesita la Google OPC.
					const shouldTokenize = payload.tokenSetting === 1;
					const shouldSaveCard = payload.cardSetting === 1;
					const provisioningTarget = getProvisioningTarget(
						shouldTokenize,
						shouldSaveCard,
					);

					// No debería pasar: Google no crea una sesión sin nada que hacer. Se cancela en
					// lugar de dejar la ventana esperando credenciales que nunca van a llegar.
					if (!provisioningTarget) {
						cancelFlow("error");
						return;
					}

					try {
						// Se piden en paralelo la dirección del tarjetahabiente y las OPCs al backend
						// del emisor, que es quien llama a Pomelo con sus credenciales.
						//
						// Los identificadores que entrega Google atan las OPCs a esta sesión y
						// dispositivo:
						// - `serverSessionId` va embebido en la Google OPC.
						// - `publicDeviceId` / `publicWalletId` se usan para generar la TSP OPC.
						//   Solo vienen cuando Google va a tokenizar (`tokenSetting` = 1).
						const [userAddress, opcs] = await Promise.all([
							getUserAddress(),
							requestGooglePayOpcs({
								cardId: card.data.id,
								cardProvider: card.data.provider,
								provisioningTarget,
								serverSessionId: payload.serverSessionId,
								deviceId: payload.publicDeviceId,
								walletAccountId: payload.publicWalletId,
							}),
						]);

						// Datos no sensibles de la tarjeta que Google muestra en su UI y en la Wallet.
						const paymentCredentials: PaymentCredentials = {
							displayName: card.data.name_on_card,
							lastDigits: card.data.last_four,
							userAddress,
						};

						// Pomelo devuelve exactamente las OPCs pedidas en `provisioningTarget`, así que
						// la TSP OPC está presente si `shouldTokenize` y la Google OPC si
						// `shouldSaveCard`.

						// Tokenización: se envía la TSP OPC.
						if (shouldTokenize) {
							paymentCredentials.tokenCredentials = {
								cardNetwork: getCardNetwork(card.data.provider),
								tokenServiceProvider: getTokenServiceProvider(
									card.data.provider,
								),
								opaquePaymentCard: base64ToUint8Array(opcs.opc!),
							};
						}

						// Guardar la tarjeta (FPAN) en la cuenta de Google: se envía la Google OPC.
						if (shouldSaveCard) {
							paymentCredentials.cardCredentials = {
								googleOpaquePaymentCard: base64ToUint8Array(opcs.google_opc!),
							};
						}

						// Se le entregan las credenciales a Google. A partir de acá Google maneja el
						// resto del flujo (chequeo de elegibilidad, ID&V, activación del token) y
						// reporta el resultado vía los callbacks.
						window.googlepay?.pushPaymentCredentials(paymentCredentials);
					} catch (error) {
						// Si falla el pedido de OPCs no hay nada para enviarle a Google. Se cancela en
						// lugar de dejar la ventana esperando hasta que expire (E302).
						console.error("Failed to get payment credentials:", error);
						cancelFlow("error");
					}
				},
				// El flujo terminó bien. Google ya mostró una pantalla de éxito en su ventana.
				//
				// El éxito puede ser parcial: si se pidieron ambas cosas y una falla después de
				// enviar las credenciales (por ejemplo E303-E308 en la tokenización, que llegan en
				// `debugInfo.nonFatalErrors`), Google igual completa la otra y llama a `onSuccess`.
				// Hay que revisar `tokenResult` / `cardResult` para saber qué se hizo.
				onSuccess: (payload) => {
					callbacks?.onSuccess?.(payload);
				},
				// El flujo falló: no se tokenizó ni se guardó nada. Google ya mostró un error en su
				// ventana, así que esto sirve principalmente para logging y para adaptar nuestra UI.
				onFailure: (payload) => {
					callbacks?.onFailure?.({ reason: "error", payload });
				},
				// El usuario (u otra causa) cerró la ventana de Google antes de llegar a un estado
				// final. Lo más probable es que no se haya tokenizado ni guardado nada, pero no es
				// seguro.
				onCancel: () => {
					callbacks?.onFailure?.({ reason: "cancelled" });
				},
			});
		} catch (error) {
			// `openAppWindow` lanza una excepción sincrónica con un código E4xx cuando no puede abrir
			// la ventana (por ejemplo E411 si se bloqueó el popup, E410 si ya estaba abierta).
			console.error("Failed to open Google Pay window:", error);
			callbacks?.onFailure?.({ reason: "popup-blocked" });
		}
	}, [card, callbacks]);

	return { start };
}
