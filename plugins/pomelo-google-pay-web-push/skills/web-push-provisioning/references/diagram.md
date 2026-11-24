# Diagrama de secuencia de la integración

Al terminar, el resumen final incluye un diagrama de secuencia en Mermaid con **cómo quedó la integración en este proyecto**. Adaptá la plantilla: usá los nombres reales (rutas, archivos, funciones) y quitá o agregá participantes según las capas que existan.

## Cómo mostrarlo

Que se vea **dibujado**, no como código Mermaid en la terminal:

1. **Si tenés la herramienta `Artifact`** (o una de vista previa de HTML), generá una página HTML autocontenida con el diagrama y publicala como artifact privado. Usá la plantilla de abajo, con tu diagrama adaptado en el `<pre class="mermaid">`. Decile al usuario el link y que el diagrama sale de la integración recién hecha.
2. **Si no tenés ninguna**, mostrá el bloque ` ```mermaid ` en el resumen, que muchos clientes renderizan, y no escribas archivos nuevos en el proyecto del usuario.

Plantilla HTML (modo claro y oscuro, sin dependencias salvo Mermaid desde cdnjs con versión fija):

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flujo Google Pay web</title>
  <style>
    :root { --bg: #ffffff; --fg: #1a1a1a; }
    @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #14161a; --fg: #e8e8e8; } }
    :root[data-theme="dark"] { --bg: #14161a; --fg: #e8e8e8; }
    body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; margin: 0; padding: 16px; }
    .mermaid { overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Flujo Google Pay web push</h1>
  <pre class="mermaid">
<!-- acá va el sequenceDiagram adaptado al proyecto -->
  </pre>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js"></script>
  <script>
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    mermaid.initialize({ startOnLoad: true, theme: dark ? "dark" : "default" });
  </script>
</body>
</html>
```

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
