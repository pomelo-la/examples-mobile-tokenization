import { getAccessToken } from "@/lib/pomelo/auth";

export type CardProvider = "VISA" | "MASTERCARD";

/**
 * Subconjunto de la tarjeta de Pomelo que usa el flujo de provisioning:
 * - `id`: se envía a Pomelo para generar las OPCs.
 * - `provider`: define el endpoint de Pomelo y el `cardNetwork` de Google.
 * - `last_four` y `name_on_card`: datos no sensibles que Google le muestra al usuario
 *   (`PaymentCredentials.lastDigits` / `displayName`).
 *
 * El sitio nunca necesita el PAN completo: solo viaja encriptado dentro de las OPCs.
 */
export interface PomeloCardResponse {
  data: {
    id: string;
    last_four: string;
    provider: CardProvider;
    name_on_card: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function getCard(cardId: string): Promise<PomeloCardResponse> {
  const baseUrl = requireEnv("POMELO_BASE_URL");
  const token = await getAccessToken();

  const response = await fetch(
    `${baseUrl}/cards/v1/${encodeURIComponent(cardId)}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Pomelo get card failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as PomeloCardResponse;
}
