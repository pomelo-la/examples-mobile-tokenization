# Diagrama de secuencia de la integración

Al terminar, el resumen final incluye un diagrama de secuencia en Mermaid con **cómo quedó la integración en este proyecto**. Adaptá la plantilla: usá los nombres reales (rutas, archivos, funciones) y quitá o agregá participantes según las capas que existan.

## Reglas

- **Participantes:** incluí solo las capas reales. Una sola capa: `Backend`. BFF y API separadas: `BFF` y `API`.
- **Etiquetas con nombres reales:** la ruta del endpoint (`POST /api/google-pay/opcs`), el archivo o la función donde está cada paso.
- **Lo pendiente se marca:** si una capa no se implementó en este repo, dibujala igual con una nota `Pendiente: la implementa el equipo de <capa>`.
- **El orden importa:** `openAppWindow` va primero y sin pasos previos; las OPCs se piden recién en `onSessionCreated`.

## Plantilla (BFF y API separadas)

```mermaid
sequenceDiagram
    autonumber
    actor U as Tarjetahabiente
    participant F as Frontend<br/>(<archivo del botón>)
    participant G as Google Pay<br/>(ventana)
    participant B as BFF<br/>(POST <ruta>)
    participant A as API<br/>(POST <ruta>)
    participant P as Pomelo

    U->>F: Toca "Agregar a Google Pay"
    F->>G: openAppWindow(integratorId, tokenSetting 1, cardSetting 1, callbacks)
    G->>U: Elige su cuenta de Google
    G-->>F: onSessionCreated(serverSessionId, publicDeviceId, publicWalletId, settings finales)
    Note over F: provisioning_target según los settings finales<br/>(ALL, TSP_OPC o GOOGLE_OPC)
    F->>B: cardId, provisioningTarget, serverSessionId, deviceId, walletAccountId
    B->>A: Reenvía con la identidad del usuario
    Note over A: Valida que la tarjeta es del usuario
    A->>P: POST /token-provisioning/v2/{visa|mastercard}/google-pay
    P-->>A: opc (TSP OPC) y/o google_opc
    A-->>B: opc y/o google_opc
    B-->>F: opc y/o google_opc
    F->>G: pushPaymentCredentials(tokenCredentials y/o cardCredentials)
    G-->>F: onSuccess (tokenResult / cardResult)
    F->>U: Muestra el resultado

    alt Falla el pedido de OPCs
        F->>G: closeAppWindow()
        F->>U: Muestra el error
    end
```

## Variante con un solo backend

Quitá el participante `B` y las dos flechas del BFF; `F` llama directo a `Backend`, que valida la tarjeta y llama a Pomelo.
