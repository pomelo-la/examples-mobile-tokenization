# Troubleshooting

| Código | Causa probable | Solución |
| --- | --- | --- |
| `E008` | Falta `rel="opener"` en la imagen del botón. | Agregar `rel="opener"` al `<img>`. |
| `E101` | El `integratorId` no está autorizado. | Verificar el Merchant ID en la Issuer Console de Google. |
| `E102` | El origin del sitio no está autorizado para el `integratorId`. Pasa siempre en `localhost`. | Registrar el origin con Google y probar desde esa URL. |
| `E105` | `tokenSetting` y `cardSetting` en `0`. | Pedir al menos uno en `openAppWindow`. |
| `E106` | La combinación de settings no está habilitada para el `integratorId`. | Revisar con Google qué modos tiene habilitados el emisor. |
| `E114` | Se pidió guardar la tarjeta sin la configuración del emisor en Google. | Completar el formulario de Google indicando que Pomelo es el program manager. |
| `E302` | Las credenciales no llegaron a tiempo. | Llamar a `pushPaymentCredentials` en `onSessionCreated`, o `closeAppWindow()` si falla el pedido de OPCs. |
| `E305` / `E306` | Tarjeta no elegible o tokenización rechazada. | Revisar la tarjeta en Pomelo. Con `cardSetting = 1` llega como error no fatal en `onSuccess`. |
| `E307` / `E308` | Falló CheckEligibility / TokenizeCard del proveedor. | Revisar logs y la respuesta de Pomelo. |
| `E410` | `openAppWindow` se llamó con la ventana ya abierta. | Evitar dobles clicks (deshabilitar el botón mientras corre el flujo). |
| `E411` | El navegador bloqueó la ventana. | Llamar a `openAppWindow` sincrónicamente en el click, sin trabajo previo. |
| `E0xx` | Error inesperado de Google. | Contactar a Google con el código. |

Lista completa: https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#errorCodes

## Síntomas sin código de error

- **La ventana de Google queda cargando**: no se llamó a `pushPaymentCredentials` (el pedido de OPCs falló o se demoró). Ver `E302`.
- **La ventana no se abre**: popup bloqueado por trabajo antes de `openAppWindow`, o la librería no está cargada (`window.googlepay` es `undefined`).
- **Google rechaza las credenciales**: la OPC se decodificó del base64 (`atob`, `Buffer.from`) en lugar de usar `TextEncoder`, o se envió `tokenCredentials` / `cardCredentials` sin que el setting final correspondiente sea `1`.
- **Visa falla con `TSP_OPC` o `ALL`**: faltan `device_id` / `wallet_account_id`. Solo vienen cuando `tokenSetting = 1`.
