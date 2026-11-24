# Traspaso a la otra capa (BFF o API)

Cuando el repo tiene solo una de las dos capas, el resumen final incluye este texto adaptado, para que el equipo dueño de la otra capa la implemente sin tener contexto previo. Reemplazá los valores entre `<...>` con los reales del proyecto (rutas, nombres, URL base).

## Contenido

- Si falta la API
- Si falta el BFF

## Si falta la API (el repo es el BFF)

Texto para el equipo de la API:

> **Qué necesitamos.** Un endpoint que genere las OPCs (One-Time Payment Credentials) que Google Pay necesita para agregar una tarjeta de Pomelo desde la web. Nuestro BFF lo va a llamar cuando el usuario toque "Agregar a Google Pay".
>
> **Qué hace el servicio.**
> 1. Valida que `cardId` pertenece al usuario autenticado. Sin esta validación, cualquiera que conozca un `cardId` podría pedir OPCs.
> 2. Obtiene un access token de Pomelo (OAuth 2.0 client credentials) y lo cachea hasta que expire.
> 3. Llama a la API de Pomelo según la marca de la tarjeta (`visa` o `mastercard`), con el mismo body para ambas, y devuelve `opc` y/o `google_opc`.
>
> **Contrato que espera el BFF.**
>
> ```bash
> curl -X POST "<API_BASE_URL>/<ruta>/google-pay/opcs" \
>   -H "Authorization: Bearer <token del usuario>" \
>   -H "Content-Type: application/json" \
>   -d '{
>     "cardId": "crd-20gRqyp809SvDzXzhSeG2w6UiO5",
>     "provisioningTarget": "ALL",
>     "serverSessionId": "sess-9c2f-4a1b-8e3d",
>     "deviceId": "MTcwOTIwMTMyMDA4NTIwZDZI",
>     "walletAccountId": "iBzxylvWTDyR8jzZd1Hdlg"
>   }'
> ```
>
> Respuesta `200`: `{ "opc": "<base64>", "google_opc": "<base64>" }`. Con `provisioningTarget` `TSP_OPC` solo viene `opc`; con `GOOGLE_OPC` solo viene `google_opc`. Si falla Pomelo, responder `502`.
>
> **Llamada a Pomelo.**
>
> ```bash
> curl -X POST "${POMELO_BASE_URL}/token-provisioning/v2/visa/google-pay" \
>   -H "Authorization: Bearer ${POMELO_TOKEN}" \
>   -H "Content-Type: application/json" \
>   -d '{
>     "card_id": "crd-20gRqyp809SvDzXzhSeG2w6UiO5",
>     "provisioning_target": "ALL",
>     "server_session_id": "sess-9c2f-4a1b-8e3d",
>     "device_id": "MTcwOTIwMTMyMDA4NTIwZDZI",
>     "wallet_account_id": "iBzxylvWTDyR8jzZd1Hdlg"
>   }'
> ```
>
> Para Mastercard, el mismo body a `/token-provisioning/v2/mastercard/google-pay`. Con `provisioning_target: GOOGLE_OPC` no se envían `device_id` ni `wallet_account_id`.
>
> **Documentación.** [Provisioning en Google Pay (API de Pomelo)](https://developers.pomelo.la/api-reference/tokenization/push-provisioning/provisioning-visa-in-google-pay-upp) · [Autenticación](https://developers.pomelo.la/api-reference/home/auth). Código de referencia en Node/TypeScript: `references/backend.md` del plugin, o el [ejemplo completo](https://github.com/pomelo-la/examples-mobile-tokenization/tree/develop/example-web-push-google-wallet).

## Si falta el BFF (el repo es la API)

Texto para el equipo del BFF y del frontend:

> **Qué necesitamos.** Un endpoint en el BFF que reciba el pedido del navegador y lo reenvíe a la API, más el botón y el flujo de Google Pay en el frontend.
>
> **Qué hace el BFF.** Recibe `cardId`, `provisioningTarget`, `serverSessionId`, `deviceId` y `walletAccountId`, y los reenvía a la API con la identidad del usuario. No lleva credenciales de Pomelo ni valida contra Pomelo: eso lo hace la API.
>
> ```bash
> curl -X POST "<API_BASE_URL>/<ruta>/google-pay/opcs" \
>   -H "Authorization: Bearer <token del usuario>" \
>   -H "Content-Type: application/json" \
>   -d '{"cardId":"crd-...","provisioningTarget":"ALL","serverSessionId":"sess-...","deviceId":"...","walletAccountId":"..."}'
> ```
>
> Respuesta `200`: `{ "opc": "<base64>", "google_opc": "<base64>" }`.
>
> **Frontend.** Botón oficial con `rel="opener"`, `openAppWindow` sincrónico en el click y el flujo de `onSessionCreated`. Guía y código: `references/frontend.md` del plugin, la [documentación de Google](https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api) y el [ejemplo completo](https://github.com/pomelo-la/examples-mobile-tokenization/tree/develop/example-web-push-google-wallet).
