---
type: llm
weight: 3
focus: { source: file, path: server.js }
---

El endpoint `/api/google-pay/opcs` estaba roto. PASS solo si la versión corregida cumple TODOS los puntos:

1. Elige el endpoint de Pomelo según la marca de la tarjeta: `/token-provisioning/v2/visa/google-pay` para VISA y `/token-provisioning/v2/mastercard/google-pay` para MASTERCARD (la tarjeta de este emisor es MASTERCARD).
2. El body enviado a Pomelo incluye `provisioning_target` (`ALL`, `TSP_OPC` o `GOOGLE_OPC`), además de `card_id` y `server_session_id`, y `device_id` / `wallet_account_id` cuando se pide la TSP OPC.
3. Si la respuesta de Pomelo no es exitosa, responde al frontend con un error HTTP (no devuelve datos vacíos con 200).

FAIL si falta cualquiera de los puntos.
