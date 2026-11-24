# Diagrama de secuencia de la integración

Al terminar, el resumen final incluye un diagrama de secuencia de **cómo quedó la integración en este proyecto**. Se dibuja en texto (ASCII) dentro de un bloque de código, directamente en la respuesta: se ve igual en cualquier terminal o IDE, sin publicar nada ni crear archivos.

## Reglas

- **No publiques el diagrama** (nada de artifacts ni páginas externas) y no escribas archivos nuevos en el proyecto del usuario para mostrarlo.
- **Participantes:** incluí solo las capas reales. Una sola capa: `Backend`. BFF y API separadas: `BFF` y `API`.
- **Etiquetas con nombres reales:** la ruta del endpoint (`POST /api/google-pay/opcs`), el archivo o la función donde está cada paso.
- **Lo pendiente se marca:** si una capa no se implementó en este repo, dibujala igual con `(pendiente)` junto al nombre.
- **El orden importa:** `openAppWindow` va primero y sin pasos previos; las OPCs se piden recién en `onSessionCreated`.
- **Ancho:** máximo ~100 columnas, para que no se corte. Etiquetas cortas; el detalle va en "Dónde se hizo".

## Plantilla (BFF y API separadas)

Un renglón por paso, con el emisor, la flecha y el receptor alineados en columnas fijas. Es más fácil de leer y de mantener alineado que un diagrama de carriles.

```text
 Participantes: Usuario · Frontend · Google Pay · BFF · API · Pomelo

  #  De            Hacia         Mensaje
 ─── ───────────── ───────────── ────────────────────────────────────────────────────────
  1  Usuario   ──▶ Frontend      Toca "Agregar a Google Pay"                (<archivo>)
  2  Frontend  ──▶ Google Pay    openAppWindow(integratorId, tokenSetting 1, cardSetting 1)
  3  Usuario   ──▶ Google Pay    Elige su cuenta de Google
  4  Google Pay ─▶ Frontend      onSessionCreated(serverSessionId, deviceId, walletId,
                                 settings finales)
  5  Frontend  ──▶ Frontend      provisioning_target = ALL | TSP_OPC | GOOGLE_OPC
  6  Frontend  ──▶ BFF           POST <ruta>: cardId, target, session, device, wallet
  7  BFF       ──▶ API           POST <ruta>, con la identidad del usuario
  8  API       ──▶ API           Valida que la tarjeta es del usuario
  9  API       ──▶ Pomelo        POST /token-provisioning/v2/{visa|mastercard}/google-pay
 10  Pomelo    ──▶ API           opc (TSP OPC) y/o google_opc
 11  API → BFF → Frontend        opc y/o google_opc
 12  Frontend  ──▶ Google Pay    pushPaymentCredentials(tokenCredentials y/o cardCredentials)
 13  Google Pay ─▶ Frontend      onSuccess(tokenResult / cardResult)
 14  Frontend  ──▶ Usuario       Muestra el resultado

 Si falla el pedido de OPCs (pasos 6 a 11):
  A  Frontend  ──▶ Google Pay    closeAppWindow()
  B  Frontend  ──▶ Usuario       Muestra el error
```

## Variante con un solo backend

Quitá el BFF y el paso 7: el frontend llama directo a `Backend`, que valida la tarjeta y llama a Pomelo.
