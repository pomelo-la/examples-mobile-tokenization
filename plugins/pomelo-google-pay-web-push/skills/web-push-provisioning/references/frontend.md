# Frontend: librería, botón y flujo

## Contenido

- Cargar la librería de Google
- Botón "Agregar a Google Pay"
- Flujo completo (TypeScript, sin framework)
- Tipos mínimos de `window.googlepay`
- Notas por framework
- Manejo de resultados

## Cargar la librería de Google

La librería (`integration.min.js`) se descarga de la [documentación de Google](https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#quick_start) y se sirve desde el sitio del emisor. Crea `window.googlepay` y tiene que estar cargada **antes** del click.

```html
<script src="/integration.min.js"></script>
```

No la agregues al repositorio si el emisor no la tiene: indicá dónde ubicarla.

## Botón "Agregar a Google Pay"

Imagen oficial servida por Google, según las [brand guidelines](https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#brand_guidelines):

```html
<!-- Reservar entre 100 y 300px de ancho; el tamaño depende del idioma. -->
<button type="button" id="add-to-google-pay" aria-label="Agregar a Google Pay">
  <img
    src="https://pay.google.com/gp/v/a/pushprovisioning/saveButtonImage?hl=es-419"
    rel="opener"
    height="46"
    alt=""
  />
</button>
```

- `rel="opener"` es obligatorio (sin él, `E008`). En JSX/TSX, TypeScript no tipa `rel` en `<img>`: usar `{...({ rel: "opener" } as { rel: string })}`.
- `hl` fuerza el idioma (`es-419`, `pt-BR`, `en-US`...).
- Google recomienda ocultar el botón en navegadores no soportados (solo las últimas versiones de Chrome, Firefox, Edge y Safari).

## Flujo completo (TypeScript, sin framework)

```ts
type CardProvider = "VISA" | "MASTERCARD";
type ProvisioningTarget = "ALL" | "TSP_OPC" | "GOOGLE_OPC";

interface Card {
  id: string; // crd-...
  provider: CardProvider;
  lastFour: string;
  nameOnCard: string;
}

/**
 * Google espera los códigos ASCII del string base64, NO los bytes decodificados.
 * Nunca usar atob ni Buffer.from(..., "base64").
 */
function base64ToUint8Array(base64: string): Uint8Array {
  return new TextEncoder().encode(base64);
}

function getProvisioningTarget(
  shouldTokenize: boolean,
  shouldSaveCard: boolean,
): ProvisioningTarget | null {
  if (shouldTokenize && shouldSaveCard) return "ALL";
  if (shouldTokenize) return "TSP_OPC";
  if (shouldSaveCard) return "GOOGLE_OPC";
  return null;
}

export function startGooglePayProvisioning(card: Card) {
  const googlepay = window.googlepay;
  if (!googlepay) {
    showMessage("No pudimos cargar Google Pay");
    return;
  }

  // Cierra la ventana de Google y avisa. Después de closeAppWindow, Google no llama callbacks.
  const cancelFlow = () => {
    googlepay.closeAppWindow();
    showMessage("No pudimos agregar la tarjeta a Google Pay");
  };

  try {
    // IMPORTANTE: primera instrucción del click, sin requests ni await antes.
    googlepay.openAppWindow({
      integratorId: GOOGLE_PAY_INTEGRATOR_ID, // Merchant ID de la Issuer Console (no es secreto)
      tokenSetting: 1, // pedir tokenizar en el dispositivo
      cardSetting: 1, // pedir guardar la tarjeta en la cuenta de Google
      hl: "es-419",
      onSessionCreated: async (payload) => {
        // Settings FINALES: Google puede degradarlos.
        const shouldTokenize = payload.tokenSetting === 1;
        const shouldSaveCard = payload.cardSetting === 1;
        const provisioningTarget = getProvisioningTarget(shouldTokenize, shouldSaveCard);
        if (!provisioningTarget) {
          cancelFlow();
          return;
        }

        try {
          // Endpoint propio del backend del emisor (ver backend.md).
          const response = await fetch("/api/google-pay/opcs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cardId: card.id,
              provisioningTarget,
              serverSessionId: payload.serverSessionId,
              deviceId: payload.publicDeviceId,
              walletAccountId: payload.publicWalletId,
            }),
          });
          if (!response.ok) throw new Error(`OPC request failed: ${response.status}`);
          const opcs: { opc?: string; google_opc?: string } = await response.json();

          const paymentCredentials: PaymentCredentials = {
            displayName: card.nameOnCard,
            lastDigits: card.lastFour,
            userAddress: await getUserAddress(), // dirección del tarjetahabiente, countryCode ISO alpha-2
          };

          if (shouldTokenize) {
            paymentCredentials.tokenCredentials = {
              cardNetwork: card.provider === "VISA" ? "CARD_NETWORK_VISA" : "CARD_NETWORK_MASTERCARD",
              tokenServiceProvider:
                card.provider === "VISA" ? "TOKEN_PROVIDER_VISA" : "TOKEN_PROVIDER_MASTERCARD",
              opaquePaymentCard: base64ToUint8Array(opcs.opc!),
            };
          }

          if (shouldSaveCard) {
            paymentCredentials.cardCredentials = {
              googleOpaquePaymentCard: base64ToUint8Array(opcs.google_opc!),
            };
          }

          googlepay.pushPaymentCredentials(paymentCredentials);
        } catch (error) {
          console.error(error);
          cancelFlow(); // evita que la ventana quede esperando hasta E302
        }
      },
      onSuccess: (payload) => {
        // El éxito puede ser parcial.
        if (payload.tokenResult === 1) showMessage("¡Tarjeta agregada a Google Pay!");
        else if (payload.cardResult === 1) showMessage("¡Tarjeta guardada en tu cuenta Google!");
      },
      onFailure: (payload) => {
        console.error("Google Pay failure", payload.errors);
        showMessage("No pudimos agregar la tarjeta a Google Pay");
      },
      onCancel: () => {
        showMessage("Se cerró la ventana de Google Pay");
      },
    });
  } catch (error) {
    // Excepción sincrónica E4xx: típicamente popup bloqueado (E411) o ventana ya abierta (E410).
    console.error(error);
    showMessage("Tu navegador bloqueó la ventana de Google Pay. Permití las ventanas emergentes.");
  }
}

document
  .getElementById("add-to-google-pay")
  ?.addEventListener("click", () => startGooglePayProvisioning(currentCard));
```

`showMessage`, `getUserAddress`, `currentCard` y `GOOGLE_PAY_INTEGRATOR_ID` son del proyecto del emisor. `getUserAddress` puede pedirse en paralelo con las OPCs.

## Tipos mínimos de `window.googlepay`

```ts
interface OnSessionCreatedPayload {
  clientSessionId: string;
  serverSessionId: string;
  tokenSetting: number; // final: 1 = se tokeniza
  cardSetting: number; // final: 1 = se guarda el FPAN
  publicDeviceId?: string; // solo si tokenSetting === 1
  publicWalletId?: string; // solo si tokenSetting === 1
}

interface OnSuccessPayload {
  tokenResult: 0 | 1;
  cardResult: 0 | 1;
  debugInfo: { nonFatalErrors: { errorCode: string }[] };
}

interface OnFailurePayload {
  errors: { errorCode: string }[];
}

interface UserAddress {
  name: string;
  addressLines: string[];
  localityName: string;
  administrativeAreaName: string;
  postalCodeNumber: string;
  countryCode: string; // ISO 3166-1 alpha-2
  phone: string;
}

interface PaymentCredentials {
  displayName: string;
  lastDigits: string;
  userAddress: Partial<UserAddress>;
  tokenCredentials?: {
    cardNetwork: "CARD_NETWORK_VISA" | "CARD_NETWORK_MASTERCARD";
    tokenServiceProvider: "TOKEN_PROVIDER_VISA" | "TOKEN_PROVIDER_MASTERCARD";
    opaquePaymentCard: Uint8Array;
  };
  cardCredentials?: { googleOpaquePaymentCard: Uint8Array };
}

interface GooglePayLibrary {
  openAppWindow(options: {
    integratorId: string;
    tokenSetting: number;
    cardSetting: number;
    onSessionCreated: (payload: OnSessionCreatedPayload) => void;
    hl?: string;
    isTestEnvironment?: boolean;
    clientSessionId?: string;
    onReady?: () => void;
    onSuccess?: (payload: OnSuccessPayload) => void;
    onFailure?: (payload: OnFailurePayload) => void;
    onCancel?: () => void;
    onFinish?: () => void;
  }): void;
  pushPaymentCredentials(credentials: PaymentCredentials): void;
  closeAppWindow(): void;
}

declare global {
  interface Window {
    googlepay?: GooglePayLibrary;
  }
}
```

## Notas por framework

- **React**: el handler del botón llama directo a la función que ejecuta `openAppWindow`. No envolverlo en un `async` que haga `await` antes. Los datos de la tarjeta se cargan antes de renderizar el botón.
- **Next.js (App Router)**: la librería se carga con `next/script` y `strategy="beforeInteractive"` en el layout. El botón y el flujo van en un client component (`"use client"`). El pedido de OPCs puede ser un route handler o una server action; las credenciales de Pomelo solo en variables sin prefijo `NEXT_PUBLIC_`. El `integratorId` sí puede ser `NEXT_PUBLIC_`. La imagen del botón con `next/image` necesita `unoptimized` y `pay.google.com` en `images.remotePatterns`.
- **Angular / Vue**: mismo criterio: la llamada a `openAppWindow` va directo en el handler del evento `click`, y la librería en `index.html` o cargada antes de mostrar el botón.

Ejemplo completo en Next.js: https://github.com/pomelo-la/examples-mobile-tokenization/tree/develop/example-web-push-google-wallet

## Manejo de resultados

| Callback | Cuándo | Qué hacer |
| --- | --- | --- |
| `onSuccess` | Se tokenizó, se guardó la tarjeta, o ambas | Revisar `tokenResult` y `cardResult` (puede ser parcial). Si la tokenización falla después de enviar las credenciales (`E303`-`E308`), Google igual guarda la tarjeta y llama a `onSuccess` con `tokenResult = 0`. |
| `onFailure` | No se hizo nada | Google ya mostró el error. Loguear `errors[].errorCode`. |
| `onCancel` | El usuario cerró la ventana antes de terminar | Probablemente no se hizo nada, pero no es seguro. |
| Excepción de `openAppWindow` | No se pudo abrir la ventana (`E4xx`) | Pedir al usuario que permita ventanas emergentes. |
