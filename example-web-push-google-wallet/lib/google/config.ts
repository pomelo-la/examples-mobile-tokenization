// Google Pay Web Push Provisioning configuration.
// The Merchant ID is exposed to the client as a build-time environment variable.
if (!process.env.NEXT_PUBLIC_GOOGLE_PAY_INTEGRATOR_ID) {
	throw new Error(
		"Missing required environment variable: NEXT_PUBLIC_GOOGLE_PAY_INTEGRATOR_ID",
	);
}

export const GOOGLE_PAY_INTEGRATOR_ID =
	process.env.NEXT_PUBLIC_GOOGLE_PAY_INTEGRATOR_ID;
