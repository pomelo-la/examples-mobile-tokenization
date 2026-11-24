---
type: llm
weight: 3
focus: { source: file, path: public/index.html }
---

Evaluá la integración de Google Pay Web Push Provisioning en esta página. PASS solo si se cumplen TODOS los puntos:

1. Hay un botón con la imagen oficial `https://pay.google.com/gp/v/a/pushprovisioning/saveButtonImage` y el `<img>` tiene `rel="opener"`.
2. Se carga el script `integration.min.js` antes de que el usuario pueda hacer click.
3. En el handler del click, `window.googlepay.openAppWindow(...)` se llama de forma sincrónica: NO hay `await`, `fetch` ni otra request antes de esa llamada dentro del handler.
4. El pedido de credenciales al backend se hace DENTRO del callback `onSessionCreated`, no antes.
5. Dentro de `onSessionCreated` se usan `payload.tokenSetting` y `payload.cardSetting` (los valores que entrega Google) para decidir qué pedir y qué enviar: `tokenCredentials` solo si tokenSetting es 1 y `cardCredentials` solo si cardSetting es 1.
6. Las OPCs se convierten con `new TextEncoder().encode(...)` y NO se decodifican con `atob` ni similares.
7. Se llama a `pushPaymentCredentials(...)` con `displayName`, `lastDigits` y `userAddress`.
8. Si falla el pedido de OPCs, se llama a `closeAppWindow()`.

FAIL si falta cualquiera de los puntos o si hay credenciales de Pomelo (client_secret) en la página.
