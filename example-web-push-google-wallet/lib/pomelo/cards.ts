import { getAccessToken } from "@/lib/pomelo/auth";

export type CardProvider = "VISA" | "MASTERCARD";

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
