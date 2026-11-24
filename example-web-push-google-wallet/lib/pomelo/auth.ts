interface TokenResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Obtiene un access token de Pomelo usando el grant OAuth 2.0 client credentials.
 *
 * Solo del lado del servidor: el client secret identifica al emisor frente a Pomelo y nunca debe
 * llegar al navegador. El token se cachea en memoria y se renueva un minuto antes de expirar,
 * para que el flujo de provisioning no sume un round trip extra en cada click.
 *
 * Docs:
 * https://developers.pomelo.la/api-reference/home/auth
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const baseUrl = requireEnv("POMELO_BASE_URL");
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("POMELO_CLIENT_ID"),
      client_secret: requireEnv("POMELO_CLIENT_SECRET"),
      audience: requireEnv("POMELO_AUDIENCE"),
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Pomelo token request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as TokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}
