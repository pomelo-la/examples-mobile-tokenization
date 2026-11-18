// Configuración de Google Pay Web Push Provisioning.
//
// `integratorId` es el Merchant ID asignado por Google, que se encuentra en la Google Pay Issuer
// Console. Identifica quién inicia la sesión y en nombre de qué emisor. Google lo valida junto
// con el origin de la página contra una allowlist, así que cada origin donde se muestre el botón
// "Agregar a Google Pay" (dev, stage, prod...) tiene que estar registrado en Google para este ID.
//
// No es un secreto: se envía desde el navegador en `openAppWindow`.
//
// Docs:
// https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#quick_start
// https://developers.google.com/pay/issuers/overview/get-started#retrieve_merchant_id
if (!process.env.NEXT_PUBLIC_GOOGLE_PAY_INTEGRATOR_ID) {
	throw new Error(
		"Missing required environment variable: NEXT_PUBLIC_GOOGLE_PAY_INTEGRATOR_ID",
	);
}

export const GOOGLE_PAY_INTEGRATOR_ID =
	process.env.NEXT_PUBLIC_GOOGLE_PAY_INTEGRATOR_ID;
