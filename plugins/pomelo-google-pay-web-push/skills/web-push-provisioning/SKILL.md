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

### 0. Preguntar la marca de las tarjetas

La integración depende de la marca: el endpoint de Pomelo es distinto para Visa y para Mastercard (el body es el mismo). Los emisores de Pomelo suelen emitir **Visa o Mastercard**, y a veces **ambas**.

1. **Deducila primero** del proyecto: buscá `VISA` / `MASTERCARD` / `visa` / `mastercard` en el código, los modelos de tarjeta, las respuestas de la API de Pomelo y la configuración.
2. **Si no se puede deducir, preguntá** antes de escribir código, con una sola pregunta de opción múltiple (usá `AskUserQuestion` si está disponible): "¿Qué marcas de tarjeta emiten con Pomelo?" con las opciones Visa, Mastercard, Ambas.
3. **Si no podés preguntar** (modo no interactivo), asumí ambas marcas, porque cubre todos los casos.

Con una sola marca, igual elegí el endpoint a partir de la marca de la tarjeta (no lo fijes en el código): así agregar la otra marca después no requiere cambios.

### 1. Relevar el proyecto y elegir dónde va el botón

Antes de escribir código, identificá:

- **Frontend**: framework (HTML/JS plano, React, Next.js, Angular, Vue...) y dónde se muestra la tarjeta.
- **Backend**: lenguaje y framework, cómo se manejan las variables de entorno y si ya existe un cliente de la API de Pomelo (autenticación, base URL).
- **Dónde vive la integración con Pomelo**: en muchos proyectos la app la sirve un BFF (backend for frontend) y las llamadas a Pomelo están en **otra API**. Buscá el cliente de Pomelo (`POMELO_*`, `api.pomelo.la`, `/oauth/token`, `/cards/v1`) y cómo el frontend llega a los datos de la tarjeta.
  - Si el repo ya tiene cliente y credenciales de Pomelo, la integración vive acá: seguí.
  - **En cualquier otro caso preguntá**, también si el repo no llama a ninguna otra API: que no haya un cliente de Pomelo en este repo no significa que la integración no exista en otro servicio. Opciones: "en este mismo backend", "en otra API (este repo es el BFF)", "no existe todavía, hay que crearla acá".
  - **Nunca crees un cliente de Pomelo nuevo (OAuth, credenciales) sin confirmarlo.** En modo no interactivo, creá solo lo necesario en este repo y dejá en el resumen esta decisión marcada como supuesto a confirmar.
- **Dónde va el botón**: buscá la pantalla de **detalle de la tarjeta**, la que muestra la tarjeta y sus acciones (pausar o bloquear, denunciar, ver movimientos, cambiar PIN, etc.). Ahí va el botón, junto a esas acciones. Buscá por rutas y componentes (`card`, `tarjeta`, `card-detail`, `cartao`), por textos de las acciones y por el lugar donde ya se consulta la tarjeta. **Si no hay una pantalla clara, o hay varias candidatas, preguntá** dónde mostrarlo, con las candidatas que encontraste como opciones. En modo no interactivo, elegí la más probable y avisalo en el resumen.
- **Datos de la tarjeta disponibles en el frontend**: id de Pomelo (`crd-...`), marca (`VISA` / `MASTERCARD`), últimos 4 dígitos y nombre. Si faltan, hay que exponerlos desde el backend **antes** del click.
- **Dirección del tarjetahabiente** para `userAddress`: de dónde sale (el backend del emisor, normalmente). `countryCode` es ISO 3166-1 alpha-2 (`AR`, no `ARG`).

Si falta información que no se puede deducir (por ejemplo, el `integratorId` o el nombre de las variables de entorno), usá un placeholder claro o una variable de entorno y avisalo en los pendientes del resumen final.

### 2. Backend: endpoint de OPCs

**Una sola capa:** si la integración con Pomelo vive en este backend, hacé todo acá, como se describe abajo.

**BFF y API separadas:** el navegador solo habla con el BFF, y las credenciales de Pomelo viven solo en la API que ya las tiene. Repartí el trabajo así:

- **API con la integración de Pomelo:** el endpoint de OPCs (cliente OAuth, endpoint por marca, `provisioning_target`) y la validación de que la tarjeta pertenece al usuario. Esa validación va siempre en la API, no solo en el BFF.
- **BFF:** un endpoint que recibe el pedido del frontend y lo reenvía a la API, reenviando la identidad del usuario. No agregues credenciales de Pomelo ni un cliente de Pomelo al BFF.
- **Si el repo es solo una de las dos capas:** implementá esa capa y dejá la otra como pendiente. En el resumen final incluí el texto de traspaso de [references/handoff.md](references/handoff.md), adaptado al proyecto: qué hace el servicio, un `curl` de ejemplo del contrato y los links a la documentación de Pomelo, para que el equipo dueño del otro repo lo implemente sin contexto previo.

El endpoint de OPCs (en la API, o en el único backend) es el que sigue. Agregá un endpoint (por ejemplo `POST /api/google-pay/opcs`) que reciba `cardId`, `provisioningTarget`, `serverSessionId`, `deviceId` y `walletAccountId`, y que:

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

### Documentar el código que generás

El código que dejás en el proyecto tiene que explicar el flujo, igual que el [ejemplo del repo](https://github.com/pomelo-la/examples-mobile-tokenization/tree/develop/example-web-push-google-wallet). Un desarrollador que nunca vio push provisioning debe poder entender qué hace cada pieza leyendo solo los comentarios. Reglas y ejemplos: [references/comments.md](references/comments.md). Resumen:

- Comentarios en el **idioma del proyecto** (español si no se sabe), con JSDoc/KDoc en funciones, tipos y componentes.
- Cada archivo nuevo abre con un comentario de **qué rol cumple en el flujo** y desde dónde se lo invoca.
- Cada función dice **qué hace y por qué**, no repite el código. Las reglas no obvias (orden de `openAppWindow`, `TextEncoder`, `closeAppWindow`, `provisioning_target`) llevan su motivo.
- Los pasos de `onSessionCreated` van **numerados** con un comentario por paso.
- Un bloque `Docs:` con el link oficial (Google o Pomelo) donde aplique.
- Los placeholders se marcan con `TODO(emisor):` y dicen qué hay que reemplazar y por qué.
- No expliques conceptos del framework (Next, React, Express...), solo el flujo de push provisioning.

### 4. Verificar

No es posible probar el flujo de punta a punta desde el agente: Pomelo no soporta un ambiente de test y Google no permite `localhost` (valida el origin contra una allowlist). Revisá el código contra esta checklist:

- [ ] `openAppWindow` se llama sincrónicamente en el click, sin requests ni `await` antes.
- [ ] La librería de Google se carga antes del click.
- [ ] El `<img>` del botón tiene `rel="opener"`.
- [ ] `provisioning_target` se calcula con `tokenSetting` / `cardSetting` del payload de `onSessionCreated`.
- [ ] `tokenCredentials` solo si `tokenSetting === 1`; `cardCredentials` solo si `cardSetting === 1`.
- [ ] Las OPCs se convierten con `TextEncoder`, sin decodificar el base64.
- [ ] Si falla el pedido de OPCs se llama a `closeAppWindow()`.
- [ ] `client_secret` y el token de Pomelo solo existen en el backend. Con BFF y API separadas, solo en la API, nunca en el BFF.
- [ ] El endpoint de Pomelo depende de la marca (`visa` / `mastercard`) y el body es el mismo.
- [ ] `onSuccess` contempla éxito parcial (`tokenResult` / `cardResult`).

Si el proyecto tiene linter, type checker o tests, correlos.

### 5. Cerrar con un resumen que acompañe al usuario

El objetivo es que el usuario llegue a producción lo más directo posible. El resumen final tiene siempre estas partes, en este orden: qué se hizo, decisiones y supuestos, dónde se hizo (con el diagrama) y qué queda pendiente.

**1. Qué se hizo.** Un párrafo que dice el resultado, las marcas soportadas y si se pudo verificar (compila, linter, tests; y que la prueba de punta a punta no es posible desde acá). No es una lista de archivos.

**2. Decisiones y supuestos.** Una lista de cada decisión que tomaste y **por qué**, con una marca clara en las que el usuario debe confirmar:
- marca de las tarjetas (dedujiste, preguntaste o asumiste) y cómo queda para agregar la otra;
- dónde vive la integración con Pomelo y por qué (este backend, API separada) y qué capas se tocaron;
- en qué pantalla quedó el botón y por qué esa;
- cómo se resolvió lo que no existía (usuario autenticado, dirección del tarjetahabiente, datos de la tarjeta) y que es provisorio.

**3. Dónde se hizo.** Una entrada por archivo, con su ruta como link, **qué cambió y qué función cumple en el flujo y por qué existe**. No alcanza con nombrar el archivo: por ejemplo, "`lib/pomelo.ts`: cliente de Pomelo. Pide el access token (OAuth) y lo cachea porque el token dura minutos; elige el endpoint por marca porque Visa y Mastercard tienen rutas distintas con el mismo body".

**Diagrama.** Después de "Dónde se hizo", dibujá en la respuesta, en un bloque de código de texto (ASCII), un diagrama de secuencia de cómo quedó la integración en este proyecto, con sus capas, rutas y archivos reales. No lo publiques ni crees archivos para mostrarlo. Plantilla y reglas: [references/diagram.md](references/diagram.md).

**4. Qué queda pendiente.** Una checklist numerada, en el orden en que conviene hacerlo. Cada ítem dice **qué hacer, por qué y dónde**, con el link correspondiente. Incluí solo los que apliquen y completá los que dependan del proyecto (por ejemplo, el nombre real de la variable o el archivo donde va):

0. **Si falta la otra capa (BFF o API):** va primero. Pegá el texto de traspaso de [references/handoff.md](references/handoff.md) adaptado al proyecto, listo para copiar y pasar al otro equipo.
1. **Descargar la librería de Google** (`integration.min.js`) de la [documentación oficial](https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api) y servirla desde el sitio, en la ruta que carga el código. Sin ella, `window.googlepay` no existe y el botón no hace nada. Requiere tener acceso a esa documentación.
2. **Obtener el `integratorId`** (Merchant ID) en la Issuer Console de Google y cargarlo en la variable de entorno indicada.
3. **Configurar las credenciales de Pomelo** en el backend (`POMELO_CLIENT_ID`, `POMELO_CLIENT_SECRET`, `POMELO_AUDIENCE`, `POMELO_BASE_URL`, o los nombres que use el proyecto). Nunca en el frontend. Doc: [Autenticación](https://developers.pomelo.la/api-reference/home/auth).
4. **Resolver autenticación y datos reales**, si el proyecto tiene placeholders:
   - Que el backend devuelva la tarjeta solo si pertenece al usuario autenticado. Sin eso, cualquiera que conozca un `cardId` podría pedir OPCs.
   - La dirección real del tarjetahabiente para `userAddress` (`countryCode` en ISO alpha-2).
5. **Registrar en Google los origins** donde se muestra el botón. Si no, el popup falla con `E102`.
6. **Completar el formulario de Google** indicando que Pomelo es su program manager, para poder guardar la tarjeta en la cuenta de Google. Si no, falla con `E114`.
7. **Probar de punta a punta** desde una URL registrada en Google y con una tarjeta real. No funciona en `localhost` y Pomelo no tiene ambiente de test: hay que desplegar a la URL declarada en Google. Si algo falla, [references/troubleshooting.md](references/troubleshooting.md) mapea cada código de error (`E1xx`-`E4xx`) a su causa.

Cerrá con los links útiles: la [API de Google](https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api), la [API de Pomelo](https://developers.pomelo.la/api-reference/tokenization/push-provisioning/provisioning-visa-in-google-pay-upp) y el [ejemplo completo](https://github.com/pomelo-la/examples-mobile-tokenization/tree/develop/example-web-push-google-wallet).

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
