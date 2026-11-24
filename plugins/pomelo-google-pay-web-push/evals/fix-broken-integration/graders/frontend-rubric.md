---
type: llm
weight: 3
focus: { source: file, path: public/index.html }
---

Esta página tenía una integración rota de Google Pay Web Push Provisioning. PASS solo si la versión corregida cumple TODOS los puntos:

1. En el handler del click, `window.googlepay.openAppWindow(...)` se llama de forma sincrónica: NO hay `await` ni `fetch` antes de esa llamada dentro del handler (la dirección del usuario ya no se pide antes de abrir la ventana).
2. El `<img>` del botón tiene `rel="opener"`.
3. Dentro de `onSessionCreated` se usan `payload.tokenSetting` y `payload.cardSetting` para decidir qué pedir y qué enviar: `tokenCredentials` solo si tokenSetting es 1 y `cardCredentials` solo si cardSetting es 1.
4. Las OPCs se convierten con `new TextEncoder().encode(...)`; ya no se usa `atob`.
5. Si falla el pedido de OPCs, se llama a `closeAppWindow()`.
6. Se manejan `onSuccess`, `onFailure` y `onCancel`.

FAIL si falta cualquiera de los puntos.
