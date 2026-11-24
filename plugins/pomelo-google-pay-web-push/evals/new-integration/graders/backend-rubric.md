---
type: llm
weight: 3
focus: { source: file, path: server.js }
---

Evaluá el endpoint de backend que genera las credenciales para Google Pay Web Push Provisioning. PASS solo si se cumplen TODOS los puntos:

1. Hay un endpoint nuevo del servidor que el frontend llama para obtener las OPCs, protegido con la autenticación existente (`requireAuth`).
2. Llama a la API de Pomelo `POST /token-provisioning/v2/visa/google-pay` o `POST /token-provisioning/v2/mastercard/google-pay`, eligiendo según la marca (`provider`) de la tarjeta.
3. El body enviado a Pomelo incluye `card_id`, `provisioning_target` (con valores `ALL`, `TSP_OPC` o `GOOGLE_OPC`) y `server_session_id`; e incluye `device_id` y `wallet_account_id` cuando se pide la TSP OPC (`ALL` o `TSP_OPC`).
4. Usa el access token de Pomelo del servidor (las credenciales OAuth siguen en variables de entorno del backend).
5. Devuelve al frontend `opc` y/o `google_opc`, y responde con un error HTTP si falla la llamada a Pomelo.

FAIL si falta cualquiera de los puntos.
