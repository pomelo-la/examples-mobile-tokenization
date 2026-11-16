import type { UserAddress } from "@/lib/google/google-pay-types";

/**
 * Simulated GET endpoint that returns hardcoded user data.
 * In a real implementation, this would fetch the user's data from the backend.
 */
export async function getUserAddress(): Promise<UserAddress> {
	// Simulate network delay
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
