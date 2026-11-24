# Backend: generación de OPCs con la API de Pomelo

## Contenido

- Autenticación
- Endpoints
- Body y `provisioning_target`
- Respuesta
- Código de referencia (Node.js / TypeScript)
- Ejemplo con curl

## Autenticación

OAuth 2.0 client credentials. El token se cachea en el servidor hasta poco antes de `expires_in`.

```http
POST {POMELO_BASE_URL}/oauth/token
Content-Type: application/json

{
  "client_id": "<POMELO_CLIENT_ID>",
  "client_secret": "<POMELO_CLIENT_SECRET>",
  "audience": "<POMELO_AUDIENCE>",
  "grant_type": "client_credentials"
}
```

Respuesta: `access_token`, `expires_in` (segundos), `token_type` y `scope`.

Documentación: https://developers.pomelo.la/api-reference/home/auth

## Endpoints

Uno por marca. El body es el mismo para ambos.

| Marca | Endpoint |
| --- | --- |
| `VISA` | `POST {POMELO_BASE_URL}/token-provisioning/v2/visa/google-pay` |
| `MASTERCARD` | `POST {POMELO_BASE_URL}/token-provisioning/v2/mastercard/google-pay` |

Header: `Authorization: Bearer <access_token>`.

Documentación: https://developers.pomelo.la/api-reference/tokenization/push-provisioning/provisioning-visa-in-google-pay-upp

## Body y `provisioning_target`

| Campo | Origen | Requerido |
| --- | --- | --- |
| `card_id` | Id de la tarjeta en Pomelo (`crd-...`) | Siempre |
| `provisioning_target` | `ALL`, `TSP_OPC` o `GOOGLE_OPC` (default `ALL`) | No, pero enviarlo siempre |
| `server_session_id` | `serverSessionId` de `onSessionCreated` | Con `GOOGLE_OPC` o `ALL` |
| `device_id` | `publicDeviceId` de `onSessionCreated` | Con `TSP_OPC` o `ALL` |
| `wallet_account_id` | `publicWalletId` de `onSessionCreated` | Con `TSP_OPC` o `ALL` |
| `user_id` | Id del usuario en Pomelo (`usr-...`) | No |

- `TSP_OPC`: devuelve solo `data.opc` (para tokenizar).
- `GOOGLE_OPC`: devuelve solo `data.google_opc` (para guardar la tarjeta).
- `ALL`: devuelve ambas.

Google solo envía `publicDeviceId` y `publicWalletId` cuando va a tokenizar (`tokenSetting = 1`), por eso no se piden con `GOOGLE_OPC`.

## Respuesta

```json
{
  "data": {
    "opc": "eyJmdW5kaW5nQWNjb3VudEluZm8i...",
    "google_opc": "eyJmdW5kaW5nQWNjb3VudEluZm8i..."
  }
}
```

Errores: `400` (request inválido) y `502` (falla del proveedor). En ambos casos el frontend tiene que cerrar la ventana de Google.

## Código de referencia (Node.js / TypeScript)

Adaptalo al framework del proyecto (Express, Next.js route handler o server action, NestJS, Fastify...). En otros lenguajes, replicá la misma lógica.

```ts
type CardProvider = "VISA" | "MASTERCARD";
type ProvisioningTarget = "ALL" | "TSP_OPC" | "GOOGLE_OPC";

interface GooglePayOpcs {
  /** TSP OPC en base64. Presente con TSP_OPC o ALL. */
  opc?: string;
  /** Google OPC en base64. Presente con GOOGLE_OPC o ALL. */
  google_opc?: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getPomeloAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(`${process.env.POMELO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.POMELO_CLIENT_ID,
      client_secret: process.env.POMELO_CLIENT_SECRET,
      audience: process.env.POMELO_AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) {
    throw new Error(`Pomelo token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function requestGooglePayOpcs(params: {
  cardId: string;
  cardProvider: CardProvider;
  provisioningTarget: ProvisioningTarget;
  serverSessionId: string;
  deviceId?: string;
  walletAccountId?: string;
}): Promise<GooglePayOpcs> {
  const token = await getPomeloAccessToken();

  // Un endpoint por marca; el body es el mismo.
  const endpoint =
    params.cardProvider === "VISA"
      ? "/token-provisioning/v2/visa/google-pay"
      : "/token-provisioning/v2/mastercard/google-pay";

  const body: Record<string, string> = {
    card_id: params.cardId,
    provisioning_target: params.provisioningTarget,
    server_session_id: params.serverSessionId,
  };

  // La TSP OPC se genera para un dispositivo y una wallet concretos.
  const shouldRequestTspOpc = params.provisioningTarget !== "GOOGLE_OPC";
  if (shouldRequestTspOpc) {
    if (!params.deviceId || !params.walletAccountId) {
      throw new Error(`${params.provisioningTarget} requires deviceId and walletAccountId`);
    }
    body.device_id = params.deviceId;
    body.wallet_account_id = params.walletAccountId;
  }

  const response = await fetch(`${process.env.POMELO_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Pomelo OPC request failed: ${response.status}`);
  }

  const result = (await response.json()) as { data: GooglePayOpcs };
  return result.data;
}
```

### Endpoint propio del emisor (ejemplo con Express)

```ts
app.post("/api/google-pay/opcs", requireAuth, async (req, res) => {
  const { cardId, provisioningTarget, serverSessionId, deviceId, walletAccountId } = req.body;

  // La marca sale del backend (la tarjeta del usuario autenticado), no del request.
  const card = await findCardOfUser(req.user, cardId);
  if (!card) return res.status(404).end();

  try {
    const opcs = await requestGooglePayOpcs({
      cardId,
      cardProvider: card.provider,
      provisioningTarget,
      serverSessionId,
      deviceId,
      walletAccountId,
    });
    res.json(opcs);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "opc_request_failed" });
  }
});
```

## Ejemplo con curl

```bash
curl -X POST "${POMELO_BASE_URL}/token-provisioning/v2/visa/google-pay" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "card_id": "crd-20gRqyp809SvDzXzhSeG2w6UiO5",
    "provisioning_target": "ALL",
    "server_session_id": "sess-9c2f-4a1b-8e3d",
    "device_id": "MTcwOTIwMTMyMDA4NTIwZDZI",
    "wallet_account_id": "iBzxylvWTDyR8jzZd1Hdlg"
  }'
```
