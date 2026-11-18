import type { UserAddress } from "@/lib/google/google-pay-types";

/**
 * Endpoint GET simulado que devuelve datos de usuario hardcodeados.
 * En una implementación real, estos datos se obtendrían del backend del emisor.
 *
 * La dirección se envía a Google en `PaymentCredentials.userAddress` y se usa para precargar la
 * dirección de facturación del tarjetahabiente. Debe ser la dirección del dueño de la tarjeta
 * registrada en el emisor. `countryCode` tiene que ser un código ISO 3166-1 alpha-2 ("AR", no "ARG").
 *
 * Docs:
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#useraddress_object
 */
export async function getUserAddress(): Promise<UserAddress> {
	// Simula la latencia de red
	await new Promise((resolve) => setTimeout(resolve, 100));

	return {
		name: "Juan Pérez",
		addressLines: ["Av. Corrientes 1234, Piso 5"],
		localityName: "Buenos Aires",
		administrativeAreaName: "CABA",
		postalCodeNumber: "C1043AAZ",
		countryCode: "AR",
		phone: "+54 11 5555-5555",
	};
}
