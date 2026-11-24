---
name: web-push-provisioning
description: Integra Google Pay Web Push Provisioning con la API de Pomelo en un sitio web existente, para que el tarjetahabiente agregue su tarjeta Visa o Mastercard de Pomelo a Google Pay / Google Wallet desde el navegador, sin app nativa. Cubre el botón "Agregar a Google Pay", la librería window.googlepay (openAppWindow, onSessionCreated, pushPaymentCredentials), el endpoint de backend que pide la TSP OPC y la Google OPC a Pomelo con provisioning_target, y el manejo de resultados y errores (E1xx-E4xx). Usar cuando pidan agregar, integrar, revisar o corregir "agregar a Google Pay" / "add to Google Pay" / "adicionar ao Google Pay", web push provisioning, push provisioning web, tokenización web o "Google Wallet desde la web" con tarjetas de Pomelo. No usar para integraciones Android nativas (Tap and Pay SDK) ni para el SDK de Pomelo.
---

# Google Pay Web Push Provisioning con Pomelo

Web Push Provisioning permite que el tarjetahabiente agregue su tarjeta a Google Pay **desde el sitio web del emisor**. Google abre su propia ventana, el usuario elige su cuenta de Google y Google:

- **tokeniza** la tarjeta en un dispositivo Android del usuario (token), y/o
- **guarda** la tarjeta (FPAN) en la cuenta de Google del usuario.

La API de Pomelo genera las credenciales de pago encriptadas que Google necesita: la **TSP OPC** (para tokenizar) y/o la **Google OPC** (para guardar la tarjeta).

Respondé al usuario en su idioma.

## Arquitectura

La integración siempre tiene dos partes. No las mezcles:

1. **Frontend del emisor**: carga la librería de Google, muestra el botón y ejecuta el flujo con `window.googlepay`.
2. **Backend del emisor**: expone un endpoint propio que el frontend llama desde `onSessionCreated`. Ese endpoint se autentica contra Pomelo y pide las OPCs. Las credenciales de Pomelo **nunca** llegan al navegador.

## Reglas obligatorias

Estas reglas son la causa de la mayoría de las integraciones rotas. Cumplilas todas:

1. **`openAppWindow` es lo primero en el click.** Llamalo de forma sincrónica en el handler del click, sin `await`, `fetch` ni trabajo pesado antes. Si no, el navegador bloquea la ventana (`E411`). Los datos que necesites en el click (card id, marca, últimos 4, nombre) tienen que estar cargados antes.
2. **Las OPCs se piden dentro de `onSessionCreated`**, nunca antes: dependen de `serverSessionId`, `publicDeviceId` y `publicWalletId`, que Google entrega en ese callback.
3. **Usar los settings FINALES de `onSessionCreated`**, no los pedidos en `openAppWindow`. Google puede degradarlos (por ejemplo, `tokenSetting` llega en `0` si el usuario no tiene un Android compatible). Con ellos se elige `provisioning_target`:

   | `tokenSetting` | `cardSetting` | `provisioning_target` | Se envía en `PaymentCredentials` |
   | --- | --- | --- | --- |
   | `1` | `1` | `ALL` | `tokenCredentials` + `cardCredentials` |
   | `1` | `0` | `TSP_OPC` | `tokenCredentials` |
   | `0` | `1` | `GOOGLE_OPC` | `cardCredentials` |

4. **Formato de las OPCs**: Google espera un `Uint8Array` con los **códigos ASCII del string base64**, no los bytes decodificados. Pomelo ya devuelve base64, así que se usa `new TextEncoder().encode(opc)`. **Nunca** `atob`, `Buffer.from(opc, "base64")` ni `Uint8Array.from(atob(...))`.
5. **Siempre enviar credenciales o cerrar la ventana.** Si falla el pedido de OPCs, llamar a `window.googlepay.closeAppWindow()` y avisar al usuario. Si no, la ventana de Google queda en un loader hasta que expira (`E302`). Después de `closeAppWindow` Google no llama a ningún callback.
6. **Botón oficial con `rel="opener"`**: usar la imagen servida por Google y el atributo `rel="opener"` en el `<img>`. Sin él, el flujo falla con `E008`.
7. **Secretos solo en el backend**: `client_id`, `client_secret` y el access token de Pomelo viven en el servidor. El `integratorId` de Google no es secreto y puede estar en el frontend.
8. **Mismo body para Visa y Mastercard**: solo cambia el endpoint de Pomelo según la marca de la tarjeta.

## Flujo de trabajo

### 1. Relevar el proyecto

Antes de escribir código, identificá:

- **Frontend**: framework (HTML/JS plano, React, Next.js, Angular, Vue...) y dónde se muestra la tarjeta.
- **Backend**: lenguaje y framework, cómo se manejan las variables de entorno y si ya existe un cliente de la API de Pomelo (autenticación, base URL).
- **Datos de la tarjeta disponibles en el frontend**: id de Pomelo (`crd-...`), marca (`VISA` / `MASTERCARD`), últimos 4 dígitos y nombre. Si faltan, hay que exponerlos desde el backend **antes** del click.
- **Dirección del tarjetahabiente** para `userAddress`: de dónde sale (el backend del emisor, normalmente). `countryCode` es ISO 3166-1 alpha-2 (`AR`, no `ARG`).

Si falta información que no se puede deducir (por ejemplo, el `integratorId` o el nombre de las variables de entorno), usá un placeholder claro o una variable de entorno y avisalo al final.

### 2. Backend: endpoint de OPCs

Agregá un endpoint propio (por ejemplo `POST /api/google-pay/opcs`) que reciba `cardId`, `provisioningTarget`, `serverSessionId`, `deviceId` y `walletAccountId`, y que:

1. Obtenga un access token de Pomelo (OAuth 2.0 client credentials) y lo cachee hasta que expire.
2. Elija el endpoint según la marca de la tarjeta y llame a Pomelo con `provisioning_target`.
3. Devuelva `opc` y/o `google_opc` al frontend.

Validá que el usuario autenticado sea dueño de `cardId` antes de pedir las OPCs. Contrato de la API, ejemplo de body y código de referencia: [references/backend.md](references/backend.md).

### 3. Frontend: librería, botón y flujo

1. Cargar la librería de Google (`integration.min.js`, se descarga de la documentación de Google y se sirve desde el sitio) antes de que el usuario pueda hacer click.
2. Agregar el botón oficial con `rel="opener"`.
3. En el click: `openAppWindow` con `integratorId`, `tokenSetting: 1`, `cardSetting: 1` y los callbacks.
4. En `onSessionCreated`: calcular `provisioning_target` con los settings finales, llamar al endpoint del backend, armar `PaymentCredentials` y llamar a `pushPaymentCredentials`. Si algo falla, `closeAppWindow`.
5. Manejar `onSuccess` (puede ser parcial: revisar `tokenResult` y `cardResult`), `onFailure`, `onCancel` y la excepción sincrónica de `openAppWindow`.

Código de referencia, tipos y variantes por framework: [references/frontend.md](references/frontend.md).

### 4. Verificar

No es posible probar el flujo de punta a punta desde el agente: Pomelo no soporta un ambiente de test y Google no permite `localhost` (valida el origin contra una allowlist). Revisá el código contra esta checklist:

- [ ] `openAppWindow` se llama sincrónicamente en el click, sin requests ni `await` antes.
- [ ] La librería de Google se carga antes del click.
- [ ] El `<img>` del botón tiene `rel="opener"`.
- [ ] `provisioning_target` se calcula con `tokenSetting` / `cardSetting` del payload de `onSessionCreated`.
- [ ] `tokenCredentials` solo si `tokenSetting === 1`; `cardCredentials` solo si `cardSetting === 1`.
- [ ] Las OPCs se convierten con `TextEncoder`, sin decodificar el base64.
- [ ] Si falla el pedido de OPCs se llama a `closeAppWindow()`.
- [ ] `client_secret` y el token de Pomelo solo existen en el backend.
- [ ] El endpoint de Pomelo depende de la marca (`visa` / `mastercard`) y el body es el mismo.
- [ ] `onSuccess` contempla éxito parcial (`tokenResult` / `cardResult`).

Si el proyecto tiene linter, type checker o tests, correlos.

### 5. Cerrar con los pasos pendientes del emisor

Al terminar, listá al usuario lo que tiene que resolver fuera del código:

- Descargar la librería de Google desde la [documentación oficial](https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api) y servirla desde el sitio.
- Obtener el `integratorId` (Merchant ID) en la Issuer Console de Google.
- Registrar en Google los origins donde se muestra el botón (si no, `E102`).
- Para guardar la tarjeta en la cuenta de Google: completar el formulario de Google indicando que Pomelo es su program manager (si no, `E114`).
- Configurar las credenciales OAuth de Pomelo en el backend.
- Probar desde la URL registrada en Google: no funciona en `localhost` y Pomelo no tiene ambiente de test.

Errores frecuentes y cómo resolverlos: [references/troubleshooting.md](references/troubleshooting.md).

## MCP de Pomelo

El plugin incluye el MCP `pomelo-api-reference` con la documentación de la API de Pomelo. Si sus tools están disponibles, usalas para confirmar los endpoints y el body antes de escribir el backend, en lugar de apoyarte solo en `references/backend.md`:

- `search_endpoints`: busca endpoints por intención (ej. "provisioning google pay").
- `get_endpoint`: documentación completa de un endpoint.
- `generate_request_example`: ejemplo de request en curl, Node o Python.
- `list_endpoints_by_topic` y `list_topics`: navegar la documentación.

Si el MCP no responde, usá `references/backend.md`.

## Referencias

- [Google Pay Unified Web Push Provisioning API](https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api)
- [Pomelo: Provisioning Visa en Google Pay](https://developers.pomelo.la/api-reference/tokenization/push-provisioning/provisioning-visa-in-google-pay-upp)
- [Pomelo: Autenticación](https://developers.pomelo.la/api-reference/home/auth)
- Ejemplo completo en Next.js: [`example-web-push-google-wallet`](https://github.com/pomelo-la/examples-mobile-tokenization/tree/develop/example-web-push-google-wallet)
